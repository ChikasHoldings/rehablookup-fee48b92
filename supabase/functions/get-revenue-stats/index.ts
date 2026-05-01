import Stripe from "https://esm.sh/stripe@18.5.0?target=denonext";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2?target=denonext";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: unknown) => {
  console.log(`[GET-REVENUE-STATS] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);
};

// Pro product IDs - includes legacy IDs for backward compatibility
const PRO_PRODUCT_IDS = [
  "prod_pro_monthly",
  "prod_TbalLOPujTIoUe", 
  "prod_Tbyz1bf6iYyzYd",
  "prod_TbalOeJZA2ZoJl", 
  "prod_TbyzJVNOQL71NN",
];

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

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      logStep("No Stripe key configured");
      return new Response(
        JSON.stringify({ 
          total_subscriptions: 0,
          active_subscriptions: 0,
          pro_count: 0,
          free_count: 0,
          mrr: 0,
          mrr_growth: 0,
          new_last_30_days: 0,
          canceled_last_30_days: 0,
          churn_rate: 0,
          subscriptions: [],
          recent_events: [],
          configured: false
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Get all subscriptions (paginated)
    const allSubscriptions: Stripe.Subscription[] = [];
    let hasMore = true;
    let startingAfter: string | undefined = undefined;

    while (hasMore) {
      const subs: Stripe.Response<Stripe.ApiList<Stripe.Subscription>> = await stripe.subscriptions.list({
        status: "all",
        limit: 100,
        starting_after: startingAfter,
        expand: ["data.customer"],
      });
      
      allSubscriptions.push(...subs.data);
      hasMore = subs.has_more;
      if (subs.data.length > 0) {
        startingAfter = subs.data[subs.data.length - 1].id;
      }
    }

    logStep("Fetched all subscriptions", { count: allSubscriptions.length });

    // Calculate stats
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    let activeCount = 0;
    let proCount = 0;
    let canceledLast30Days = 0;
    let newLast30Days = 0;
    let mrr = 0;

    const providerSubscriptions: Array<{
      customer_id: string;
      customer_email: string;
      customer_name: string;
      plan: "free" | "pro";
      status: string;
      current_period_end: string;
      created: string;
      cancel_at_period_end: boolean;
      monthly_amount: number;
    }> = [];

    // Track recent events
    const recentEvents: Array<{
      type: "upgrade" | "downgrade" | "canceled" | "new";
      customer_email: string;
      from_plan?: string;
      to_plan?: string;
      date: string;
    }> = [];

    for (const sub of allSubscriptions) {
      const customer = sub.customer as Stripe.Customer;
      const productId = sub.items.data[0]?.price?.product as string;
      const amount = sub.items.data[0]?.price?.unit_amount || 0;
      const interval = sub.items.data[0]?.price?.recurring?.interval;
      const monthlyAmount = interval === "year" ? amount / 12 : amount;

      // Simplified to Free/Pro model
      const plan: "free" | "pro" = PRO_PRODUCT_IDS.includes(productId) ? "pro" : "free";

      // Safely parse dates - handle null/undefined/invalid timestamps
      const createdTimestamp = sub.created;
      const createdDate = createdTimestamp && !isNaN(createdTimestamp) 
        ? new Date(createdTimestamp * 1000) 
        : null;
      
      const canceledTimestamp = sub.canceled_at;
      const canceledDate = canceledTimestamp && !isNaN(canceledTimestamp)
        ? new Date(canceledTimestamp * 1000)
        : null;

      const periodEndTimestamp = sub.current_period_end;
      const periodEndDate = periodEndTimestamp && !isNaN(periodEndTimestamp)
        ? new Date(periodEndTimestamp * 1000)
        : null;

      if (sub.status === "active") {
        activeCount++;
        mrr += monthlyAmount / 100;

        if (plan === "pro") {
          proCount++;
        }

        // New subscription in last 30 days
        if (createdDate && createdDate > thirtyDaysAgo) {
          newLast30Days++;
          recentEvents.push({
            type: "new",
            customer_email: customer.email || "Unknown",
            to_plan: plan,
            date: createdDate.toISOString(),
          });
        }
      }

      // Canceled in last 30 days
      if (canceledDate && canceledDate > thirtyDaysAgo) {
        canceledLast30Days++;
        recentEvents.push({
          type: "canceled",
          customer_email: customer.email || "Unknown",
          from_plan: plan,
          date: canceledDate.toISOString(),
        });
      }

      providerSubscriptions.push({
        customer_id: customer.id,
        customer_email: customer.email || "Unknown",
        customer_name: customer.name || "Unknown",
        plan,
        status: sub.status,
        current_period_end: periodEndDate ? periodEndDate.toISOString() : new Date().toISOString(),
        created: createdDate ? createdDate.toISOString() : new Date().toISOString(),
        cancel_at_period_end: sub.cancel_at_period_end,
        monthly_amount: monthlyAmount / 100,
      });
    }

    // Calculate churn rate (canceled in last 30 days / active at start of period)
    const activeAtPeriodStart = activeCount + canceledLast30Days;
    const churnRate = activeAtPeriodStart > 0 
      ? Math.round((canceledLast30Days / activeAtPeriodStart) * 100 * 10) / 10
      : 0;

    // Sort events by date descending - safely handle invalid dates
    recentEvents.sort((a, b) => {
      const dateA = a.date ? new Date(a.date).getTime() : 0;
      const dateB = b.date ? new Date(b.date).getTime() : 0;
      // Handle NaN values
      const safeA = isNaN(dateA) ? 0 : dateA;
      const safeB = isNaN(dateB) ? 0 : dateB;
      return safeB - safeA;
    });

    // Get last month's charges for MRR comparison
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    const currentMonthCharges = await stripe.charges.list({
      created: { gte: Math.floor(startOfMonth.getTime() / 1000) },
      limit: 100,
    });

    const prevMonthCharges = await stripe.charges.list({
      created: {
        gte: Math.floor(startOfPrevMonth.getTime() / 1000),
        lte: Math.floor(endOfPrevMonth.getTime() / 1000),
      },
      limit: 100,
    });

    const currentRevenue = currentMonthCharges.data
      .filter((charge: Stripe.Charge) => charge.status === "succeeded" && !charge.refunded)
      .reduce((sum: number, charge: Stripe.Charge) => sum + charge.amount, 0) / 100;

    const previousRevenue = prevMonthCharges.data
      .filter((charge: Stripe.Charge) => charge.status === "succeeded" && !charge.refunded)
      .reduce((sum: number, charge: Stripe.Charge) => sum + charge.amount, 0) / 100;

    const mrrGrowth = previousRevenue > 0 
      ? Math.round(((currentRevenue - previousRevenue) / previousRevenue) * 100 * 10) / 10
      : currentRevenue > 0 ? 100 : 0;

    // Free count = active subscriptions without Pro product (for display purposes, not actual Free tier)
    const freeCount = activeCount - proCount;

    const stats = {
      total_subscriptions: allSubscriptions.length,
      active_subscriptions: activeCount,
      pro_count: proCount,
      free_count: freeCount > 0 ? freeCount : 0,
      mrr: Math.round(mrr * 100) / 100,
      mrr_growth: mrrGrowth,
      new_last_30_days: newLast30Days,
      canceled_last_30_days: canceledLast30Days,
      churn_rate: churnRate,
      subscriptions: providerSubscriptions,
      recent_events: recentEvents.slice(0, 20),
      configured: true,
      // Legacy fields for backwards compatibility
      monthlyRevenue: currentRevenue,
      previousMonthRevenue: previousRevenue,
      percentChange: mrrGrowth,
      // Analytics page specific fields
      activeSubscriptions: activeCount,
      newSubscriptions: newLast30Days,
      revenue: currentRevenue,
      churnCount: canceledLast30Days,
      churnRate: churnRate,
      upgrades: recentEvents.filter(e => e.type === "upgrade").length,
      downgrades: recentEvents.filter(e => e.type === "downgrade").length,
      subscriptionsByPlan: {
        free: freeCount > 0 ? freeCount : 0,
        pro: proCount,
      },
      totalCustomers: providerSubscriptions.length,
    };

    logStep("Stats calculated", { 
      active: activeCount, 
      mrr: stats.mrr,
      churn: stats.churn_rate 
    });

    return new Response(JSON.stringify(stats), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
