/**
 * Plan constants for the unified provider onboarding wizard.
 *
 * Pricing here mirrors what's set in Stripe for the production
 * STRIPE_PRO_PRICE_ID (price_1Sel1C9fxdThyiakWLfgbl9K = $99/month
 * Pro subscription). The matching TIERS array in
 * src/pages/ForProviders.tsx is the broader marketing source — when
 * marketing updates copy or pricing there, mirror it here.
 *
 * Note (2026-05-20 audit, deferred): a live Stripe lookup (small edge
 * fn calling `Stripe.prices.retrieve(STRIPE_PRO_PRICE_ID)`) would
 * propagate price changes without a deploy. We're skipping it because
 * (a) price changes for Pro are rare events that always require
 * coordinated copy updates in ForProviders.tsx + marketing emails
 * anyway, (b) the lookup-key resolution at create-checkout-session
 * runtime is the authoritative price for actual Checkout — the
 * `priceMonthly` here is purely UI copy that gets cross-checked
 * against Stripe at purchase time. Revisit if Pro pricing changes
 * become frequent enough to make the deploy-cycle overhead matter.
 */

export interface Plan {
  id: "free" | "pro";
  name: string;
  priceMonthly: number; // USD whole dollars
  badge: "Recommended" | null;
  headline: string;
  features: string[];
  /** Optional footnote shown under the CTA. */
  note?: string;
}

export const PLANS: Record<"free" | "pro", Plan> = {
  free: {
    id: "free",
    name: "Free",
    priceMonthly: 0,
    badge: null,
    headline: "Get listed for free",
    features: [
      "1 facility listing",
      "Up to 5 photos",
      "Standard placement in the directory",
      "Basic support",
    ],
    note: "You can upgrade to Pro anytime from your dashboard.",
  },
  pro: {
    id: "pro",
    name: "Pro",
    priceMonthly: 99,
    badge: "Recommended",
    headline: "Stand out and convert",
    features: [
      "Up to 5 facility listings",
      "Enriched profile with extra detail blocks",
      "Up to 10 photos + 1 facility video",
      "Priority placement on city + state pages",
      "Lead analytics dashboard",
      "Dedicated provider support",
    ],
  },
} as const;
