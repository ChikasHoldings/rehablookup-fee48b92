import Stripe from "https://esm.sh/stripe@18.5.0?target=denonext";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2?target=denonext";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// PRO SUBSCRIPTION CONFIGURATION
// All paid subscriptions map to "pro" tier in the Free/Pro model
const PRO_PRODUCT_IDS = [
  "prod_pro_monthly", // New Pro product ID
  // Legacy product IDs for backward compatibility
  "prod_TbalLOPujTIoUe", 
  "prod_SHmIFMgcVkqixh", 
  "prod_Tbyz1bf6iYyzYd",
  "prod_TbalOeJZA2ZoJl", 
  "prod_SHmJIiVALcuWdF", 
  "prod_TbyzJVNOQL71NN",
];

const logStep = (step: string, details?: unknown) => {
  console.log(`[GET-PROVIDER-SUBSCRIPTION] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // POST-only enforcement
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed", code: "method_not_allowed", allowed: ["POST"] }),
      {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json", Allow: "POST, OPTIONS" },
      },
    );
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
          plan: "free",
          plan_name: "Free",
          subscribed: false,
          subscription: null,
          customer: null,
          payment_history: [],
          invoices: [],
          timeline: [],
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
          plan: "free",
          plan_name: "Free",
          subscribed: false,
          subscription: null,
          customer: null,
          payment_history: [],
          invoices: [],
          timeline: [],
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    const customer = customers.data[0];
    const customerId = customer.id;
    logStep("Found Stripe customer", { customerId });

    // Get subscriptions (all statuses to build timeline) - avoid deep expand
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "all",
      limit: 10,
    });

    // Get payment intents
    const paymentIntents = await stripe.paymentIntents.list({
      customer: customerId,
      limit: 20,
    });

    // Get invoices with full details
    const invoices = await stripe.invoices.list({
      customer: customerId,
      limit: 20,
    });

    // Determine current plan from active subscription
    const activeSubscription = subscriptions.data.find((s: { status: string }) => s.status === "active");
    let plan = "free";
    let planName = "Free";
    let monthlyAmount = 0;

    if (activeSubscription) {
      const priceId = activeSubscription.items.data[0]?.price?.id;
      let productId: string | null = null;
      
      // Fetch price with product expansion separately to avoid deep nesting
      if (priceId) {
        try {
          const price = await stripe.prices.retrieve(priceId, { expand: ["product"] });
          productId = typeof price.product === "string" ? price.product : (price.product as any)?.id;
          monthlyAmount = (price.unit_amount || 0) / 100;
        } catch (e) {
          logStep("Could not fetch price details", { priceId, error: String(e) });
        }
      }
      
      // All paid subscriptions are now "Pro"
      if (productId && (PRO_PRODUCT_IDS.includes(productId) || productId)) {
        plan = "pro";
        planName = "Pro";
      }
    }

    // Build subscription data
    const subscriptionData = activeSubscription ? {
      id: activeSubscription.id,
      status: activeSubscription.status,
      current_period_start: new Date(activeSubscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(activeSubscription.current_period_end * 1000).toISOString(),
      cancel_at_period_end: activeSubscription.cancel_at_period_end,
      canceled_at: activeSubscription.canceled_at ? new Date(activeSubscription.canceled_at * 1000).toISOString() : null,
      created: new Date(activeSubscription.created * 1000).toISOString(),
      plan,
      monthly_amount: monthlyAmount,
      pause_collection: activeSubscription.pause_collection || null,
    } : null;

    // Build customer data
    const customerData = {
      id: customer.id,
      email: customer.email || email,
      name: customer.name || null,
      created: new Date(customer.created * 1000).toISOString(),
    };

    // Build payment history
    const paymentHistory = paymentIntents.data.map((pi: any) => ({
      id: pi.id,
      amount: pi.amount,
      currency: pi.currency,
      status: pi.status,
      created: pi.created,
      payment_method_type: pi.payment_method_types?.[0] || "card",
      description: pi.description,
    }));

    // Build invoices list
    const invoicesList = invoices.data.map((inv: any) => ({
      id: inv.id,
      number: inv.number,
      amount_paid: inv.amount_paid,
      amount_due: inv.amount_due,
      currency: inv.currency,
      status: inv.status,
      created: inv.created,
      period_start: inv.period_start,
      period_end: inv.period_end,
      hosted_invoice_url: inv.hosted_invoice_url,
      pdf: inv.invoice_pdf,
    }));

    // Build timeline from various events
    const timeline: Array<{
      type: string;
      date: string;
      description: string;
      metadata?: Record<string, string>;
    }> = [];

    // Add subscription events
    subscriptions.data.forEach((sub: any) => {
      // Created event
      timeline.push({
        type: "created",
        date: new Date(sub.created * 1000).toISOString(),
        description: `Subscription created`,
        metadata: { plan: getPlanFromSubscription(sub) },
      });

      // Canceled event
      if (sub.canceled_at) {
        timeline.push({
          type: "canceled",
          date: new Date(sub.canceled_at * 1000).toISOString(),
          description: `Subscription canceled`,
        });
      }
    });

    // Add payment events
    paymentIntents.data.forEach((pi: any) => {
      if (pi.status === "succeeded") {
        timeline.push({
          type: "payment_succeeded",
          date: new Date(pi.created * 1000).toISOString(),
          description: `Payment of $${(pi.amount / 100).toFixed(2)} succeeded`,
        });
      } else if (pi.status === "canceled" || pi.last_payment_error) {
        timeline.push({
          type: "payment_failed",
          date: new Date(pi.created * 1000).toISOString(),
          description: `Payment of $${(pi.amount / 100).toFixed(2)} failed`,
        });
      }
    });

    // Sort timeline by date descending
    timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    logStep("Returning detailed subscription data", { plan, hasActiveSubscription: !!activeSubscription });

    return new Response(
      JSON.stringify({
        plan,
        plan_name: planName,
        subscribed: !!activeSubscription,
        subscription: subscriptionData,
        customer: customerData,
        payment_history: paymentHistory,
        invoices: invoicesList,
        timeline,
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

function getPlanFromSubscription(sub: any): string {
  const productId = sub.items?.data?.[0]?.price?.product;
  if (typeof productId === "string") {
    if (PRO_PRODUCT_IDS.includes(productId)) return "Pro";
  }
  // Any active subscription is Pro
  return sub.status === "active" ? "Pro" : "Free";
}
