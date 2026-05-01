import Stripe from "https://esm.sh/stripe@18.5.0?target=denonext";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2?target=denonext";

const VERSION = "1.0.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// PRO SUBSCRIPTION CONFIGURATION
// Pro subscription = $399/mo for enhanced features (20% off unlocks, 5 facilities, etc.)
const PRO_PRODUCT_IDS = [
  "prod_pro_monthly", // New Pro product ID
  // Legacy product IDs for backward compatibility with existing subscriptions
  "prod_TbalLOPujTIoUe", 
  "prod_Tbyz1bf6iYyzYd",
  "prod_TbalOeJZA2ZoJl", 
  "prod_TbyzJVNOQL71NN",
];

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

Deno.serve(async (req) => {
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

    // Default response for free users
    const freeResponse = {
      subscribed: false,
      isPro: false,
      plan: "free",
      plan_name: "Free Listing",
      subscription_end: null,
      current_period_start: null,
      status: null,
      cancel_at_period_end: false,
    };

    if (customers.data.length === 0) {
      logStep("No Stripe customer found, returning free plan");
      return new Response(JSON.stringify(freeResponse), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    // Check for active, past_due, or trialing subscriptions
    const [activeSubscriptions, pastDueSubscriptions, trialingSubscriptions] = await Promise.all([
      stripe.subscriptions.list({ customer: customerId, status: "active", limit: 1 }),
      stripe.subscriptions.list({ customer: customerId, status: "past_due", limit: 1 }),
      stripe.subscriptions.list({ customer: customerId, status: "trialing", limit: 1 }),
    ]);

    const subscription = 
      activeSubscriptions.data[0] || 
      pastDueSubscriptions.data[0] || 
      trialingSubscriptions.data[0];

    if (!subscription) {
      logStep("No active/past_due/trialing subscription found, returning free plan");
      return new Response(JSON.stringify(freeResponse), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
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
      logStep("Warning: Could not parse subscription dates", { error: String(dateError) });
    }
    
    const productId = subscription.items.data[0]?.price?.product as string;
    const priceId = subscription.items.data[0]?.price?.id as string;
    
    logStep("Subscription found", { 
      subscriptionId: subscription.id, 
      productId, 
      status: subscription.status,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      endDate: subscriptionEnd 
    });

    // Check if this is a Pro subscription (any paid subscription is now "Pro")
    const isPro = PRO_PRODUCT_IDS.includes(productId) || !!subscription;

    logStep("Determined subscription status", { 
      isPro,
      productId,
      priceId,
      status: subscription.status,
      cancelAtPeriodEnd: subscription.cancel_at_period_end
    });

    return new Response(
      JSON.stringify({
        subscribed: true,
        isPro,
        plan: isPro ? "pro" : "free",
        plan_name: isPro ? "Pro" : "Free Listing",
        subscription_end: subscriptionEnd,
        current_period_start: subscriptionStart,
        product_id: productId,
        price_id: priceId,
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
