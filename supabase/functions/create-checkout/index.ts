import Stripe from "https://esm.sh/stripe@18.5.0?target=denonext";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2?target=denonext";
import { PriceResolutionError, selectActivePriceId } from "../_shared/stripe-price.ts";

const VERSION = "1.0.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Pro monthly Stripe price is resolved by lookup_key at request time (not at
// module load) so the function automatically picks up price rotations.
// Resolution FAILS CLOSED — see resolveProPriceId: if the key does not map to
// exactly one active price, checkout errors out rather than charging a
// hardcoded fallback.
const PRO_LOOKUP_KEY = "rl_pro_monthly_v1";

// Legacy hardcoded Pro price id. Retained ONLY to recognize existing
// subscribers who are still billed on this price (so we correctly report
// "already on Pro" instead of trying to re-bill them). It is NEVER charged —
// checkout fails closed when the lookup key can't be resolved.
const LEGACY_PRO_PRICE_ID = "price_1Sel1C9fxdThyiakWLfgbl9K";

// Stripe mode (live/test) derived from the secret-key prefix, for safe
// diagnostic logging. Never logs the key itself.
function stripeModeFromKey(key: string): "live" | "test" | "unknown" {
  if (key.startsWith("sk_live_") || key.startsWith("rk_live_")) return "live";
  if (key.startsWith("sk_test_") || key.startsWith("rk_test_")) return "test";
  return "unknown";
}

// Resolve the active Pro monthly price by lookup_key. Throws
// PriceResolutionError (handled at the call site → controlled 503) when the
// key does not resolve to exactly one active price. There is no fallback.
async function resolveProPriceId(stripe: Stripe): Promise<string> {
  // limit:2 so selectActivePriceId can reject ambiguous duplicates, not just
  // a missing key.
  const found = await stripe.prices.list({
    lookup_keys: [PRO_LOOKUP_KEY],
    active: true,
    limit: 2,
  });
  return selectActivePriceId(found.data);
}

function isSameOrigin(candidate: unknown, origin: string): candidate is string {
  if (typeof candidate !== "string" || candidate.length === 0) return false;
  try {
    const u = new URL(candidate);
    const o = new URL(origin);
    return u.origin === o.origin;
  } catch {
    return false;
  }
}

const logStep = (requestId: string, step: string, details?: Record<string, unknown>) => {
  const timestamp = new Date().toISOString();
  console.log(`[CREATE-CHECKOUT] [${VERSION}] [${requestId}] [${timestamp}] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);
};

const generateRequestId = () => `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

Deno.serve(async (req) => {
  const requestId = generateRequestId();
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    logStep(requestId, "Function started");

    const { promoCode, action, facilityId, successUrl, cancelUrl } = await req.json();
    logStep(requestId, "Request received", { action, facilityId, promoCode: promoCode ? "provided" : "none", hasCustomUrls: !!(successUrl || cancelUrl) });

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep(requestId, "User authenticated", { userId: user.id, email: user.email });

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Resolve the active Pro price by lookup_key. FAILS CLOSED: if the
    // key doesn't resolve to exactly one active Stripe price we return a
    // controlled error instead of billing a hardcoded fallback — so a
    // missing/rotated/duplicated price can never silently charge the
    // wrong amount.
    let proPriceId: string;
    try {
      proPriceId = await resolveProPriceId(stripe);
    } catch (resolveErr) {
      const reason = resolveErr instanceof Error ? resolveErr.message : String(resolveErr);
      // Internal diagnostics only — no secrets. Stripe mode is derived
      // from the key prefix, never the key itself.
      logStep(requestId, "Pro price resolution FAILED — failing closed", {
        product: "pro",
        billingInterval: "monthly",
        lookupKey: PRO_LOOKUP_KEY,
        stripeMode: stripeModeFromKey(stripeKey),
        reason,
        failClosed: true,
      });
      const code = resolveErr instanceof PriceResolutionError
        ? resolveErr.code
        : "PRICE_RESOLUTION_FAILED";
      return new Response(
        JSON.stringify({
          error: "This plan is temporarily unavailable. Please contact support.",
          code,
          requestId,
          _version: VERSION,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 503 },
      );
    }
    logStep(requestId, "Pro price resolved", { proPriceId });

    // Check if customer exists
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string | undefined;
    let existingSubscription: Stripe.Subscription | null = null;

    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep(requestId, "Found existing customer", { customerId });

      // Single-flight guard against double-billing from tab duplicates.
      // If an open Checkout session for this user exists from the last
      // 30 minutes, return its URL instead of creating a new session.
      const thirtyMinAgo = Math.floor((Date.now() - 30 * 60 * 1000) / 1000);
      const recentSessions = await stripe.checkout.sessions.list({
        customer: customerId,
        limit: 5,
        created: { gte: thirtyMinAgo },
      });
      const openSession = recentSessions.data.find(
        (s) => s.status === "open" && s.mode === "subscription" && s.url,
      );
      if (openSession?.url) {
        logStep(requestId, "Reusing open Checkout session (single-flight)", {
          sessionId: openSession.id,
        });
        return new Response(
          JSON.stringify({ url: openSession.url, sessionId: openSession.id, requestId, reused: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
        );
      }

      // Check for existing active subscription
      const subscriptions = await stripe.subscriptions.list({
        customer: customerId,
        status: "active",
        limit: 1,
      });

      if (subscriptions.data.length > 0) {
        existingSubscription = subscriptions.data[0];
        logStep(requestId, "Found existing subscription", { 
          subscriptionId: existingSubscription.id,
          currentPriceId: existingSubscription.items.data[0]?.price.id
        });
      }
    }

    const origin = req.headers.get("origin") || "https://rehablookup.com";

    // If already has Pro subscription
    if (existingSubscription) {
      const currentPriceId = existingSubscription.items.data[0]?.price.id;
      
      // Already on Pro (current resolved price OR the legacy hardcoded
      // price some existing subscribers are still billed on).
      if (currentPriceId === proPriceId || currentPriceId === LEGACY_PRO_PRICE_ID) {
        return new Response(
          JSON.stringify({ error: "You are already on the Pro plan", alreadySubscribed: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }

      // Upgrading from legacy plan to Pro
      if (action === "upgrade") {
        logStep(requestId, "Updating existing subscription to Pro", {
          subscriptionId: existingSubscription.id,
          fromPrice: currentPriceId,
          toPrice: proPriceId,
        });

        await stripe.subscriptions.update(existingSubscription.id, {
          items: [{
            id: existingSubscription.items.data[0].id,
            price: proPriceId,
          }],
          proration_behavior: 'create_prorations',
          metadata: {
            user_id: user.id,
            plan: "pro",
            upgraded_at: new Date().toISOString(),
          },
        });

        logStep(requestId, "Subscription upgraded to Pro successfully");

        return new Response(
          JSON.stringify({ 
            success: true, 
            message: "Upgraded to Pro successfully",
            upgraded: true,
            requestId,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
        );
      }
    }

    // Look up promo code if provided
    let discounts: { promotion_code: string }[] | undefined;
    if (promoCode) {
      try {
        const promoCodes = await stripe.promotionCodes.list({
          code: promoCode.trim().toUpperCase(),
          active: true,
          limit: 1,
        });
        if (promoCodes.data.length > 0) {
          const promoCodeObj = promoCodes.data[0];
          discounts = [{ promotion_code: promoCodeObj.id }];
          logStep(requestId, "Promo code applied", { promoCodeId: promoCodeObj.id });
        } else {
          logStep(requestId, "Promo code not found or inactive", { promoCode });
        }
      } catch (promoErr) {
        logStep(requestId, "Error looking up promo code", { error: String(promoErr) });
      }
    }

    // Build checkout session config for Pro subscription
    const sessionConfig: Stripe.Checkout.SessionCreateParams = {
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      // Required for existing customers with tax_id_collection
      customer_update: customerId ? {
        name: "auto",
        address: "auto",
      } : undefined,
      billing_address_collection: "required",
      payment_method_types: ["card"],
      line_items: [
        {
          price: proPriceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      // Callers (e.g. /provider/onboarding wizard) can override these to
      // route the post-Checkout return into their own flow. We validate
      // overrides are same-origin to prevent open-redirect abuse.
      success_url: isSameOrigin(successUrl, origin)
        ? successUrl
        : `${origin}/provider/billing?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: isSameOrigin(cancelUrl, origin)
        ? cancelUrl
        : `${origin}/provider/billing?canceled=true`,
      metadata: {
        user_id: user.id,
        type: "pro_subscription",
        facility_id: facilityId || "",
        plan: "pro",
        plan_tier: "pro",
        plan_name: "Pro",
        // rl_pro_monthly_v1 resolves to a monthly Stripe price. Setting
        // billing_period explicitly so the webhook does NOT fall back to
        // its "annual" default when deriveTierFlagsFromSubscription
        // can't infer the interval from a lookup-key match.
        billing_period: "monthly",
      },
      subscription_data: {
        metadata: {
          user_id: user.id,
          type: "pro_subscription",
          facility_id: facilityId || "",
          plan: "pro",
          plan_tier: "pro",
          plan_name: "Pro",
          billing_period: "monthly",
          created_via: "checkout",
        },
      },
      // Custom text shown on the Stripe Checkout page. EKRA flat-fee
      // model: no per-lead unlocks, no per-placement charges. The Pro
      // plan unlocks verified badge, lead analytics, priority placement,
      // and Marketing Hub (Featured + Concierge add-ons).
      custom_text: {
        submit: {
          message: "Cancel anytime. Pro unlocks verified badge, lead analytics, priority placement, and the Marketing Hub.",
        },
      },
      // Allow tax ID collection for business customers
      tax_id_collection: {
        enabled: true,
      },
      // Phone number collection
      phone_number_collection: {
        enabled: true,
      },
    };

    // Apply discount if promo code was valid, otherwise allow manual entry
    if (discounts) {
      sessionConfig.discounts = discounts;
    } else {
      sessionConfig.allow_promotion_codes = true;
    }

    // Stripe-side idempotency key — bucketed per user per 5-minute window
    // so a network retry of the same Create-Session call always returns the
    // same session id (Stripe stores idempotency keys for 24 h). Combined
    // with the open-session reuse above this gives belt-and-braces
    // double-billing protection.
    const idempotencyBucket = Math.floor(Date.now() / (5 * 60 * 1000));
    const idempotencyKey = `create-checkout:${user.id}:${idempotencyBucket}`;
    const session = await stripe.checkout.sessions.create(sessionConfig, {
      idempotencyKey,
    });

    logStep(requestId, "Checkout session created", {
      sessionId: session.id,
      hasDiscount: !!discounts,
      idempotencyKey,
    });

    return new Response(JSON.stringify({ url: session.url, sessionId: session.id, requestId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep(requestId, "ERROR in create-checkout", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage, requestId, _version: VERSION }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
