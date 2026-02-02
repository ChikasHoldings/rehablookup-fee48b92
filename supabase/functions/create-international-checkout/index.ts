import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// $299 International Placement Service Fee
const INTERNATIONAL_PRICE_ID = "price_1SwGkF9fxdThyiakznR520wG";

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-INTL-CHECKOUT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

    // Try to get authenticated user from request
    let authenticatedUserId: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader && supabaseUrl && supabaseAnonKey) {
      try {
        const supabase = createClient(supabaseUrl, supabaseAnonKey);
        const token = authHeader.replace("Bearer ", "");
        const { data: { user } } = await supabase.auth.getUser(token);
        if (user) {
          authenticatedUserId = user.id;
          logStep("Authenticated user found", { userId: user.id });
        }
      } catch (authErr) {
        logStep("Auth check failed, proceeding as anonymous", { error: authErr });
      }
    }

    const { email, name, phone, country } = await req.json();
    
    if (!email) {
      throw new Error("Email is required");
    }
    if (!name) {
      throw new Error("Name is required");
    }
    if (!country) {
      throw new Error("Country is required");
    }

    logStep("Processing international checkout", { 
      email, 
      name,
      country,
      userId: authenticatedUserId
    });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Check for existing customer
    const customers = await stripe.customers.list({ email, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Found existing customer", { customerId });
    }

    // Generate idempotency key
    const idempotencyKey = `intl_placement_${email}_${Date.now()}`;

    const origin = req.headers.get("origin") || "https://rehablookup.com";

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : email,
      line_items: [
        {
          price: INTERNATIONAL_PRICE_ID,
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${origin}/international/intake?session_id={CHECKOUT_SESSION_ID}&payment=success`,
      cancel_url: `${origin}/international?canceled=true`,
      metadata: {
        service: "international_placement",
        client_name: name,
        client_email: email,
        client_phone: phone || "",
        client_country: country,
        idempotency_key: idempotencyKey,
        user_id: authenticatedUserId || "",
      },
      payment_intent_data: {
        metadata: {
          service: "international_placement",
          email: email,
          client_name: name,
          client_country: country,
          user_id: authenticatedUserId || "",
        },
      },
    });

    logStep("Checkout session created", { 
      sessionId: session.id, 
      url: session.url,
      userId: authenticatedUserId 
    });

    return new Response(
      JSON.stringify({ 
        url: session.url, 
        sessionId: session.id,
        idempotencyKey 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
