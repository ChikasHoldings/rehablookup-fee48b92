import Stripe from "https://esm.sh/stripe@18.5.0?target=denonext";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2?target=denonext";

// Pro product IDs - includes legacy IDs for backward compatibility
const PRO_PRODUCT_IDS = [
  "prod_pro_monthly",
  "prod_TbalLOPujTIoUe", 
  "prod_Tbyz1bf6iYyzYd",
  "prod_TbalOeJZA2ZoJl", 
  "prod_TbyzJVNOQL71NN",
];

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: unknown) => {
  console.log(`[GET-BILLING-HISTORY] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Find Stripe customer by user's email
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });

    if (customers.data.length === 0) {
      logStep("No Stripe customer found");
      return new Response(
        JSON.stringify({
          subscription: null,
          invoices: [],
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    // Get subscriptions (including past_due status)
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      limit: 1,
    });

    // Find active or past_due subscription
    const activeSubscription = subscriptions.data.find(
      (sub: any) => sub.status === "active" || sub.status === "past_due" || sub.status === "trialing"
    );

    // Determine plan from product ID - simplified to Free/Pro model
    let planName: "free" | "pro" = "free";
    if (activeSubscription) {
      const productId = activeSubscription.items.data[0]?.price?.product as string;
      if (PRO_PRODUCT_IDS.includes(productId)) {
        planName = "pro";
      }
    }

    // Build subscription data for UI
    const subscriptionData = activeSubscription ? {
      id: activeSubscription.id,
      status: activeSubscription.status,
      current_period_start: activeSubscription.current_period_start,
      current_period_end: activeSubscription.current_period_end,
      cancel_at_period_end: activeSubscription.cancel_at_period_end,
      canceled_at: activeSubscription.canceled_at,
      plan: planName,
    } : null;

    // Get recent invoices
    const invoices = await stripe.invoices.list({
      customer: customerId,
      limit: 10,
    });

    const invoicesList = invoices.data.map((inv: any) => ({
      id: inv.id,
      amount: inv.amount_paid || inv.amount_due,
      currency: inv.currency,
      status: inv.status,
      created: inv.created,
      invoice_pdf: inv.invoice_pdf,
      hosted_invoice_url: inv.hosted_invoice_url,
    }));

    logStep("Returning billing history", { 
      hasSubscription: !!activeSubscription, 
      invoiceCount: invoicesList.length,
      plan: planName
    });

    return new Response(
      JSON.stringify({
        subscription: subscriptionData,
        invoices: invoicesList,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
