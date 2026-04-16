import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const VALID_RELOAD_AMOUNTS = new Set([20000, 50000, 100000]);

// Bonus mapping (must match purchase-credits)
const TIER_BONUSES: Record<number, number> = {
  20000: 0,
  50000: 5000,
  100000: 20000,
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // This function is called internally after a lead unlock
    // It checks if the provider has auto-reload enabled and triggers a Stripe checkout
    const { providerId, currentBalanceCents } = await req.json();

    if (!providerId || typeof currentBalanceCents !== "number") {
      return new Response(
        JSON.stringify({ error: "Missing providerId or currentBalanceCents" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Fetch auto-reload settings
    const { data: settings, error: settingsError } = await supabaseAdmin
      .from("provider_auto_reload_settings")
      .select("*")
      .eq("provider_id", providerId)
      .eq("enabled", true)
      .maybeSingle();

    if (settingsError || !settings) {
      return new Response(
        JSON.stringify({ skipped: true, reason: "No auto-reload settings or disabled" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if balance is below threshold
    if (currentBalanceCents >= settings.threshold_cents) {
      return new Response(
        JSON.stringify({ skipped: true, reason: "Balance above threshold" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate reload amount
    if (!VALID_RELOAD_AMOUNTS.has(settings.reload_amount_cents)) {
      return new Response(
        JSON.stringify({ error: "Invalid reload amount in settings" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user email for Stripe customer lookup
    const { data: userData } = await supabaseAdmin.auth.admin.getUserById(providerId);
    if (!userData?.user?.email) {
      return new Response(
        JSON.stringify({ error: "User not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Find existing Stripe customer
    const customers = await stripe.customers.list({
      email: userData.user.email,
      limit: 1,
    });

    if (customers.data.length === 0) {
      // No Stripe customer = no saved payment method, can't auto-charge
      return new Response(
        JSON.stringify({ skipped: true, reason: "No Stripe customer found for auto-reload" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const customer = customers.data[0];

    // Get default payment method
    const paymentMethods = await stripe.paymentMethods.list({
      customer: customer.id,
      type: "card",
      limit: 1,
    });

    if (paymentMethods.data.length === 0) {
      return new Response(
        JSON.stringify({ skipped: true, reason: "No payment method on file" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const paymentMethodId = paymentMethods.data[0].id;
    const amountCents = settings.reload_amount_cents;
    const bonusCents = TIER_BONUSES[amountCents] ?? 0;
    const totalCreditsCents = amountCents + bonusCents;
    const facilityId = settings.facility_id;

    // Idempotency layer 1: per-provider advisory lock (sub-second protection)
    // Two near-simultaneous unlocks would each pass the threshold check and
    // try to charge. The advisory lock guarantees only one charge attempt
    // wins; the loser short-circuits cleanly.
    const { data: lockAcquired } = await supabaseAdmin.rpc(
      "try_acquire_auto_reload_lock",
      { p_provider_id: providerId }
    );

    if (lockAcquired === false) {
      return new Response(
        JSON.stringify({ skipped: true, reason: "Auto-reload already in flight for this provider" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Idempotency layer 2: 5-minute window check (catches retries across requests)
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data: recentAutoReload } = await supabaseAdmin
      .from("credit_transactions")
      .select("id")
      .eq("provider_id", providerId)
      .eq("transaction_type", "purchase")
      .ilike("description", "%auto-reload%")
      .gte("created_at", fiveMinAgo)
      .limit(1);

    if (recentAutoReload && recentAutoReload.length > 0) {
      return new Response(
        JSON.stringify({ skipped: true, reason: "Auto-reload already triggered recently" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create PaymentIntent and confirm immediately (off-session)
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: "usd",
      customer: customer.id,
      payment_method: paymentMethodId,
      off_session: true,
      confirm: true,
      metadata: {
        type: "credit_purchase",
        auto_reload: "true",
        user_id: providerId,
        facility_id: facilityId || "",
        amount_cents: amountCents.toString(),
        bonus_cents: bonusCents.toString(),
        total_credits_cents: totalCreditsCents.toString(),
      },
    });

    if (paymentIntent.status === "succeeded") {
      // Grant credits immediately
      const { error: txError } = await supabaseAdmin.from("credit_transactions").insert({
        provider_id: providerId,
        facility_id: facilityId,
        amount_cents: amountCents,
        transaction_type: "purchase",
        reference_id: `auto_reload_${paymentIntent.id}`,
        description: `Auto-reload: $${(amountCents / 100).toFixed(0)} in credits`,
        stripe_payment_intent_id: paymentIntent.id,
      });

      if (!txError) {
        // Add bonus if applicable
        if (bonusCents > 0) {
          await supabaseAdmin.from("credit_transactions").insert({
            provider_id: providerId,
            facility_id: facilityId,
            amount_cents: bonusCents,
            transaction_type: "bonus",
            reference_id: `auto_reload_${paymentIntent.id}_bonus`,
            description: `Bonus credits from auto-reload ($${(amountCents / 100).toFixed(0)} purchase)`,
            stripe_payment_intent_id: paymentIntent.id,
          });
        }

        // Increment balance atomically
        await supabaseAdmin.rpc("increment_provider_credits", {
          p_provider_id: providerId,
          p_facility_id: facilityId,
          p_amount_cents: totalCreditsCents,
        });
      }

      return new Response(
        JSON.stringify({
          success: true,
          amountCharged: amountCents,
          creditsAdded: totalCreditsCents,
          paymentIntentId: paymentIntent.id,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ skipped: true, reason: "Payment not immediately succeeded", status: paymentIntent.status }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[auto-reload-credits] Error:", error);
    return new Response(
      JSON.stringify({ error: "Auto-reload failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
