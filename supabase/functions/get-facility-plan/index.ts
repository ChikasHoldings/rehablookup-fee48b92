import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Product IDs for plans - support both old and new IDs for backward compatibility
const PROFESSIONAL_PRODUCT_IDS = ["prod_TbalLOPujTIoUe", "prod_Tbyz1bf6iYyzYd"];
const FEATURED_PRODUCT_IDS = ["prod_TbalOeJZA2ZoJl", "prod_TbyzJVNOQL71NN"];

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[GET-FACILITY-PLAN] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { facilityId } = await req.json();
    
    if (!facilityId) {
      logStep("No facility ID provided, returning basic");
      return new Response(JSON.stringify({ plan: "basic" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    logStep("Checking plan for facility", { facilityId });

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      logStep("No Stripe key, returning basic");
      return new Response(JSON.stringify({ plan: "basic" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Get facility owner
    const { data: facility, error: facilityError } = await supabaseClient
      .from("facilities")
      .select("user_id")
      .eq("id", facilityId)
      .maybeSingle();

    if (facilityError || !facility) {
      logStep("Facility not found", { facilityId, error: facilityError?.message });
      return new Response(JSON.stringify({ plan: "basic" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Get provider email from profiles table
    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("email")
      .eq("user_id", facility.user_id)
      .maybeSingle();

    const providerEmail = profile?.email;

    if (!providerEmail) {
      logStep("No provider email found");
      return new Response(JSON.stringify({ plan: "basic" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    logStep("Found provider email", { email: providerEmail });

    // Find Stripe customer
    const customers = await stripe.customers.list({ email: providerEmail, limit: 1 });
    if (customers.data.length === 0) {
      logStep("No Stripe customer found");
      return new Response(JSON.stringify({ plan: "basic" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    // Check for active subscription
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });

    if (subscriptions.data.length === 0) {
      logStep("No active subscription");
      return new Response(JSON.stringify({ plan: "basic" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const subscription = subscriptions.data[0];
    const productId = subscription.items.data[0].price.product as string;

    // Determine plan based on product ID (supports both old and new IDs)
    let plan = "basic";
    if (FEATURED_PRODUCT_IDS.includes(productId)) {
      plan = "featured";
    } else if (PROFESSIONAL_PRODUCT_IDS.includes(productId)) {
      plan = "professional";
    }

    logStep("Determined plan", { plan, productId });

    return new Response(JSON.stringify({ plan }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ plan: "basic", error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  }
});
