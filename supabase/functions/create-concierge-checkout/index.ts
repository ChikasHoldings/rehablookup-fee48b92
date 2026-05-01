import Stripe from "https://esm.sh/stripe@18.5.0?target=denonext";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2?target=denonext";

// Inline validation utilities
const sanitizeString = (str: unknown, maxLength = 500): string => {
  if (!str || typeof str !== "string") return "";
  return str.trim().slice(0, maxLength).replace(/[<>]/g, "");
};
const sanitizeEmail = (email: unknown): string => {
  if (!email || typeof email !== "string") throw new Error("Invalid email");
  const cleaned = email.trim().toLowerCase().slice(0, 254);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned)) throw new Error("Invalid email format");
  return cleaned;
};
const errorResponse = (msg: string, status: number, headers: Record<string, string>) =>
  new Response(JSON.stringify({ error: msg }), { headers: { ...headers, "Content-Type": "application/json" }, status });
const successResponse = (data: Record<string, unknown>, headers: Record<string, string>) =>
  new Response(JSON.stringify(data), { headers: { ...headers, "Content-Type": "application/json" }, status: 200 });

const VERSION = "3.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Domestic Concierge Service - $29 seeker fee
const CONCIERGE_PRICE_ID = "price_1SxeVg9fxdThyiakIWdVSRtT";
const EXPECTED_AMOUNT_CENTS = 2900;

// Maximum request body size (50KB)
const MAX_BODY_SIZE = 50000;

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CONCIERGE-CHECKOUT v${VERSION}] ${step}${detailsStr}`);
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
      return errorResponse("Payment system not configured", 500, corsHeaders);
    }

    // Validate key format
    if (stripeKey.startsWith("pk_")) {
      logStep("ERROR: Invalid key type - publishable key provided");
      return errorResponse("Payment configuration error", 500, corsHeaders);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    // Validate content length
    const contentLength = req.headers.get("content-length");
    if (contentLength && parseInt(contentLength) > MAX_BODY_SIZE) {
      logStep("ERROR: Request too large", { size: contentLength });
      return errorResponse("Request body too large", 413, corsHeaders);
    }

    // Parse and validate request body
    let body: Record<string, unknown>;
    try {
      const rawBody = await req.text();
      if (rawBody.length > MAX_BODY_SIZE) {
        return errorResponse("Request body too large", 413, corsHeaders);
      }
      body = JSON.parse(rawBody);
    } catch {
      logStep("ERROR: Invalid JSON body");
      return errorResponse("Invalid request body", 400, corsHeaders);
    }

    const { email, intakeDraftKey, intakeData, isAuthenticated, userId: passedUserId, draftId } = body;
    
    // Validate email
    let sanitizedEmail: string;
    try {
      sanitizedEmail = sanitizeEmail(email);
    } catch {
      logStep("ERROR: Invalid email", { email: typeof email });
      return errorResponse("Valid email address is required", 400, corsHeaders);
    }

    const sanitizedDraftId = draftId ? sanitizeString(draftId as string, 100).replace(/[^a-zA-Z0-9_-]/g, "") : null;

    if (!supabaseUrl || !supabaseServiceKey) {
      logStep("ERROR: Missing Supabase config");
      return errorResponse("Server configuration error", 500, corsHeaders);
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Rate limiting: Check recent checkout attempts for this email
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    
    const { count: recentAttempts } = await supabaseAdmin
      .from("concierge_inquiries")
      .select("*", { count: "exact", head: true })
      .eq("user_email", sanitizedEmail)
      .gte("created_at", fiveMinutesAgo);

    if (recentAttempts && recentAttempts >= 10) {
      logStep("Rate limit exceeded for checkout attempts", { email: sanitizedEmail, count: recentAttempts });
      return errorResponse("Too many checkout attempts. Please wait a few minutes.", 429, corsHeaders);
    }

    // Try to get authenticated user from request
    let authenticatedUserId: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader && supabaseAnonKey) {
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

    // Use authenticated user ID first, then passed userId (validate UUID format)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const effectiveUserId = authenticatedUserId || 
      (typeof passedUserId === 'string' && uuidRegex.test(passedUserId) ? passedUserId : null);

    logStep("Processing checkout", { 
      email: sanitizedEmail, 
      isAuthenticated: !!isAuthenticated,
      userId: effectiveUserId,
      draftId: sanitizedDraftId
    });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Verify the price exists and matches expected amount
    try {
      const price = await stripe.prices.retrieve(CONCIERGE_PRICE_ID);
      if (price.unit_amount !== EXPECTED_AMOUNT_CENTS) {
        logStep("ERROR: Price amount mismatch", { expected: EXPECTED_AMOUNT_CENTS, actual: price.unit_amount });
        return errorResponse("Payment configuration error", 500, corsHeaders);
      }
    } catch (priceErr) {
      logStep("ERROR: Failed to verify price", { error: String(priceErr) });
      return errorResponse("Payment configuration error", 500, corsHeaders);
    }

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

    // Generate idempotency key with timestamp
    const idempotencyKey = `concierge_${sanitizedEmail.replace(/[^a-zA-Z0-9]/g, "_")}_${Date.now()}`;

    const origin = req.headers.get("origin") || "https://rehablookup.com";
    
    // Validate origin
    const allowedOrigins = ["https://rehablookup.com", "https://www.rehablookup.com"];
    const validOrigin = allowedOrigins.includes(origin) ? origin : "https://rehablookup.com";

    // Determine success URL based on whether user is authenticated
    const successUrl = isAuthenticated 
      ? `${validOrigin}/account/concierge?session_id={CHECKOUT_SESSION_ID}&payment=success`
      : `${validOrigin}/concierge/thank-you?session_id={CHECKOUT_SESSION_ID}`;
    
    const cancelUrl = isAuthenticated
      ? `${validOrigin}/account/concierge?payment=canceled`
      : `${validOrigin}/concierge/intake?canceled=true`;

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
          draft_id: sanitizedDraftId || "",
          version: VERSION,
          expected_amount: String(EXPECTED_AMOUNT_CENTS),
        },
        payment_intent_data: {
          metadata: {
            service: "concierge_placement",
            email: sanitizedEmail,
            user_id: effectiveUserId || "",
            expected_amount: String(EXPECTED_AMOUNT_CENTS),
          },
        },
      });
    } catch (stripeErr) {
      const errorMessage = stripeErr instanceof Error ? stripeErr.message : String(stripeErr);
      logStep("Stripe checkout creation failed", { error: errorMessage });
      return errorResponse("Failed to create checkout session. Please try again.", 500, corsHeaders);
    }

    if (!session.url) {
      logStep("ERROR: No checkout URL returned");
      return errorResponse("Checkout session created but no URL returned", 500, corsHeaders);
    }

    // ============================================================
    // CRITICAL FIX: Link the checkout_session_id back to the draft
    // so the webhook and submit-intake can find it later.
    // ============================================================
    if (sanitizedDraftId) {
      const { data: draftRecord } = await supabaseAdmin
        .from("concierge_inquiries")
        .select("id, payment_status")
        .eq("draft_id", sanitizedDraftId)
        .maybeSingle();

      if (draftRecord && draftRecord.payment_status !== "paid" && draftRecord.payment_status !== "succeeded") {
        const { error: linkError } = await supabaseAdmin
          .from("concierge_inquiries")
          .update({
            checkout_session_id: session.id,
            idempotency_key: `intake_${session.id}`,
            updated_at: new Date().toISOString(),
          })
          .eq("id", draftRecord.id);

        if (linkError) {
          logStep("WARNING: Failed to link checkout session to draft", { error: linkError.message, draftId: sanitizedDraftId });
        } else {
          logStep("Linked checkout session to draft", { draftId: sanitizedDraftId, inquiryId: draftRecord.id, sessionId: session.id });
        }
      } else {
        logStep("No unpaid draft found to link", { draftId: sanitizedDraftId, found: !!draftRecord });
      }
    }

    logStep("Checkout session created", { 
      sessionId: session.id, 
      userId: effectiveUserId 
    });

    return successResponse({
      url: session.url,
      sessionId: session.id,
      idempotencyKey,
    }, corsHeaders);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("UNHANDLED ERROR", { message: errorMessage });
    return errorResponse("An unexpected error occurred. Please try again.", 500, corsHeaders);
  }
});
