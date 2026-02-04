import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const VERSION = "1.1.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CONCIERGE_PRICE_ID = "price_1SnWYz9fxdThyiakSODGlML5";

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CONCIERGE-CHECKOUT v${VERSION}] ${step}${detailsStr}`);
};

// Input validation helpers
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
};

const sanitizeString = (str: string, maxLength: number = 500): string => {
  if (!str || typeof str !== 'string') return '';
  return str.trim().slice(0, maxLength).replace(/[<>]/g, '');
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    // Validate Stripe key
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      logStep("ERROR: STRIPE_SECRET_KEY not configured");
      return new Response(
        JSON.stringify({ 
          error: "Payment system not configured",
          instructions: "Contact support to configure payment processing"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    // Validate key format
    if (stripeKey.startsWith("pk_")) {
      logStep("ERROR: Invalid key type - publishable key provided");
      return new Response(
        JSON.stringify({ error: "Payment configuration error" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

    // Parse and validate request body
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      logStep("ERROR: Invalid JSON body");
      return new Response(
        JSON.stringify({ error: "Invalid request body" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const { email, intakeDraftKey, intakeData, isAuthenticated, userId: passedUserId } = body;
    
    // Validate email
    if (!email || typeof email !== 'string' || !isValidEmail(email)) {
      logStep("ERROR: Invalid email", { email: typeof email });
      return new Response(
        JSON.stringify({ error: "Valid email address is required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const sanitizedEmail = sanitizeString(email as string, 254).toLowerCase();

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
        logStep("Auth check failed, proceeding as anonymous", { error: String(authErr) });
      }
    }

    // Use authenticated user ID first, then passed userId
    const effectiveUserId = authenticatedUserId || (typeof passedUserId === 'string' ? passedUserId : null);

    logStep("Processing checkout", { 
      email: sanitizedEmail, 
      isAuthenticated: !!isAuthenticated,
      userId: effectiveUserId
    });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Check for existing customer with retry
    let customerId: string | undefined;
    try {
      const customers = await stripe.customers.list({ email: sanitizedEmail, limit: 1 });
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
        logStep("Found existing customer", { customerId });
      }
    } catch (customerErr) {
      logStep("Customer lookup failed, proceeding without", { error: String(customerErr) });
    }

    // Generate idempotency key
    const idempotencyKey = `concierge_${sanitizedEmail}_${Date.now()}`;

    const origin = req.headers.get("origin") || "https://rehablookup.com";

    // Determine success URL based on whether user is authenticated
    const successUrl = isAuthenticated 
      ? `${origin}/account/concierge?session_id={CHECKOUT_SESSION_ID}&payment=success`
      : `${origin}/concierge/intake?session_id={CHECKOUT_SESSION_ID}`;
    
    const cancelUrl = isAuthenticated
      ? `${origin}/account/concierge?payment=canceled`
      : `${origin}/concierge/intake?canceled=true`;

    // Create checkout session with timeout handling
    let session: Stripe.Checkout.Session;
    try {
      session = await stripe.checkout.sessions.create({
        customer: customerId,
        customer_email: customerId ? undefined : sanitizedEmail,
        line_items: [
          {
            price: CONCIERGE_PRICE_ID,
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: successUrl,
        cancel_url: cancelUrl,
        expires_at: Math.floor(Date.now() / 1000) + 3600, // 1 hour expiry
        metadata: {
          service: "concierge_placement",
          intake_draft_key: sanitizeString(intakeDraftKey as string || "", 100),
          idempotency_key: idempotencyKey,
          is_authenticated: isAuthenticated ? "true" : "false",
          has_intake_data: intakeData ? "true" : "false",
          user_id: effectiveUserId || "",
          version: VERSION,
        },
        payment_intent_data: {
          metadata: {
            service: "concierge_placement",
            email: sanitizedEmail,
            user_id: effectiveUserId || "",
          },
        },
      });
    } catch (stripeErr) {
      const errorMessage = stripeErr instanceof Error ? stripeErr.message : String(stripeErr);
      logStep("Stripe checkout creation failed", { error: errorMessage });
      return new Response(
        JSON.stringify({ error: "Failed to create checkout session. Please try again." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    if (!session.url) {
      logStep("ERROR: No checkout URL returned");
      return new Response(
        JSON.stringify({ error: "Checkout session created but no URL returned" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    logStep("Checkout session created", { 
      sessionId: session.id, 
      url: session.url,
      userId: effectiveUserId 
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
    logStep("UNHANDLED ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred. Please try again." }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
