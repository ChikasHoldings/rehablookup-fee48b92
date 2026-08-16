/**
 * Stage-3 B1+B2 VERIFICATION HOTFIX #2 — legacy Featured is not Pro.
 *
 * WHAT WAS WRONG
 * ──────────────
 * The canonical webhook carried ONE product-id list, named PRO_PRODUCT_IDS,
 * that contained the two Professional products AND the two Featured products.
 * Every consumer read membership as "this is Pro":
 *
 *     if (productId && PRO_PRODUCT_IDS.includes(productId)) planTier = "pro";
 *
 * On customer.subscription.created that classification IS the entitlement
 * decision — `planTier === "pro" && subscriptionEntitled` calls
 * activateProBenefits(). So a Featured subscription that reached the legacy
 * product-id fallback (no `metadata.type='featured_addon'`, no Featured lookup
 * key) was granted Pro: profiles.plan='pro', and with a Pro row in
 * facility_subscriptions, has_active_pro() → public_facilities.is_pro → the
 * public facility phone and the Call CTA. Paid visibility became a trust and
 * product entitlement.
 *
 * WHY THIS FILE, AND NOT THE PREVIOUS TEST
 * ────────────────────────────────────────
 * Hotfix #1 shipped "a Stripe Featured product does not become Pro", but it
 * asserted against the downstream canonical projection while manually handing
 * it `is_pro: false`. That proves the projection respects its input. It cannot
 * fail while the webhook produces the wrong input, which is exactly the defect
 * that was live. These tests drive the REAL classifier — the same module the
 * Edge function imports and the generator inlines into the deployable
 * artifact — with Stripe-subscription-shaped fixtures, and then run its output
 * through the webhook's actual entitlement gate.
 */

import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import {
  LEGACY_PRO_PRODUCT_IDS,
  LEGACY_FEATURED_PRODUCT_IDS,
  LOOKUP_KEYS,
  classifyLegacyProduct,
  deriveTierFlagsFromSubscription,
  legacyProductPlanTier,
  planNameFromTierFlags,
  resolveSubscriptionPlan,
  type ClassifiableSubscription,
} from "../../supabase/functions/_shared/stripe-product-classification";

const ROOT = join(__dirname, "..", "..");
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8");
const stripJs = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");

// The product identities this contract is written against.
const PRO_1 = "prod_TbalLOPujTIoUe"; // legacy professional
const PRO_2 = "prod_Tbyz1bf6iYyzYd"; // professional
const FEATURED_1 = "prod_TbalOeJZA2ZoJl"; // legacy featured
const FEATURED_2 = "prod_TbyzJVNOQL71NN"; // featured

/** A Stripe subscription as the webhook receives it on customer.subscription.created. */
function subscription(opts: {
  productId?: string | null;
  lookupKey?: string | null;
  metadata?: Record<string, string> | null;
  interval?: "month" | "year";
  unitAmount?: number;
  extraItems?: { productId?: string | null; lookupKey?: string | null }[];
}): ClassifiableSubscription {
  const item = (o: { productId?: string | null; lookupKey?: string | null }) => ({
    price: {
      lookup_key: o.lookupKey ?? null,
      unit_amount: opts.unitAmount ?? 59900,
      // Stripe does not expand `product` on this event: it is a bare id string.
      product: o.productId ?? null,
      recurring: { interval: opts.interval ?? "month" },
    },
    quantity: 1,
  });
  return {
    items: {
      data: [
        item({ productId: opts.productId, lookupKey: opts.lookupKey }),
        ...(opts.extraItems ?? []).map(item),
      ],
    },
    metadata: opts.metadata ?? null,
  };
}

/**
 * The webhook's ACTUAL Pro-entitlement gate, transcribed from
 * customer.subscription.created:
 *
 *     const subscriptionEntitled =
 *       subscription.status === "active" || subscription.status === "trialing";
 *     if (profile?.user_id && planTier === "pro" && subscriptionEntitled) {
 *       const proResult = await activateProBenefits(supabaseAdmin, profile.user_id);
 *
 * Running the resolver's output through it is what makes "never Pro" a
 * statement about reachability rather than about a stored label.
 */
function wouldActivateProBenefits(
  sub: ClassifiableSubscription,
  status: string,
  productName: string | null = null,
): boolean {
  const plan = resolveSubscriptionPlan(sub, productName);
  const subscriptionEntitled = status === "active" || status === "trialing";
  const hasProfile = true; // the most permissive case: the provider IS resolvable
  return hasProfile && plan.planTier === "pro" && subscriptionEntitled;
}

// ═══════════════════════════════════════════════════════════════════════════
// The two product sets are disjoint — the root cause, asserted directly
// ═══════════════════════════════════════════════════════════════════════════

describe("legacy product sets", () => {
  it("Pro and Featured product ids do not overlap", () => {
    const pro = new Set<string>(LEGACY_PRO_PRODUCT_IDS);
    const intersection = LEGACY_FEATURED_PRODUCT_IDS.filter((id) => pro.has(id));
    expect(intersection).toEqual([]);
  });

  it("holds exactly the four known products, on the correct side", () => {
    expect([...LEGACY_PRO_PRODUCT_IDS].sort()).toEqual([PRO_1, PRO_2].sort());
    expect([...LEGACY_FEATURED_PRODUCT_IDS].sort()).toEqual([FEATURED_1, FEATURED_2].sort());
  });

  it("classifies each product as itself, and refuses to guess at unknown ones", () => {
    expect(classifyLegacyProduct(PRO_1)).toBe("pro");
    expect(classifyLegacyProduct(PRO_2)).toBe("pro");
    expect(classifyLegacyProduct(FEATURED_1)).toBe("featured");
    expect(classifyLegacyProduct(FEATURED_2)).toBe("featured");
    expect(classifyLegacyProduct("prod_somethingElse")).toBeNull();
    expect(classifyLegacyProduct(null)).toBeNull();
    expect(classifyLegacyProduct(undefined)).toBeNull();
    expect(classifyLegacyProduct("")).toBeNull();
  });

  it("only a Pro product can produce the Pro tier", () => {
    expect(legacyProductPlanTier(PRO_1)).toBe("pro");
    expect(legacyProductPlanTier(PRO_2)).toBe("pro");
    expect(legacyProductPlanTier(FEATURED_1)).toBeNull();
    expect(legacyProductPlanTier(FEATURED_2)).toBeNull();
    expect(legacyProductPlanTier("prod_unknown")).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// A + B — legacy Pro products, no metadata, still Pro
// ═══════════════════════════════════════════════════════════════════════════

describe("legacy Pro products are unchanged", () => {
  for (const [label, productId] of [
    ["A. legacy professional", PRO_1],
    ["B. professional", PRO_2],
  ] as const) {
    it(`${label} with NO metadata is classified Pro`, () => {
      const sub = subscription({ productId, metadata: null });
      const plan = resolveSubscriptionPlan(sub, "Professional");

      expect(plan.legacyClass).toBe("pro");
      expect(plan.planTier).toBe("pro");
      expect(plan.matchedNewLookupKeys).toBe(false);
      expect(plan.planName).toBe("Professional");
      expect(wouldActivateProBenefits(sub, "active", "Professional")).toBe(true);
    });

    it(`${label} still grants nothing before payment confirms (incomplete)`, () => {
      // Unchanged 2026-07-02 gate: Pro is not granted on an unpaid 3DS/SCA
      // subscription. Verified here so the classifier fix cannot be read as
      // having loosened it.
      const sub = subscription({ productId, metadata: null });
      expect(wouldActivateProBenefits(sub, "incomplete", "Professional")).toBe(false);
      expect(wouldActivateProBenefits(sub, "trialing", "Professional")).toBe(true);
    });
  }

  it("a legacy Pro subscription with metadata.type='pro_subscription' is still Pro", () => {
    // The metadata fallback exists for the legacy create-checkout PRO_PRICE_ID,
    // which carries no lookup_key. Narrowing it must not break that.
    const sub = subscription({
      productId: PRO_1,
      metadata: { type: "pro_subscription" },
    });
    expect(deriveTierFlagsFromSubscription(sub).tier).toBe("pro");
    expect(resolveSubscriptionPlan(sub).planTier).toBe("pro");
  });

  it("a subscription with NO product at all and pro metadata is still Pro", () => {
    // No recognised product either way, so the metadata claim is all there is.
    const sub = subscription({ productId: null, metadata: { plan_tier: "pro" } });
    expect(resolveSubscriptionPlan(sub).planTier).toBe("pro");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// C–G — a Featured product is never Pro, under EVERY metadata state
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Every metadata state a Featured subscription can arrive in. The contract is
 * that not one of them produces Pro — the modern marker, the absence of one,
 * and every wrong one, including metadata that explicitly claims Pro.
 */
const FEATURED_METADATA_STATES: { label: string; metadata: Record<string, string> | null }[] = [
  { label: "metadata.type='featured_addon' (modern add-on marker)", metadata: { type: "featured_addon" } },
  { label: "NO metadata at all", metadata: null },
  { label: "metadata present but no type key", metadata: { facility_id: "fac-1" } },
  { label: "empty metadata object", metadata: {} },
  { label: "unknown metadata.type", metadata: { type: "some_future_thing" } },
  { label: "malformed metadata.type (empty string)", metadata: { type: "" } },
  { label: "malformed metadata.type (whitespace)", metadata: { type: "   " } },
  { label: "MISLABELED metadata.type='pro_subscription'", metadata: { type: "pro_subscription" } },
  { label: "MISLABELED metadata.type='PRO_SUBSCRIPTION'", metadata: { type: "PRO_SUBSCRIPTION" } },
  { label: "MISLABELED metadata.plan_tier='pro'", metadata: { plan_tier: "pro" } },
  { label: "MISLABELED both pro markers", metadata: { type: "pro_subscription", plan_tier: "pro" } },
];

for (const [fixture, productId, name] of [
  ["C/E/G — Featured product #1 (legacy featured)", FEATURED_1, "Featured Listing"],
  ["D/F/G — Featured product #2 (featured)", FEATURED_2, "Featured"],
] as const) {
  describe(`${fixture} is never Pro`, () => {
    for (const state of FEATURED_METADATA_STATES) {
      it(`${state.label} → classified Featured, planTier is not "pro"`, () => {
        const sub = subscription({ productId, metadata: state.metadata });
        const plan = resolveSubscriptionPlan(sub, name);

        expect(plan.legacyClass).toBe("featured");
        expect(plan.planTier).not.toBe("pro");
        expect(plan.planTier).toBeNull();
      });

      it(`${state.label} → activateProBenefits is unreachable in every status`, () => {
        const sub = subscription({ productId, metadata: state.metadata });
        // Including the two statuses that ARE entitled for a real Pro product.
        for (const status of ["active", "trialing", "past_due", "incomplete", "canceled"]) {
          expect(wouldActivateProBenefits(sub, status, name)).toBe(false);
        }
      });

      it(`${state.label} → cannot produce tier='pro' or profiles.plan='pro'`, () => {
        // The two rows a Pro classification would write. Both are keyed off
        // planTier, so a null tier means neither is reachable — asserted on the
        // value the webhook actually stores in subscription_events.plan_tier
        // and gates facility_subscriptions.tier on.
        const sub = subscription({ productId, metadata: state.metadata });
        const plan = resolveSubscriptionPlan(sub, name);
        const storedPlanTier = plan.planTier; // → subscription_events.plan_tier
        expect(storedPlanTier).toBeNull();
        // facility_subscriptions.tier / profiles.plan are only written on the
        // Pro branch, whose sole condition is this value.
        expect(storedPlanTier === "pro").toBe(false);
      });
    }

    it("a mislabeled Featured subscription does not even derive a Pro tier flag", () => {
      // Guarding at the flag layer as well as the plan layer: the metadata
      // fallback inside deriveTierFlagsFromSubscription used to promote ANY
      // subscription claiming Pro in metadata, with no reference to what was
      // actually billed.
      const sub = subscription({ productId, metadata: { type: "pro_subscription" } });
      const flags = deriveTierFlagsFromSubscription(sub);
      expect(flags.tier).toBeNull();
      expect(flags.matched_new_lookup_keys).toBe(false);
    });
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// H + I — the modern lookup keys
// ═══════════════════════════════════════════════════════════════════════════

describe("H. new Pro lookup keys", () => {
  it("rl_pro_monthly_v1 → Pro, monthly", () => {
    const sub = subscription({
      productId: PRO_2,
      lookupKey: LOOKUP_KEYS.PRO_MONTHLY,
      interval: "month",
    });
    const plan = resolveSubscriptionPlan(sub);
    expect(plan.matchedNewLookupKeys).toBe(true);
    expect(plan.planTier).toBe("pro");
    expect(plan.planName).toBe("Pro (monthly)");
    expect(wouldActivateProBenefits(sub, "active")).toBe(true);
  });

  it("rl_pro_annual_v1 → Pro, annual", () => {
    const sub = subscription({
      productId: PRO_2,
      lookupKey: LOOKUP_KEYS.PRO_ANNUAL,
      interval: "year",
    });
    expect(resolveSubscriptionPlan(sub).planName).toBe("Pro (annual)");
    expect(resolveSubscriptionPlan(sub).planTier).toBe("pro");
  });
});

describe("I. new Featured lookup keys are Featured-only", () => {
  for (const [key, interval, expected] of [
    [LOOKUP_KEYS.FEATURED_MONTHLY, "month", "Featured (monthly)"],
    [LOOKUP_KEYS.FEATURED_ANNUAL, "year", "Featured (annual)"],
  ] as const) {
    it(`${key} → planTier is not "pro", labeled "${expected}"`, () => {
      const sub = subscription({
        productId: FEATURED_2,
        lookupKey: key,
        interval,
        metadata: { type: "featured_addon" },
      });
      const plan = resolveSubscriptionPlan(sub);

      expect(plan.matchedNewLookupKeys).toBe(true);
      expect(plan.planTier).not.toBe("pro");
      expect(plan.planTier).toBeNull();
      // THE LABEL DEFECT: a Featured-only purchase was announced to the audit
      // trail and to admins as "Pro + Featured".
      expect(plan.planName).toBe(expected);
      expect(plan.planName).not.toContain("Pro");
      expect(wouldActivateProBenefits(sub, "active")).toBe(false);
    });
  }

  it("a genuine Pro + Featured subscription is still labeled Pro + Featured", () => {
    // The combined state is real (one subscription, both items) and must keep
    // its truthful label — the fix is about not CLAIMING Pro, not about
    // erasing it where it was actually bought.
    const sub = subscription({
      productId: PRO_2,
      lookupKey: LOOKUP_KEYS.PRO_ANNUAL,
      interval: "year",
      extraItems: [{ productId: FEATURED_2, lookupKey: LOOKUP_KEYS.FEATURED_ANNUAL }],
    });
    const plan = resolveSubscriptionPlan(sub);
    expect(plan.planTier).toBe("pro");
    expect(plan.planName).toBe("Pro + Featured (annual)");
  });

  it("Concierge keeps superseding the Featured label", () => {
    expect(
      planNameFromTierFlags({
        tier: "pro",
        has_featured: true,
        has_concierge_partner: true,
        billing_period: "annual",
      }),
    ).toBe("Pro + Concierge (annual)");
    expect(
      planNameFromTierFlags({
        tier: null,
        has_featured: false,
        has_concierge_partner: true,
        billing_period: "monthly",
      }),
    ).toBe("Concierge (monthly)");
  });

  it("no flag combination invents a Pro label out of nothing", () => {
    expect(
      planNameFromTierFlags({
        tier: null,
        has_featured: false,
        has_concierge_partner: false,
        billing_period: null,
      }),
    ).toBe("Subscription (annual)");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// J — past_due Pro entitlement is untouched by this hotfix
// ═══════════════════════════════════════════════════════════════════════════

describe("J. past_due Pro behaviour is unchanged", () => {
  it("has_active_pro still grants the past_due dunning grace window", () => {
    const sql = read("supabase/migrations/20260829000100_has_active_pro_grace_for_past_due.sql");
    expect(sql).toMatch(/status\s*=\s*'past_due'/);
    expect(sql).toMatch(/tier\s*=\s*'pro'/);
  });

  it("this hotfix adds no migration, and none redefines has_active_pro", () => {
    // The two B1/B2 migrations are the newest in the tree and are explicitly
    // out of scope here; anything newer would be a silent contract change
    // arriving under a classification fix.
    const migrations = readdirSync(join(ROOT, "supabase/migrations"))
      .filter((f) => f.endsWith(".sql"))
      .sort();
    const newest = migrations[migrations.length - 1];
    expect(newest).toBe("20260901000100_ranking_weights_drop_pro_boost.sql");
    for (const name of ["20260901000000_public_facilities_plan_independent_verified.sql", newest]) {
      expect(read(`supabase/migrations/${name}`)).not.toMatch(
        /create\s+or\s+replace\s+function\s+(public\.)?has_active_pro/i,
      );
    }
  });

  it("the webhook still maps Stripe past_due onto the stored past_due status", () => {
    const code = stripJs(read("supabase/functions/stripe-webhook/entrypoint.ts"));
    expect(code).toMatch(/status\s*===\s*"past_due"\s*\?\s*"past_due"/);
    // and the recovery path re-asserts only the plan mirror.
    expect(code).toMatch(/previousStatus\s*===\s*"past_due"/);
  });

  it("a Featured product does not acquire Pro entitlement in the past_due window either", () => {
    for (const productId of [FEATURED_1, FEATURED_2]) {
      expect(wouldActivateProBenefits(subscription({ productId }), "past_due")).toBe(false);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// The deployable artifact carries the fix
// ═══════════════════════════════════════════════════════════════════════════

describe("the generated webhook is the one that ships", () => {
  const artifact = () => stripJs(read("supabase/functions/stripe-webhook/index.ts"));

  it("no constant named PRO_PRODUCT_IDS survives anywhere", () => {
    // The name itself was the defect: a list called PRO_PRODUCT_IDS that held
    // Featured products, read by every branch as a Pro predicate.
    // `LEGACY_PRO_PRODUCT_IDS` is the corrected, Featured-free set and is
    // deliberately not matched here.
    const bareProSet = /(?<!LEGACY_)PRO_PRODUCT_IDS/;
    expect(artifact()).not.toMatch(bareProSet);
    expect(stripJs(read("supabase/functions/stripe-webhook/entrypoint.ts"))).not.toMatch(
      bareProSet,
    );
  });

  it("neither Featured product id appears in the generated Pro set", () => {
    const code = artifact();
    const proSet = code.match(/LEGACY_PRO_PRODUCT_IDS\s*=\s*\[([\s\S]*?)\]/);
    expect(proSet).not.toBeNull();
    expect(proSet![1]).not.toContain(FEATURED_1);
    expect(proSet![1]).not.toContain(FEATURED_2);
    expect(proSet![1]).toContain(PRO_1);
    expect(proSet![1]).toContain(PRO_2);
  });

  it("the generated Featured set holds exactly the two Featured products", () => {
    const featuredSet = artifact().match(/LEGACY_FEATURED_PRODUCT_IDS\s*=\s*\[([\s\S]*?)\]/);
    expect(featuredSet).not.toBeNull();
    expect(featuredSet![1]).toContain(FEATURED_1);
    expect(featuredSet![1]).toContain(FEATURED_2);
    expect(featuredSet![1]).not.toContain(PRO_1);
    expect(featuredSet![1]).not.toContain(PRO_2);
  });

  it("has no product-id membership test outside the classifier", () => {
    // Any `SOMETHING_IDS.includes(productId) → pro` reintroduced elsewhere is
    // a second copy of the mapping this module exists to own.
    const code = artifact();
    const rogue = code.match(/_IDS\s*(?:as[^)]*)?\)?\.includes\([^)]*\)\s*\)?\s*(?:\{[^}]*)?planTier\s*=\s*"pro"/g);
    expect(rogue).toBeNull();
  });

  it("Pro benefits activation is still gated on planTier === \"pro\"", () => {
    const code = artifact();
    expect(code).toMatch(/planTier\s*===\s*"pro"\s*&&\s*subscriptionEntitled/);
  });

  it("the legacy Featured fallback reaches a reconciliation signal, not Pro", () => {
    const code = artifact();
    expect(code).toMatch(/legacyClass\s*===\s*"featured"/);
    expect(code).toContain("legacy_featured_subscription_unresolved");
    expect(code).toContain("activateFeaturedAddon");
  });
});
