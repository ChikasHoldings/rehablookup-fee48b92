import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Credit package options
const CREDIT_PACKAGES = [
  { amountCents: 5000, label: "$50" },
  { amountCents: 10000, label: "$100" },
  { amountCents: 25000, label: "$250" },
  { amountCents: 50000, label: "$500" },
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { amountCents, facilityId } = await req.json();

    if (!amountCents || !facilityId) {
      return new Response(JSON.stringify({ error: "Missing amountCents or facilityId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate amount is a valid package
    const validPackage = CREDIT_PACKAGES.find(p => p.amountCents === amountCents);
    if (!validPackage) {
      return new Response(JSON.stringify({ error: "Invalid credit amount" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create admin client
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Verify facility belongs to user
    const { data: facility } = await supabaseAdmin
      .from("facilities")
      .select("id, user_id")
      .eq("id", facilityId)
      .single();

    if (!facility || facility.user_id !== user.id) {
      return new Response(JSON.stringify({ error: "Facility not found or unauthorized" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
      apiVersion: "2023-10-16",
    });

    // Find or create Stripe customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string;

    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    } else {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { user_id: user.id },
      });
      customerId = customer.id;
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [{
        price_data: {
          currency: "usd",
          product_data: {
            name: "Lead Unlock Credits",
            description: `${validPackage.label} in credits for unlocking leads`,
          },
          unit_amount: amountCents,
        },
        quantity: 1,
      }],
      success_url: `${req.headers.get("origin")}/provider/billing?credits_success=true&amount=${amountCents}`,
      cancel_url: `${req.headers.get("origin")}/provider/billing?credits_canceled=true`,
      metadata: {
        type: "credit_purchase",
        amount_cents: amountCents.toString(),
        facility_id: facilityId,
        user_id: user.id,
      },
    });

    return new Response(JSON.stringify({ 
      checkoutUrl: session.url,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in purchase-credits:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
