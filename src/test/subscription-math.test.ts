/**
 * Pure-math tests for the cancellation refund + upgrade proration
 * formulas powering monetization rebuild PR 2. The same source file
 * (`supabase/functions/_shared/subscription-math.ts`) is imported by
 * the Stripe webhook and the admin cancellation endpoint, so verifying
 * the math here also verifies it in production runtime.
 *
 * A parallel `deno test` suite at
 * supabase/functions/_shared/__tests__/subscription-math.test.ts
 * exercises the same cases inside the Deno runtime the edge functions
 * actually use.
 *
 * Two-branch design: monthly subscribers never get a refund (Stripe
 * handles cancel-at-period-end natively), annual subscribers get
 * paid − months_used × full_monthly_rate refunded.
 */

import { describe, it, expect } from "vitest";
import {
  computeMonthsUsed,
  computeCancellationRefund,
  computeUpgradeProration,
  TIER_PRICING,
} from "../../supabase/functions/_shared/subscription-math";

const DAY = 24 * 60 * 60 * 1000;

function daysFromNow(periodStart: Date, days: number): Date {
  return new Date(periodStart.getTime() + days * DAY);
}

describe("computeMonthsUsed", () => {
  const start = new Date("2026-01-01T00:00:00Z");

  it("returns 0 within the first hour", () => {
    expect(computeMonthsUsed(start, new Date(start.getTime() + 30 * 60 * 1000))).toBe(0);
  });

  it("returns 1 after 1 day", () => {
    expect(computeMonthsUsed(start, daysFromNow(start, 1))).toBe(1);
  });

  it("returns 1 at exactly 30 days", () => {
    expect(computeMonthsUsed(start, daysFromNow(start, 30))).toBe(1);
  });

  it("returns 2 at 31 days", () => {
    expect(computeMonthsUsed(start, daysFromNow(start, 31))).toBe(2);
  });

  it("returns 4 after 4 months exactly (120 days)", () => {
    expect(computeMonthsUsed(start, daysFromNow(start, 120))).toBe(4);
  });

  it("rounds 4 months + 5 days UP to 5", () => {
    expect(computeMonthsUsed(start, daysFromNow(start, 125))).toBe(5);
  });

  it("returns 12 at a full year of 30-day months", () => {
    expect(computeMonthsUsed(start, daysFromNow(start, 360))).toBe(12);
  });

  it("clamps to 0 on negative time (now before periodStart)", () => {
    expect(computeMonthsUsed(start, daysFromNow(start, -10))).toBe(0);
  });
});

// ────────────────────────────────────────────────────────────────────
// Annual branch — full custom refund math
// ────────────────────────────────────────────────────────────────────

describe("computeCancellationRefund — annual branch (worked examples)", () => {
  const periodStart = new Date("2026-01-01T00:00:00Z");

  it("Pro, $1009.80 paid, cancel after exactly 4 months → refund $613.80", () => {
    const result = computeCancellationRefund({
      billingPeriod: "annual",
      paidAmountCents: 100980,
      fullMonthlyRateCents: TIER_PRICING.pro.fullMonthlyRateCents,
      periodStart,
      now: daysFromNow(periodStart, 120),
    });
    expect(result.monthsUsed).toBe(4);
    expect(result.chargeForUseCents).toBe(4 * 9900);
    expect(result.refundCents).toBe(61380);
  });

  it("Pro, $1009.80 paid, cancel at 4 months + 5 days → 5 months → refund $514.80", () => {
    const result = computeCancellationRefund({
      billingPeriod: "annual",
      paidAmountCents: 100980,
      fullMonthlyRateCents: TIER_PRICING.pro.fullMonthlyRateCents,
      periodStart,
      now: daysFromNow(periodStart, 125),
    });
    expect(result.monthsUsed).toBe(5);
    expect(result.chargeForUseCents).toBe(5 * 9900);
    expect(result.refundCents).toBe(51480);
  });

  it("Pro, $1009.80 paid, cancel at 11 months → refund clamped to 0", () => {
    const result = computeCancellationRefund({
      billingPeriod: "annual",
      paidAmountCents: 100980,
      fullMonthlyRateCents: TIER_PRICING.pro.fullMonthlyRateCents,
      periodStart,
      now: daysFromNow(periodStart, 330),
    });
    expect(result.monthsUsed).toBe(11);
    expect(result.chargeForUseCents).toBe(11 * 9900);
    expect(result.refundCents).toBe(0);
  });

  it("Featured, $6108.60 paid (spec-canonical), cancel after 6 months → refund $2514.60", () => {
    const result = computeCancellationRefund({
      billingPeriod: "annual",
      paidAmountCents: 610860,
      fullMonthlyRateCents: TIER_PRICING.featured.fullMonthlyRateCents,
      periodStart,
      now: daysFromNow(periodStart, 180),
    });
    expect(result.monthsUsed).toBe(6);
    expect(result.chargeForUseCents).toBe(6 * 59900);
    expect(result.refundCents).toBe(610860 - 6 * 59900);
  });

  it("Concierge, $10,200 paid, cancel on day 1 (< 1 hour) → full refund", () => {
    const result = computeCancellationRefund({
      billingPeriod: "annual",
      paidAmountCents: 1020000,
      fullMonthlyRateCents: TIER_PRICING.concierge.fullMonthlyRateCents,
      periodStart,
      now: new Date(periodStart.getTime() + 30 * 60 * 1000), // 30 min in
    });
    expect(result.monthsUsed).toBe(0);
    expect(result.chargeForUseCents).toBe(0);
    expect(result.refundCents).toBe(1020000);
  });
});

describe("computeCancellationRefund — annual branch (edge cases)", () => {
  const periodStart = new Date("2026-01-01T00:00:00Z");

  it("paidAmount = 0 yields refund 0, no error", () => {
    const result = computeCancellationRefund({
      billingPeriod: "annual",
      paidAmountCents: 0,
      fullMonthlyRateCents: 9900,
      periodStart,
      now: daysFromNow(periodStart, 90),
    });
    expect(result.refundCents).toBe(0);
  });

  it("cancellation requested AFTER periodEnd → refund 0", () => {
    const periodEnd = daysFromNow(periodStart, 365);
    const result = computeCancellationRefund({
      billingPeriod: "annual",
      paidAmountCents: 100980,
      fullMonthlyRateCents: 9900,
      periodStart,
      periodEnd,
      now: daysFromNow(periodStart, 400),
    });
    expect(result.refundCents).toBe(0);
  });

  it("cancel at exact period_end → refund 0 (full year used)", () => {
    const periodEnd = daysFromNow(periodStart, 365);
    const result = computeCancellationRefund({
      billingPeriod: "annual",
      paidAmountCents: 100980,
      fullMonthlyRateCents: 9900,
      periodStart,
      periodEnd,
      now: periodEnd,
    });
    expect(result.refundCents).toBe(0);
  });

  it("partial cents are never produced (integer math)", () => {
    const result = computeCancellationRefund({
      billingPeriod: "annual",
      paidAmountCents: 100980,
      fullMonthlyRateCents: 9900,
      periodStart,
      now: daysFromNow(periodStart, 47),
    });
    expect(Number.isInteger(result.refundCents)).toBe(true);
    expect(Number.isInteger(result.chargeForUseCents)).toBe(true);
  });

  it("negative now → clamped to 0 months → full refund", () => {
    const result = computeCancellationRefund({
      billingPeriod: "annual",
      paidAmountCents: 100980,
      fullMonthlyRateCents: 9900,
      periodStart,
      now: daysFromNow(periodStart, -5),
    });
    expect(result.monthsUsed).toBe(0);
    expect(result.refundCents).toBe(100980);
  });

  it("decimal paidAmount inputs are floored", () => {
    const result = computeCancellationRefund({
      billingPeriod: "annual",
      paidAmountCents: 100980.7,
      fullMonthlyRateCents: 9900,
      periodStart,
      now: daysFromNow(periodStart, 30),
    });
    expect(result.refundCents).toBe(100980 - 9900);
  });
});

// ────────────────────────────────────────────────────────────────────
// Monthly branch — refund is always 0 (Stripe handles natively)
// ────────────────────────────────────────────────────────────────────

describe("computeCancellationRefund — monthly branch (no refund, ever)", () => {
  const periodStart = new Date("2026-01-01T00:00:00Z");

  it("Monthly Pro, $99 paid, cancel after 10 days → refund 0", () => {
    const result = computeCancellationRefund({
      billingPeriod: "monthly",
      paidAmountCents: 9900,
      fullMonthlyRateCents: TIER_PRICING.pro.fullMonthlyRateCents,
      periodStart,
      now: daysFromNow(periodStart, 10),
    });
    expect(result.refundCents).toBe(0);
    expect(result.monthsUsed).toBe(1);
    expect(result.chargeForUseCents).toBe(9900);
  });

  it("Monthly Featured, $599 paid, cancel after 15 days → refund 0", () => {
    const result = computeCancellationRefund({
      billingPeriod: "monthly",
      paidAmountCents: 59900,
      fullMonthlyRateCents: TIER_PRICING.featured.fullMonthlyRateCents,
      periodStart,
      now: daysFromNow(periodStart, 15),
    });
    expect(result.refundCents).toBe(0);
    expect(result.monthsUsed).toBe(1);
    expect(result.chargeForUseCents).toBe(59900);
  });

  it("Monthly Concierge, $1000 paid, cancel after 1 day → refund 0", () => {
    const result = computeCancellationRefund({
      billingPeriod: "monthly",
      paidAmountCents: 100000,
      fullMonthlyRateCents: TIER_PRICING.concierge.fullMonthlyRateCents,
      periodStart,
      now: daysFromNow(periodStart, 1),
    });
    expect(result.refundCents).toBe(0);
    expect(result.chargeForUseCents).toBe(100000);
  });

  it("Monthly refund branch ignores periodEnd race condition", () => {
    // Even if `now` is past periodEnd, monthly still returns 0 refund.
    // The annual branch had a special case for this; the monthly branch
    // doesn't need one because there's no refund either way.
    const periodEnd = daysFromNow(periodStart, 30);
    const result = computeCancellationRefund({
      billingPeriod: "monthly",
      paidAmountCents: 9900,
      fullMonthlyRateCents: TIER_PRICING.pro.fullMonthlyRateCents,
      periodStart,
      periodEnd,
      now: daysFromNow(periodStart, 45),
    });
    expect(result.refundCents).toBe(0);
  });
});

// ────────────────────────────────────────────────────────────────────
// Upgrade proration — splits monthly (stripe-native) vs annual (computed)
// ────────────────────────────────────────────────────────────────────

describe("computeUpgradeProration — annual branch (computed)", () => {
  const now = new Date("2026-06-01T00:00:00Z");

  it("Annual Pro adds Featured with 200 days remaining → ≈$3938.36", () => {
    const periodEnd = new Date(now.getTime() + 200 * DAY);
    const result = computeUpgradeProration({
      currentBillingPeriod: "annual",
      addonFullAnnualCents: TIER_PRICING.featured.fullAnnualCents, // 718800
      addonMonthlyCents: TIER_PRICING.featured.fullMonthlyRateCents,
      periodEnd,
      now,
    });
    expect(result.handledBy).toBe("computed");
    expect(result.daysRemaining).toBe(200);
    // 718800 / 365 = 1969.315..., × 200 = 393863.01..., rounded = 393863
    expect(result.proratedChargeCents).toBe(393863);
  });

  it("days_remaining = 0 → prorated charge 0", () => {
    const result = computeUpgradeProration({
      currentBillingPeriod: "annual",
      addonFullAnnualCents: TIER_PRICING.featured.fullAnnualCents,
      addonMonthlyCents: TIER_PRICING.featured.fullMonthlyRateCents,
      periodEnd: now,
      now,
    });
    expect(result.daysRemaining).toBe(0);
    expect(result.proratedChargeCents).toBe(0);
  });

  it("upgrade after periodEnd → prorated 0 (negative days clamped)", () => {
    const periodEnd = new Date(now.getTime() - 10 * DAY);
    const result = computeUpgradeProration({
      currentBillingPeriod: "annual",
      addonFullAnnualCents: TIER_PRICING.featured.fullAnnualCents,
      addonMonthlyCents: TIER_PRICING.featured.fullMonthlyRateCents,
      periodEnd,
      now,
    });
    expect(result.daysRemaining).toBe(0);
    expect(result.proratedChargeCents).toBe(0);
  });

  it("days_remaining = 365 → prorated ≈ full annual (sanity check)", () => {
    const periodEnd = new Date(now.getTime() + 365 * DAY);
    const result = computeUpgradeProration({
      currentBillingPeriod: "annual",
      addonFullAnnualCents: TIER_PRICING.featured.fullAnnualCents,
      addonMonthlyCents: TIER_PRICING.featured.fullMonthlyRateCents,
      periodEnd,
      now,
    });
    expect(result.daysRemaining).toBe(365);
    expect(result.proratedChargeCents).toBe(TIER_PRICING.featured.fullAnnualCents);
  });

  it("Concierge add-on with 100 days remaining → ≈$3287.67", () => {
    const periodEnd = new Date(now.getTime() + 100 * DAY);
    const result = computeUpgradeProration({
      currentBillingPeriod: "annual",
      addonFullAnnualCents: TIER_PRICING.concierge.fullAnnualCents, // 1200000
      addonMonthlyCents: TIER_PRICING.concierge.fullMonthlyRateCents,
      periodEnd,
      now,
    });
    expect(result.daysRemaining).toBe(100);
    // 1200000 / 365 = 3287.671..., × 100 = 328767.12..., rounded = 328767
    expect(result.proratedChargeCents).toBe(328767);
  });

  it("returned values are integers (no float cents)", () => {
    const periodEnd = new Date(now.getTime() + 73 * DAY); // 73 isn't a round divisor of 365
    const result = computeUpgradeProration({
      currentBillingPeriod: "annual",
      addonFullAnnualCents: TIER_PRICING.featured.fullAnnualCents,
      addonMonthlyCents: TIER_PRICING.featured.fullMonthlyRateCents,
      periodEnd,
      now,
    });
    expect(Number.isInteger(result.proratedChargeCents)).toBe(true);
    expect(Number.isInteger(result.daysRemaining)).toBe(true);
  });
});

describe("computeUpgradeProration — monthly branch (Stripe-native)", () => {
  const now = new Date("2026-06-15T00:00:00Z");

  it("Monthly Pro adds Featured mid-month → handledBy=stripe-native, no computed charge", () => {
    const periodEnd = new Date(now.getTime() + 15 * DAY);
    const result = computeUpgradeProration({
      currentBillingPeriod: "monthly",
      addonFullAnnualCents: TIER_PRICING.featured.fullAnnualCents,
      addonMonthlyCents: TIER_PRICING.featured.fullMonthlyRateCents,
      periodEnd,
      now,
    });
    expect(result.handledBy).toBe("stripe-native");
    expect(result.proratedChargeCents).toBeNull();
    // daysRemaining is still reported so a preview UI can show "X days left"
    expect(result.daysRemaining).toBe(15);
  });

  it("Monthly Pro adds Concierge with 1 day left → handledBy=stripe-native", () => {
    const periodEnd = new Date(now.getTime() + 1 * DAY);
    const result = computeUpgradeProration({
      currentBillingPeriod: "monthly",
      addonFullAnnualCents: TIER_PRICING.concierge.fullAnnualCents,
      addonMonthlyCents: TIER_PRICING.concierge.fullMonthlyRateCents,
      periodEnd,
      now,
    });
    expect(result.handledBy).toBe("stripe-native");
    expect(result.proratedChargeCents).toBeNull();
  });

  it("dailyRateCents on monthly branch reflects monthly/30, not annual/365", () => {
    // Featured monthly = 59900¢; daily = 59900/30 ≈ 1997 (rounded).
    const periodEnd = new Date(now.getTime() + 10 * DAY);
    const result = computeUpgradeProration({
      currentBillingPeriod: "monthly",
      addonFullAnnualCents: TIER_PRICING.featured.fullAnnualCents,
      addonMonthlyCents: TIER_PRICING.featured.fullMonthlyRateCents,
      periodEnd,
      now,
    });
    expect(result.dailyRateCents).toBe(Math.round(59900 / 30));
  });
});

// ────────────────────────────────────────────────────────────────────
// Cascading scenarios + tier-pricing sanity
// ────────────────────────────────────────────────────────────────────

describe("Cascading cancellation — combined refund math", () => {
  const periodStart = new Date("2026-01-01T00:00:00Z");
  const now = daysFromNow(periodStart, 180); // 6 months in → months_used = 6

  it("Annual Pro + Featured + Concierge, cancel at 6 months — three separate refunds", () => {
    const proRefund = computeCancellationRefund({
      billingPeriod: "annual",
      paidAmountCents: TIER_PRICING.pro.discountedAnnualCents, // 100980
      fullMonthlyRateCents: TIER_PRICING.pro.fullMonthlyRateCents,
      periodStart,
      now,
    });
    const featuredRefund = computeCancellationRefund({
      billingPeriod: "annual",
      paidAmountCents: TIER_PRICING.featured.discountedAnnualCents, // 610860
      fullMonthlyRateCents: TIER_PRICING.featured.fullMonthlyRateCents,
      periodStart,
      now,
    });
    const conciergeRefund = computeCancellationRefund({
      billingPeriod: "annual",
      paidAmountCents: TIER_PRICING.concierge.discountedAnnualCents, // 1020000
      fullMonthlyRateCents: TIER_PRICING.concierge.fullMonthlyRateCents,
      periodStart,
      now,
    });

    // Pro: $100980 - 6×9900 = $100980 - $59400 = $41580
    expect(proRefund.refundCents).toBe(41580);
    // Featured: $610860 - 6×59900 = $610860 - $359400 = $251460
    expect(featuredRefund.refundCents).toBe(251460);
    // Concierge: $1020000 - 6×100000 = $1020000 - $600000 = $420000
    expect(conciergeRefund.refundCents).toBe(420000);

    const total = proRefund.refundCents + featuredRefund.refundCents + conciergeRefund.refundCents;
    expect(total).toBe(713040); // $7,130.40 total
  });

  it("Monthly Pro + Featured, cancel Featured-only at day 15 → both refunds = 0", () => {
    // Monthly cancellation: Stripe handles it. We log 0-refund audit rows.
    const featuredRefund = computeCancellationRefund({
      billingPeriod: "monthly",
      paidAmountCents: TIER_PRICING.featured.fullMonthlyRateCents,
      fullMonthlyRateCents: TIER_PRICING.featured.fullMonthlyRateCents,
      periodStart,
      now: daysFromNow(periodStart, 15),
    });
    expect(featuredRefund.refundCents).toBe(0);
    expect(featuredRefund.chargeForUseCents).toBe(TIER_PRICING.featured.fullMonthlyRateCents);
  });
});

describe("TIER_PRICING constants — sanity", () => {
  it("Pro discounted annual = $1009.80", () => {
    expect(TIER_PRICING.pro.discountedAnnualCents).toBe(100980);
  });
  it("Featured discounted annual = $6108.60 (spec-canonical, matches Stripe price)", () => {
    expect(TIER_PRICING.featured.discountedAnnualCents).toBe(610860);
  });
  it("Concierge discounted annual = $10200", () => {
    expect(TIER_PRICING.concierge.discountedAnnualCents).toBe(1020000);
  });
  it("Full annuals = monthly × 12 (no discount)", () => {
    expect(TIER_PRICING.pro.fullAnnualCents).toBe(9900 * 12);
    expect(TIER_PRICING.featured.fullAnnualCents).toBe(59900 * 12);
    expect(TIER_PRICING.concierge.fullAnnualCents).toBe(100000 * 12);
  });
});
