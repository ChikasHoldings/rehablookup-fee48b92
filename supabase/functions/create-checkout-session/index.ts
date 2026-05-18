// ============================================================================
// create-checkout-session v1.1.0
// ----------------------------------------------------------------------------
// Authenticated Stripe Checkout entry for:
//   1. intent="initial_subscription" + product="pro" — Pro upgrade from
//      the provider Billing page (monthly or annual). NEW in v1.1.0;
//      Billing.tsx calls this path. (The wizard's separate Pro flow
//      uses create-signup-checkout.)
//   2. intent="add_addon" + product="featured"|"concierge" —
//      add-ons purchased from the MarketingHub. Requires the caller's
//      facility to be on active Pro.
//
// Body:
//   {
//     facility_id: uuid,
//     intent: "initial_subscription" | "add_addon",
//     billing_period: "monthly" | "annual",
//     items: [{ product: "pro" | "featured" | "concierge" }],
//   }
//
// Returns:
//   200 { url, sessionId }            — caller redirects to Stripe Checkout
//   400 validation
//   401 auth
//   403 not facility owner
//   404 facility / price not found
//   409 already-has-this-addon (or already on Pro, for initial_subscription)
// ============================================================================
import Stripe from "https://esm.sh/stripe@18.5.0?target=denonext";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2?target=denonext";

const VERSION = "1.1.0";

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

const LOOKUP_KEYS: Record<"pro" | "featured" | "concierge", { monthly: string; annual: string }> = {
  pro:       { monthly: "rl_pro_monthly_v1",       annual: "rl_pro_annual_v1" },
  featured:  { monthly: "rl_featured_monthly_v1",  annual: "rl_featured_annual_v1" },
  concierge: { monthly: "rl_concierge_monthly_v1", annual: "rl_concierge_annual_v1" },
};

type Product = "pro" | "featured" | "concierge";
type Intent = "initial_subscription" | "add_addon";
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
      // Round-31 audit fix: optional Concierge levels-of-care
      // selected by the provider at the add-geo form. Stored in
      // subscription metadata so activateConciergePartner uses the
      // chosen levels instead of seeding all DEFAULT_LEVELS_OF_CARE.
      levels_of_care?: string[];
    };
    try { body = await req.json(); } catch { return json(400, { error: "Invalid JSON", code: "BAD_JSON" }); }

    const facilityId = String(body.facility_id ?? "").trim();
    const intent = String(body.intent ?? "").trim() as Intent;
    const billingPeriod = String(body.billing_period ?? "").trim() as Billing;
    const item0 = (body.items ?? [])[0];
    const product = String(item0?.product ?? "").trim() as Product;
    // Sanitize levels_of_care: array of alphanumeric+underscore-ish
    // tokens, ≤ 12 entries, ≤ 40 chars each. Stored as comma-joined
    // string in Stripe metadata (Stripe metadata values are strings,
    // 500-char max).
    const levelsOfCareArr = Array.isArray(body.levels_of_care)
      ? body.levels_of_care
          .filter((s) => typeof s === "string")
          .map((s) => s.trim().toLowerCase())
          .filter((s) => /^[a-z0-9_\-]{1,40}$/.test(s))
          .slice(0, 12)
      : [];
    const levelsOfCareCsv = levelsOfCareArr.length > 0 ? levelsOfCareArr.join(",") : null;

    if (!UUID_REGEX.test(facilityId)) return json(400, { error: "facility_id must be a valid UUID", code: "INVALID_FACILITY_ID" });
    if (intent !== "initial_subscription" && intent !== "add_addon") {
      return json(400, { error: "intent must be 'initial_subscription' or 'add_addon'", code: "INVALID_INTENT" });
    }
    if (billingPeriod !== "monthly" && billingPeriod !== "annual") {
      return json(400, { error: "billing_period must be 'monthly' or 'annual'", code: "INVALID_BILLING_PERIOD" });
    }
    if (intent === "initial_subscription" && product !== "pro") {
      return json(400, { error: "items[0].product must be 'pro' for initial_subscription", code: "INVALID_PRODUCT" });
    }
    if (intent === "add_addon" && product !== "featured" && product !== "concierge") {
      return json(400, { error: "items[0].product must be 'featured' or 'concierge' for add_addon", code: "INVALID_PRODUCT" });
    }

    const svc = createClient(SUPABASE_URL, SUPABASE_SRK);
    const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2025-08-27.basil" });

    // ---- Authorization: caller must own the facility. ----
    const { data: facility, error: facilityErr } = await svc
      .from("facilities")
      .select("id, user_id")
      .eq("id", facilityId)
      .maybeSingle();
    if (facilityErr) {
      log("ERROR", "facilities lookup failed", { error: facilityErr.message });
      return json(500, { error: "Internal error", code: "DB_ERROR" });
    }
    if (!facility) return json(404, { error: "Facility not found", code: "FACILITY_NOT_FOUND" });
    if ((facility as { user_id: string | null }).user_id !== userId) {
      return json(403, { error: "Not the owner of this facility", code: "NOT_OWNER" });
    }

    // ---- Subscription state lookup (intent-specific). ----
    const { data: facSub, error: facSubErr } = await svc
      .from("facility_subscriptions")
      .select("id, tier, status, has_featured, has_concierge_partner, stripe_customer_id, current_period_end")
      .eq("facility_id", facilityId)
      .maybeSingle();
    if (facSubErr) {
      log("ERROR", "facility_subscriptions lookup failed", { error: facSubErr.message });
      return json(500, { error: "Internal error", code: "DB_ERROR" });
    }
    const activePro =
      facSub &&
      (facSub as { tier: string | null }).tier === "pro" &&
      (facSub as { status: string }).status === "active";

    if (intent === "initial_subscription") {
      if (activePro) {
        return json(409, {
          error: "This facility already has an active Pro subscription.",
          code: "ALREADY_PRO",
        });
      }
    } else {
      // add_addon
      if (!facSub) {
        return json(409, {
          error: "This facility has no active subscription. Upgrade to Pro first.",
          code: "NO_SUBSCRIPTION",
        });
      }
      if (!activePro) {
        return json(409, {
          error: `${product[0].toUpperCase()}${product.slice(1)} requires an active Pro subscription.`,
          code: "PRO_REQUIRED",
        });
      }
      if (product === "featured" && (facSub as { has_featured: boolean }).has_featured === true) {
        return json(409, { error: "Featured is already active on this facility.", code: "ALREADY_ACTIVE" });
      }
      if (product === "concierge" && (facSub as { has_concierge_partner: boolean }).has_concierge_partner === true) {
        return json(409, { error: "Concierge is already active on this facility.", code: "ALREADY_ACTIVE" });
      }
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

    // ---- Resolve Stripe customer ----
    const storedCustomerId = facSub
      ? (facSub as { stripe_customer_id: string | null }).stripe_customer_id
      : null;
    let customerId = storedCustomerId ?? undefined;
    if (!customerId) {
      const customers = await stripe.customers.list({ email: userEmail, limit: 1 });
      customerId = customers.data[0]?.id;
    }
    // For initial_subscription on a brand-new account there may be no
    // Stripe customer yet; Stripe will create one inline at Checkout.

    // ---- Reuse open session within 30 min (single-flight). ----
    const reuseTag =
      intent === "initial_subscription" ? "pro_subscription" : `${product}_addon`;
    if (customerId) {
      const thirtyMinAgo = Math.floor((Date.now() - 30 * 60 * 1000) / 1000);
      const recentSessions = await stripe.checkout.sessions.list({
        customer: customerId,
        limit: 10,
        created: { gte: thirtyMinAgo },
      });
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
    }

    // ---- Build success / cancel URLs per intent. ----
    const origin = req.headers.get("origin") || "https://rehablookup.com";
    let successPath: string;
    let cancelPath: string;
    if (intent === "initial_subscription") {
      successPath = `/provider/billing?checkout=success&plan=pro&session_id={CHECKOUT_SESSION_ID}`;
      cancelPath = `/provider/billing?checkout=cancel`;
    } else if (product === "featured") {
      successPath = `/provider/billing/placements?addon=featured&checkout=success&session_id={CHECKOUT_SESSION_ID}`;
      cancelPath = `/provider/marketing/featured?checkout=cancel`;
    } else {
      successPath = `/provider/billing/concierge?addon=concierge&checkout=success&session_id={CHECKOUT_SESSION_ID}`;
      cancelPath = `/provider/marketing/concierge?checkout=cancel`;
    }

    const idempotencyKey = `create-checkout:${userId}:${facilityId}:${reuseTag}:${billingPeriod}:${Math.floor(Date.now() / (5 * 60 * 1000))}`;

    const checkoutMetadata = {
      type: reuseTag,
      facility_id: facilityId,
      provider_user_id: userId,
      billing_period: billingPeriod,
      // The webhook keys off plan_tier to know whether to call
      // activateProBenefits. Pro initial_subscription always tags this.
      ...(intent === "initial_subscription" ? { plan_tier: "pro" } : {}),
      // Round-31 fix: forward Concierge levels-of-care so the webhook
      // can seed concierge_partner_facilities with the user's chosen
      // levels rather than the broad DEFAULT.
      ...(product === "concierge" && levelsOfCareCsv ? { levels_of_care: levelsOfCareCsv } : {}),
    };

    const session = await stripe.checkout.sessions.create(
      {
        ...(customerId
          ? { customer: customerId, customer_update: { name: "auto", address: "auto" } }
          : { customer_email: userEmail }),
        mode: "subscription",
        payment_method_types: ["card"],
        billing_address_collection: "auto",
        line_items: [{ price: price.id, quantity: 1 }],
        success_url: `${origin}${successPath}`,
        cancel_url: `${origin}${cancelPath}`,
        metadata: checkoutMetadata,
        subscription_data: {
          metadata: checkoutMetadata,
        },
      },
      { idempotencyKey },
    );

    if (!session.url) {
      log("ERROR", "Stripe returned session without URL", { sessionId: session.id });
      return json(502, { error: "Stripe returned a malformed session", code: "STRIPE_BAD_RESPONSE" });
    }

    log("INFO", "Checkout session created", {
      sessionId: session.id,
      intent,
      product,
      billingPeriod,
    });
    return json(200, { url: session.url, sessionId: session.id });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log("ERROR", "Unhandled exception", { error: errorMessage });
    return json(500, { error: errorMessage, code: "UNHANDLED_EXCEPTION" });
  }
});
