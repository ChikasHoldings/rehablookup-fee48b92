// ============================================================================
// create-checkout-session v1.0.0
// ----------------------------------------------------------------------------
// Authenticated endpoint for purchasing add-ons (Featured today; Concierge
// follows the same pattern). The Pro upgrade flow keeps its own
// `create-checkout` function because Pro is the gateway tier.
//
// Body:
//   {
//     facility_id: uuid,
//     intent: "add_addon",
//     billing_period: "monthly" | "annual",
//     items: [{ product: "featured" | "concierge" }],
//   }
//
// Behavior:
//   1. Authenticate via Authorization JWT.
//   2. Verify the caller owns the facility AND the facility has an
//      active Pro subscription (Featured/Concierge are Pro-gated).
//   3. Resolve the Stripe price by lookup key
//      (rl_featured_monthly_v1 / rl_featured_annual_v1 etc.).
//   4. 30-min single-flight: if an open Checkout session for the same
//      customer + same add-on type was created in the last 30 min,
//      return its URL. Combined with Stripe's idempotency key, this
//      blocks double-billing across tab dupes / network retries.
//   5. Create a NEW Stripe subscription Checkout session with
//      success_url + cancel_url back to /provider/marketing/<addon>
//      and metadata identifying the add-on type + facility id. The
//      webhook keys off metadata.type === "featured_addon" to activate.
//
// Returns:
//   200 { url: stripeCheckoutUrl }
//   400 validation
//   401 auth
//   403 facility not owned by caller, or caller not Pro
//   404 facility / price not found
//   409 already-has-this-addon
// ============================================================================
import Stripe from "https://esm.sh/stripe@18.5.0?target=denonext";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2?target=denonext";

const VERSION = "1.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify({ ...body, _version: VERSION }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const log = (level: "INFO" | "WARN" | "ERROR", msg: string, details?: unknown) => {
  const d = details ? ` | ${JSON.stringify(details)}` : "";
  console.log(`[CREATE-CHECKOUT-SESSION] [${VERSION}] [${level}] ${msg}${d}`);
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const LOOKUP_KEYS: Record<"featured" | "concierge", { monthly: string; annual: string }> = {
  featured: { monthly: "rl_featured_monthly_v1", annual: "rl_featured_annual_v1" },
  concierge: { monthly: "rl_concierge_monthly_v1", annual: "rl_concierge_annual_v1" },
};

type AddOnProduct = "featured" | "concierge";
type Billing = "monthly" | "annual";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed", code: "METHOD_NOT_ALLOWED" });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON = Deno.env.get("SUPABASE_ANON_KEY");
    const SUPABASE_SRK = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
    if (!SUPABASE_URL || !SUPABASE_ANON || !SUPABASE_SRK || !STRIPE_SECRET_KEY) {
      log("ERROR", "Missing env");
      return json(500, { error: "Server misconfigured", code: "SERVER_MISCONFIGURED" });
    }

    // ---- Auth ----
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json(401, { error: "Authentication required", code: "AUTH_MISSING" });
    const anon = createClient(SUPABASE_URL, SUPABASE_ANON);
    const token = authHeader.replace(/^Bearer\s+/i, "");
    const { data: u, error: uErr } = await anon.auth.getUser(token);
    if (uErr || !u?.user?.email) return json(401, { error: "Invalid authentication", code: "AUTH_INVALID" });
    const userId = u.user.id;
    const userEmail = u.user.email;

    // ---- Body ----
    let body: {
      facility_id?: string;
      intent?: string;
      billing_period?: string;
      items?: { product?: string }[];
    };
    try { body = await req.json(); } catch { return json(400, { error: "Invalid JSON", code: "BAD_JSON" }); }

    const facilityId = String(body.facility_id ?? "").trim();
    const intent = String(body.intent ?? "").trim();
    const billingPeriod = String(body.billing_period ?? "").trim() as Billing;
    const item0 = (body.items ?? [])[0];
    const product = String(item0?.product ?? "").trim() as AddOnProduct;

    if (!UUID_REGEX.test(facilityId)) return json(400, { error: "facility_id must be a valid UUID", code: "INVALID_FACILITY_ID" });
    if (intent !== "add_addon") return json(400, { error: "intent must be 'add_addon'", code: "INVALID_INTENT" });
    if (billingPeriod !== "monthly" && billingPeriod !== "annual") {
      return json(400, { error: "billing_period must be 'monthly' or 'annual'", code: "INVALID_BILLING_PERIOD" });
    }
    if (product !== "featured" && product !== "concierge") {
      return json(400, { error: "items[0].product must be 'featured' or 'concierge'", code: "INVALID_PRODUCT" });
    }

    const svc = createClient(SUPABASE_URL, SUPABASE_SRK);
    const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2025-08-27.basil" });

    // ---- Authorize: caller must own the facility AND the row must
    //      already have an active Pro subscription. ----
    const { data: facSub, error: facSubErr } = await svc
      .from("facility_subscriptions")
      .select("id, facility_id, provider_id, tier, status, has_featured, has_concierge_partner, stripe_customer_id, featured_stripe_subscription_id")
      .eq("facility_id", facilityId)
      .maybeSingle();
    if (facSubErr) {
      log("ERROR", "facility_subscriptions lookup failed", { error: facSubErr.message });
      return json(500, { error: "Internal error", code: "DB_ERROR" });
    }
    if (!facSub) {
      return json(409, {
        error: "This facility has no active subscription. Upgrade to Pro before adding Featured.",
        code: "NO_SUBSCRIPTION",
      });
    }
    if ((facSub as { provider_id: string }).provider_id !== userId) {
      return json(403, { error: "Not the owner of this facility", code: "NOT_OWNER" });
    }
    if ((facSub as { tier: string | null }).tier !== "pro" || (facSub as { status: string }).status !== "active") {
      return json(409, {
        error: "Featured requires an active Pro subscription. Upgrade to Pro first.",
        code: "PRO_REQUIRED",
      });
    }
    if (product === "featured" && (facSub as { has_featured: boolean }).has_featured === true) {
      return json(409, { error: "Featured is already active on this facility.", code: "ALREADY_ACTIVE" });
    }
    if (product === "concierge" && (facSub as { has_concierge_partner: boolean }).has_concierge_partner === true) {
      return json(409, { error: "Concierge is already active on this facility.", code: "ALREADY_ACTIVE" });
    }

    // ---- Resolve Stripe price by lookup key ----
    const lookupKey = LOOKUP_KEYS[product][billingPeriod];
    const priceList = await stripe.prices.list({
      lookup_keys: [lookupKey],
      active: true,
      limit: 1,
    });
    const price = priceList.data[0];
    if (!price) {
      log("ERROR", "Price not found", { lookupKey });
      return json(404, {
        error: `Pricing not configured for ${product} ${billingPeriod}. Contact support.`,
        code: "PRICE_NOT_FOUND",
      });
    }

    // ---- Resolve Stripe customer (must exist — Pro is on file) ----
    const storedCustomerId = (facSub as { stripe_customer_id: string | null }).stripe_customer_id;
    let customerId = storedCustomerId ?? undefined;
    if (!customerId) {
      const customers = await stripe.customers.list({ email: userEmail, limit: 1 });
      customerId = customers.data[0]?.id;
    }
    if (!customerId) {
      return json(409, {
        error: "No Stripe customer record found. Please contact support.",
        code: "CUSTOMER_NOT_FOUND",
      });
    }

    // ---- Single-flight: open Checkout session reuse ----
    const thirtyMinAgo = Math.floor((Date.now() - 30 * 60 * 1000) / 1000);
    const recentSessions = await stripe.checkout.sessions.list({
      customer: customerId,
      limit: 10,
      created: { gte: thirtyMinAgo },
    });
    const reuseTag = `${product}_addon`;
    const openSession = recentSessions.data.find(
      (s) =>
        s.status === "open" &&
        s.mode === "subscription" &&
        s.metadata?.type === reuseTag &&
        s.metadata?.facility_id === facilityId &&
        !!s.url,
    );
    if (openSession?.url) {
      log("INFO", "Reusing open Checkout session", { sessionId: openSession.id });
      return json(200, { url: openSession.url, sessionId: openSession.id, reused: true });
    }

    // ---- Create Checkout session ----
    const origin = req.headers.get("origin") || "https://rehablookup.com";
    const successPath =
      product === "featured" ? "/provider/billing/placements" : "/provider/billing/concierge";
    const cancelPath =
      product === "featured" ? "/provider/marketing/featured" : "/provider/marketing/concierge";

    const idempotencyKey = `create-addon-checkout:${userId}:${facilityId}:${product}:${billingPeriod}:${Math.floor(Date.now() / (5 * 60 * 1000))}`;

    const session = await stripe.checkout.sessions.create(
      {
        customer: customerId,
        mode: "subscription",
        payment_method_types: ["card"],
        billing_address_collection: "auto",
        customer_update: { name: "auto", address: "auto" },
        line_items: [{ price: price.id, quantity: 1 }],
        success_url: `${origin}${successPath}?addon=${product}&checkout=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}${cancelPath}?checkout=cancel`,
        metadata: {
          type: `${product}_addon`,
          facility_id: facilityId,
          provider_user_id: userId,
          billing_period: billingPeriod,
        },
        subscription_data: {
          metadata: {
            type: `${product}_addon`,
            facility_id: facilityId,
            provider_user_id: userId,
            billing_period: billingPeriod,
          },
        },
      },
      { idempotencyKey },
    );

    if (!session.url) {
      log("ERROR", "Stripe returned session without URL", { sessionId: session.id });
      return json(502, { error: "Stripe returned a malformed session", code: "STRIPE_BAD_RESPONSE" });
    }

    log("INFO", "Checkout session created", { sessionId: session.id, product, billingPeriod });
    return json(200, { url: session.url, sessionId: session.id });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log("ERROR", "Unhandled exception", { error: errorMessage });
    return json(500, { error: errorMessage, code: "UNHANDLED_EXCEPTION" });
  }
});
