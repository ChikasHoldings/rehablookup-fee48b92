import Stripe from "https://esm.sh/stripe@18.5.0?target=denonext";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2?target=denonext";

// Inline validation utilities
const sanitizeString = (str: unknown, maxLength = 500): string => {
  if (!str || typeof str !== "string") return "";
  return str.trim().slice(0, maxLength).replace(/[<>]/g, "");
};
const sanitizePhone = (phone: unknown): string => {
  if (!phone || typeof phone !== "string") return "";
  return phone.replace(/[^\d+\-() ]/g, "").slice(0, 30);
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

const VERSION = "2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const INTERNATIONAL_PRICE_ID = "price_1SwGkF9fxdThyiakznR520wG";
const EXPECTED_AMOUNT_CENTS = 29900;

// Maximum request body size (50KB)
const MAX_BODY_SIZE = 50000;

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-INTL-CHECKOUT] [${VERSION}] ${step}${detailsStr}`);
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
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

    const { email, name, phone, country, intakeData, draftId } = body;

    // Validate and sanitize required fields
    let sanitizedEmail: string;
    try {
      sanitizedEmail = sanitizeEmail(email);
    } catch {
      return errorResponse("Valid email is required", 400, corsHeaders);
    }

    const sanitizedName = sanitizeString(name as string, 200);
    if (!sanitizedName) {
      return errorResponse("Name is required", 400, corsHeaders);
    }

    const sanitizedCountry = sanitizeString(country as string, 100);
    if (!sanitizedCountry) {
      return errorResponse("Country is required", 400, corsHeaders);
    }

    const sanitizedPhone = sanitizePhone(phone);
    const sanitizedDraftId = draftId ? sanitizeString(draftId as string, 100).replace(/[^a-zA-Z0-9_-]/g, "") : null;

    // Rate limiting: Check recent checkout attempts for this email
    if (supabaseUrl && supabaseServiceKey) {
      const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      
      const { count: recentAttempts } = await supabaseAdmin
        .from("international_placement_cases")
        .select("*", { count: "exact", head: true })
        .eq("client_email", sanitizedEmail)
        .gte("created_at", fiveMinutesAgo);

      if (recentAttempts && recentAttempts >= 5) {
        logStep("Rate limit exceeded for checkout attempts", { email: sanitizedEmail, count: recentAttempts });
        return errorResponse("Too many checkout attempts. Please wait a few minutes.", 429, corsHeaders);
      }
    }

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

    logStep("Processing international checkout", { 
      email: sanitizedEmail, 
      name: sanitizedName,
      country: sanitizedCountry,
      userId: authenticatedUserId,
      hasIntakeData: !!intakeData,
      draftId: sanitizedDraftId || null,
    });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Verify the price exists and matches expected amount
    try {
      const price = await stripe.prices.retrieve(INTERNATIONAL_PRICE_ID);
      if (price.unit_amount !== EXPECTED_AMOUNT_CENTS) {
        logStep("ERROR: Price amount mismatch", { expected: EXPECTED_AMOUNT_CENTS, actual: price.unit_amount });
        return errorResponse("Payment configuration error", 500, corsHeaders);
      }
    } catch (priceErr) {
      logStep("ERROR: Failed to verify price", { error: String(priceErr) });
      return errorResponse("Payment configuration error", 500, corsHeaders);
    }

    // Check for existing customer
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
    const idempotencyKey = `intl_placement_${sanitizedEmail.replace(/[^a-zA-Z0-9]/g, "_")}_${Date.now()}`;

    const origin = req.headers.get("origin") || "https://rehablookup.com";
    
    // Validate origin
    const allowedOrigins = ["https://rehablookup.com", "https://www.rehablookup.com"];
    const validOrigin = allowedOrigins.includes(origin) ? origin : "https://rehablookup.com";

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : sanitizedEmail,
      line_items: [
        {
          price: INTERNATIONAL_PRICE_ID,
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${validOrigin}/international/thank-you?session_id={CHECKOUT_SESSION_ID}&payment=success`,
      cancel_url: `${validOrigin}/international?canceled=true`,
      expires_at: Math.floor(Date.now() / 1000) + 3600, // 1 hour expiry
      metadata: {
        type: "international_placement",
        service: "international_placement",
        client_name: sanitizedName,
        client_email: sanitizedEmail,
        client_phone: sanitizedPhone || "",
        client_country: sanitizedCountry,
        idempotency_key: idempotencyKey,
        user_id: authenticatedUserId || "",
        draft_id: sanitizedDraftId || "",
        expected_amount: String(EXPECTED_AMOUNT_CENTS),
        version: VERSION,
      },
      payment_intent_data: {
        metadata: {
          type: "international_placement",
          service: "international_placement",
          email: sanitizedEmail,
          client_name: sanitizedName,
          client_country: sanitizedCountry,
          user_id: authenticatedUserId || "",
          expected_amount: String(EXPECTED_AMOUNT_CENTS),
        },
      },
    });

    logStep("Checkout session created", { 
      sessionId: session.id, 
      userId: authenticatedUserId 
    });

    // Create pending payment record
    if (supabaseUrl && supabaseServiceKey) {
      try {
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
        
        // Check for existing payment with same session to ensure idempotency
        const { data: existing } = await supabaseAdmin
          .from("international_payments")
          .select("id")
          .eq("stripe_checkout_session_id", session.id)
          .maybeSingle();

        if (!existing) {
          const { error: insertError } = await supabaseAdmin
            .from("international_payments")
            .insert({
              user_id: authenticatedUserId,
              email: sanitizedEmail,
              stripe_checkout_session_id: session.id,
              amount_cents: EXPECTED_AMOUNT_CENTS,
              currency: "USD",
              status: "pending",
              client_name: sanitizedName,
              client_country: sanitizedCountry,
              metadata: {
                phone: sanitizedPhone || null,
                idempotency_key: idempotencyKey,
                draft_id: sanitizedDraftId,
              },
            });

          if (insertError) {
            logStep("Warning: Failed to create payment record", { error: insertError.message });
          } else {
            logStep("Pending payment record created");
          }
        }
      } catch (dbErr) {
        logStep("Warning: DB operation failed", { error: String(dbErr) });
      }
    }

    return successResponse({
      url: session.url,
      sessionId: session.id,
      idempotencyKey,
    }, corsHeaders);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return errorResponse("An unexpected error occurred. Please try again.", 500, corsHeaders);
  }
});