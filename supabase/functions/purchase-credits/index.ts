import Stripe from "https://esm.sh/stripe@18.5.0?target=denonext";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2?target=denonext";

const VERSION = "3.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const generateRequestId = () => crypto.randomUUID().slice(0, 8);
const logStep = (requestId: string, step: string, details?: Record<string, unknown>) => {
  const timestamp = new Date().toISOString();
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[PURCHASE-CREDITS] [${VERSION}] [${requestId}] [${timestamp}] ${step}${detailsStr}`);
};

// Fixed credit tiers — $200, $500 (+10% bonus), $1,000 (+20% bonus)
const CREDIT_PACKAGES = [
  { amountCents: 20000, label: "$200", creditsCents: 20000, bonusCents: 0 },
  { amountCents: 50000, label: "$500", creditsCents: 50000, bonusCents: 5000 },
  { amountCents: 100000, label: "$1,000", creditsCents: 100000, bonusCents: 20000 },
];

const VALID_AMOUNTS: Set<number> = new Set(CREDIT_PACKAGES.map(p => p.amountCents));
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_BODY_SIZE = 2048;

Deno.serve(async (req) => {
  const requestId = generateRequestId();
  logStep(requestId, "Request received", { method: req.method, version: VERSION });

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");

    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
      logStep(requestId, "ERROR - Missing Supabase configuration");
      return new Response(JSON.stringify({ error: "Server configuration error", requestId, _version: VERSION }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!stripeKey || stripeKey.startsWith("pk_") || stripeKey.startsWith("rk_")) {
      logStep(requestId, "ERROR - Invalid or missing Stripe key");
      return new Response(JSON.stringify({ error: "Payment system not configured", requestId, _version: VERSION }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripeMode = stripeKey.startsWith("sk_test_") ? "test" : "live";
    logStep(requestId, "Stripe mode detected", { mode: stripeMode });

    // ── Authenticate user ──
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized", requestId, _version: VERSION }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !user) {
      logStep(requestId, "ERROR - Authentication failed", { error: authError?.message });
      return new Response(JSON.stringify({ error: "Unauthorized", requestId, _version: VERSION }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    logStep(requestId, "User authenticated", { userId: user.id });

    // ── Rate limit: max 5 purchase attempts per 15 minutes ──
    const { data: rateCheck } = await supabaseClient.rpc("check_rate_limit", {
      p_identifier: `purchase:${user.id}`,
      p_action_type: "credit_purchase",
      p_max_attempts: 5,
      p_window_minutes: 15,
    });

    if (rateCheck?.is_limited) {
      logStep(requestId, "Rate limited", { retryAfter: rateCheck.retry_after_seconds });
      return new Response(JSON.stringify({
        error: "Too many purchase attempts. Please wait a few minutes.",
        requestId, _version: VERSION,
      }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Log attempt (initially as failure; success logged after checkout creation)
    await supabaseClient.rpc("log_rate_limit_event", {
      p_identifier: `purchase:${user.id}`,
      p_action_type: "credit_purchase",
      p_success: false,
    });

    // ── Parse and validate body ──
    const rawBody = await req.text();
    if (rawBody.length > MAX_BODY_SIZE) {
      return new Response(JSON.stringify({ error: "Request too large", requestId, _version: VERSION }), {
        status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let body: { amountCents?: unknown; facilityId?: unknown };
    try {
      body = JSON.parse(rawBody);
    } catch {
      return new Response(JSON.stringify({ error: "Invalid request body", requestId, _version: VERSION }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { amountCents, facilityId } = body;

    if (amountCents === undefined || amountCents === null || !facilityId) {
      return new Response(JSON.stringify({ error: "Missing amountCents or facilityId", requestId, _version: VERSION }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Strict type + UUID validation
    if (typeof facilityId !== "string" || !UUID_RE.test(facilityId)) {
      return new Response(JSON.stringify({ error: "Invalid facility ID", requestId, _version: VERSION }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (typeof amountCents !== "number" || !Number.isInteger(amountCents) || !VALID_AMOUNTS.has(amountCents)) {
      logStep(requestId, "ERROR - Invalid credit amount", { amountCents });
      return new Response(JSON.stringify({
        error: "Invalid credit amount. Choose $200, $500, or $1,000.",
        requestId, _version: VERSION,
      }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const validPackage = CREDIT_PACKAGES.find(p => p.amountCents === amountCents)!;
    logStep(requestId, "Package validated", { amountCents, label: validPackage.label, bonusCents: validPackage.bonusCents });

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // ── Verify facility ownership + status ──
    const { data: facility, error: facilityError } = await supabaseAdmin
      .from("facilities")
      .select("id, user_id, name, status, suspended")
      .eq("id", facilityId)
      .single();

    if (facilityError || !facility) {
      return new Response(JSON.stringify({ error: "Facility not found", requestId, _version: VERSION }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (facility.user_id !== user.id) {
      logStep(requestId, "ERROR - Facility ownership mismatch");
      return new Response(JSON.stringify({ error: "Unauthorized", requestId, _version: VERSION }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Block purchases for suspended or non-approved facilities
    if (facility.suspended) {
      logStep(requestId, "ERROR - Facility is suspended", { facilityId });
      return new Response(JSON.stringify({ error: "Your facility is currently suspended. Please contact support.", requestId, _version: VERSION }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (facility.status !== "approved") {
      logStep(requestId, "ERROR - Facility not approved", { facilityId, status: facility.status });
      return new Response(JSON.stringify({ error: "Your facility must be approved before purchasing credits.", requestId, _version: VERSION }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    logStep(requestId, "Facility verified", { facilityId, facilityName: facility.name });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // ── Find or create Stripe customer ──
    let customerId: string;
    try {
      const customers = await stripe.customers.list({ email: user.email, limit: 1 });
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
        logStep(requestId, "Existing Stripe customer found", { customerId });
      } else {
        const customer = await stripe.customers.create({
          email: user.email,
          metadata: { user_id: user.id, facility_id: facilityId },
        });
        customerId = customer.id;
        logStep(requestId, "New Stripe customer created", { customerId });
      }
    } catch (stripeError) {
      logStep(requestId, "ERROR - Stripe customer operation failed", { error: String(stripeError) });
      return new Response(JSON.stringify({ error: "Payment provider error. Please try again.", requestId, _version: VERSION }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const origin = req.headers.get("origin") || "https://rehablookup.com";

    // ── Build description ──
    const bonusText = validPackage.bonusCents > 0
      ? ` + $${(validPackage.bonusCents / 100).toFixed(0)} bonus credits`
      : "";
    const productDescription = `${validPackage.label} in credits${bonusText} for unlocking inquiries`;

    // ── Idempotency key to prevent duplicate Stripe sessions from rapid clicks ──
    const idempotencyKey = `credits_${user.id}_${amountCents}_${Math.floor(Date.now() / 60000)}`;

    let session: Stripe.Checkout.Session;
    try {
      session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: "payment",
        payment_method_types: ["card"],
        line_items: [{
          price_data: {
            currency: "usd",
            product_data: {
              name: "Lead Unlock Credits",
              description: productDescription,
            },
            unit_amount: amountCents,
          },
          quantity: 1,
        }],
        // Don't leak purchase amounts in URL — use opaque token
        success_url: `${origin}/provider/billing?credits_success=true&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/provider/billing?credits_canceled=true`,
        expires_at: Math.floor(Date.now() / 1000) + 1800, // 30 min expiry
        metadata: {
          type: "credit_purchase",
          amount_cents: amountCents.toString(),
          bonus_cents: validPackage.bonusCents.toString(),
          total_credits_cents: (validPackage.creditsCents + validPackage.bonusCents).toString(),
          facility_id: facilityId,
          user_id: user.id,
          request_id: requestId,
          idempotency_key: idempotencyKey,
        },
      }, {
        idempotencyKey,
      });

      logStep(requestId, "Checkout session created", { sessionId: session.id, bonus: validPackage.bonusCents, expiresAt: session.expires_at });

      // Mark rate limit event as successful
      await supabaseClient.rpc("log_rate_limit_event", {
        p_identifier: `purchase:${user.id}`,
        p_action_type: "credit_purchase",
        p_success: true,
      });
    } catch (checkoutError) {
      logStep(requestId, "ERROR - Checkout session creation failed", { error: String(checkoutError) });
      return new Response(JSON.stringify({ error: "Failed to create checkout session. Please try again.", requestId, _version: VERSION }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      checkoutUrl: session.url,
      sessionId: session.id,
      requestId,
      _version: VERSION,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error) {
    logStep(requestId, "ERROR - Unhandled exception", { error: error instanceof Error ? error.message : String(error) });
    return new Response(JSON.stringify({ error: "An unexpected error occurred. Please try again.", requestId, _version: VERSION }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
