import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Unlock pricing per inquiry type (in cents) - defaults if admin settings not found
const DEFAULT_PRICES: Record<string, number> = {
  request_info: 3900,      // $39.00
  request_callback: 4900,  // $49.00
};
const DEFAULT_PRO_DISCOUNT_PERCENT = 20;

// Fetch dynamic pricing from platform_settings
// deno-lint-ignore no-explicit-any
async function getUnlockPricing(supabase: any): Promise<{
  prices: Record<string, number>;
  proDiscountPercent: number;
}> {
  const { data: settings } = await supabase
    .from("platform_settings")
    .select("setting_key, setting_value")
    .in("setting_key", [
      "unlock_price_request_info",
      "unlock_price_request_callback", 
      "pro_discount_percent"
    ]);

  const prices: Record<string, number> = { ...DEFAULT_PRICES };
  let proDiscountPercent = DEFAULT_PRO_DISCOUNT_PERCENT;

  if (settings) {
    for (const setting of settings) {
      if (setting.setting_key === "unlock_price_request_info") {
        prices.request_info = (setting.setting_value as { cents: number })?.cents ?? DEFAULT_PRICES.request_info;
      } else if (setting.setting_key === "unlock_price_request_callback") {
        prices.request_callback = (setting.setting_value as { cents: number })?.cents ?? DEFAULT_PRICES.request_callback;
      } else if (setting.setting_key === "pro_discount_percent") {
        proDiscountPercent = (setting.setting_value as { value: number })?.value ?? DEFAULT_PRO_DISCOUNT_PERCENT;
      }
    }
  }

  return { prices, proDiscountPercent };
}

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

    // Fetch the lead to get inquiry_type
    const { data: leadData } = await supabaseAdmin
      .from("leads")
      .select("inquiry_type")
      .eq("id", leadId)
      .single();

    const inquiryType = leadData?.inquiry_type || 'request_info';

    // Fetch dynamic pricing from admin settings
    const { prices, proDiscountPercent: adminDiscountPercent } = await getUnlockPricing(supabaseAdmin);

    // Check Pro status for discount
    const { data: proSubscription } = await supabaseAdmin
      .from("pro_subscriptions")
      .select("unlock_discount_percent, status, current_period_end")
      .eq("facility_id", facilityId)
      .eq("status", "active")
      .maybeSingle();

    const isPro = proSubscription && 
      (!proSubscription.current_period_end || new Date(proSubscription.current_period_end) > new Date());
    // Use provider's custom discount if set, otherwise use admin default
    const discountPercent = isPro ? (proSubscription.unlock_discount_percent ?? adminDiscountPercent) : 0;
    
    // Calculate final price based on inquiry type
    const basePrice = prices[inquiryType] ?? prices.request_info;
    const discountAmount = discountPercent > 0 ? Math.round(basePrice * discountPercent / 100) : 0;
    const unlockPrice = basePrice - discountAmount;

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

      // Log the credit transaction with enhanced details
      await supabaseAdmin.from("credit_transactions").insert({
        provider_id: user.id,
        facility_id: facilityId,
        amount_cents: -unlockPrice,
        transaction_type: "unlock",
        reference_id: leadId,
        description: `Unlocked ${inquiryType.replace('_', ' ')} inquiry`,
        inquiry_type: inquiryType,
        base_price_cents: basePrice,
        discount_applied: isPro,
        discount_amount_cents: discountAmount,
      });

    } else if (paymentMethod === 'stripe') {
      // Create Stripe PaymentIntent for direct card payment
      const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
        apiVersion: "2025-08-27.basil",
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
      inquiryType,
      basePrice,
      discountApplied: isPro,
      discountPercent,
      discountAmount,
      pricePaid: unlockPrice,
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
