import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Plan configuration with lead limits - matches new pricing structure
const PLAN_CONFIG: Record<string, { product_id: string | null; lead_limit: number; name: string; featured: boolean }> = {
  basic: {
    product_id: null,
    lead_limit: 0,
    name: "Basic Listing",
    featured: false,
  },
  professional: {
    product_id: "prod_TbalLOPujTIoUe",
    lead_limit: 25,
    name: "Professional",
    featured: false,
  },
  featured: {
    product_id: "prod_TbalOeJZA2ZoJl",
    lead_limit: 75,
    name: "Featured",
    featured: true,
  },
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    logStep("Authorization header found");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });

    if (customers.data.length === 0) {
      logStep("No Stripe customer found, returning basic plan");
      return new Response(
        JSON.stringify({
          subscribed: false,
          plan: "basic",
          plan_name: PLAN_CONFIG.basic.name,
          lead_limit: PLAN_CONFIG.basic.lead_limit,
          subscription_end: null,
          is_featured: false,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });

    if (subscriptions.data.length === 0) {
      logStep("No active subscription found, returning basic plan");
      return new Response(
        JSON.stringify({
          subscribed: false,
          plan: "basic",
          plan_name: PLAN_CONFIG.basic.name,
          lead_limit: PLAN_CONFIG.basic.lead_limit,
          subscription_end: null,
          is_featured: false,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    const subscription = subscriptions.data[0];
    const subscriptionEnd = new Date(subscription.current_period_end * 1000).toISOString();
    const productId = subscription.items.data[0].price.product as string;
    logStep("Active subscription found", { subscriptionId: subscription.id, productId, endDate: subscriptionEnd });

    // Determine plan based on product ID
    let plan = "basic";
    let planConfig = PLAN_CONFIG.basic;

    if (productId === PLAN_CONFIG.professional.product_id) {
      plan = "professional";
      planConfig = PLAN_CONFIG.professional;
    } else if (productId === PLAN_CONFIG.featured.product_id) {
      plan = "featured";
      planConfig = PLAN_CONFIG.featured;
    }

    logStep("Determined plan", { plan, leadLimit: planConfig.lead_limit, featured: planConfig.featured });

    return new Response(
      JSON.stringify({
        subscribed: true,
        plan,
        plan_name: planConfig.name,
        lead_limit: planConfig.lead_limit,
        subscription_end: subscriptionEnd,
        product_id: productId,
        is_featured: planConfig.featured,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in check-subscription", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
