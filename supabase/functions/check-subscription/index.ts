import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Plan configuration with lead limits - updated pricing structure
const PLAN_CONFIG: Record<string, { product_ids: string[]; lead_limit: number; qualified_lead_limit: number; direct_lead_limit: number; name: string; featured: boolean }> = {
  basic: {
    product_ids: [],
    lead_limit: 4, // Basic plan includes 4 leads/month (1 per week)
    qualified_lead_limit: 4,
    direct_lead_limit: 4, // Limited for Basic
    name: "Basic Listing",
    featured: false,
  },
  professional: {
    // Support both old and new product IDs for existing subscriptions
    product_ids: ["prod_TbalLOPujTIoUe", "prod_Tbyz1bf6iYyzYd"],
    lead_limit: 25, // 25 exclusive qualified leads/month
    qualified_lead_limit: 25,
    direct_lead_limit: -1, // Unlimited direct leads from profile
    name: "Professional",
    featured: false,
  },
  featured: {
    // Support both old and new product IDs for existing subscriptions
    product_ids: ["prod_TbalOeJZA2ZoJl", "prod_TbyzJVNOQL71NN"],
    lead_limit: 75, // 75 exclusive qualified leads/month
    qualified_lead_limit: 75,
    direct_lead_limit: -1, // Unlimited direct leads
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
          qualified_lead_limit: PLAN_CONFIG.basic.qualified_lead_limit,
          direct_lead_limit: PLAN_CONFIG.basic.direct_lead_limit,
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
          qualified_lead_limit: PLAN_CONFIG.basic.qualified_lead_limit,
          direct_lead_limit: PLAN_CONFIG.basic.direct_lead_limit,
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

    // Determine plan based on product ID (supports both old and new product IDs)
    let plan = "basic";
    let planConfig = PLAN_CONFIG.basic;

    if (PLAN_CONFIG.professional.product_ids.includes(productId)) {
      plan = "professional";
      planConfig = PLAN_CONFIG.professional;
    } else if (PLAN_CONFIG.featured.product_ids.includes(productId)) {
      plan = "featured";
      planConfig = PLAN_CONFIG.featured;
    }

    logStep("Determined plan", { plan, leadLimit: planConfig.lead_limit, qualifiedLeadLimit: planConfig.qualified_lead_limit, featured: planConfig.featured });

    return new Response(
      JSON.stringify({
        subscribed: true,
        plan,
        plan_name: planConfig.name,
        lead_limit: planConfig.lead_limit,
        qualified_lead_limit: planConfig.qualified_lead_limit,
        direct_lead_limit: planConfig.direct_lead_limit,
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