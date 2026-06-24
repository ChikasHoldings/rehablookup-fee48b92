// create-signup-checkout
// ──────────────────────
// Stripe Checkout session creator for the facility signup flow.
// Distinct from `create-checkout` (the legacy upgrade-from-dashboard
// function) so signup intent is preserved end-to-end:
//   • success_url: /signup/complete?session_id={CHECKOUT_SESSION_ID}
//   • cancel_url:  /signup/subscription?retry=true
//   • metadata:    signup_flow=true, facility_id, billing_period, flow
//
// Resolves price IDs by lookup_key (rl_pro_monthly_v1 /
// rl_pro_annual_v1) rather than hardcoded IDs so the env stays
// consistent with scripts/stripe-setup-monetization.ts.
//
// verify_jwt = true. The caller must be authenticated and own (or have
// just created) the target facility.

import Stripe from "https://esm.sh/stripe@18.5.0?target=denonext";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2?target=denonext";
import { z } from "https://esm.sh/zod@3.23.8?target=denonext";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PRO_MONTHLY_KEY = "rl_pro_monthly_v1";
const PRO_ANNUAL_KEY = "rl_pro_annual_v1";

const RequestSchema = z.object({
  facility_id: z.string().uuid(),
  billing_period: z.enum(["monthly", "annual"]),
  /** 'new-listing' = self-listing; 'claim' = claiming a SAMHSA-imported record. */
  flow: z.enum(["new-listing", "claim"]).default("new-listing"),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json", Allow: "POST, OPTIONS" },
    });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const userClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } },
  );
  const { data: { user }, error: authErr } = await userClient.auth.getUser();
  if (authErr || !user?.email) {
    return new Response(JSON.stringify({ error: "Unauthorized", code: "auth_failed" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(
      JSON.stringify({ error: "Validation failed", issues: parsed.error.issues }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // Verify facility exists + the caller owns it. Service-role client so
  // RLS doesn't mask the check.
  const admin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );
  const { data: facility } = await admin
    .from("facilities")
    .select("id, user_id, name")
    .eq("id", parsed.data.facility_id)
    .maybeSingle();
  if (!facility) {
    return new Response(JSON.stringify({ error: "Facility not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (facility.user_id && facility.user_id !== user.id) {
    return new Response(JSON.stringify({ error: "Not your facility", code: "forbidden" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (!stripeKey) {
    return new Response(JSON.stringify({ error: "Stripe not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const stripe = new Stripe(stripeKey, {
    apiVersion: "2025-04-30.basil" as Stripe.LatestApiVersion,
  });

  // Resolve the Stripe price by lookup_key — single source of truth
  // shared with scripts/stripe-setup-monetization.ts.
  const lookupKey = parsed.data.billing_period === "monthly" ? PRO_MONTHLY_KEY : PRO_ANNUAL_KEY;
  let priceId: string;
  try {
    const prices = await stripe.prices.list({
      lookup_keys: [lookupKey],
      active: true,
      limit: 1,
    });
    if (prices.data.length === 0) {
      return new Response(
        JSON.stringify({
          error: `Stripe price for ${lookupKey} not found — run scripts/stripe-setup-monetization.ts`,
          code: "missing_price",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    priceId = prices.data[0].id;
  } catch (err) {
    console.error("[create-signup-checkout] stripe.prices.list failed", err);
    return new Response(
      JSON.stringify({ error: "Failed to resolve Stripe price", code: "stripe_lookup_failed" }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // Re-use existing Stripe customer if the user signed up before.
  let customerId: string | undefined;
  try {
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }
  } catch (err) {
    console.error("[create-signup-checkout] customer lookup failed", err);
  }

  const origin =
    req.headers.get("origin") ||
    Deno.env.get("PUBLIC_APP_URL") ||
    "https://rehablookup.com";

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/signup/complete?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/signup/subscription?retry=true`,
      // metadata — the webhook reads these to wire up the
      // facility_subscriptions row after payment succeeds.
      metadata: {
        signup_flow: "true",
        flow: parsed.data.flow,
        facility_id: parsed.data.facility_id,
        billing_period: parsed.data.billing_period,
        type: "pro_subscription",
        user_id: user.id,
      },
      subscription_data: {
        metadata: {
          signup_flow: "true",
          flow: parsed.data.flow,
          facility_id: parsed.data.facility_id,
          billing_period: parsed.data.billing_period,
        },
      },
    }, {
      // Prevent a double-submit / network retry during signup from creating two
      // live Pro subscriptions for the same facility: a stable 5-minute
      // idempotency key makes Stripe return the SAME Checkout Session on retry.
      idempotencyKey: `signup-checkout-${user.id}-${parsed.data.facility_id}-${Math.floor(Date.now() / 300000)}`,
    });

    return new Response(
      JSON.stringify({ ok: true, url: session.url, session_id: session.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[create-signup-checkout] checkout.sessions.create failed", err);
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : "Failed to create Stripe Checkout session",
        code: "stripe_create_failed",
      }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
