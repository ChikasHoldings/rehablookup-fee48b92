/**
 * R5 — Cancelling Featured must not touch Pro (or Concierge state).
 *
 * Stage 1 audit, Finding 5: `provider-self-cancel-subscription` implements one
 * cancellation engine with three scopes — `all`, `addon-featured`,
 * `addon-concierge`. Stage 5 deletes only `addon-concierge`. The regression
 * risk is that the shared scaffolding (refund math, Stripe subscription stop,
 * placement deactivation, audit rows) is damaged while removing that scope,
 * silently breaking a paying Featured subscriber's cancellation or refund.
 *
 * Runs the REAL handler; Stripe and Supabase are recorders.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { loadEdgeFunction, setEdgeEnv, edgeRequest } from "./edge/loadEdgeFunction";
import { createFakeSupabase, type FakeSupabase } from "./edge/fakeSupabase";
import { __setCreateClient } from "./edge/stubs/supabase-js";
import { __setStripe } from "./edge/stubs/stripe";

const SUB_ROW_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const FACILITY_ID = "11111111-1111-4111-8111-111111111111";
const PROVIDER_ID = "99999999-9999-4999-8999-999999999999";

const PRO_STRIPE_SUB = "sub_pro_live";
const FEATURED_STRIPE_SUB = "sub_featured_live";
const CONCIERGE_STRIPE_SUB = "sub_concierge_live";

interface StripeRecorder {
  canceled: string[];
  updated: { id: string; params: unknown }[];
  refunds: { charge: string; amount: number }[];
  stripe: Record<string, unknown>;
}

function makeStripe(): StripeRecorder {
  const canceled: string[] = [];
  const updated: { id: string; params: unknown }[] = [];
  const refunds: { charge: string; amount: number }[] = [];

  const stripe = {
    subscriptions: {
      cancel: async (id: string) => {
        canceled.push(id);
        return { id, status: "canceled" };
      },
      update: async (id: string, params: unknown) => {
        updated.push({ id, params });
        return { id };
      },
      retrieve: async (id: string) => ({ id, status: "active" }),
    },
    invoices: {
      list: async ({ subscription }: { subscription: string }) => ({
        data: [
          {
            id: `in_${subscription}`,
            charge: `ch_${subscription}`,
            status: "paid",
            paid: true,
            amount_paid: 59900,
          },
        ],
      }),
    },
    refunds: {
      create: async ({ charge, amount }: { charge: string; amount: number }) => {
        refunds.push({ charge, amount });
        return { id: `re_${charge}`, amount };
      },
    },
  };

  return { canceled, updated, refunds, stripe };
}

/** Pro + Featured + Concierge all active, so we can prove scoping precisely. */
function subscriptionRow() {
  return {
    id: SUB_ROW_ID,
    facility_id: FACILITY_ID,
    provider_id: PROVIDER_ID,
    stripe_subscription_id: PRO_STRIPE_SUB,
    featured_stripe_subscription_id: FEATURED_STRIPE_SUB,
    concierge_stripe_subscription_id: CONCIERGE_STRIPE_SUB,
    stripe_customer_id: "cus_test",
    status: "active",
    tier: "pro",
    has_featured: true,
    has_concierge_partner: true,
    paid_amount_cents: 9900,
    price_cents: 9900,
    billing_period: "monthly",
    period_start: "2026-08-01T00:00:00Z",
    current_period_end: "2026-09-01T00:00:00Z",
    canceled_at: null,
  };
}

function makeDb(sub = subscriptionRow()): FakeSupabase {
  return createFakeSupabase({
    tables: {
      facility_subscriptions: [sub],
      featured_placements: [
        {
          id: "fp-1",
          facility_id: FACILITY_ID,
          subscription_id: SUB_ROW_ID,
          placement_type: "state",
          placement_value: "texas",
          active: true,
          deactivated_at: null,
        },
      ],
      concierge_partner_facilities: [
        {
          id: "cpf-1",
          facility_id: FACILITY_ID,
          subscription_id: SUB_ROW_ID,
          geo_state: "TX",
          geo_city: "Austin",
          active: true,
          deactivated_at: null,
        },
      ],
      subscription_cancellations: [],
      subscription_events: [],
      admin_notifications: [],
      provider_notifications: [],
    },
    authUser: { id: PROVIDER_ID, email: "owner@example.com" },
  });
}

async function cancel(db: FakeSupabase, stripe: Record<string, unknown>, scope: string) {
  __setCreateClient(() => db);
  __setStripe(stripe);
  const handler = await loadEdgeFunction("provider-self-cancel-subscription");
  const res = await handler(
    edgeRequest(
      { subscription_id: SUB_ROW_ID, scope },
      { headers: { Authorization: "Bearer test-token" } },
    ),
  );
  let json: Record<string, unknown> = {};
  try {
    json = (await res.json()) as Record<string, unknown>;
  } catch {
    /* ignore */
  }
  return { status: res.status, json };
}

function subAfter(db: FakeSupabase) {
  return db.tables.facility_subscriptions[0];
}

describe("R5 — addon-featured cancellation is correctly scoped", () => {
  beforeEach(() => {
    setEdgeEnv({
      SUPABASE_URL: "https://test.supabase.co",
      SUPABASE_ANON_KEY: "anon",
      SUPABASE_SERVICE_ROLE_KEY: "srk",
      STRIPE_SECRET_KEY: "sk_test_fake",
    });
  });

  afterEach(() => {
    __setCreateClient(null);
    __setStripe(null);
  });

  it("clears has_featured", async () => {
    const db = makeDb();
    const rec = makeStripe();
    const { status } = await cancel(db, rec.stripe, "addon-featured");

    expect(status).toBe(200);
    expect(subAfter(db).has_featured).toBe(false);
  });

  it("leaves Pro entirely intact", async () => {
    const db = makeDb();
    const rec = makeStripe();
    await cancel(db, rec.stripe, "addon-featured");

    const sub = subAfter(db);
    expect(sub.tier).toBe("pro");
    expect(sub.status).toBe("active");
    expect(sub.canceled_at).toBeNull();
    // The Pro Stripe subscription must never be touched by an add-on cancel.
    expect(rec.canceled).not.toContain(PRO_STRIPE_SUB);
    expect(rec.updated.map((u) => u.id)).not.toContain(PRO_STRIPE_SUB);
  });

  it("stops ONLY the Featured Stripe subscription", async () => {
    const db = makeDb();
    const rec = makeStripe();
    await cancel(db, rec.stripe, "addon-featured");

    expect(rec.canceled).toContain(FEATURED_STRIPE_SUB);
    expect(rec.canceled).not.toContain(CONCIERGE_STRIPE_SUB);
  });

  it("deactivates the facility's Featured placements", async () => {
    const db = makeDb();
    const rec = makeStripe();
    await cancel(db, rec.stripe, "addon-featured");

    const placement = db.tables.featured_placements[0];
    expect(placement.active).toBe(false);
    expect(placement.deactivated_at).toBeTruthy();
  });

  it("does not disturb Concierge state", async () => {
    // Until Stage 5 removes Concierge entirely, an addon-featured cancel must
    // leave it alone — and after removal this assertion is trivially safe.
    const db = makeDb();
    const rec = makeStripe();
    await cancel(db, rec.stripe, "addon-featured");

    expect(subAfter(db).has_concierge_partner).toBe(true);
    expect(db.tables.concierge_partner_facilities[0].active).toBe(true);
  });

  it("writes a scope-tagged cancellation audit row", async () => {
    const db = makeDb();
    const rec = makeStripe();
    await cancel(db, rec.stripe, "addon-featured");

    const rows = db.tables.subscription_cancellations;
    expect(rows).toHaveLength(1);
    expect(rows[0].reason).toBe("scope:featured");
    expect(rows[0].subscription_id).toBe(SUB_ROW_ID);
  });

  it("issues the exact annual Featured refund through the real cancellation path", async () => {
    // Annual Featured, $6,108.60 paid, cancelled 175 days in. Partial months
    // round UP, so 175/30 → 6 months used. 175 (not 180) keeps the test off
    // the rounding boundary, where a few ms of clock drift would tip it to 7.
    // Expected refund = 610860 − (6 × 59900) = 251460 ($2,514.60).
    // `src/test/subscription-math.test.ts` proves the formula in isolation;
    // this proves the CANCELLATION PATH actually applies it and refunds the
    // Featured charge — the part Stage 5 could break.
    const DAY = 24 * 60 * 60 * 1000;
    const periodStart = new Date(Date.now() - 175 * DAY);
    const periodEnd = new Date(periodStart.getTime() + 365 * DAY);
    const db = makeDb({
      ...subscriptionRow(),
      billing_period: "annual",
      paid_amount_cents: 610860,
      price_cents: 610860,
      period_start: periodStart.toISOString(),
      current_period_end: periodEnd.toISOString(),
    });
    const rec = makeStripe();
    await cancel(db, rec.stripe, "addon-featured");

    const audit = db.tables.subscription_cancellations[0];
    expect(audit.reason).toBe("scope:featured");
    expect(audit.refund_amount_cents).toBe(251460);

    expect(rec.refunds).toHaveLength(1);
    expect(rec.refunds[0].amount).toBe(251460);

    // ⚠️ CHARACTERIZED PRE-EXISTING DEFECT — not introduced by this stage and
    // deliberately NOT fixed here (Stage 1.5A adds coverage only).
    //
    // `refundOnePiece` resolves the refundable charge from
    // `subscription.stripe_subscription_id` — the PRO subscription — for every
    // scope, even though Featured bills on its own
    // `featured_stripe_subscription_id`. So the Featured refund is attempted
    // against the Pro invoice. Against real Stripe a $2,514.60 refund on a $99
    // Pro charge is rejected, and the code falls through to its
    // `subscription_refund_failed` admin-notification path — i.e. the provider
    // is not refunded automatically.
    //
    // Pinning it here so the behaviour is visible and a future fix is an
    // intentional, reviewed change rather than a silent one.
    expect(rec.refunds[0].charge).toBe(`ch_${PRO_STRIPE_SUB}`);
  });

  it("issues no refund on a monthly Featured cancellation (documented policy)", async () => {
    // Monthly is non-refundable by policy — the provider keeps the period they
    // paid for. Pinning this stops a refactor from silently starting to refund
    // (or from starting to charge) monthly Featured cancellations.
    const db = makeDb();
    const rec = makeStripe();
    await cancel(db, rec.stripe, "addon-featured");

    const audit = db.tables.subscription_cancellations[0];
    expect(audit.refund_amount_cents).toBe(0);
    expect(rec.refunds).toHaveLength(0);
  });

  it("is idempotent — a repeated addon-featured cancel does not double-refund", async () => {
    const db = makeDb();
    const rec = makeStripe();
    await cancel(db, rec.stripe, "addon-featured");
    const refundsAfterFirst = rec.refunds.length;
    const auditAfterFirst = db.tables.subscription_cancellations.length;

    await cancel(db, rec.stripe, "addon-featured");

    expect(rec.refunds).toHaveLength(refundsAfterFirst);
    expect(db.tables.subscription_cancellations).toHaveLength(auditAfterFirst);
  });

  it("scope=all still schedules the Pro cancellation (the shared engine keeps working)", async () => {
    // Monthly self-cancel defers to period end by design: the provider keeps
    // the access they already paid for and Stripe simply stops renewing. The
    // full teardown runs from the customer.subscription.deleted webhook.
    const db = makeDb();
    const rec = makeStripe();
    const { status } = await cancel(db, rec.stripe, "all");

    expect(status).toBe(200);
    const proUpdate = rec.updated.find((u) => u.id === PRO_STRIPE_SUB);
    expect(proUpdate).toBeDefined();
    expect(proUpdate?.params).toEqual({ cancel_at_period_end: true });
    expect(subAfter(db).cancel_at_period_end).toBe(true);
    // Nothing is torn down yet — access is retained until the period boundary.
    expect(subAfter(db).status).toBe("active");
    expect(db.tables.featured_placements[0].active).toBe(true);
  });

  it("scope=all also schedules the Featured add-on subscription to stop", async () => {
    const db = makeDb();
    const rec = makeStripe();
    await cancel(db, rec.stripe, "all");

    const featuredUpdate = rec.updated.find((u) => u.id === FEATURED_STRIPE_SUB);
    expect(featuredUpdate).toBeDefined();
    expect(featuredUpdate?.params).toEqual({ cancel_at_period_end: true });
  });

  it("rejects a cancel request from a non-owner", async () => {
    const db = createFakeSupabase({
      tables: {
        facility_subscriptions: [{ ...subscriptionRow(), provider_id: "someone-else" }],
        featured_placements: [],
        concierge_partner_facilities: [],
        subscription_cancellations: [],
        subscription_events: [],
        admin_notifications: [],
        provider_notifications: [],
      },
      authUser: { id: PROVIDER_ID, email: "owner@example.com" },
    });
    const rec = makeStripe();
    const { status } = await cancel(db, rec.stripe, "addon-featured");

    expect(status).toBe(403);
    expect(rec.canceled).toHaveLength(0);
  });

  it("rejects an unknown cancellation scope", async () => {
    const db = makeDb();
    const rec = makeStripe();
    const { status } = await cancel(db, rec.stripe, "addon-nonsense");

    expect(status).toBe(400);
    expect(rec.canceled).toHaveLength(0);
  });
});
