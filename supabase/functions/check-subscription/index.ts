import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// PLAN CONFIGURATION - STRICT ENFORCEMENT
// Basic = 0 leads (no qualified leads, upgrade required)
// Professional = 100 shared leads/month (max 2 providers per lead)
// Featured = 100 exclusive leads/month (1 provider per lead)
const PLAN_CONFIG: Record<string, { 
  product_ids: string[]; 
  lead_limit: number; 
  name: string; 
  featured: boolean;
  exclusivity: 'shared' | 'exclusive';
}> = {
  basic: {
    product_ids: [],
    lead_limit: 0, // No qualified leads for basic plan
    name: "Basic Listing",
    featured: false,
    exclusivity: 'exclusive',
  },
  professional: {
    // Support both old and new product IDs for existing subscriptions
    product_ids: ["prod_TbalLOPujTIoUe", "prod_Tbyz1bf6iYyzYd"],
    lead_limit: 100, // 100 shared qualified leads/month
    name: "Professional",
    featured: false,
    exclusivity: 'shared', // ALL leads are shared (no exclusive leads allowed)
  },
  featured: {
    // Support both old and new product IDs for existing subscriptions
    product_ids: ["prod_TbalOeJZA2ZoJl", "prod_TbyzJVNOQL71NN"],
    lead_limit: 100, // 100 exclusive qualified leads/month
    name: "Featured",
    featured: true,
    exclusivity: 'exclusive', // ALL leads are exclusive (no shared leads allowed)
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
          exclusivity: PLAN_CONFIG.basic.exclusivity,
          status: null,
          cancel_at_period_end: false,
          current_period_start: null,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    // Check for active, past_due, or trialing subscriptions first
    const activeSubscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });

    // Also check for past_due subscriptions (still active but payment failed)
    const pastDueSubscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "past_due",
      limit: 1,
    });

    // Also check for trialing subscriptions
    const trialingSubscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "trialing",
      limit: 1,
    });

    // Use the first subscription found in priority order
    const subscription = 
      activeSubscriptions.data[0] || 
      pastDueSubscriptions.data[0] || 
      trialingSubscriptions.data[0];

    if (!subscription) {
      logStep("No active/past_due/trialing subscription found, returning basic plan");
      return new Response(
        JSON.stringify({
          subscribed: false,
          plan: "basic",
          plan_name: PLAN_CONFIG.basic.name,
          lead_limit: PLAN_CONFIG.basic.lead_limit,
          subscription_end: null,
          is_featured: false,
          exclusivity: PLAN_CONFIG.basic.exclusivity,
          status: null,
          cancel_at_period_end: false,
          current_period_start: null,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // Safely convert Unix timestamps to ISO strings
    let subscriptionEnd: string | null = null;
    let subscriptionStart: string | null = null;
    
    try {
      if (subscription.current_period_end) {
        subscriptionEnd = new Date(subscription.current_period_end * 1000).toISOString();
      }
      if (subscription.current_period_start) {
        subscriptionStart = new Date(subscription.current_period_start * 1000).toISOString();
      }
    } catch (dateError) {
      logStep("Warning: Could not parse subscription dates", { 
        current_period_end: subscription.current_period_end,
        current_period_start: subscription.current_period_start,
        error: dateError instanceof Error ? dateError.message : String(dateError)
      });
    }
    
    const productId = subscription.items.data[0]?.price?.product as string;
    
    logStep("Subscription found", { 
      subscriptionId: subscription.id, 
      productId, 
      status: subscription.status,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      endDate: subscriptionEnd 
    });

    // Determine plan based on product ID (supports both old and new product IDs)
    // Also check price ID as fallback since sometimes product is returned as object
    const priceId = subscription.items.data[0]?.price?.id as string;
    let plan = "basic";
    let planConfig = PLAN_CONFIG.basic;

    if (PLAN_CONFIG.professional.product_ids.includes(productId)) {
      plan = "professional";
      planConfig = PLAN_CONFIG.professional;
    } else if (PLAN_CONFIG.featured.product_ids.includes(productId)) {
      plan = "featured";
      planConfig = PLAN_CONFIG.featured;
    } else {
      // Fallback: check by price ID
      if (priceId === "price_1Sel1C9fxdThyiakWLfgbl9K") {
        plan = "professional";
        planConfig = PLAN_CONFIG.professional;
      } else if (priceId === "price_1Sel1P9fxdThyiakj5MaAvOE") {
        plan = "featured";
        planConfig = PLAN_CONFIG.featured;
      }
    }

    logStep("Determined plan", { 
      plan,
      priceId,
      productId,
      leadLimit: planConfig.lead_limit, 
      featured: planConfig.featured, 
      exclusivity: planConfig.exclusivity,
      status: subscription.status,
      cancelAtPeriodEnd: subscription.cancel_at_period_end
    });

    return new Response(
      JSON.stringify({
        subscribed: true,
        plan,
        plan_name: planConfig.name,
        lead_limit: planConfig.lead_limit,
        subscription_end: subscriptionEnd,
        current_period_start: subscriptionStart,
        product_id: productId,
        price_id: priceId,
        is_featured: planConfig.featured,
        exclusivity: planConfig.exclusivity,
        status: subscription.status,
        cancel_at_period_end: subscription.cancel_at_period_end,
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
