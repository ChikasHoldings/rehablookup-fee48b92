import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Default unlock price in cents ($25)
const DEFAULT_UNLOCK_PRICE_CENTS = 2500;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { leadId, facilityId, paymentMethod = 'credits' } = await req.json();

    if (!leadId || !facilityId) {
      return new Response(JSON.stringify({ error: "Missing leadId or facilityId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create admin client for database operations
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Check if lead is already unlocked by this facility
    const { data: existingUnlock } = await supabaseAdmin
      .from("lead_unlocks")
      .select("id")
      .eq("lead_id", leadId)
      .eq("facility_id", facilityId)
      .maybeSingle();

    if (existingUnlock) {
      return new Response(JSON.stringify({ error: "Lead already unlocked" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify facility belongs to user
    const { data: facility } = await supabaseAdmin
      .from("facilities")
      .select("id, user_id")
      .eq("id", facilityId)
      .single();

    if (!facility || facility.user_id !== user.id) {
      return new Response(JSON.stringify({ error: "Facility not found or unauthorized" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check Pro status for discount
    const { data: proSubscription } = await supabaseAdmin
      .from("pro_subscriptions")
      .select("unlock_discount_percent, status, current_period_end")
      .eq("facility_id", facilityId)
      .eq("status", "active")
      .maybeSingle();

    const isPro = proSubscription && 
      (!proSubscription.current_period_end || new Date(proSubscription.current_period_end) > new Date());
    const discountPercent = isPro ? (proSubscription.unlock_discount_percent ?? 20) : 0;
    
    // Calculate final price
    let unlockPrice = DEFAULT_UNLOCK_PRICE_CENTS;
    if (discountPercent > 0) {
      unlockPrice = Math.round(unlockPrice * (1 - discountPercent / 100));
    }

    let stripePaymentIntentId: string | null = null;

    if (paymentMethod === 'credits') {
      // Check credit balance
      const { data: credits } = await supabaseAdmin
        .from("provider_credits")
        .select("balance_cents")
        .eq("provider_id", user.id)
        .maybeSingle();

      const currentBalance = credits?.balance_cents ?? 0;

      if (currentBalance < unlockPrice) {
        return new Response(JSON.stringify({ 
          error: "Insufficient credits",
          required: unlockPrice,
          current: currentBalance,
          needsCredits: unlockPrice - currentBalance,
        }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Deduct credits
      const newBalance = currentBalance - unlockPrice;
      const { error: updateError } = await supabaseAdmin
        .from("provider_credits")
        .upsert({
          provider_id: user.id,
          facility_id: facilityId,
          balance_cents: newBalance,
          updated_at: new Date().toISOString(),
        }, { onConflict: "provider_id" });

      if (updateError) {
        console.error("Error updating credits:", updateError);
        return new Response(JSON.stringify({ error: "Failed to process payment" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Log the credit transaction
      await supabaseAdmin.from("credit_transactions").insert({
        provider_id: user.id,
        facility_id: facilityId,
        amount_cents: -unlockPrice,
        transaction_type: "unlock",
        reference_id: leadId,
        description: `Unlocked lead ${leadId.substring(0, 8)}...`,
      });

    } else if (paymentMethod === 'stripe') {
      // Create Stripe PaymentIntent for direct card payment
      const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
        apiVersion: "2023-10-16",
      });

      // Find or create Stripe customer
      const customers = await stripe.customers.list({ email: user.email, limit: 1 });
      let customerId: string;

      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
      } else {
        const customer = await stripe.customers.create({
          email: user.email,
          metadata: { user_id: user.id },
        });
        customerId = customer.id;
      }

      // For now, just return a checkout URL for Stripe payment
      // In production, you'd use Payment Intents or embedded checkout
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: "payment",
        payment_method_types: ["card"],
        line_items: [{
          price_data: {
            currency: "usd",
            product_data: {
              name: "Lead Unlock",
              description: isPro ? `Lead unlock (${discountPercent}% Pro discount applied)` : "Unlock lead contact details",
            },
            unit_amount: unlockPrice,
          },
          quantity: 1,
        }],
        success_url: `${req.headers.get("origin")}/provider/leads?unlock_success=true&lead=${leadId}`,
        cancel_url: `${req.headers.get("origin")}/provider/leads?unlock_canceled=true`,
        metadata: {
          type: "lead_unlock",
          lead_id: leadId,
          facility_id: facilityId,
          user_id: user.id,
        },
      });

      return new Response(JSON.stringify({ 
        checkoutUrl: session.url,
        requiresPayment: true,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create the unlock record
    const { data: unlock, error: unlockError } = await supabaseAdmin
      .from("lead_unlocks")
      .insert({
        lead_id: leadId,
        provider_id: user.id,
        facility_id: facilityId,
        unlock_price_cents: unlockPrice,
        payment_method: paymentMethod,
        stripe_payment_intent_id: stripePaymentIntentId,
      })
      .select()
      .single();

    if (unlockError) {
      console.error("Error creating unlock:", unlockError);
      return new Response(JSON.stringify({ error: "Failed to unlock lead" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch the lead with full details
    const { data: lead } = await supabaseAdmin
      .from("leads")
      .select("*")
      .eq("id", leadId)
      .single();

    return new Response(JSON.stringify({ 
      success: true,
      unlock,
      lead,
      pricePaid: unlockPrice,
      discountApplied: discountPercent,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in unlock-lead:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
