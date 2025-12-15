import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[GET-REVENUE-STATS] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    // Verify admin access
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header provided");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !userData.user) {
      throw new Error("User not authenticated");
    }

    // Check if user is admin
    const { data: roleData } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .single();

    if (!roleData) {
      throw new Error("Unauthorized - admin access required");
    }

    logStep("Admin verified", { userId: userData.user.id });

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      logStep("No Stripe key configured");
      return new Response(
        JSON.stringify({ 
          monthlyRevenue: 0,
          previousMonthRevenue: 0,
          percentChange: 0,
          activeSubscriptions: 0,
          totalCustomers: 0,
          configured: false
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    logStep("Stripe client initialized");

    // Get current month boundaries
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    // Fetch charges for current month
    const currentMonthCharges = await stripe.charges.list({
      created: {
        gte: Math.floor(startOfMonth.getTime() / 1000),
      },
      limit: 100,
    });
    logStep("Fetched current month charges", { count: currentMonthCharges.data.length });

    // Fetch charges for previous month
    const prevMonthCharges = await stripe.charges.list({
      created: {
        gte: Math.floor(startOfPrevMonth.getTime() / 1000),
        lte: Math.floor(endOfPrevMonth.getTime() / 1000),
      },
      limit: 100,
    });
    logStep("Fetched previous month charges", { count: prevMonthCharges.data.length });

    // Calculate revenue (only successful charges)
    const monthlyRevenue = currentMonthCharges.data
      .filter((charge: Stripe.Charge) => charge.status === "succeeded" && !charge.refunded)
      .reduce((sum: number, charge: Stripe.Charge) => sum + charge.amount, 0) / 100;

    const previousMonthRevenue = prevMonthCharges.data
      .filter((charge: Stripe.Charge) => charge.status === "succeeded" && !charge.refunded)
      .reduce((sum: number, charge: Stripe.Charge) => sum + charge.amount, 0) / 100;

    // Calculate percent change
    const percentChange = previousMonthRevenue > 0 
      ? Math.round(((monthlyRevenue - previousMonthRevenue) / previousMonthRevenue) * 100)
      : monthlyRevenue > 0 ? 100 : 0;

    // Get active subscriptions count
    const subscriptions = await stripe.subscriptions.list({
      status: "active",
      limit: 100,
    });
    const activeSubscriptions = subscriptions.data.length;
    logStep("Fetched active subscriptions", { count: activeSubscriptions });

    // Get total customers count
    const customers = await stripe.customers.list({ limit: 100 });
    const totalCustomers = customers.data.length;
    logStep("Fetched customers", { count: totalCustomers });

    const response = {
      monthlyRevenue,
      previousMonthRevenue,
      percentChange,
      activeSubscriptions,
      totalCustomers,
      configured: true,
    };

    logStep("Returning stats", response);

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
