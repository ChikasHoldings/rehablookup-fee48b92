import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PLAN_CONFIG: Record<string, { name: string }> = {
  basic: { name: "Basic Listing" },
  professional: { name: "Professional" },
  featured: { name: "Featured" },
};

const logStep = (step: string, details?: unknown) => {
  console.log(`[GET-PROVIDER-SUBSCRIPTION] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);
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

    // Verify admin role
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const adminUser = userData.user;
    if (!adminUser) throw new Error("User not authenticated");

    // Check if user is admin
    const { data: roleData } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", adminUser.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) throw new Error("Unauthorized: Admin access required");
    logStep("Admin verified", { adminId: adminUser.id });

    // Get provider email from request
    const { providerEmail, userId } = await req.json();
    if (!providerEmail && !userId) throw new Error("Provider email or userId is required");

    let email = providerEmail;
    
    // If userId provided, get the email from profiles
    if (userId && !providerEmail) {
      const { data: profile } = await supabaseClient
        .from("profiles")
        .select("email")
        .eq("user_id", userId)
        .maybeSingle();
      
      if (profile?.email) {
        email = profile.email;
      } else {
        // Fallback to auth user
        const { data: authUser } = await supabaseClient.auth.admin.getUserById(userId);
        email = authUser?.user?.email;
      }
    }

    if (!email) {
      return new Response(
        JSON.stringify({
          plan: "basic",
          plan_name: "Basic Listing",
          subscribed: false,
          subscription: null,
          payments: [],
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    logStep("Looking up provider", { email });

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    
    // Find Stripe customer
    const customers = await stripe.customers.list({ email, limit: 1 });

    if (customers.data.length === 0) {
      logStep("No Stripe customer found");
      return new Response(
        JSON.stringify({
          plan: "basic",
          plan_name: "Basic Listing",
          subscribed: false,
          subscription: null,
          payments: [],
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    // Get subscriptions
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "all",
      limit: 5,
    });

    // Get payment history
    const payments = await stripe.paymentIntents.list({
      customer: customerId,
      limit: 10,
    });

    // Get invoices
    const invoices = await stripe.invoices.list({
      customer: customerId,
      limit: 10,
    });

    // Determine current plan
    const activeSubscription = subscriptions.data.find((s: { status: string }) => s.status === "active");
    let plan = "basic";
    let planName = "Basic Listing";

    if (activeSubscription) {
      const productId = activeSubscription.items.data[0]?.price?.product as string;
      if (productId === "prod_TbalLOPujTIoUe") {
        plan = "professional";
        planName = "Professional";
      } else if (productId === "prod_TbalOeJZA2ZoJl") {
        plan = "featured";
        planName = "Featured";
      }
    }

    const subscriptionData = activeSubscription ? {
      id: activeSubscription.id,
      status: activeSubscription.status,
      current_period_start: new Date(activeSubscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(activeSubscription.current_period_end * 1000).toISOString(),
      cancel_at_period_end: activeSubscription.cancel_at_period_end,
      created: new Date(activeSubscription.created * 1000).toISOString(),
    } : null;

    const paymentHistory = invoices.data.map((invoice: any) => ({
      id: invoice.id,
      amount: invoice.amount_paid / 100,
      currency: invoice.currency,
      status: invoice.status,
      created: new Date(invoice.created * 1000).toISOString(),
      invoice_pdf: invoice.invoice_pdf,
      description: invoice.lines.data[0]?.description || "Subscription payment",
    }));

    logStep("Returning subscription data", { plan, hasActiveSubscription: !!activeSubscription });

    return new Response(
      JSON.stringify({
        plan,
        plan_name: planName,
        subscribed: !!activeSubscription,
        subscription: subscriptionData,
        payments: paymentHistory,
        customer_id: customerId,
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
