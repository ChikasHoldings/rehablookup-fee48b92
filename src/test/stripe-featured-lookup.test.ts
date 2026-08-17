/**
 * Stage-3 B2 — canonical Featured Stripe compatibility lookup.
 *
 * WHAT WAS WRONG
 * ──────────────
 * get-featured-facilities decided Featured eligibility with:
 *
 *     customers.list({ email, limit: 1 })
 *       → subscriptions.list({ customer, status: "active", limit: 1 })
 *       → subs.data[0].items.data[0].price.product
 *       → FEATURED_PRODUCT_IDS.includes(productId)
 *
 * Four defects, each of which DROPS a real Featured purchase:
 *
 *   1. a second, local definition of Pro/Featured identity;
 *   2. modern lookup-key Featured SKUs bill against products that list has
 *      never contained, so every modern Featured purchase read as "not
 *      Featured";
 *   3. Featured on a customer object other than the first returned for the
 *      email was invisible;
 *   4. Featured on a later subscription, or a later ITEM, was invisible — and
 *      a Pro item in position 0 actively masked it.
 *
 * These tests drive the REAL helper the Edge function imports, with a fake
 * structural Stripe client, so enumeration and classification are exercised
 * rather than re-implemented.
 */

import { describe, it, expect } from "vitest";

import {
  emailHasActiveFeaturedSubscription,
  subscriptionGrantsFeatured,
  type FeaturedLookupStripeClient,
  type StripeListPage,
} from "../../supabase/functions/_shared/stripe-featured-lookup";
import {
  LOOKUP_KEYS,
  LEGACY_FEATURED_PRODUCT_IDS,
  LEGACY_PRO_PRODUCT_IDS,
} from "../../supabase/functions/_shared/stripe-product-classification";

const EMAIL = "provider@example.com";

// The two live legacy Featured aliases, read from the canonical module so a
// change there cannot leave these tests asserting a stale contract.
const [LEGACY_FEATURED_ALIAS, LEGACY_FEATURED_REAL] = LEGACY_FEATURED_PRODUCT_IDS;
const [LEGACY_PRO_A, LEGACY_PRO_B] = LEGACY_PRO_PRODUCT_IDS;

type Item = {
  id?: string;
  price?: {
    lookup_key?: string | null;
    product?: unknown;
    unit_amount?: number | null;
    recurring?: { interval?: string | null } | null;
  } | null;
  quantity?: number | null;
};

type Sub = {
  id: string;
  items: { data: Item[]; has_more?: boolean };
  metadata?: Record<string, string> | null;
};

/** A subscription item on a modern lookup-key price. */
const keyItem = (id: string, lookup_key: string, interval: "month" | "year" = "month"): Item => ({
  id,
  price: { lookup_key, product: `prod_modern_${lookup_key}`, unit_amount: 9900, recurring: { interval } },
  quantity: 1,
});

/** A subscription item on a legacy keyless price, identified by product id. */
const productItem = (id: string, product: string): Item => ({
  id,
  price: { lookup_key: null, product, unit_amount: 39900, recurring: { interval: "month" } },
  quantity: 1,
});

const sub = (id: string, items: Item[], extra: Partial<Sub> = {}): Sub => ({
  id,
  items: { data: items, has_more: false },
  ...extra,
});

interface FakeCall {
  method: string;
  starting_after?: string;
  customer?: string;
  subscription?: string;
}

interface FakeSpec {
  customerPages?: StripeListPage<{ id: string }>[];
  subsByCustomer?: Record<string, StripeListPage<Sub>[]>;
  itemPagesBySub?: Record<string, StripeListPage<Item>[]>;
  throwOn?: { customers?: boolean; subscriptionsFor?: string[]; items?: boolean };
}

/**
 * Fake Stripe client that serves pages BY CURSOR.
 *
 * A page is returned only when `starting_after` equals the last id of the
 * preceding page. Code that ignores the cursor therefore re-reads page 0
 * forever and never observes a later page — which is exactly the regression
 * these tests must be able to catch.
 */
function makeStripe(spec: FakeSpec): { stripe: FeaturedLookupStripeClient; calls: FakeCall[] } {
  const calls: FakeCall[] = [];

  const serve = <T extends { id?: string }>(
    pages: StripeListPage<T>[],
    starting_after?: string,
  ): StripeListPage<T> => {
    if (!starting_after) return pages[0] ?? { data: [], has_more: false };
    const idx = pages.findIndex((p) => {
      const last = p.data[p.data.length - 1];
      return last && last.id === starting_after;
    });
    if (idx === -1 || idx + 1 >= pages.length) return { data: [], has_more: false };
    return pages[idx + 1];
  };

  const stripe: FeaturedLookupStripeClient = {
    customers: {
      list: (params) => {
        calls.push({ method: "customers.list", starting_after: params.starting_after });
        if (spec.throwOn?.customers) return Promise.reject(new Error("stripe down"));
        return Promise.resolve(serve(spec.customerPages ?? [], params.starting_after));
      },
    },
    subscriptions: {
      list: (params) => {
        calls.push({
          method: "subscriptions.list",
          customer: params.customer,
          starting_after: params.starting_after,
        });
        if (spec.throwOn?.subscriptionsFor?.includes(params.customer)) {
          return Promise.reject(new Error("stripe down"));
        }
        const pages = spec.subsByCustomer?.[params.customer] ?? [];
        return Promise.resolve(
          serve(pages as StripeListPage<Sub>[], params.starting_after) as never,
        );
      },
    },
    subscriptionItems: {
      list: (params) => {
        calls.push({
          method: "subscriptionItems.list",
          subscription: params.subscription,
          starting_after: params.starting_after,
        });
        if (spec.throwOn?.items) return Promise.reject(new Error("stripe down"));
        const pages = spec.itemPagesBySub?.[params.subscription] ?? [];
        return Promise.resolve(serve(pages, params.starting_after) as never);
      },
    },
  };

  return { stripe, calls };
}

/** Single customer, single active subscription carrying `items`. */
const oneSub = (items: Item[], extra: Partial<Sub> = {}) =>
  makeStripe({
    customerPages: [{ data: [{ id: "cus_1" }], has_more: false }],
    subsByCustomer: { cus_1: [{ data: [sub("sub_1", items, extra)], has_more: false }] },
  });

// ═══════════════════════════════════════════════════════════════════════════
// CLASSIFICATION — what does and does not grant Featured
// ═══════════════════════════════════════════════════════════════════════════
describe("Featured classification flows through the canonical classifier", () => {
  it("1. modern Featured MONTHLY lookup key → Featured", async () => {
    const { stripe } = oneSub([keyItem("si_1", LOOKUP_KEYS.FEATURED_MONTHLY, "month")]);
    await expect(emailHasActiveFeaturedSubscription(stripe, EMAIL)).resolves.toBe(true);
  });

  it("2. modern Featured ANNUAL lookup key → Featured", async () => {
    const { stripe } = oneSub([keyItem("si_1", LOOKUP_KEYS.FEATURED_ANNUAL, "year")]);
    await expect(emailHasActiveFeaturedSubscription(stripe, EMAIL)).resolves.toBe(true);
  });

  it("3. modern Pro MONTHLY lookup key → NOT Featured", async () => {
    const { stripe } = oneSub([keyItem("si_1", LOOKUP_KEYS.PRO_MONTHLY, "month")]);
    await expect(emailHasActiveFeaturedSubscription(stripe, EMAIL)).resolves.toBe(false);
  });

  it("4. modern Pro ANNUAL lookup key → NOT Featured", async () => {
    const { stripe } = oneSub([keyItem("si_1", LOOKUP_KEYS.PRO_ANNUAL, "year")]);
    await expect(emailHasActiveFeaturedSubscription(stripe, EMAIL)).resolves.toBe(false);
  });

  it("5. legacy Featured product → Featured", async () => {
    const { stripe } = oneSub([productItem("si_1", LEGACY_FEATURED_REAL)]);
    await expect(emailHasActiveFeaturedSubscription(stripe, EMAIL)).resolves.toBe(true);
  });

  it("6. defensive historical Featured alias → Featured, and never Pro", async () => {
    const { stripe } = oneSub([productItem("si_1", LEGACY_FEATURED_ALIAS)]);
    await expect(emailHasActiveFeaturedSubscription(stripe, EMAIL)).resolves.toBe(true);

    // The alias must classify as Featured and must NOT be a Pro product — the
    // exact confusion that let paid visibility become a Pro entitlement.
    expect(LEGACY_PRO_PRODUCT_IDS as readonly string[]).not.toContain(LEGACY_FEATURED_ALIAS);
    expect(
      subscriptionGrantsFeatured({ items: { data: [productItem("si_1", LEGACY_FEATURED_ALIAS)] } }),
    ).toBe(true);
  });

  it("7. legacy Pro products → NOT Featured", async () => {
    for (const proProduct of [LEGACY_PRO_A, LEGACY_PRO_B]) {
      const { stripe } = oneSub([productItem("si_1", proProduct)]);
      await expect(emailHasActiveFeaturedSubscription(stripe, EMAIL)).resolves.toBe(false);
    }
  });

  it("8. unknown product → NOT Featured", async () => {
    const { stripe } = oneSub([productItem("si_1", "prod_totally_unknown")]);
    await expect(emailHasActiveFeaturedSubscription(stripe, EMAIL)).resolves.toBe(false);
  });

  it("9. Concierge lookup key → NOT Featured", async () => {
    for (const key of [LOOKUP_KEYS.CONCIERGE_MONTHLY, LOOKUP_KEYS.CONCIERGE_ANNUAL]) {
      const { stripe } = oneSub([keyItem("si_1", key)]);
      await expect(emailHasActiveFeaturedSubscription(stripe, EMAIL)).resolves.toBe(false);
    }
  });

  it("10. Pro + Featured on the SAME subscription → Featured", async () => {
    const { stripe } = oneSub([
      keyItem("si_1", LOOKUP_KEYS.PRO_MONTHLY),
      keyItem("si_2", LOOKUP_KEYS.FEATURED_MONTHLY),
    ]);
    await expect(emailHasActiveFeaturedSubscription(stripe, EMAIL)).resolves.toBe(true);
  });

  it("11. Featured as the SECOND item → Featured (a Pro item cannot mask it)", async () => {
    const { stripe } = oneSub([
      productItem("si_1", LEGACY_PRO_A),
      productItem("si_2", LEGACY_FEATURED_REAL),
    ]);
    await expect(emailHasActiveFeaturedSubscription(stripe, EMAIL)).resolves.toBe(true);
  });

  it("12. unknown first item + Featured second item → Featured", async () => {
    const { stripe } = oneSub([
      productItem("si_1", "prod_totally_unknown"),
      keyItem("si_2", LOOKUP_KEYS.FEATURED_ANNUAL, "year"),
    ]);
    await expect(emailHasActiveFeaturedSubscription(stripe, EMAIL)).resolves.toBe(true);
  });

  it("metadata alone cannot invent Featured", async () => {
    const { stripe } = oneSub([keyItem("si_1", LOOKUP_KEYS.PRO_MONTHLY)], {
      metadata: { type: "featured_addon", plan: "featured", plan_tier: "featured" },
    });
    await expect(emailHasActiveFeaturedSubscription(stripe, EMAIL)).resolves.toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// ENUMERATION — nothing may be dropped by a narrowing read
// ═══════════════════════════════════════════════════════════════════════════
describe("Featured enumeration is complete across customers, subscriptions and items", () => {
  it("13. Featured on the SECOND matching customer → true", async () => {
    const { stripe } = makeStripe({
      customerPages: [{ data: [{ id: "cus_1" }, { id: "cus_2" }], has_more: false }],
      subsByCustomer: {
        cus_1: [{ data: [sub("sub_1", [keyItem("si_1", LOOKUP_KEYS.PRO_MONTHLY)])], has_more: false }],
        cus_2: [{ data: [sub("sub_2", [keyItem("si_2", LOOKUP_KEYS.FEATURED_MONTHLY)])], has_more: false }],
      },
    });
    await expect(emailHasActiveFeaturedSubscription(stripe, EMAIL)).resolves.toBe(true);
  });

  it("14. Featured on the SECOND active subscription → true", async () => {
    const { stripe } = makeStripe({
      customerPages: [{ data: [{ id: "cus_1" }], has_more: false }],
      subsByCustomer: {
        cus_1: [
          {
            data: [
              sub("sub_1", [keyItem("si_1", LOOKUP_KEYS.PRO_MONTHLY)]),
              sub("sub_2", [keyItem("si_2", LOOKUP_KEYS.FEATURED_MONTHLY)]),
            ],
            has_more: false,
          },
        ],
      },
    });
    await expect(emailHasActiveFeaturedSubscription(stripe, EMAIL)).resolves.toBe(true);
  });

  it("15. Featured on a LATER CUSTOMER PAGE → true", async () => {
    const { stripe, calls } = makeStripe({
      customerPages: [
        { data: [{ id: "cus_1" }], has_more: true },
        { data: [{ id: "cus_2" }], has_more: false },
      ],
      subsByCustomer: {
        cus_1: [{ data: [], has_more: false }],
        cus_2: [{ data: [sub("sub_2", [keyItem("si_2", LOOKUP_KEYS.FEATURED_MONTHLY)])], has_more: false }],
      },
    });
    await expect(emailHasActiveFeaturedSubscription(stripe, EMAIL)).resolves.toBe(true);
    // Page 2 was requested with the cursor advanced to page 1's last id.
    expect(calls).toContainEqual({ method: "customers.list", starting_after: "cus_1" });
  });

  it("16. Featured on a LATER SUBSCRIPTION PAGE → true", async () => {
    const { stripe, calls } = makeStripe({
      customerPages: [{ data: [{ id: "cus_1" }], has_more: false }],
      subsByCustomer: {
        cus_1: [
          { data: [sub("sub_1", [keyItem("si_1", LOOKUP_KEYS.PRO_MONTHLY)])], has_more: true },
          { data: [sub("sub_2", [keyItem("si_2", LOOKUP_KEYS.FEATURED_MONTHLY)])], has_more: false },
        ],
      },
    });
    await expect(emailHasActiveFeaturedSubscription(stripe, EMAIL)).resolves.toBe(true);
    expect(calls).toContainEqual({
      method: "subscriptions.list",
      customer: "cus_1",
      starting_after: "sub_1",
    });
  });

  it("17. embedded items has_more=true and Featured is on a later ITEM page → true", async () => {
    const { stripe, calls } = makeStripe({
      customerPages: [{ data: [{ id: "cus_1" }], has_more: false }],
      subsByCustomer: {
        cus_1: [
          {
            data: [
              {
                id: "sub_1",
                items: { data: [keyItem("si_1", LOOKUP_KEYS.PRO_MONTHLY)], has_more: true },
              },
            ],
            has_more: false,
          },
        ],
      },
      itemPagesBySub: {
        sub_1: [
          { data: [keyItem("si_1", LOOKUP_KEYS.PRO_MONTHLY)], has_more: true },
          { data: [keyItem("si_2", LOOKUP_KEYS.FEATURED_MONTHLY)], has_more: false },
        ],
      },
    });
    await expect(emailHasActiveFeaturedSubscription(stripe, EMAIL)).resolves.toBe(true);
    expect(calls).toContainEqual({
      method: "subscriptionItems.list",
      subscription: "sub_1",
      starting_after: "si_1",
    });
  });

  it("does NOT fetch extra item pages when the embedded items already prove Featured", async () => {
    const { stripe, calls } = makeStripe({
      customerPages: [{ data: [{ id: "cus_1" }], has_more: false }],
      subsByCustomer: {
        cus_1: [
          {
            data: [
              {
                id: "sub_1",
                items: { data: [keyItem("si_1", LOOKUP_KEYS.FEATURED_MONTHLY)], has_more: true },
              },
            ],
            has_more: false,
          },
        ],
      },
    });
    await expect(emailHasActiveFeaturedSubscription(stripe, EMAIL)).resolves.toBe(true);
    expect(calls.filter((c) => c.method === "subscriptionItems.list")).toHaveLength(0);
  });

  it("18. all pages exhausted with only Pro → false", async () => {
    const { stripe } = makeStripe({
      customerPages: [
        { data: [{ id: "cus_1" }], has_more: true },
        { data: [{ id: "cus_2" }], has_more: false },
      ],
      subsByCustomer: {
        cus_1: [
          { data: [sub("sub_1", [keyItem("si_1", LOOKUP_KEYS.PRO_MONTHLY)])], has_more: true },
          { data: [sub("sub_2", [productItem("si_2", LEGACY_PRO_B)])], has_more: false },
        ],
        cus_2: [{ data: [sub("sub_3", [keyItem("si_3", LOOKUP_KEYS.PRO_ANNUAL, "year")])], has_more: false }],
      },
    });
    await expect(emailHasActiveFeaturedSubscription(stripe, EMAIL)).resolves.toBe(false);
  });

  it("19. all pages exhausted with unknown products → false", async () => {
    const { stripe } = makeStripe({
      customerPages: [{ data: [{ id: "cus_1" }, { id: "cus_2" }], has_more: false }],
      subsByCustomer: {
        cus_1: [{ data: [sub("sub_1", [productItem("si_1", "prod_unknown_a")])], has_more: false }],
        cus_2: [{ data: [sub("sub_2", [productItem("si_2", "prod_unknown_b")])], has_more: false }],
      },
    });
    await expect(emailHasActiveFeaturedSubscription(stripe, EMAIL)).resolves.toBe(false);
  });

  it("20. Stripe read failure fails CLOSED and fabricates no entitlement", async () => {
    const stages: string[] = [];
    const { stripe } = makeStripe({ throwOn: { customers: true } });
    await expect(
      emailHasActiveFeaturedSubscription(stripe, EMAIL, {
        onError: (stage) => stages.push(stage),
      }),
    ).resolves.toBe(false);
    expect(stages).toContain("customers.list");
  });

  it("20b. a subscription-read failure does not hide a readable Featured customer", async () => {
    const { stripe } = makeStripe({
      customerPages: [{ data: [{ id: "cus_bad" }, { id: "cus_good" }], has_more: false }],
      subsByCustomer: {
        cus_good: [{ data: [sub("sub_2", [keyItem("si_2", LOOKUP_KEYS.FEATURED_MONTHLY)])], has_more: false }],
      },
      throwOn: { subscriptionsFor: ["cus_bad"] },
    });
    await expect(emailHasActiveFeaturedSubscription(stripe, EMAIL)).resolves.toBe(true);
  });

  it("20c. an item-page failure yields false rather than a fabricated Featured", async () => {
    const stages: string[] = [];
    const { stripe } = makeStripe({
      customerPages: [{ data: [{ id: "cus_1" }], has_more: false }],
      subsByCustomer: {
        cus_1: [
          {
            data: [
              {
                id: "sub_1",
                items: { data: [keyItem("si_1", LOOKUP_KEYS.PRO_MONTHLY)], has_more: true },
              },
            ],
            has_more: false,
          },
        ],
      },
      throwOn: { items: true },
    });
    await expect(
      emailHasActiveFeaturedSubscription(stripe, EMAIL, { onError: (s) => stages.push(s) }),
    ).resolves.toBe(false);
    expect(stages).toContain("subscription_items.list");
  });

  it("terminates instead of re-reading page 1 forever when the cursor cannot advance", async () => {
    // has_more is permanently true and the page's objects carry no id, so no
    // cursor can be formed. The loop must stop, not spin.
    const stripe: FeaturedLookupStripeClient = {
      customers: {
        list: () => Promise.resolve({ data: [{ id: "" } as { id: string }], has_more: true }),
      },
      subscriptions: { list: () => Promise.resolve({ data: [], has_more: false }) },
      subscriptionItems: { list: () => Promise.resolve({ data: [], has_more: false }) },
    };
    const stages: string[] = [];
    await expect(
      emailHasActiveFeaturedSubscription(stripe, EMAIL, { onError: (s) => stages.push(s) }),
    ).resolves.toBe(false);
    expect(stages).toContain("customers.list");
  });

  it("an empty email performs no Stripe call at all", async () => {
    const { stripe, calls } = makeStripe({});
    await expect(emailHasActiveFeaturedSubscription(stripe, "")).resolves.toBe(false);
    expect(calls).toHaveLength(0);
  });

  it("requests Stripe's maximum page size, never limit:1", async () => {
    const seen: number[] = [];
    const stripe: FeaturedLookupStripeClient = {
      customers: {
        list: (p) => {
          seen.push(p.limit);
          return Promise.resolve({ data: [{ id: "cus_1" }], has_more: false });
        },
      },
      subscriptions: {
        list: (p) => {
          seen.push(p.limit);
          return Promise.resolve({ data: [], has_more: false });
        },
      },
      subscriptionItems: { list: () => Promise.resolve({ data: [], has_more: false }) },
    };
    await emailHasActiveFeaturedSubscription(stripe, EMAIL);
    expect(seen.length).toBeGreaterThan(0);
    expect(seen.every((n) => n === 100)).toBe(true);
  });
});
