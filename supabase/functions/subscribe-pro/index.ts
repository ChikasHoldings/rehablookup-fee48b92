import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

// Version tracking for deployment verification
const VERSION = "1.1.0";
const DEPLOYED_AT = "2026-04-06T00:00:00Z";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Production logging with request ID
const generateRequestId = () => crypto.randomUUID().slice(0, 8);
const logStep = (requestId: string, step: string, details?: Record<string, unknown>) => {
  const timestamp = new Date().toISOString();
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[SUBSCRIBE-PRO] [${VERSION}] [${requestId}] [${timestamp}] ${step}${detailsStr}`);
};

// Pro subscription price - $399/month
const PRO_PRICE_CENTS = 39900;
const PRO_PRICE_ID = "price_1Sel1C9fxdThyiakWLfgbl9K";

Deno.serve(async (req) => {
  const requestId = generateRequestId();
  logStep(requestId, "Request received", { method: req.method, version: VERSION });

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");

    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
      logStep(requestId, "ERROR - Missing Supabase configuration");
      return new Response(JSON.stringify({ 
        error: "Server configuration error", 
        requestId,
        _version: VERSION 
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!stripeKey) {
      logStep(requestId, "ERROR - STRIPE_SECRET_KEY not configured");
      return new Response(JSON.stringify({ 
        error: "Payment system not configured", 
        requestId,
        _version: VERSION 
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate Stripe key format
    if (stripeKey.startsWith("pk_") || stripeKey.startsWith("rk_")) {
      logStep(requestId, "ERROR - Invalid Stripe key type");
      return new Response(JSON.stringify({ 
        error: "Invalid payment configuration", 
        requestId,
        _version: VERSION 
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripeMode = stripeKey.startsWith("sk_test_") ? "test" : "live";
    logStep(requestId, "Stripe mode detected", { mode: stripeMode });

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: req.headers.get("Authorization")! } }
    });

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      logStep(requestId, "ERROR - No authorization header");
      return new Response(JSON.stringify({ error: "Unauthorized", requestId, _version: VERSION }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !user) {
      logStep(requestId, "ERROR - Authentication failed", { error: authError?.message });
      return new Response(JSON.stringify({ error: "Unauthorized", requestId, _version: VERSION }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    logStep(requestId, "User authenticated", { userId: user.id });

    // Parse and validate request body
    let body: { facilityId?: string };
    try {
      body = await req.json();
    } catch (parseError) {
      logStep(requestId, "ERROR - Invalid JSON body");
      return new Response(JSON.stringify({ 
        error: "Invalid request body", 
        requestId,
        _version: VERSION 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { facilityId } = body;

    if (!facilityId) {
      logStep(requestId, "ERROR - Missing facilityId");
      return new Response(JSON.stringify({ 
        error: "Missing facilityId", 
        requestId,
        _version: VERSION 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create admin client
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // Verify facility belongs to user
    const { data: facility, error: facilityError } = await supabaseAdmin
      .from("facilities")
      .select("id, user_id, name")
      .eq("id", facilityId)
      .single();

    if (facilityError || !facility) {
      logStep(requestId, "ERROR - Facility not found", { facilityId, error: facilityError?.message });
      return new Response(JSON.stringify({ 
        error: "Facility not found", 
        requestId,
        _version: VERSION 
      }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (facility.user_id !== user.id) {
      logStep(requestId, "ERROR - Facility ownership mismatch");
      return new Response(JSON.stringify({ 
        error: "Facility not found or unauthorized", 
        requestId,
        _version: VERSION 
      }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    logStep(requestId, "Facility verified", { facilityId, facilityName: facility.name });

    // Check if already has active Pro subscription
    const { data: existingPro } = await supabaseAdmin
      .from("pro_subscriptions")
      .select("id, status, current_period_end")
      .eq("facility_id", facilityId)
      .eq("status", "active")
      .maybeSingle();

    if (existingPro) {
      logStep(requestId, "ERROR - Already has active Pro subscription", { existingProId: existingPro.id });
      return new Response(JSON.stringify({ 
        error: "Already has active Pro subscription", 
        requestId,
        _version: VERSION 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Initialize Stripe
    const stripe = new Stripe(stripeKey, {
      apiVersion: "2025-08-27.basil",
    });

    // Find or create Stripe customer
    let customerId: string;
    try {
      const customers = await stripe.customers.list({ email: user.email, limit: 1 });

      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
        logStep(requestId, "Existing Stripe customer found", { customerId });
      } else {
        const customer = await stripe.customers.create({
          email: user.email,
          metadata: { 
            user_id: user.id,
            facility_id: facilityId,
          },
        });
        customerId = customer.id;
        logStep(requestId, "New Stripe customer created", { customerId });
      }
    } catch (stripeError) {
      const errorMessage = stripeError instanceof Error ? stripeError.message : "Unknown Stripe error";
      logStep(requestId, "ERROR - Stripe customer operation failed", { error: errorMessage });
      return new Response(JSON.stringify({ 
        error: "Payment provider error. Please try again.", 
        requestId,
        _version: VERSION 
      }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get origin for redirect URLs
    const origin = req.headers.get("origin") || "https://rehablookup.com";

    // Create Stripe checkout session for subscription
    let session: Stripe.Checkout.Session;
    try {
      session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: "subscription",
        payment_method_types: ["card"],
        line_items: [{
          price: PRO_PRICE_ID,
          quantity: 1,
        }],
        success_url: `${origin}/provider/pro-upgrade?pro_success=true`,
        cancel_url: `${origin}/provider/pro-upgrade?pro_canceled=true`,
        metadata: {
          type: "pro_subscription",
          facility_id: facilityId,
          user_id: user.id,
          request_id: requestId,
        },
        subscription_data: {
          metadata: {
            type: "pro_subscription",
            facility_id: facilityId,
            user_id: user.id,
          },
        },
      });

      logStep(requestId, "Checkout session created", { sessionId: session.id });
    } catch (checkoutError) {
      const errorMessage = checkoutError instanceof Error ? checkoutError.message : "Unknown checkout error";
      logStep(requestId, "ERROR - Checkout session creation failed", { error: errorMessage });
      return new Response(JSON.stringify({ 
        error: "Failed to create checkout session. Please try again.", 
        requestId,
        _version: VERSION 
      }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    logStep(requestId, "Pro subscription flow completed successfully");

    return new Response(JSON.stringify({ 
      checkoutUrl: session.url,
      sessionId: session.id,
      requestId,
      _version: VERSION,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logStep(requestId, "ERROR - Unhandled exception", { error: message });
    return new Response(JSON.stringify({ 
      error: "An unexpected error occurred. Please try again.", 
      requestId,
      _version: VERSION 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
