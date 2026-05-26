// Pricing constants for the provider-dashboard billing surfaces.
// Mirrors `supabase/functions/_shared/subscription-math.ts` TIER_PRICING
// so frontend display values can't drift from the math used at checkout
// and cancellation. Cents-precision; format with the helpers below.

export type TierKey = "pro" | "featured" | "concierge";

export interface TierPricing {
  monthlyCents: number;       // What Stripe charges per month on monthly billing
  annualCents: number;        // What Stripe charges per year on annual billing (15% off)
  fullAnnualCents: number;    // 12 × monthly — the "sticker" annual before discount
  monthlyEquivOfAnnualCents: number; // annual / 12 — for "$X/mo equivalent" displays
}

export const TIER_PRICING: Record<TierKey, TierPricing> = {
  pro: {
    monthlyCents: 9900,
    annualCents: 100980,
    fullAnnualCents: 118800,
    monthlyEquivOfAnnualCents: 8415,
  },
  featured: {
    monthlyCents: 59900,
    annualCents: 610860,
    fullAnnualCents: 718800,
    monthlyEquivOfAnnualCents: 50905,
  },
  concierge: {
    monthlyCents: 100000,
    annualCents: 1020000,
    fullAnnualCents: 1200000,
    monthlyEquivOfAnnualCents: 85000,
  },
};

// The top spend is now Pro + Concierge ($1,099/mo) — Concierge is a
// mutually-exclusive upgrade that already includes Featured exposure, so a
// Pro + Featured + Concierge bundle no longer exists.
export const BUNDLE_MONTHLY_CENTS = 9900 + 100000;       // 109900 = $1,099/mo
export const BUNDLE_ANNUAL_CENTS = 100980 + 1020000;     // 1120980 = $11,209.80/yr

/** Whole-dollar format: `$99` or `$1,099`. */
export function fmtMoneyWhole(cents: number): string {
  return `$${Math.round(cents / 100).toLocaleString("en-US")}`;
}

/** Full precision format: `$99.00` or `$1,009.80`. */
export function fmtMoney(cents: number | null | undefined): string {
  if (cents == null) return "—";
  return `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Apply a promo percentage to a cents amount for DISPLAY (strikethrough +
 * discounted). The actual charge is handled by the Stripe coupon at checkout;
 * this just mirrors it so the UI shows the same number. Returns the original
 * amount unchanged when there's no valid percent.
 */
export function applyPromoPercent(cents: number, percent: number | null | undefined): number {
  if (!percent || percent <= 0 || percent >= 100) return cents;
  return Math.round((cents * (100 - percent)) / 100);
}

/** "Pro + Concierge" / "Pro + Featured" / "Pro" / "Free" */
export function tierComboLabel(flags: {
  tier: string | null;
  has_featured: boolean | null;
  has_concierge_partner: boolean | null;
}): string {
  if (flags.tier !== "pro") return "Free";
  // Concierge is the mutually-exclusive upgrade that already includes Featured
  // exposure, so it supersedes the Featured label if both flags are ever set.
  if (flags.has_concierge_partner) return "Pro + Concierge";
  if (flags.has_featured) return "Pro + Featured";
  return "Pro";
}
