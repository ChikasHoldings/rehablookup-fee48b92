/**
 * R4 — Featured checkout must survive removal of the Concierge branch.
 *
 * Stage 1 audit, Finding 4: `create-checkout-session` is a SINGLE edge
 * function serving Pro, Featured and Concierge. Stage 5 deletes only the
 * Concierge branch. The regression risk is that the file is deleted outright,
 * or that shared scaffolding (price lookup, customer resolution, metadata,
 * success URLs) is damaged while carving Concierge out.
 *
 * These tests invoke the REAL handler and assert on the exact arguments it
 * hands to Stripe. Only the Stripe SDK and Supabase client are doubles.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { loadEdgeFunction, setEdgeEnv, edgeRequest } from "./edge/loadEdgeFunction";
import { createFakeSupabase, type FakeSupabase } from "./edge/fakeSupabase";
import { __setCreateClient } from "./edge/stubs/supabase-js";
import { __setStripe } from "./edge/stubs/stripe";

const FACILITY_ID = "11111111-1111-4111-8111-111111111111";
const USER_ID = "99999999-9999-4999-8999-999999999999";
const USER_EMAIL = "owner@example.com";

const FEATURED_MONTHLY_PRICE = "price_featured_monthly_test";
const FEATURED_ANNUAL_PRICE = "price_featured_annual_test";
const PRO_MONTHLY_PRICE = "price_pro_monthly_test";

/** Prices the fake Stripe account knows about, keyed by lookup_key. */
const PRICE_BOOK: Record<string, string> = {
  rl_pro_monthly_v1: PRO_MONTHLY_PRICE,
  rl_featured_monthly_v1: FEATURED_MONTHLY_PRICE,
  rl_featured_annual_v1: FEATURED_ANNUAL_PRICE,
  // NOTE: no rl_concierge_* entries. If the Featured path ever reached for a
  // Concierge price this fixture would return PRICE_NOT_FOUND and fail.
};

interface StripeRecorder {
  priceListCalls: { lookup_keys: string[] }[];
  sessionCreateCalls: { params: Record<string, unknown>; opts: Record<string, unknown> }[];
  stripe: Record<string, unknown>;
}

function makeStripe(): StripeRecorder {
  const priceListCalls: { lookup_keys: string[] }[] = [];
  const sessionCreateCalls: { params: Record<string, unknown>; opts: Record<string, unknown> }[] = [];

  const stripe = {
    prices: {
      list: async (args: { lookup_keys: string[] }) => {
        priceListCalls.push(args);
        const id = PRICE_BOOK[args.lookup_keys[0]];
        return { data: id ? [{ id, lookup_key: args.lookup_keys[0], active: true }] : [] };
      },
    },
    customers: {
      list: async () => ({ data: [] }),
    },
    checkout: {
      sessions: {
        list: async () => ({ data: [] }),
        create: async (params: Record<string, unknown>, opts: Record<string, unknown>) => {
          sessionCreateCalls.push({ params, opts });
          return { id: "cs_test_123", url: "https://checkout.stripe.com/c/pay/cs_test_123" };
        },
      },
    },
    coupons: {
      retrieve: async () => ({ valid: true }),
    },
  };

  return { priceListCalls, sessionCreateCalls, stripe };
}

function makeDb(subscription: Record<string, unknown> | null): FakeSupabase {
  return createFakeSupabase({
    tables: {
      facilities: [{ id: FACILITY_ID, user_id: USER_ID, suspended: false }],
      facility_subscriptions: subscription ? [subscription] : [],
      promotions: [],
      admin_notifications: [],
    },
    authUser: { id: USER_ID, email: USER_EMAIL },
  });
}

/** An active-Pro facility that holds NO add-ons at all. */
function proOnlySubscription() {
  return {
    id: "sub-row-1",
    facility_id: FACILITY_ID,
    tier: "pro",
    status: "active",
    has_featured: false,
    has_concierge_partner: false,
    stripe_customer_id: null,
    current_period_end: "2027-01-01T00:00:00Z",
  };
}

async function callCheckout(
  db: FakeSupabase,
  stripe: Record<string, unknown>,
  body: Record<string, unknown>,
) {
  __setCreateClient(() => db);
  __setStripe(stripe);
  const handler = await loadEdgeFunction("create-checkout-session");
  const res = await handler(
    edgeRequest(body, {
      headers: { Authorization: "Bearer test-token", origin: "https://rehablookup.com" },
    }),
  );
  return { status: res.status, json: (await res.json()) as Record<string, unknown> };
}

describe("R4 — Featured add-on checkout works without any Concierge dependency", () => {
  beforeEach(() => {
    setEdgeEnv({
      SUPABASE_URL: "https://test.supabase.co",
      SUPABASE_ANON_KEY: "anon-key",
      SUPABASE_SERVICE_ROLE_KEY: "srk",
      STRIPE_SECRET_KEY: "sk_test_fake",
      // Deliberately NO STRIPE_PRICE_CONCIERGE_MONTHLY / _ANNUAL here:
      // the Featured path must not read them.
    });
  });

  afterEach(() => {
    __setCreateClient(null);
    __setStripe(null);
  });

  it("accepts intent=add_addon product=featured and returns a Checkout URL", async () => {
    const rec = makeStripe();
    const { status, json } = await callCheckout(makeDb(proOnlySubscription()), rec.stripe, {
      facility_id: FACILITY_ID,
      intent: "add_addon",
      billing_period: "monthly",
      items: [{ product: "featured" }],
    });

    expect(status).toBe(200);
    expect(json.url).toBe("https://checkout.stripe.com/c/pay/cs_test_123");
    expect(json.sessionId).toBe("cs_test_123");
  });

  it("resolves the Featured price by its own lookup key and never a Concierge key", async () => {
    const rec = makeStripe();
    await callCheckout(makeDb(proOnlySubscription()), rec.stripe, {
      facility_id: FACILITY_ID,
      intent: "add_addon",
      billing_period: "monthly",
      items: [{ product: "featured" }],
    });

    const requestedKeys = rec.priceListCalls.flatMap((c) => c.lookup_keys);
    expect(requestedKeys).toContain("rl_featured_monthly_v1");
    expect(requestedKeys.some((k) => k.includes("concierge"))).toBe(false);
  });

  it("resolves the annual Featured price when billing_period=annual", async () => {
    const rec = makeStripe();
    const { status } = await callCheckout(makeDb(proOnlySubscription()), rec.stripe, {
      facility_id: FACILITY_ID,
      intent: "add_addon",
      billing_period: "annual",
      items: [{ product: "featured" }],
    });

    expect(status).toBe(200);
    expect(rec.priceListCalls.flatMap((c) => c.lookup_keys)).toContain("rl_featured_annual_v1");
    expect(rec.sessionCreateCalls[0].params.line_items).toEqual([
      { price: FEATURED_ANNUAL_PRICE, quantity: 1 },
    ]);
  });

  it("builds the expected Stripe Checkout configuration for Featured", async () => {
    const rec = makeStripe();
    await callCheckout(makeDb(proOnlySubscription()), rec.stripe, {
      facility_id: FACILITY_ID,
      intent: "add_addon",
      billing_period: "monthly",
      items: [{ product: "featured" }],
    });

    expect(rec.sessionCreateCalls).toHaveLength(1);
    const { params } = rec.sessionCreateCalls[0];

    expect(params.mode).toBe("subscription");
    expect(params.line_items).toEqual([{ price: FEATURED_MONTHLY_PRICE, quantity: 1 }]);
    expect(params.customer_email).toBe(USER_EMAIL);
    expect(String(params.success_url)).toContain("/provider/marketing/featured");
    expect(String(params.success_url)).toContain("addon=featured");
    expect(String(params.cancel_url)).toContain("/provider/marketing/featured");
  });

  it("carries the facility/user metadata the webhook routes activation on", async () => {
    const rec = makeStripe();
    await callCheckout(makeDb(proOnlySubscription()), rec.stripe, {
      facility_id: FACILITY_ID,
      intent: "add_addon",
      billing_period: "monthly",
      items: [{ product: "featured" }],
    });

    const { params } = rec.sessionCreateCalls[0];
    const metadata = params.metadata as Record<string, unknown>;

    // `featured_addon` is the routing token stripe-webhook branches on.
    expect(metadata.type).toBe("featured_addon");
    expect(metadata.facility_id).toBe(FACILITY_ID);
    expect(metadata.user_id).toBe(USER_ID);
    expect(metadata.billing_period).toBe("monthly");
    // The subscription inherits the same metadata so subscription.created can route.
    expect((params.subscription_data as { metadata: unknown }).metadata).toEqual(metadata);
  });

  it("emits no Concierge-only metadata or custom_text on a Featured checkout", async () => {
    const rec = makeStripe();
    await callCheckout(makeDb(proOnlySubscription()), rec.stripe, {
      facility_id: FACILITY_ID,
      intent: "add_addon",
      billing_period: "monthly",
      items: [{ product: "featured" }],
      // Even if a client sends Concierge-shaped extras, Featured must ignore them.
      levels_of_care: ["detox", "iop"],
    });

    const { params } = rec.sessionCreateCalls[0];
    const metadata = params.metadata as Record<string, unknown>;

    expect(metadata.levels_of_care).toBeUndefined();
    expect(metadata.supersede_featured).toBeUndefined();
    expect(params.custom_text).toBeUndefined();
  });

  it("still enforces the Pro-required gate for Featured", async () => {
    const rec = makeStripe();
    const freeTierSub = { ...proOnlySubscription(), tier: null, status: "inactive" };
    const { status, json } = await callCheckout(makeDb(freeTierSub), rec.stripe, {
      facility_id: FACILITY_ID,
      intent: "add_addon",
      billing_period: "monthly",
      items: [{ product: "featured" }],
    });

    expect(status).toBe(409);
    expect(json.code).toBe("PRO_REQUIRED");
    expect(rec.sessionCreateCalls).toHaveLength(0);
  });

  it("still refuses a duplicate Featured purchase", async () => {
    const rec = makeStripe();
    const alreadyFeatured = { ...proOnlySubscription(), has_featured: true };
    const { status, json } = await callCheckout(makeDb(alreadyFeatured), rec.stripe, {
      facility_id: FACILITY_ID,
      intent: "add_addon",
      billing_period: "monthly",
      items: [{ product: "featured" }],
    });

    expect(status).toBe(409);
    expect(json.code).toBe("ALREADY_ACTIVE");
    expect(rec.sessionCreateCalls).toHaveLength(0);
  });

  it("still refuses checkout for a non-owner", async () => {
    const rec = makeStripe();
    const db = createFakeSupabase({
      tables: {
        facilities: [{ id: FACILITY_ID, user_id: "someone-else", suspended: false }],
        facility_subscriptions: [proOnlySubscription()],
        promotions: [],
        admin_notifications: [],
      },
      authUser: { id: USER_ID, email: USER_EMAIL },
    });
    const { status, json } = await callCheckout(db, rec.stripe, {
      facility_id: FACILITY_ID,
      intent: "add_addon",
      billing_period: "monthly",
      items: [{ product: "featured" }],
    });

    expect(status).toBe(403);
    expect(json.code).toBe("NOT_OWNER");
  });

  it("keeps the Pro initial_subscription path working from the same function", async () => {
    // Pro and Featured share this file; carving Concierge out must not
    // disturb the Pro branch either.
    const rec = makeStripe();
    const { status } = await callCheckout(makeDb(null), rec.stripe, {
      facility_id: FACILITY_ID,
      intent: "initial_subscription",
      billing_period: "monthly",
      items: [{ product: "pro" }],
    });

    expect(status).toBe(200);
    const metadata = rec.sessionCreateCalls[0].params.metadata as Record<string, unknown>;
    expect(metadata.type).toBe("pro_subscription");
    expect(metadata.plan_tier).toBe("pro");
    expect(rec.sessionCreateCalls[0].params.line_items).toEqual([
      { price: PRO_MONTHLY_PRICE, quantity: 1 },
    ]);
  });

  /**
   * TEMPORARY CHARACTERIZATION — delete with the Concierge branch in Stage 5.
   * Records that Concierge currently blocks a Featured purchase, so removing
   * Concierge should also remove this 409 path (Featured becomes purchasable
   * unconditionally for active-Pro facilities).
   */
  it("[characterization] Concierge currently blocks buying Featured (CONCIERGE_ACTIVE)", async () => {
    const rec = makeStripe();
    const conciergeSub = { ...proOnlySubscription(), has_concierge_partner: true };
    const { status, json } = await callCheckout(makeDb(conciergeSub), rec.stripe, {
      facility_id: FACILITY_ID,
      intent: "add_addon",
      billing_period: "monthly",
      items: [{ product: "featured" }],
    });

    expect(status).toBe(409);
    expect(json.code).toBe("CONCIERGE_ACTIVE");
  });
});
