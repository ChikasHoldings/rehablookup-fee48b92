import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Featured plan product ID
const FEATURED_PRODUCT_ID = "prod_TbalOeJZA2ZoJl";

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[GET-FEATURED-FACILITIES] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      logStep("No Stripe key, returning empty array");
      return new Response(JSON.stringify({ featuredFacilityIds: [] }), {
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

    // Get all approved facilities with their owner's email
    const { data: facilities, error: facilitiesError } = await supabaseClient
      .from("facilities")
      .select(`
        id,
        user_id,
        profiles!inner (
          email
        )
      `)
      .eq("status", "approved");

    if (facilitiesError) {
      logStep("Error fetching facilities", { error: facilitiesError.message });
      throw new Error(`Failed to fetch facilities: ${facilitiesError.message}`);
    }

    logStep("Fetched facilities", { count: facilities?.length || 0 });

    const featuredFacilityIds: string[] = [];

    // Check each facility's owner for Featured subscription
    for (const facility of facilities || []) {
      const profiles = facility.profiles as unknown as { email: string }[] | { email: string };
      const providerEmail = Array.isArray(profiles) ? profiles[0]?.email : profiles?.email;
      
      if (!providerEmail) continue;

      try {
        // Find Stripe customer
        const customers = await stripe.customers.list({ email: providerEmail, limit: 1 });
        if (customers.data.length === 0) continue;

        const customerId = customers.data[0].id;

        // Check for active Featured subscription
        const subscriptions = await stripe.subscriptions.list({
          customer: customerId,
          status: "active",
          limit: 1,
        });

        if (subscriptions.data.length > 0) {
          const subscription = subscriptions.data[0];
          const productId = subscription.items.data[0].price.product as string;

          if (productId === FEATURED_PRODUCT_ID) {
            featuredFacilityIds.push(facility.id);
            logStep("Found Featured subscriber", { facilityId: facility.id, email: providerEmail });
          }
        }
      } catch (stripeError) {
        logStep("Error checking Stripe for facility", { facilityId: facility.id, error: stripeError });
        // Continue checking other facilities
      }
    }

    logStep("Completed", { featuredCount: featuredFacilityIds.length });

    return new Response(
      JSON.stringify({ featuredFacilityIds }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in get-featured-facilities", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage, featuredFacilityIds: [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200, // Return 200 with empty array to not break the UI
    });
  }
});
