// ============================================================================
// Legacy Stripe product classification — single source of truth.
//
// WHY THIS MODULE EXISTS
// ──────────────────────
// The webhook used to carry ONE list called PRO_PRODUCT_IDS that contained
// four product ids: the two Professional products AND the two Featured
// products. Every consumer of that list read membership as "this is Pro":
//
//     if (productId && PRO_PRODUCT_IDS.includes(productId)) planTier = "pro";
//
// So a Featured subscription that reached the legacy product-id fallback —
// any subscription without the modern `metadata.type='featured_addon'` marker
// or a Featured lookup key — was classified `planTier = "pro"`, and on the
// customer.subscription.created path that classification is the entitlement
// decision: `planTier === "pro" && subscriptionEntitled` calls
// activateProBenefits(). Paid visibility became a Pro entitlement.
//
// Under the Stage-3 directory contract the two product families are disjoint
// and mean different things:
//
//   PRO       $99/mo product tier. Buys product FEATURES: the public facility
//             phone + Call CTA, enhanced-profile media, the raised photo cap,
//             provider analytics.
//
//   FEATURED  Paid VISIBILITY only, in a clearly labeled rail. It buys no
//             trust, no verification, no organic ranking advantage, no public
//             phone, and no Pro entitlement of any kind.
//
// A Featured product must therefore NEVER resolve to Pro — under any metadata
// state, including missing, stale, or malformed metadata. That is a property
// of this classifier, not of the caller: callers ask what a product IS and are
// given one of three answers, so no call site can reinvent the mapping.
//
// This module is pure and dependency-free. It is inlined into the deployable
// webhook by scripts/inline-stripe-webhook-shared.py and imported directly by
// the Vitest suite, so the classification the tests exercise is the same code
// the Edge function runs.
// ============================================================================

/**
 * Products that are the $99/mo Pro tier. Membership here — and ONLY here —
 * may produce `planTier = "pro"`.
 */
export const LEGACY_PRO_PRODUCT_IDS = [
  "prod_TbalLOPujTIoUe", // legacy professional
  "prod_Tbyz1bf6iYyzYd", // professional
] as const;

/**
 * Products that are paid Featured visibility. Membership here must never
 * produce a Pro tier, Pro benefits, `facility_subscriptions.tier='pro'`,
 * `profiles.plan='pro'`, or `public_facilities.is_pro=true`.
 */
export const LEGACY_FEATURED_PRODUCT_IDS = [
  "prod_TbalOeJZA2ZoJl", // legacy featured
  "prod_TbyzJVNOQL71NN", // featured
] as const;

/**
 * What a legacy Stripe product IS. `null` means "not a product this contract
 * recognises" — an unknown product is never assumed to be Pro.
 */
export type LegacyProductClass = "pro" | "featured" | null;

/**
 * Classify a Stripe product id. The two recognised sets are disjoint by
 * construction (asserted in the tests and at build time by
 * scripts/check-stripe-webhook-inline.mjs), so this is total and unambiguous.
 */
export function classifyLegacyProduct(
  productId: string | null | undefined,
): LegacyProductClass {
  if (!productId) return null;
  if ((LEGACY_PRO_PRODUCT_IDS as readonly string[]).includes(productId)) return "pro";
  if ((LEGACY_FEATURED_PRODUCT_IDS as readonly string[]).includes(productId)) return "featured";
  return null;
}

/**
 * The plan tier a legacy product id may grant. Fail-closed: everything that is
 * not a recognised Pro product — Featured, unknown, absent — returns null.
 *
 * This is the only expression in the webhook allowed to derive `"pro"` from a
 * product id. Call sites must not re-test set membership themselves.
 */
export function legacyProductPlanTier(
  productId: string | null | undefined,
): "pro" | null {
  return classifyLegacyProduct(productId) === "pro" ? "pro" : null;
}

/** Read a product id off a Stripe price whose `product` may be an id or an object. */
export function productIdFromPriceProduct(
  product: unknown,
): string | null {
  if (typeof product === "string") return product || null;
  if (product && typeof product === "object") {
    const id = (product as { id?: unknown }).id;
    if (typeof id === "string" && id) return id;
  }
  return null;
}

/**
 * Classify every product referenced by a subscription's items.
 *
 * A subscription can legitimately carry more than one item (Pro + an add-on on
 * a single subscription), so a single-item read of `items.data[0]` is not a
 * safe basis for suppressing or granting Pro. Callers get both facts.
 */
export function classifySubscriptionProducts(
  items: ReadonlyArray<{ price?: { product?: unknown } | null } | null | undefined>,
): { hasLegacyProProduct: boolean; hasLegacyFeaturedProduct: boolean } {
  let hasLegacyProProduct = false;
  let hasLegacyFeaturedProduct = false;
  for (const item of items ?? []) {
    const cls = classifyLegacyProduct(productIdFromPriceProduct(item?.price?.product));
    if (cls === "pro") hasLegacyProProduct = true;
    if (cls === "featured") hasLegacyFeaturedProduct = true;
  }
  return { hasLegacyProProduct, hasLegacyFeaturedProduct };
}

// ── Modern flat-fee monetization lookup keys ───────────────────────────────
//
// Created by scripts/stripe-setup-monetization.ts. Six keys = three SKUs ×
// two billing intervals. The webhook resolves both billing_period and the
// tier/addon flags from the lookup_key + price.recurring.interval.
export const LOOKUP_KEYS = {
  PRO_MONTHLY: "rl_pro_monthly_v1",
  PRO_ANNUAL: "rl_pro_annual_v1",
  FEATURED_MONTHLY: "rl_featured_monthly_v1",
  FEATURED_ANNUAL: "rl_featured_annual_v1",
  CONCIERGE_MONTHLY: "rl_concierge_monthly_v1",
  CONCIERGE_ANNUAL: "rl_concierge_annual_v1",
} as const;

export const PRO_KEYS = [LOOKUP_KEYS.PRO_MONTHLY, LOOKUP_KEYS.PRO_ANNUAL] as const;
export const FEATURED_KEYS = [LOOKUP_KEYS.FEATURED_MONTHLY, LOOKUP_KEYS.FEATURED_ANNUAL] as const;
export const CONCIERGE_KEYS = [LOOKUP_KEYS.CONCIERGE_MONTHLY, LOOKUP_KEYS.CONCIERGE_ANNUAL] as const;

/**
 * Per-tier full monthly rates in cents. Used both to compute the
 * monthly_equivalent for cancellation math AND, on annual subscriptions, to
 * reconstruct original_annual_cents + discount_applied_cents.
 */
export const FULL_MONTHLY_CENTS = {
  pro: 9900,        // $99
  featured: 59900,  // $599
  concierge: 100000, // $1,000
} as const;

/**
 * Structural shape of the parts of a Stripe subscription this module reads.
 *
 * Deliberately structural rather than `Stripe.Subscription`: keeping this
 * module free of the esm.sh Stripe import is what lets the Vitest suite import
 * it directly, so the classification the tests drive is the same code the Edge
 * function runs — not a re-implementation that can drift from it. A real
 * `Stripe.Subscription` satisfies this shape.
 */
export interface ClassifiableSubscriptionItem {
  price?: {
    lookup_key?: string | null;
    unit_amount?: number | null;
    recurring?: { interval?: string | null } | null;
    product?: unknown;
  } | null;
  quantity?: number | null;
}

export interface ClassifiableSubscription {
  items: { data: ReadonlyArray<ClassifiableSubscriptionItem> };
  metadata?: Record<string, string> | null;
}

export interface TierFlags {
  tier: "pro" | null;
  has_featured: boolean;
  has_concierge_partner: boolean;
  billing_period: "monthly" | "annual" | null;
  paid_amount_cents: number;
  original_annual_cents: number | null;
  discount_applied_cents: number;
  matched_new_lookup_keys: boolean;
}

/**
 * Inspect a Stripe subscription's items and return:
 *   - tier:                "pro" if any item matches a Pro lookup key
 *   - has_featured:        true if any item matches a Featured key
 *   - has_concierge_partner: true if any item matches a Concierge key
 *   - billing_period:      "monthly" | "annual" — inferred from the FIRST
 *                          matched item's recurring.interval. All items
 *                          on the same subscription share one interval
 *                          (Stripe requires this for a single subscription).
 *   - paid_amount_cents:   sum of unit_amount × quantity across all items
 *                          (= what Stripe just charged this period)
 *   - original_annual_cents: for annual subscriptions, the un-discounted
 *                            yearly sticker (full_monthly × 12 × pieces).
 *                            null for monthly.
 *   - discount_applied_cents: for annual, original − paid (≈15%). 0 for monthly.
 * Falls through to {tier:null, matched_new_lookup_keys:false} if no new
 * lookup keys are present (legacy subscriptions still flow through the
 * older product-id path in the webhook's event handlers).
 */
export function deriveTierFlagsFromSubscription(sub: ClassifiableSubscription): TierFlags {
  let isPro = false;
  let hasFeatured = false;
  let hasConcierge = false;
  let paidAmountCents = 0;
  let interval: "month" | "year" | null = null;
  for (const item of sub.items.data) {
    const lookupKey = item?.price?.lookup_key ?? null;
    const itemInterval = item?.price?.recurring?.interval as "month" | "year" | undefined;
    if (lookupKey && (PRO_KEYS as readonly string[]).includes(lookupKey)) isPro = true;
    if (lookupKey && (FEATURED_KEYS as readonly string[]).includes(lookupKey)) hasFeatured = true;
    if (lookupKey && (CONCIERGE_KEYS as readonly string[]).includes(lookupKey)) hasConcierge = true;
    // Take the first available recurring interval, regardless of whether
    // the price carries one of our flat-fee lookup keys. Legacy Pro
    // subscriptions (created via create-checkout's hardcoded
    // PRO_PRICE_ID, which has no lookup_key) still need to record their
    // billing_period — otherwise the caller's fallback "annual" default
    // mis-classifies a monthly Pro subscription. Also picks up future
    // price rotations where we forgot to attach a lookup_key.
    if (interval === null && itemInterval) {
      interval = itemInterval;
    }
    paidAmountCents += (item?.price?.unit_amount ?? 0) * (item?.quantity ?? 1);
  }
  // Fall back: if the checkout metadata tagged this as a Pro subscription but
  // no lookup_key matched (legacy create-checkout path), treat the whole
  // subscription as Pro.
  //
  // Metadata is operator-/integration-supplied and can be stale or wrong; the
  // product id is what Stripe actually billed. So the fallback is REFUSED when
  // every recognised product on the subscription is FEATURED and no Pro
  // product or Pro lookup key is present. Without that guard a Featured
  // subscription carrying `metadata.type='pro_subscription'` — a mislabeled or
  // copy-pasted legacy checkout — would be promoted to Pro on a metadata claim
  // alone, and on customer.subscription.created that promotion IS the
  // entitlement decision. A genuine legacy Pro subscription classifies as
  // "pro" here and is untouched.
  const metaType = (sub.metadata?.type ?? "").toLowerCase();
  const metaPlanTier = (sub.metadata?.plan_tier ?? "").toLowerCase();
  const productClasses = classifySubscriptionProducts(sub.items.data);
  const featuredOnlyProducts =
    productClasses.hasLegacyFeaturedProduct && !productClasses.hasLegacyProProduct;
  if (!isPro && (metaType === "pro_subscription" || metaPlanTier === "pro") && !featuredOnlyProducts) {
    isPro = true;
  }
  const billingPeriod: "monthly" | "annual" | null =
    interval === "month" ? "monthly" : interval === "year" ? "annual" : null;

  // Reconstruct the sticker price + discount for annual subscribers.
  // For monthly, original = null and discount = 0 (no annual sticker).
  let originalAnnualCents: number | null = null;
  let discountAppliedCents = 0;
  if (billingPeriod === "annual" && (isPro || hasFeatured || hasConcierge)) {
    originalAnnualCents =
      (isPro ? FULL_MONTHLY_CENTS.pro * 12 : 0) +
      (hasFeatured ? FULL_MONTHLY_CENTS.featured * 12 : 0) +
      (hasConcierge ? FULL_MONTHLY_CENTS.concierge * 12 : 0);
    discountAppliedCents = Math.max(0, originalAnnualCents - paidAmountCents);
  }

  return {
    tier: isPro ? "pro" : null,
    has_featured: hasFeatured,
    has_concierge_partner: hasConcierge,
    billing_period: billingPeriod,
    paid_amount_cents: paidAmountCents,
    original_annual_cents: originalAnnualCents,
    discount_applied_cents: discountAppliedCents,
    matched_new_lookup_keys: isPro || hasFeatured || hasConcierge,
  };
}

export interface SubscriptionPlanDecision {
  /** The tier the webhook stores and gates Pro activation on. */
  planTier: "pro" | null;
  /** Label for subscription_events / admin notifications. */
  planName: string;
  /** What the billed legacy product IS, when it is one this contract knows. */
  legacyClass: LegacyProductClass;
  /** True when the modern lookup keys decided this, false on the legacy path. */
  matchedNewLookupKeys: boolean;
}

/**
 * The exact plan decision `customer.subscription.created` makes.
 *
 * This is the entitlement decision: the handler activates Pro benefits when
 * `planTier === "pro"` and the subscription is active/trialing. It is a pure
 * function so the decision can be driven directly with fixtures rather than
 * inferred from the surrounding I/O.
 *
 * `legacyProductName` is the Stripe product's display name, which the handler
 * fetches only on the legacy path; pass null when it has not been resolved.
 */
export function resolveSubscriptionPlan(
  sub: ClassifiableSubscription,
  legacyProductName?: string | null,
): SubscriptionPlanDecision {
  const flags = deriveTierFlagsFromSubscription(sub);
  const legacyClass = classifyLegacyProduct(
    productIdFromPriceProduct(sub.items.data[0]?.price?.product),
  );
  if (flags.matched_new_lookup_keys) {
    return {
      planTier: flags.tier,
      planName: planNameFromTierFlags(flags),
      legacyClass,
      matchedNewLookupKeys: true,
    };
  }
  return {
    // Fail-closed: only a recognised Pro product grants the Pro tier.
    // Featured, unknown and absent products all resolve to null.
    planTier: legacyProductPlanTier(
      productIdFromPriceProduct(sub.items.data[0]?.price?.product),
    ),
    planName: legacyProductName || "Subscription",
    legacyClass,
    matchedNewLookupKeys: false,
  };
}

/**
 * Build the human-readable plan label for an event/audit row from the modern
 * lookup-key flags.
 *
 * Previously this was hardcoded to lead with "Pro":
 *
 *     has_concierge ? "Pro + Concierge (…)"
 *                   : has_featured ? "Pro + Featured (…)"
 *                                  : "Pro (…)"
 *
 * so a FEATURED-ONLY lookup-key subscription — `tier === null`,
 * `has_featured === true` — was labeled "Pro + Featured" in subscription_events
 * and in the admin notification. The stored `plan_tier` stayed null, so this
 * never granted an entitlement, but every human reading the audit trail was
 * told a Featured-only purchase included Pro.
 *
 * The label now names exactly what the flags say. Concierge continues to
 * supersede the Featured label — it is the mutually-exclusive upgrade that
 * already includes Featured exposure — and no combination is invented that the
 * flags do not assert.
 */
export function planNameFromTierFlags(flags: {
  tier: string | null;
  has_featured: boolean;
  has_concierge_partner: boolean;
  billing_period: "monthly" | "annual" | null;
}): string {
  const interval = flags.billing_period === "monthly" ? "monthly" : "annual";
  const parts: string[] = [];
  if (flags.tier === "pro") parts.push("Pro");
  if (flags.has_concierge_partner) parts.push("Concierge");
  else if (flags.has_featured) parts.push("Featured");
  if (parts.length === 0) return `Subscription (${interval})`;
  return `${parts.join(" + ")} (${interval})`;
}
