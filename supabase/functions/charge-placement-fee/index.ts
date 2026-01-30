import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHARGE-PLACEMENT-FEE] ${step}${detailsStr}`);
};

// Placement fee structure
const PLACEMENT_FEES = {
  flat_fee: {
    standard: 120000, // $1,200 in cents
    pro_discount: 20, // 20% off for pro subscribers
  },
  commission: {
    standard_percent: 8,
    pro_percent: 6.4,
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Supabase configuration missing");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { inquiryId, facilityId, feeType, firstMonthCost, adminInitiated } = await req.json();
    
    if (!inquiryId || !facilityId) {
      throw new Error("Inquiry ID and Facility ID are required");
    }

    logStep("Processing placement fee", { inquiryId, facilityId, feeType, adminInitiated });

    // Verify the inquiry and placement
    const { data: inquiry, error: inquiryError } = await supabase
      .from('concierge_inquiries')
      .select('*')
      .eq('id', inquiryId)
      .single();

    if (inquiryError || !inquiry) {
      throw new Error("Inquiry not found");
    }

    // For admin-initiated charges, update the inquiry to mark placement
    if (adminInitiated) {
      logStep("Admin-initiated charge, updating placement status");
      const { error: updateError } = await supabase
        .from('concierge_inquiries')
        .update({
          status: 'placed',
          placed_facility_id: facilityId,
          placement_confirmed: true,
          placement_confirmed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', inquiryId);

      if (updateError) {
        logStep("Warning: Failed to update inquiry status", { error: updateError.message });
      }

      // Log the event
      await supabase.from('concierge_case_events').insert({
        inquiry_id: inquiryId,
        event_type: 'admin_confirmed_placement',
        event_data: { facility_id: facilityId },
        actor_type: 'admin',
      });
    } else if (!inquiry.placement_confirmed) {
      throw new Error("Placement not confirmed yet");
    }

    // Get facility and check for Pro subscription
    const { data: facility } = await supabase
      .from('facilities')
      .select('id, name, email')
      .eq('id', facilityId)
      .single();

    if (!facility) {
      throw new Error("Facility not found");
    }

    // Check for active Pro subscription
    const { data: proSub } = await supabase
      .from('pro_subscriptions')
      .select('status, unlock_discount_percent')
      .eq('facility_id', facilityId)
      .eq('status', 'active')
      .maybeSingle();

    const hasPro = !!proSub;
    const discountPercent = hasPro ? PLACEMENT_FEES.flat_fee.pro_discount : 0;

    // Calculate fee
    let feeCents: number;
    const actualFeeType = feeType || 'flat_fee';

    // Commission cap: $1,500 maximum
    const COMMISSION_CAP_CENTS = 150000;

    if (actualFeeType === 'commission' && firstMonthCost) {
      const commissionRate = hasPro 
        ? PLACEMENT_FEES.commission.pro_percent 
        : PLACEMENT_FEES.commission.standard_percent;
      feeCents = Math.round(firstMonthCost * (commissionRate / 100));
      
      // Apply commission cap
      if (feeCents > COMMISSION_CAP_CENTS) {
        logStep("Commission capped", { originalFee: feeCents, cappedFee: COMMISSION_CAP_CENTS });
        feeCents = COMMISSION_CAP_CENTS;
      }
    } else {
      feeCents = PLACEMENT_FEES.flat_fee.standard;
      if (hasPro) {
        feeCents = Math.round(feeCents * (1 - discountPercent / 100));
      }
    }

    logStep("Fee calculated", { feeCents, feeType: actualFeeType, hasPro });

    // Get provider's default payment method
    const { data: paymentMethod, error: pmError } = await supabase
      .from('provider_payment_methods')
      .select('stripe_payment_method_id, stripe_customer_id, is_verified')
      .eq('facility_id', facilityId)
      .eq('is_default', true)
      .maybeSingle();

    if (pmError || !paymentMethod) {
      // Create invoice instead of charging directly
      logStep("No payment method, creating invoice");
      
      const dueAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
      
      const { data: invoice, error: invoiceError } = await supabase
        .from('placement_invoices')
        .insert({
          inquiry_id: inquiryId,
          facility_id: facilityId,
          amount_cents: feeCents,
          fee_type: actualFeeType,
          discount_percent: discountPercent,
          discount_reason: hasPro ? 'Pro subscriber discount' : null,
          status: 'pending',
          due_at: dueAt,
        })
        .select('id')
        .single();

      if (invoiceError) {
        throw new Error(`Failed to create invoice: ${invoiceError.message}`);
      }

      // Update inquiry with fee info
      await supabase
        .from('concierge_inquiries')
        .update({
          provider_fee_type: actualFeeType,
          provider_fee_cents: feeCents,
          provider_fee_status: 'invoiced',
          provider_invoice_id: invoice.id,
        })
        .eq('id', inquiryId);

      // Send invoice_issued notification
      try {
        await fetch(`${supabaseUrl}/functions/v1/send-concierge-notifications`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            type: 'invoice_issued',
            inquiryId,
            facilityId,
            invoiceId: invoice.id,
            metadata: {
              amount_cents: feeCents,
              fee_type: actualFeeType,
              due_at: dueAt,
            },
          }),
        });
        logStep("Invoice issued notification sent");
      } catch (notifError) {
        logStep("Warning: Failed to send invoice notification", { error: notifError });
      }

      return new Response(
        JSON.stringify({
          success: true,
          charged: false,
          invoiceId: invoice.id,
          amountCents: feeCents,
          message: "Invoice created - payment method required",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // Charge the payment method
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Use stored customer ID for efficiency
    const customerId = paymentMethod.stripe_customer_id;

    if (!customerId) {
      // Fallback to retrieving from Stripe if not stored
      logStep("Customer ID not stored, retrieving from Stripe");
      const pm = await stripe.paymentMethods.retrieve(paymentMethod.stripe_payment_method_id);
      if (!pm.customer) {
        throw new Error("Payment method not attached to customer");
      }
    }

    const finalCustomerId = customerId || (await stripe.paymentMethods.retrieve(paymentMethod.stripe_payment_method_id)).customer as string;

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: feeCents,
      currency: 'usd',
      customer: finalCustomerId,
      payment_method: paymentMethod.stripe_payment_method_id,
      off_session: true,
      confirm: true,
      description: `Placement fee for case ${inquiryId.slice(0, 8).toUpperCase()}`,
      metadata: {
        inquiry_id: inquiryId,
        facility_id: facilityId,
        fee_type: actualFeeType,
      },
    });

    logStep("Payment intent created", { 
      paymentIntentId: paymentIntent.id, 
      status: paymentIntent.status 
    });

    // Create invoice record
    const { data: invoice, error: invoiceError } = await supabase
      .from('placement_invoices')
      .insert({
        inquiry_id: inquiryId,
        facility_id: facilityId,
        amount_cents: feeCents,
        fee_type: actualFeeType,
        discount_percent: discountPercent,
        discount_reason: hasPro ? 'Pro subscriber discount' : null,
        status: paymentIntent.status === 'succeeded' ? 'paid' : 'pending',
        stripe_payment_intent_id: paymentIntent.id,
        paid_at: paymentIntent.status === 'succeeded' ? new Date().toISOString() : null,
      })
      .select('id')
      .single();

    if (invoiceError) {
      logStep("Warning: Invoice record failed", { error: invoiceError });
    }

    // Log to audit trail
    await supabase.from('placement_fee_events').insert({
      invoice_id: invoice?.id,
      inquiry_id: inquiryId,
      facility_id: facilityId,
      event_type: paymentIntent.status === 'succeeded' ? 'charged' : 'created',
      actor_type: 'system',
      amount_cents: feeCents,
      details: {
        fee_type: actualFeeType,
        has_pro: hasPro,
        discount_percent: discountPercent,
        payment_intent_id: paymentIntent.id,
        payment_status: paymentIntent.status,
      },
    });
    logStep("Audit event logged");

    // Update inquiry
    await supabase
      .from('concierge_inquiries')
      .update({
        provider_fee_type: actualFeeType,
        provider_fee_cents: feeCents,
        provider_fee_status: paymentIntent.status === 'succeeded' ? 'paid' : 'pending',
        provider_invoice_id: invoice?.id,
      })
      .eq('id', inquiryId);

    // Send invoice_paid notification if successful
    if (paymentIntent.status === 'succeeded') {
      try {
        await fetch(`${supabaseUrl}/functions/v1/send-concierge-notifications`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            type: 'invoice_paid',
            inquiryId,
            facilityId,
            invoiceId: invoice?.id,
            metadata: {
              amount_cents: feeCents,
              payment_intent_id: paymentIntent.id,
            },
          }),
        });
        logStep("Invoice paid notification sent");
      } catch (notifError) {
        logStep("Warning: Failed to send payment notification", { error: notifError });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        charged: paymentIntent.status === 'succeeded',
        paymentIntentId: paymentIntent.id,
        invoiceId: invoice?.id,
        amountCents: feeCents,
      }),
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
