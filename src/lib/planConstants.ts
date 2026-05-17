/**
 * Plan constants for the unified provider onboarding wizard.
 *
 * Pricing here mirrors what's set in Stripe for the production
 * STRIPE_PRO_PRICE_ID (price_1Sel1C9fxdThyiakWLfgbl9K = $99/month
 * Pro subscription). The matching TIERS array in
 * src/pages/ForProviders.tsx is the broader marketing source — when
 * marketing updates copy or pricing there, mirror it here.
 *
 * TODO: replace the static priceMonthly with a live Stripe lookup
 * (small edge fn that reads STRIPE_PRO_PRICE_ID + Stripe.prices.retrieve)
 * so price changes propagate without a deploy. Not blocking for the
 * Step 4 wizard PR — the spec accepts hardcoded defaults when no
 * live source is available, as long as they're flagged like this.
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
      "Basic facility listing",
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
      "Enriched profile with extra detail blocks",
      "Up to 10 photos + 1 facility video",
      "Priority placement on city + state pages",
      "Lead analytics dashboard",
      "Dedicated provider support",
    ],
  },
} as const;
