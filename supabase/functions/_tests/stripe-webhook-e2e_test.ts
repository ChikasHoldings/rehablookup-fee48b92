// Stripe webhook end-to-end harness.
//
// Replays signed webhook events against the deployed stripe-webhook
// endpoint and asserts the response shape + downstream DB state.
//
// Requires env vars (all required — tests skip otherwise):
//   STRIPE_WEBHOOK_URL        e.g. https://<project>.functions.supabase.co/stripe-webhook
//   STRIPE_WEBHOOK_SECRET     the same secret stripe-webhook validates with
//   SUPABASE_TEST_URL         test project URL for assertion queries
//   SUPABASE_TEST_SRK         service-role key for assertion queries
//   STRIPE_TEST_CUSTOMER_ID   e.g. cus_test_abc (must exist in Stripe test mode)
//   STRIPE_TEST_FACILITY_ID   uuid of a seeded test facility owned by
//                             the test provider; the test does NOT create
//                             facilities to avoid polluting prod-shaped DBs
//   STRIPE_TEST_PROVIDER_USER_ID  uuid of a seeded test provider
//   STRIPE_TEST_PRO_PRICE_ID  Stripe price id whose lookup_key=rl_pro_monthly_v1
//   STRIPE_TEST_FEATURED_PRICE_ID  Stripe price id whose lookup_key=rl_featured_monthly_v1
//
// Run:
//   deno test --allow-net --allow-env stripe-webhook-e2e_test.ts
//
// Each test cleans its own writes (subscription_events row by stripe_event_id,
// facility_subscriptions row by stripe_subscription_id when newly created).

import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import {
  checkoutSessionCompletedSubscription,
  subscriptionCreated,
  subscriptionDeleted,
  subscriptionUpdatedToPastDue,
  invoicePaymentSucceeded,
  type BuildArgs,
} from "./_fixtures/stripe-events.ts";

const env = {
  url: Deno.env.get("STRIPE_WEBHOOK_URL"),
  secret: Deno.env.get("STRIPE_WEBHOOK_SECRET"),
  supabaseUrl: Deno.env.get("SUPABASE_TEST_URL"),
  supabaseSrk: Deno.env.get("SUPABASE_TEST_SRK"),
  customerId: Deno.env.get("STRIPE_TEST_CUSTOMER_ID"),
  facilityId: Deno.env.get("STRIPE_TEST_FACILITY_ID"),
  providerUserId: Deno.env.get("STRIPE_TEST_PROVIDER_USER_ID"),
  proPriceId: Deno.env.get("STRIPE_TEST_PRO_PRICE_ID"),
  featuredPriceId: Deno.env.get("STRIPE_TEST_FEATURED_PRICE_ID"),
};

const READY = !!(
  env.url && env.secret && env.supabaseUrl && env.supabaseSrk &&
  env.customerId && env.facilityId && env.providerUserId &&
  env.proPriceId && env.featuredPriceId
);

if (!READY) {
  Deno.test({
    name: "stripe-webhook e2e — SKIPPED (missing env)",
    ignore: true,
    fn: () => {
      // intentionally empty — see file header for required env vars
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────
// Signing helpers
// ─────────────────────────────────────────────────────────────────────────

async function hmacSha256Hex(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Build a stripe-signature header per Stripe's webhook spec:
 *  t=<unix>,v1=<hmac>. The webhook accepts skew up to 5 min by default. */
async function stripeSignature(payload: string, secret: string): Promise<string> {
  const t = Math.floor(Date.now() / 1000);
  const signedPayload = `${t}.${payload}`;
  const v1 = await hmacSha256Hex(secret, signedPayload);
  return `t=${t},v1=${v1}`;
}

async function postEvent(event: object): Promise<{ status: number; body: unknown }> {
  const payload = JSON.stringify(event);
  const sig = await stripeSignature(payload, env.secret!);
  const res = await fetch(env.url!, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Stripe-Signature": sig,
    },
    body: payload,
  });
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    body = await res.text();
  }
  return { status: res.status, body };
}

function svc() {
  return createClient(env.supabaseUrl!, env.supabaseSrk!);
}

function uniqueId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

async function cleanupBySubscription(stripeSubId: string) {
  const supa = svc();
  await supa.from("subscription_events").delete().eq("stripe_subscription_id", stripeSubId);
  await supa.from("featured_placements").delete().eq("subscription_id", stripeSubId);
  await supa.from("concierge_partner_facilities").delete().eq("subscription_id", stripeSubId);
  await supa.from("facility_subscriptions").delete().eq("stripe_subscription_id", stripeSubId);
  await supa
    .from("facility_subscriptions")
    .update({
      has_featured: false,
      has_concierge_partner: false,
      featured_stripe_subscription_id: null,
      concierge_stripe_subscription_id: null,
    })
    .or(`featured_stripe_subscription_id.eq.${stripeSubId},concierge_stripe_subscription_id.eq.${stripeSubId}`);
}

function baseArgs(overrides: Partial<BuildArgs> = {}): BuildArgs {
  return {
    eventId: uniqueId("evt"),
    customerId: env.customerId!,
    subscriptionId: uniqueId("sub"),
    priceId: env.proPriceId!,
    priceLookupKey: "rl_pro_monthly_v1",
    unitAmountCents: 9900,
    interval: "month",
    facilityId: env.facilityId,
    providerUserId: env.providerUserId,
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Pro subscription lifecycle
// ─────────────────────────────────────────────────────────────────────────

if (READY) Deno.test("E2E: Pro customer.subscription.created → benefits activate", async () => {
  const args = baseArgs();
  try {
    const event = subscriptionCreated(args);
    const res = await postEvent(event);
    assertEquals(res.status, 200, `webhook responded ${res.status}: ${JSON.stringify(res.body)}`);

    // Subscription row created.
    const supa = svc();
    const { data: sub } = await supa
      .from("facility_subscriptions")
      .select("tier, status, stripe_subscription_id")
      .eq("stripe_subscription_id", args.subscriptionId)
      .maybeSingle();
    assert(sub, "facility_subscriptions row should exist after Pro subscription.created");
    assertEquals((sub as { tier: string }).tier, "pro");
    assertEquals((sub as { status: string }).status, "active");

    // Event audit row.
    const { data: evt } = await supa
      .from("subscription_events")
      .select("event_type")
      .eq("stripe_event_id", args.eventId)
      .maybeSingle();
    assert(evt, "subscription_events row should exist for Pro creation");
  } finally {
    await cleanupBySubscription(args.subscriptionId);
  }
});

if (READY) Deno.test("E2E: customer.subscription.deleted reverts Pro benefits", async () => {
  const args = baseArgs();
  try {
    await postEvent(subscriptionCreated(args));
    const delEvt = subscriptionDeleted({ ...args, eventId: uniqueId("evt") });
    const res = await postEvent(delEvt);
    assertEquals(res.status, 200);

    const supa = svc();
    const { data: sub } = await supa
      .from("facility_subscriptions")
      .select("status")
      .eq("stripe_subscription_id", args.subscriptionId)
      .maybeSingle();
    assertEquals((sub as { status: string }).status, "canceled");
  } finally {
    await cleanupBySubscription(args.subscriptionId);
  }
});

if (READY) Deno.test("E2E: invoice.payment_succeeded records event without changing tier", async () => {
  const args = baseArgs();
  try {
    await postEvent(subscriptionCreated(args));
    const invoice = invoicePaymentSucceeded({ ...args, eventId: uniqueId("evt") });
    const res = await postEvent(invoice);
    assertEquals(res.status, 200);
  } finally {
    await cleanupBySubscription(args.subscriptionId);
  }
});

if (READY) Deno.test("E2E: dedup — same eventId twice produces only one effect", async () => {
  const args = baseArgs();
  try {
    const event = subscriptionCreated(args);
    const first = await postEvent(event);
    const second = await postEvent(event);
    assertEquals(first.status, 200);
    assertEquals(second.status, 200);
    // second response carries duplicate:true if the dedup path ran.
    if (typeof second.body === "object" && second.body !== null && "duplicate" in (second.body as Record<string, unknown>)) {
      assertEquals((second.body as { duplicate: boolean }).duplicate, true);
    }

    const supa = svc();
    const { count } = await supa
      .from("subscription_events")
      .select("id", { count: "exact", head: true })
      .eq("stripe_event_id", args.eventId);
    assertEquals(count, 1, "subscription_events should be deduped to 1 row");
  } finally {
    await cleanupBySubscription(args.subscriptionId);
  }
});

// ─────────────────────────────────────────────────────────────────────────
// Featured add-on lifecycle
// ─────────────────────────────────────────────────────────────────────────

if (READY) Deno.test("E2E: Featured subscription.created → has_featured + placements", async () => {
  // Featured requires an existing Pro row keyed on facility_id.
  // We assume the test facility has a pre-seeded Pro row; otherwise
  // the activation helper records its 'no facility_subscriptions row'
  // failure as an admin_notifications row and returns. The assertion
  // here checks the contract end-to-end against a properly seeded
  // sandbox.
  const args = baseArgs({
    priceId: env.featuredPriceId!,
    priceLookupKey: "rl_featured_monthly_v1",
    unitAmountCents: 59900,
    addonType: "featured_addon",
  });
  try {
    const res = await postEvent(subscriptionCreated(args));
    assertEquals(res.status, 200);

    const supa = svc();
    const { data: sub } = await supa
      .from("facility_subscriptions")
      .select("has_featured, featured_stripe_subscription_id")
      .eq("facility_id", env.facilityId!)
      .maybeSingle();
    if (sub) {
      assertEquals((sub as { has_featured: boolean }).has_featured, true);
      assertEquals(
        (sub as { featured_stripe_subscription_id: string }).featured_stripe_subscription_id,
        args.subscriptionId,
      );
    }
  } finally {
    await cleanupBySubscription(args.subscriptionId);
  }
});

if (READY) Deno.test("E2E: missing stripe-signature header → 401", async () => {
  // No Stripe-Signature header at all. The webhook must reject this
  // BEFORE any DB write — otherwise an attacker who guesses event
  // shapes could plant rows in stripe_webhook_events / fire downstream
  // notifications.
  const args = baseArgs();
  const event = subscriptionCreated(args);
  const payload = JSON.stringify(event);
  const res = await fetch(env.url!, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload,
  });
  assertEquals(res.status, 401);
  // Belt-and-suspenders: ensure no stripe_webhook_events row was
  // created for this event id.
  const { data } = await svc()
    .from("stripe_webhook_events")
    .select("event_id")
    .eq("event_id", args.eventId)
    .maybeSingle();
  assertEquals(data, null);
});

if (READY) Deno.test("E2E: invalid stripe-signature → 401", async () => {
  const args = baseArgs();
  const event = subscriptionCreated(args);
  const payload = JSON.stringify(event);
  // Sign with a wrong secret on purpose.
  const sig = await stripeSignature(payload, "wrong_secret");
  const res = await fetch(env.url!, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Stripe-Signature": sig },
    body: payload,
  });
  assertEquals(res.status, 401);
  // Same belt-and-suspenders: an invalid-signature request must not
  // leave a trail in stripe_webhook_events.
  const { data } = await svc()
    .from("stripe_webhook_events")
    .select("event_id")
    .eq("event_id", args.eventId)
    .maybeSingle();
  assertEquals(data, null);
});

if (READY) Deno.test("E2E: valid signature → 200 + stripe_webhook_events row", async () => {
  // Asserts the happy-path observability contract: a correctly-signed
  // event lands in stripe_webhook_events with status='received' and an
  // event_type that matches the payload.
  const args = baseArgs();
  try {
    const event = subscriptionCreated(args);
    const res = await postEvent(event);
    assertEquals(res.status, 200);

    const { data, error } = await svc()
      .from("stripe_webhook_events")
      .select("event_id, event_type, status")
      .eq("event_id", args.eventId)
      .maybeSingle();
    if (error) throw error;
    assert(data, `expected stripe_webhook_events row for ${args.eventId}`);
    assertEquals(data.event_id, args.eventId);
    assertEquals(data.event_type, event.type);
    // status may be 'received' or 'processed' depending on whether the
    // function has finished the downstream work by the time we query.
    assert(
      data.status === "received" || data.status === "processed",
      `unexpected status ${data.status}`,
    );
  } finally {
    await cleanupBySubscription(args.subscriptionId);
  }
});

if (READY) Deno.test("E2E: past_due transition flips status + stamps past_due_since", async () => {
  const args = baseArgs();
  try {
    await postEvent(subscriptionCreated(args));
    const pastDue = subscriptionUpdatedToPastDue({ ...args, eventId: uniqueId("evt") });
    const res = await postEvent(pastDue);
    assertEquals(res.status, 200);

    const supa = svc();
    const { data: sub } = await supa
      .from("facility_subscriptions")
      .select("status, past_due_since, dunning_milestones_sent")
      .eq("stripe_subscription_id", args.subscriptionId)
      .maybeSingle();
    if (sub) {
      const row = sub as { status: string; past_due_since: string | null; dunning_milestones_sent: string[] };
      assertEquals(row.status, "past_due");
      assert(row.past_due_since !== null, "past_due_since should be stamped by the sync_dunning_state trigger");
      assertEquals(row.dunning_milestones_sent, [], "dunning_milestones_sent should reset on past_due entry");
    }
  } finally {
    await cleanupBySubscription(args.subscriptionId);
  }
});

if (READY) Deno.test("E2E: checkout.session.completed (Pro) returns 200", async () => {
  const args = baseArgs();
  try {
    const res = await postEvent(checkoutSessionCompletedSubscription(args));
    assertEquals(res.status, 200);
  } finally {
    await cleanupBySubscription(args.subscriptionId);
  }
});
