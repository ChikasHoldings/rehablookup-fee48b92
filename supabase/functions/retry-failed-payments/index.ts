import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[RETRY-FAILED-PAYMENTS] ${step}${detailsStr}`);
};

// Retry schedule: Day 1, Day 3, Day 7
const RETRY_INTERVALS_DAYS = [0, 2, 4]; // Days from last attempt
const MAX_RETRIES = 3;

Deno.serve(async (req) => {
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
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    const now = new Date();

    // Find invoices ready for retry
    const { data: invoicesToRetry, error: fetchError } = await supabase
      .from('placement_invoices')
      .select(`
        *,
        facilities (id, name, email, user_id)
      `)
      .eq('status', 'failed')
      .lt('retry_count', MAX_RETRIES)
      .eq('delinquent', false)
      .lte('next_retry_at', now.toISOString())
      .order('next_retry_at', { ascending: true })
      .limit(50);

    if (fetchError) {
      throw new Error(`Failed to fetch invoices: ${fetchError.message}`);
    }

    logStep("Found invoices to retry", { count: invoicesToRetry?.length || 0 });

    const results: Array<{ invoiceId: string; success: boolean; error?: string }> = [];

    for (const invoice of (invoicesToRetry || [])) {
      try {
        logStep("Processing invoice", { invoiceId: invoice.id, retryCount: invoice.retry_count });

        // Get provider's default payment method
        const { data: paymentMethod } = await supabase
          .from('provider_payment_methods')
          .select('stripe_payment_method_id')
          .eq('facility_id', invoice.facility_id)
          .eq('is_default', true)
          .maybeSingle();

        if (!paymentMethod?.stripe_payment_method_id) {
          // No payment method - schedule next retry or mark delinquent
          const newRetryCount = invoice.retry_count + 1;
          
          if (newRetryCount >= MAX_RETRIES) {
            // Mark as delinquent
            await supabase
              .from('placement_invoices')
              .update({
                retry_count: newRetryCount,
                last_retry_at: now.toISOString(),
                delinquent: true,
                delinquent_at: now.toISOString(),
                failure_reason: 'No payment method on file after maximum retries',
              })
              .eq('id', invoice.id);

            // Create admin notification
            await supabase.from('admin_notifications').insert({
              type: 'payment_delinquent',
              title: 'Invoice Marked Delinquent',
              message: `Invoice for ${invoice.facilities?.name || 'Unknown'} marked delinquent after ${MAX_RETRIES} failed attempts.`,
              metadata: { invoice_id: invoice.id, facility_id: invoice.facility_id },
            });

            logStep("Invoice marked delinquent - no payment method", { invoiceId: invoice.id });
          } else {
            // Schedule next retry
            const nextRetryDays = RETRY_INTERVALS_DAYS[newRetryCount] || 4;
            const nextRetryAt = new Date(now.getTime() + nextRetryDays * 24 * 60 * 60 * 1000);

            await supabase
              .from('placement_invoices')
              .update({
                retry_count: newRetryCount,
                last_retry_at: now.toISOString(),
                next_retry_at: nextRetryAt.toISOString(),
                failure_reason: 'No payment method on file',
              })
              .eq('id', invoice.id);

            logStep("Retry scheduled - no payment method", { invoiceId: invoice.id, nextRetry: nextRetryAt });
          }

          results.push({ invoiceId: invoice.id, success: false, error: 'No payment method' });
          continue;
        }

        // Get customer ID from payment method
        const pm = await stripe.paymentMethods.retrieve(paymentMethod.stripe_payment_method_id);
        const customerId = pm.customer as string;

        if (!customerId) {
          throw new Error("Payment method not attached to customer");
        }

        // Attempt payment
        const paymentIntent = await stripe.paymentIntents.create({
          amount: invoice.amount_cents,
          currency: 'usd',
          customer: customerId,
          payment_method: paymentMethod.stripe_payment_method_id,
          off_session: true,
          confirm: true,
          description: `Placement fee retry - Invoice ${invoice.id.slice(0, 8).toUpperCase()}`,
          metadata: {
            invoice_id: invoice.id,
            facility_id: invoice.facility_id,
            retry_attempt: String(invoice.retry_count + 1),
          },
        });

        logStep("Payment attempt result", { 
          invoiceId: invoice.id, 
          status: paymentIntent.status,
        });

        if (paymentIntent.status === 'succeeded') {
          // Success! Update invoice
          await supabase
            .from('placement_invoices')
            .update({
              status: 'paid',
              paid_at: now.toISOString(),
              stripe_payment_intent_id: paymentIntent.id,
              retry_count: invoice.retry_count + 1,
              last_retry_at: now.toISOString(),
              failure_reason: null,
            })
            .eq('id', invoice.id);

          // Update inquiry status
          if (invoice.inquiry_id) {
            await supabase
              .from('concierge_inquiries')
              .update({ provider_fee_status: 'paid' })
              .eq('id', invoice.inquiry_id);
          }

          // Log success event
          await supabase.from('placement_fee_events').insert({
            invoice_id: invoice.id,
            inquiry_id: invoice.inquiry_id,
            facility_id: invoice.facility_id,
            event_type: 'charged',
            actor_type: 'system',
            amount_cents: invoice.amount_cents,
            details: {
              retry_attempt: invoice.retry_count + 1,
              payment_intent_id: paymentIntent.id,
            },
          });

          results.push({ invoiceId: invoice.id, success: true });
          logStep("Payment succeeded on retry", { invoiceId: invoice.id });
        } else {
          // Payment requires action or failed
          throw new Error(`Payment not successful: ${paymentIntent.status}`);
        }

      } catch (paymentError) {
        const errorMessage = paymentError instanceof Error ? paymentError.message : String(paymentError);
        logStep("Payment retry failed", { invoiceId: invoice.id, error: errorMessage });

        const newRetryCount = invoice.retry_count + 1;

        if (newRetryCount >= MAX_RETRIES) {
          // Mark as delinquent
          await supabase
            .from('placement_invoices')
            .update({
              retry_count: newRetryCount,
              last_retry_at: now.toISOString(),
              delinquent: true,
              delinquent_at: now.toISOString(),
              failure_reason: errorMessage,
            })
            .eq('id', invoice.id);

          // Create notifications
          await supabase.from('admin_notifications').insert({
            type: 'payment_delinquent',
            title: 'Invoice Marked Delinquent',
            message: `Invoice for ${invoice.facilities?.name || 'Unknown'} marked delinquent after ${MAX_RETRIES} failed payment attempts.`,
            metadata: { invoice_id: invoice.id, facility_id: invoice.facility_id, error: errorMessage },
          });

          // Notify provider via provider_notifications (shown in provider dashboard)
          if (invoice.facilities?.user_id) {
            await supabase.from('provider_notifications').insert({
              user_id: invoice.facilities.user_id,
              facility_id: invoice.facility_id,
              type: 'payment_failed',
              title: 'Payment Failed - Action Required',
              message: 'Your placement fee payment has failed multiple times. Please update your payment method to avoid service interruption.',
              link: '/provider/placement-network',
              metadata: { invoice_id: invoice.id },
            });
          }

          // Log event
          await supabase.from('placement_fee_events').insert({
            invoice_id: invoice.id,
            inquiry_id: invoice.inquiry_id,
            facility_id: invoice.facility_id,
            event_type: 'delinquent',
            actor_type: 'system',
            amount_cents: invoice.amount_cents,
            details: { retry_attempt: newRetryCount, error: errorMessage },
          });

          logStep("Invoice marked delinquent", { invoiceId: invoice.id });
        } else {
          // Schedule next retry
          const nextRetryDays = RETRY_INTERVALS_DAYS[newRetryCount] || 4;
          const nextRetryAt = new Date(now.getTime() + nextRetryDays * 24 * 60 * 60 * 1000);

          await supabase
            .from('placement_invoices')
            .update({
              retry_count: newRetryCount,
              last_retry_at: now.toISOString(),
              next_retry_at: nextRetryAt.toISOString(),
              failure_reason: errorMessage,
            })
            .eq('id', invoice.id);

          // Log event
          await supabase.from('placement_fee_events').insert({
            invoice_id: invoice.id,
            inquiry_id: invoice.inquiry_id,
            facility_id: invoice.facility_id,
            event_type: 'retry_failed',
            actor_type: 'system',
            amount_cents: invoice.amount_cents,
            details: { retry_attempt: newRetryCount, error: errorMessage, next_retry_at: nextRetryAt.toISOString() },
          });

          logStep("Retry scheduled", { invoiceId: invoice.id, nextRetry: nextRetryAt, attempt: newRetryCount });
        }

        results.push({ invoiceId: invoice.id, success: false, error: errorMessage });
      }
    }

    const summary = {
      processed: results.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results,
    };

    logStep("Processing complete", summary);

    return new Response(
      JSON.stringify(summary),
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
