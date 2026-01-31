import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ADDITIONAL_LISTING_PRICE_ID = "price_1SvUAg9fxdThyiakhDtW2pG9";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      throw new Error("Unauthorized");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      throw new Error("Unauthorized");
    }
    
    const userId = claimsData.claims.sub as string;
    const userEmail = claimsData.claims.email as string;

    if (!userId || !userEmail) {
      throw new Error("User not authenticated or email not available");
    }

    // Verify user has Pro subscription
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: proSub } = await adminClient
      .from("pro_subscriptions")
      .select("id, status")
      .eq("user_id", userId)
      .eq("status", "active")
      .maybeSingle();

    if (!proSub) {
      throw new Error("Pro subscription required to purchase additional listing slots");
    }

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Check if customer exists
    const customers = await stripe.customers.list({ email: userEmail, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    // Create checkout session
    const origin = req.headers.get("origin") || "https://rehablookup.lovable.app";
    
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : userEmail,
      line_items: [
        {
          price: ADDITIONAL_LISTING_PRICE_ID,
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${origin}/provider/listing?slot_purchased=true`,
      cancel_url: `${origin}/provider/listing?slot_cancelled=true`,
      metadata: {
        user_id: userId,
        purchase_type: "additional_listing_slot",
      },
    });

    // Create pending record
    await adminClient.from("purchased_listing_slots").insert({
      user_id: userId,
      stripe_checkout_session_id: session.id,
      price_cents: 4900,
      status: "pending",
    });

    console.log(`Created checkout session ${session.id} for user ${userId} to purchase additional listing slot`);

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error creating listing slot checkout:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
