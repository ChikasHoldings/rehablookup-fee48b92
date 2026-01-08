import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Pro subscription price - $99/month
const PRO_PRICE_CENTS = 9900;

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

    const { facilityId } = await req.json();

    if (!facilityId) {
      return new Response(JSON.stringify({ error: "Missing facilityId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create admin client
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Verify facility belongs to user
    const { data: facility } = await supabaseAdmin
      .from("facilities")
      .select("id, user_id, name")
      .eq("id", facilityId)
      .single();

    if (!facility || facility.user_id !== user.id) {
      return new Response(JSON.stringify({ error: "Facility not found or unauthorized" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if already has active Pro subscription
    const { data: existingPro } = await supabaseAdmin
      .from("pro_subscriptions")
      .select("*")
      .eq("facility_id", facilityId)
      .eq("status", "active")
      .maybeSingle();

    if (existingPro) {
      return new Response(JSON.stringify({ error: "Already has active Pro subscription" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Initialize Stripe
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

    // Create or get a Pro Visibility price
    // In production, you'd create this in the Stripe dashboard
    let proPrice: Stripe.Price;
    const prices = await stripe.prices.list({
      lookup_keys: ["pro_visibility_monthly"],
      limit: 1,
    });

    if (prices.data.length > 0) {
      proPrice = prices.data[0];
    } else {
      // Create the product and price if they don't exist
      const product = await stripe.products.create({
        name: "Pro Visibility Upgrade",
        description: "20% off lead unlocks + featured placement",
      });

      proPrice = await stripe.prices.create({
        product: product.id,
        unit_amount: PRO_PRICE_CENTS,
        currency: "usd",
        recurring: { interval: "month" },
        lookup_key: "pro_visibility_monthly",
      });
    }

    // Create Stripe checkout session for subscription
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{
        price: proPrice.id,
        quantity: 1,
      }],
      success_url: `${req.headers.get("origin")}/provider/billing?pro_success=true`,
      cancel_url: `${req.headers.get("origin")}/provider/billing?pro_canceled=true`,
      metadata: {
        type: "pro_subscription",
        facility_id: facilityId,
        user_id: user.id,
      },
      subscription_data: {
        metadata: {
          type: "pro_subscription",
          facility_id: facilityId,
          user_id: user.id,
        },
      },
    });

    return new Response(JSON.stringify({ 
      checkoutUrl: session.url,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in subscribe-pro:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
