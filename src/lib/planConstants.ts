/**
 * Plan constants for the unified provider onboarding wizard.
 *
 * The Pro feature list is DERIVED from src/lib/proDirectoryBenefits.ts — the
 * single source of truth for the monetization contract. It used to be a fourth
 * independent hardcoded array and it claimed "Priority placement on city + state
 * pages", which Pro has never bought: organic position is computed by
 * calculate-ranking-scores from neutral signals with no subscription input.
 * Onboarding is the FIRST thing a provider reads, so a false promise here sets
 * an expectation the rest of the product then has to break.
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

import { PRO_DIRECTORY_BENEFITS } from "@/lib/proDirectoryBenefits";

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
      "Listed in the directory",
      "Eligible facilities receive inquiries",
      "Basic support",
    ],
    note: "You can upgrade to Pro anytime from your dashboard.",
  },
  pro: {
    id: "pro",
    name: "Pro",
    priceMonthly: 99,
    badge: "Recommended",
    headline: "Make your listing easier to evaluate and contact",
    // Derived, never restated. Adding a Pro benefit means editing the contract.
    features: [
      ...PRO_DIRECTORY_BENEFITS.map((benefit) => benefit.title),
      "Dedicated provider support",
    ],
    note: "Pro enhances your listing and provider tools. Verification and organic directory position are determined independently.",
  },
};
