import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CONCIERGE_PRICE_ID = "price_1SnWYz9fxdThyiakSODGlML5";

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CONCIERGE-CHECKOUT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const { email, intakeDraftKey, intakeData, isAuthenticated } = await req.json();
    
    if (!email) {
      throw new Error("Email is required");
    }

    logStep("Processing checkout", { email, isAuthenticated: !!isAuthenticated });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Check for existing customer
    const customers = await stripe.customers.list({ email, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Found existing customer", { customerId });
    }

    // Generate idempotency key
    const idempotencyKey = `concierge_${email}_${Date.now()}`;

    const origin = req.headers.get("origin") || "https://rehablookup.com";

    // Determine success URL based on whether user is authenticated
    const successUrl = isAuthenticated 
      ? `${origin}/account/concierge?session_id={CHECKOUT_SESSION_ID}&payment=success`
      : `${origin}/concierge/intake?session_id={CHECKOUT_SESSION_ID}`;
    
    const cancelUrl = isAuthenticated
      ? `${origin}/account/concierge?payment=canceled`
      : `${origin}/concierge/intake?canceled=true`;

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : email,
      line_items: [
        {
          price: CONCIERGE_PRICE_ID,
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        service: "concierge_placement",
        intake_draft_key: intakeDraftKey || "",
        idempotency_key: idempotencyKey,
        is_authenticated: isAuthenticated ? "true" : "false",
        has_intake_data: intakeData ? "true" : "false",
      },
      payment_intent_data: {
        metadata: {
          service: "concierge_placement",
          email: email,
        },
      },
    });

    logStep("Checkout session created", { sessionId: session.id, url: session.url });

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
