// switch-to-annual
// ─────────────────
// Provider-initiated upgrade from monthly billing to annual billing.
// Implements the "switch to annual" flow described in the monetization
// spec: end the current monthly subscription at its period_end (no
// refund — they used the month), then create a new annual subscription
// that starts immediately at the monthly period_end so there's no
// service gap.
//
// Step 1: stripe.subscriptions.update(current_sub, { cancel_at_period_end: true })
//   The monthly subscription rolls off at period_end. No partial-month
//   refund — the customer used the month they paid for.
//
// Step 2: stripe.subscriptions.create({
//           customer, items: [{ price: annual_price_id }, ...addons],
//           billing_cycle_anchor: monthly_period_end,
//           proration_behavior: 'none',
//         })
//   New annual subscription starts at the monthly period_end, so the
//   first annual charge happens then. proration_behavior:'none' means
//   no double-billing in the overlap window.
//
// Step 3: Re-tag any active featured_placements / concierge_partner_
//   facilities to the NEW subscription_id once the new sub is created.
//   Easier to do here (one transaction, while we have both IDs) than to
//   chase it from the webhook later.
//
// Annual → monthly is NOT supported mid-cycle. That path returns at
// renewal time (the renewal-reminder cron points users to /provider/
// billing where they can pick monthly for the next year).
//
// verify_jwt is enabled (true): the provider must be authenticated and
// must own the facility whose subscription is being switched.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2?target=denonext";
import Stripe from "https://esm.sh/stripe@18.5.0?target=denonext";
import { z } from "https://esm.sh/zod@3.23.8?target=denonext";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Lookup-key map — annual variants of each SKU. The current monthly
// subscription's items are mirrored against the equivalent annual
// price by matching the SKU portion of the lookup_key.
const MONTHLY_TO_ANNUAL_LOOKUP = {
  rl_pro_monthly_v1: "rl_pro_annual_v1",
  rl_featured_monthly_v1: "rl_featured_annual_v1",
  rl_concierge_monthly_v1: "rl_concierge_annual_v1",
} as const;

const RequestSchema = z.object({
  subscription_id: z.string().uuid(),
});

interface FacilitySubscriptionRow {
  id: string;
  facility_id: string;
  provider_id: string | null;
  stripe_subscription_id: string | null;
  stripe_customer_id: string | null;
  billing_period: "monthly" | "annual";
  status: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json", Allow: "POST, OPTIONS" } },
    );
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Auth: resolve the caller via the user-scoped client.
  const userClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } },
  );
  const { data: { user }, error: authError } = await userClient.auth.getUser();
  if (authError || !user) {
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

  const admin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

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

  // Load the facility_subscription row and confirm ownership.
  const { data: subRow, error: subErr } = await admin
    .from("facility_subscriptions")
    .select("id, facility_id, provider_id, stripe_subscription_id, stripe_customer_id, billing_period, status")
    .eq("id", parsed.data.subscription_id)
    .maybeSingle();
  if (subErr || !subRow) {
    return new Response(JSON.stringify({ error: "Subscription not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const sub = subRow as FacilitySubscriptionRow;

  if (sub.provider_id !== user.id) {
    return new Response(JSON.stringify({ error: "Not your subscription", code: "forbidden" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (sub.billing_period !== "monthly") {
    return new Response(
      JSON.stringify({
        error: "Only monthly subscriptions can switch to annual mid-cycle",
        code: "not_monthly",
      }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  if (sub.status !== "active") {
    return new Response(
      JSON.stringify({ error: "Subscription is not active", code: "not_active" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  if (!sub.stripe_subscription_id || !sub.stripe_customer_id) {
    return new Response(
      JSON.stringify({ error: "Subscription is missing Stripe linkage", code: "missing_stripe_link" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // Pull the live Stripe subscription so we know what add-ons to mirror
  // and when the current monthly period ends. period_end becomes the
  // billing_cycle_anchor for the new annual subscription.
  let monthlySub: Stripe.Subscription;
  try {
    monthlySub = await stripe.subscriptions.retrieve(sub.stripe_subscription_id, {
      expand: ["items.data.price"],
    });
  } catch (err) {
    console.error("[switch-to-annual] stripe.retrieve failed", err);
    return new Response(
      JSON.stringify({ error: "Failed to load Stripe subscription", code: "stripe_retrieve_failed" }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // Map current monthly items -> annual lookup keys.
  const annualLookupKeys: string[] = [];
  for (const item of monthlySub.items.data) {
    const monthlyKey = item.price.lookup_key as string | null;
    if (!monthlyKey) continue;
    const annualKey = MONTHLY_TO_ANNUAL_LOOKUP[monthlyKey as keyof typeof MONTHLY_TO_ANNUAL_LOOKUP];
    if (annualKey) annualLookupKeys.push(annualKey);
  }
  if (annualLookupKeys.length === 0) {
    return new Response(
      JSON.stringify({
        error: "Could not match any subscription items to annual prices",
        code: "no_matching_annual_prices",
      }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // Resolve annual price IDs from lookup_key.
  let annualPrices: Stripe.Price[];
  try {
    const priceList = await stripe.prices.list({
      lookup_keys: annualLookupKeys,
      active: true,
      limit: annualLookupKeys.length,
    });
    annualPrices = priceList.data;
  } catch (err) {
    console.error("[switch-to-annual] stripe.prices.list failed", err);
    return new Response(
      JSON.stringify({ error: "Failed to resolve annual prices", code: "stripe_price_lookup_failed" }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
  if (annualPrices.length !== annualLookupKeys.length) {
    return new Response(
      JSON.stringify({
        error: "Some annual prices are missing in Stripe",
        code: "missing_annual_prices",
        wanted: annualLookupKeys,
        found: annualPrices.map((p) => p.lookup_key),
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const monthlyPeriodEnd = monthlySub.current_period_end; // unix seconds

  // Step 1: cancel the monthly sub at period_end (no refund — they
  // used the month). cancel_at_period_end is idempotent on Stripe.
  try {
    await stripe.subscriptions.update(sub.stripe_subscription_id, {
      cancel_at_period_end: true,
      metadata: {
        ...(monthlySub.metadata ?? {}),
        switched_to_annual_at: new Date().toISOString(),
        switched_by_user_id: user.id,
      },
    });
  } catch (err) {
    console.error("[switch-to-annual] stripe.subscriptions.update failed", err);
    return new Response(
      JSON.stringify({ error: "Failed to schedule monthly cancellation", code: "stripe_update_failed" }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // Step 2: create the new annual subscription, anchored at the monthly
  // period_end so there's no service gap and no double-billing window.
  // proration_behavior:'none' makes the first invoice fire at the
  // billing_cycle_anchor, not now.
  let annualSub: Stripe.Subscription;
  try {
    annualSub = await stripe.subscriptions.create({
      customer: sub.stripe_customer_id,
      items: annualPrices.map((p) => ({ price: p.id })),
      billing_cycle_anchor: monthlyPeriodEnd,
      proration_behavior: "none",
      metadata: {
        switched_from_monthly_sub: sub.stripe_subscription_id,
        switched_by_user_id: user.id,
        facility_subscription_id: sub.id,
      },
    });
  } catch (err) {
    console.error("[switch-to-annual] stripe.subscriptions.create failed", err);
    // The monthly cancel-at-period-end is already set; the customer is
    // not in a worse spot than before — they'll still have monthly
    // through period_end. Surface the error so support can manually
    // create the annual sub or undo the cancellation.
    return new Response(
      JSON.stringify({
        error: "Failed to create the new annual subscription",
        code: "stripe_create_failed",
        recoverable: true,
        hint: "Monthly subscription is scheduled to cancel at period_end. Support can either re-enable it or manually create the annual sub.",
      }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // Step 3: Record a pending facility_subscriptions row for the new
  // annual subscription. We DON'T insert until the
  // customer.subscription.created webhook fires for the annual sub —
  // that's the single source of truth for "the subscription is live."
  // We just log the planned switch on the existing row + leave
  // featured_placements / concierge_partner_facilities alone so they
  // stay attached to the monthly sub until it actually rolls off.
  // The webhook will re-tag them to the new subscription_id when the
  // annual sub's `created` event arrives.
  await admin
    .from("facility_subscriptions")
    .update({
      cancel_at_period_end: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", sub.id);

  return new Response(
    JSON.stringify({
      ok: true,
      monthly_subscription_id: sub.stripe_subscription_id,
      monthly_period_end_unix: monthlyPeriodEnd,
      annual_subscription_id: annualSub.id,
      annual_lookup_keys: annualLookupKeys,
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
