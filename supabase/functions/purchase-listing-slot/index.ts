import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const VERSION = "1.0.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ADDITIONAL_LISTING_PRICE_ID = "price_1SvUAg9fxdThyiakhDtW2pG9";
const LISTING_SLOT_PRICE_CENTS = 4900;

const logStep = (requestId: string, step: string, details?: Record<string, unknown>) => {
  const timestamp = new Date().toISOString();
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[PURCHASE-LISTING-SLOT] [${VERSION}] [${requestId}] [${timestamp}] ${step}${detailsStr}`);
};

const logError = (requestId: string, step: string, error: unknown) => {
  const timestamp = new Date().toISOString();
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : undefined;
  console.error(`[PURCHASE-LISTING-SLOT] [${VERSION}] [${requestId}] [${timestamp}] ERROR in ${step}: ${errorMessage}`, errorStack ? `\nStack: ${errorStack}` : "");
};

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();
  logStep(requestId, "Request received", { method: req.method, url: req.url });

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    logStep(requestId, "CORS preflight response");
    return new Response(null, { headers: corsHeaders });
  }

  // Validate request method
  if (req.method !== "POST") {
    logStep(requestId, "Invalid method", { method: req.method });
    return new Response(
      JSON.stringify({ error: "Method not allowed", requestId, _version: VERSION }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 405 }
    );
  }

  try {
    // Validate environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      logError(requestId, "Environment validation", new Error("Missing Supabase configuration"));
      return new Response(
        JSON.stringify({ error: "Server configuration error", requestId, _version: VERSION }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    if (!stripeSecretKey || !stripeSecretKey.startsWith("sk_")) {
      logError(requestId, "Environment validation", new Error("Invalid Stripe secret key format"));
      return new Response(
        JSON.stringify({ error: "Payment configuration error", requestId, _version: VERSION }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    logStep(requestId, "Environment validated");

    // Initialize Supabase client
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      logStep(requestId, "Missing authorization header");
      return new Response(
        JSON.stringify({ error: "Unauthorized", requestId, _version: VERSION }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      logError(requestId, "JWT validation", claimsError || new Error("No claims data"));
      return new Response(
        JSON.stringify({ error: "Invalid authentication token", requestId, _version: VERSION }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }
    
    const userId = claimsData.claims.sub as string;
    const userEmail = claimsData.claims.email as string;

    if (!userId || !userEmail) {
      logStep(requestId, "Missing user data from claims", { hasUserId: !!userId, hasEmail: !!userEmail });
      return new Response(
        JSON.stringify({ error: "User not authenticated or email not available", requestId, _version: VERSION }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    logStep(requestId, "User authenticated", { userId, email: userEmail.substring(0, 3) + "***" });

    // Initialize admin client for privileged operations
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user has Pro subscription
    const { data: proSub, error: proError } = await adminClient
      .from("pro_subscriptions")
      .select("id, status, current_period_end")
      .eq("provider_id", userId)
      .eq("status", "active")
      .maybeSingle();

    if (proError) {
      logError(requestId, "Pro subscription check", proError);
      return new Response(
        JSON.stringify({ error: "Failed to verify subscription status", requestId, _version: VERSION }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    if (!proSub) {
      logStep(requestId, "No active Pro subscription found", { userId });
      return new Response(
        JSON.stringify({ error: "Pro subscription required to purchase additional listing slots", requestId, _version: VERSION }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403 }
      );
    }

    logStep(requestId, "Pro subscription verified", { subscriptionId: proSub.id });

    // Get current slot count for idempotency check
    const { data: existingSlots, error: slotsError } = await adminClient
      .from("purchased_listing_slots")
      .select("id, status, stripe_checkout_session_id")
      .eq("user_id", userId)
      .eq("status", "pending")
      .gte("created_at", new Date(Date.now() - 30 * 60 * 1000).toISOString()); // Last 30 minutes

    if (slotsError) {
      logError(requestId, "Pending slots check", slotsError);
    } else if (existingSlots && existingSlots.length > 0) {
      logStep(requestId, "Found recent pending slot purchase", { count: existingSlots.length });
      // Could return the existing session URL, but for simplicity create new one
    }

    // Initialize Stripe
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2025-08-27.basil",
    });

    logStep(requestId, "Stripe initialized");

    // Check if customer exists in Stripe
    let customerId: string | undefined;
    try {
      const customers = await stripe.customers.list({ email: userEmail, limit: 1 });
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
        logStep(requestId, "Found existing Stripe customer", { customerId });
      }
    } catch (stripeErr) {
      logError(requestId, "Stripe customer lookup", stripeErr);
      // Continue without customer ID - will create new
    }

    // Create checkout session
    const origin = req.headers.get("origin") || "https://rehablookup.com";
    
    logStep(requestId, "Creating checkout session", { 
      customerId: customerId || "new", 
      priceId: ADDITIONAL_LISTING_PRICE_ID,
      origin 
    });

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
        request_id: requestId,
      },
      payment_intent_data: {
        metadata: {
          user_id: userId,
          purchase_type: "additional_listing_slot",
          request_id: requestId,
        },
      },
    });

    logStep(requestId, "Checkout session created", { sessionId: session.id });

    // Create pending record in database
    const { error: insertError } = await adminClient.from("purchased_listing_slots").insert({
      user_id: userId,
      stripe_checkout_session_id: session.id,
      price_cents: LISTING_SLOT_PRICE_CENTS,
      status: "pending",
    });

    if (insertError) {
      logError(requestId, "Database insert", insertError);
      // Don't fail the request - checkout was already created
      // Webhook will handle completion
    } else {
      logStep(requestId, "Pending slot record created");
    }

    logStep(requestId, "Request completed successfully", { 
      sessionId: session.id,
      hasUrl: !!session.url 
    });

    return new Response(
      JSON.stringify({ 
        url: session.url, 
        sessionId: session.id,
        requestId,
        _version: VERSION 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (error) {
    logError(requestId, "Unhandled exception", error);
    
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const isStripeError = error instanceof Stripe.errors.StripeError;
    
    return new Response(
      JSON.stringify({ 
        error: isStripeError ? "Payment processing error" : errorMessage,
        requestId,
        _version: VERSION 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
