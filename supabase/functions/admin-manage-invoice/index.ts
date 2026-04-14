import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { sendEmailWithRetry } from "../_shared/resilient-email-sender.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[ADMIN-MANAGE-INVOICE] ${step}${detailsStr}`);
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      throw new Error("Supabase configuration missing");
    }

    // Authenticate admin user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !userData.user) {
      throw new Error("Authentication failed");
    }

    // Verify admin role
    const supabaseService = createClient(supabaseUrl, supabaseServiceKey);
    const { data: adminProfile } = await supabaseService
      .from('admin_user_profiles')
      .select('status')
      .eq('user_id', userData.user.id)
      .eq('status', 'active')
      .maybeSingle();

    if (!adminProfile) {
      throw new Error("Admin access required");
    }

    const { invoiceId, action, reason, newAmount } = await req.json();
    
    if (!invoiceId || !action) {
      throw new Error("Invoice ID and action are required");
    }

    logStep("Processing action", { invoiceId, action });

    // Get the invoice
    const { data: invoice, error: invoiceError } = await supabaseService
      .from('placement_invoices')
      .select(`
        *,
        facilities(id, name, email, user_id),
        concierge_inquiries(id, user_name, user_email)
      `)
      .eq('id', invoiceId)
      .single();

    if (invoiceError || !invoice) {
      throw new Error("Invoice not found");
    }

    const now = new Date().toISOString();

    // Handle different actions
    switch (action) {
      case "waive": {
        if (!reason) throw new Error("Reason is required for waiving");

        await supabaseService
          .from('placement_invoices')
          .update({
            waived: true,
            waived_at: now,
            waived_by: userData.user.id,
            waive_reason: reason,
            status: 'waived',
          })
          .eq('id', invoiceId);

        // Log the event
        await supabaseService.from('placement_fee_events').insert({
          invoice_id: invoiceId,
          inquiry_id: invoice.inquiry_id,
          facility_id: invoice.facility_id,
          event_type: 'waived',
          actor_id: userData.user.id,
          actor_type: 'admin',
          amount_cents: invoice.amount_cents,
          details: { reason, waived_by_email: userData.user.email },
        });

        logStep("Invoice waived", { invoiceId, reason });
        break;
      }

      case "override": {
        if (!newAmount || !reason) {
          throw new Error("New amount and reason are required");
        }

        const originalAmount = invoice.override_amount_cents || invoice.amount_cents;

        await supabaseService
          .from('placement_invoices')
          .update({
            override_amount_cents: newAmount,
            overridden_at: now,
            overridden_by: userData.user.id,
            override_reason: reason,
          })
          .eq('id', invoiceId);

        // Log the event
        await supabaseService.from('placement_fee_events').insert({
          invoice_id: invoiceId,
          inquiry_id: invoice.inquiry_id,
          facility_id: invoice.facility_id,
          event_type: 'overridden',
          actor_id: userData.user.id,
          actor_type: 'admin',
          amount_cents: newAmount,
          details: { 
            reason, 
            original_amount: originalAmount,
            new_amount: newAmount,
            overridden_by_email: userData.user.email 
          },
        });

        logStep("Invoice amount overridden", { invoiceId, originalAmount, newAmount });
        break;
      }

      case "mark_paid": {
        await supabaseService
          .from('placement_invoices')
          .update({
            status: 'paid',
            paid_at: now,
          })
          .eq('id', invoiceId);

        // Update inquiry
        if (invoice.inquiry_id) {
          await supabaseService
            .from('concierge_inquiries')
            .update({ provider_fee_status: 'paid' })
            .eq('id', invoice.inquiry_id);
        }

        // Log the event
        await supabaseService.from('placement_fee_events').insert({
          invoice_id: invoiceId,
          inquiry_id: invoice.inquiry_id,
          facility_id: invoice.facility_id,
          event_type: 'charged',
          actor_id: userData.user.id,
          actor_type: 'admin',
          amount_cents: invoice.override_amount_cents || invoice.amount_cents,
          details: { marked_paid_by: userData.user.email, method: 'manual' },
        });

        logStep("Invoice marked as paid", { invoiceId });
        break;
      }

      case "send_reminder": {
        const resendApiKey = Deno.env.get("RESEND_API_KEY");
        if (!resendApiKey) {
          throw new Error("Email service not configured");
        }

        const resend = new Resend(resendApiKey);
        const facilityEmail = invoice.facilities?.email;
        const facilityName = invoice.facilities?.name || "Provider";
        const amountDue = ((invoice.override_amount_cents || invoice.amount_cents) / 100).toFixed(2);
        const dueDate = invoice.due_at ? new Date(invoice.due_at).toLocaleDateString() : "Not yet set";

        if (facilityEmail) {
          await resend.emails.send({
            from: "RehabLookup <no-reply@rehablookup.com>",
            to: [facilityEmail],
            subject: "Payment Reminder - Placement Fee Due",
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background-color: #1B365D; background: #1B365D; padding: 30px; border-radius: 12px 12px 0 0;">
                  <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-family: Arial, Helvetica, sans-serif;">Payment Reminder</h1>
                </div>
                <div style="background: #fff; padding: 30px; border: 1px solid #e5e7eb; border-top: none;">
                  <p style="color: #374151; font-size: 16px; line-height: 1.6;">
                    Hi ${facilityName},
                  </p>
                  <p style="color: #374151; font-size: 16px; line-height: 1.6;">
                    This is a friendly reminder that you have a placement fee payment due.
                  </p>
                  <div style="background: #f8fafc; border-left: 4px solid #1B365D; padding: 15px; margin: 20px 0;">
                    <p style="margin: 0; color: #1B365D;"><strong>Amount Due:</strong> $${amountDue}</p>
                    <p style="margin: 8px 0 0; color: #1B365D;"><strong>Due Date:</strong> ${dueDate}</p>
                    ${invoice.concierge_inquiries?.user_name ? `<p style="margin: 8px 0 0; color: #1B365D;"><strong>Case:</strong> ${invoice.concierge_inquiries.user_name}</p>` : ''}
                  </div>
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="https://rehablookup.com/provider/concierge-dashboard?tab=billing" 
                       style="background: #1B365D; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">
                      View Invoice
                    </a>
                  </div>
                </div>
                <div style="background-color: #1B365D; background: #1B365D; padding: 20px; border-radius: 0 0 12px 12px;">
                  <p style="margin: 0; font-size: 14px; font-weight: 600; color: #ffffff; font-family: Arial, Helvetica, sans-serif; text-align: center;">RehabLookup</p>
                </div>
              </div>
            `,
          });
          logStep("Payment reminder sent", { facilityEmail });
        }

        // Log the event
        await supabaseService.from('placement_fee_events').insert({
          invoice_id: invoiceId,
          inquiry_id: invoice.inquiry_id,
          facility_id: invoice.facility_id,
          event_type: 'reminder_sent',
          actor_id: userData.user.id,
          actor_type: 'admin',
          amount_cents: invoice.override_amount_cents || invoice.amount_cents,
          details: { sent_to: facilityEmail, sent_by: userData.user.email },
        });

        break;
      }

      case "retry_charge": {
        const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
        if (!stripeKey) throw new Error("Stripe not configured");

        // Get payment method with stored customer ID
        const { data: paymentMethod } = await supabaseService
          .from('provider_payment_methods')
          .select('stripe_payment_method_id, stripe_customer_id')
          .eq('facility_id', invoice.facility_id)
          .eq('is_default', true)
          .maybeSingle();

        if (!paymentMethod) {
          throw new Error("No payment method on file");
        }

        const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

        // Use stored customer ID for efficiency, fallback to retrieving from Stripe
        let customerId = paymentMethod.stripe_customer_id;
        
        if (!customerId) {
          logStep("Customer ID not stored, retrieving from Stripe");
          const pm = await stripe.paymentMethods.retrieve(paymentMethod.stripe_payment_method_id);
          customerId = pm.customer as string;
        }

        if (!customerId) {
          throw new Error("Payment method not attached to customer");
        }

        const amountToCharge = invoice.override_amount_cents || invoice.amount_cents;

        // Create new payment intent
        const paymentIntent = await stripe.paymentIntents.create({
          amount: amountToCharge,
          currency: 'usd',
          customer: customerId,
          payment_method: paymentMethod.stripe_payment_method_id,
          off_session: true,
          confirm: true,
          description: `Placement fee retry for invoice ${invoiceId.slice(0, 8).toUpperCase()}`,
          metadata: {
            invoice_id: invoiceId,
            facility_id: invoice.facility_id,
            retry: 'true',
          },
        });

        // Update invoice
        await supabaseService
          .from('placement_invoices')
          .update({
            status: paymentIntent.status === 'succeeded' ? 'paid' : 'pending',
            stripe_payment_intent_id: paymentIntent.id,
            paid_at: paymentIntent.status === 'succeeded' ? now : null,
          })
          .eq('id', invoiceId);

        // Update inquiry
        if (invoice.inquiry_id && paymentIntent.status === 'succeeded') {
          await supabaseService
            .from('concierge_inquiries')
            .update({ provider_fee_status: 'paid' })
            .eq('id', invoice.inquiry_id);
        }

        // Log the event
        await supabaseService.from('placement_fee_events').insert({
          invoice_id: invoiceId,
          inquiry_id: invoice.inquiry_id,
          facility_id: invoice.facility_id,
          event_type: paymentIntent.status === 'succeeded' ? 'charged' : 'retry_attempted',
          actor_id: userData.user.id,
          actor_type: 'admin',
          amount_cents: amountToCharge,
          details: { 
            payment_intent_id: paymentIntent.id, 
            status: paymentIntent.status,
            retried_by: userData.user.email 
          },
        });

        logStep("Payment retry completed", { paymentIntentId: paymentIntent.id, status: paymentIntent.status });
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(
      JSON.stringify({ success: true, action }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
