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
 */

import { describe, it, expect } from "vitest";
import {
  computeMonthsUsed,
  computeCancellationRefund,
  computeUpgradeProration,
  TIER_PRICING,
} from "../../supabase/functions/_shared/subscription-math";

const DAY = 24 * 60 * 60 * 1000;
const MONTH = 30 * DAY;

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

describe("computeCancellationRefund — worked examples from spec", () => {
  const periodStart = new Date("2026-01-01T00:00:00Z");

  it("Pro, $1009.80 paid, cancel after exactly 4 months → refund $613.80", () => {
    const result = computeCancellationRefund({
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
    // Spec rate: $6,108.60 = 610860¢ (the Stripe price the customer
    // actually pays). Refund = paid − months × full_monthly_rate.
    const result = computeCancellationRefund({
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

describe("computeCancellationRefund — edge cases", () => {
  const periodStart = new Date("2026-01-01T00:00:00Z");

  it("paidAmount = 0 yields refund 0, no error", () => {
    const result = computeCancellationRefund({
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
      paidAmountCents: 100980,
      fullMonthlyRateCents: 9900,
      periodStart,
      now: daysFromNow(periodStart, 47), // ceil(47/30) = 2 months
    });
    expect(Number.isInteger(result.refundCents)).toBe(true);
    expect(Number.isInteger(result.chargeForUseCents)).toBe(true);
  });

  it("negative now → clamped to 0 months → full refund", () => {
    const result = computeCancellationRefund({
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
      paidAmountCents: 100980.7,
      fullMonthlyRateCents: 9900,
      periodStart,
      now: daysFromNow(periodStart, 30),
    });
    expect(result.refundCents).toBe(100980 - 9900);
  });
});

describe("computeUpgradeProration", () => {
  const now = new Date("2026-06-01T00:00:00Z");

  it("Pro subscriber adds Featured with 200 days remaining → ≈$3938.36", () => {
    const periodEnd = new Date(now.getTime() + 200 * DAY);
    const result = computeUpgradeProration({
      addonFullAnnualCents: TIER_PRICING.featured.fullAnnualCents, // 718800
      periodEnd,
      now,
    });
    expect(result.daysRemaining).toBe(200);
    // 718800 / 365 = 1969.315..., × 200 = 393863.01..., rounded = 393863
    expect(result.proratedChargeCents).toBe(393863);
  });

  it("days_remaining = 0 → prorated charge 0", () => {
    const result = computeUpgradeProration({
      addonFullAnnualCents: TIER_PRICING.featured.fullAnnualCents,
      periodEnd: now,
      now,
    });
    expect(result.daysRemaining).toBe(0);
    expect(result.proratedChargeCents).toBe(0);
  });

  it("upgrade after periodEnd → prorated 0 (negative days clamped)", () => {
    const periodEnd = new Date(now.getTime() - 10 * DAY);
    const result = computeUpgradeProration({
      addonFullAnnualCents: TIER_PRICING.featured.fullAnnualCents,
      periodEnd,
      now,
    });
    expect(result.daysRemaining).toBe(0);
    expect(result.proratedChargeCents).toBe(0);
  });

  it("days_remaining = 365 → prorated ≈ full annual (sanity check)", () => {
    const periodEnd = new Date(now.getTime() + 365 * DAY);
    const result = computeUpgradeProration({
      addonFullAnnualCents: TIER_PRICING.featured.fullAnnualCents,
      periodEnd,
      now,
    });
    expect(result.daysRemaining).toBe(365);
    expect(result.proratedChargeCents).toBe(TIER_PRICING.featured.fullAnnualCents);
  });

  it("Concierge add-on with 100 days remaining → ≈$3287.67", () => {
    const periodEnd = new Date(now.getTime() + 100 * DAY);
    const result = computeUpgradeProration({
      addonFullAnnualCents: TIER_PRICING.concierge.fullAnnualCents, // 1200000
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
      addonFullAnnualCents: TIER_PRICING.featured.fullAnnualCents,
      periodEnd,
      now,
    });
    expect(Number.isInteger(result.proratedChargeCents)).toBe(true);
    expect(Number.isInteger(result.daysRemaining)).toBe(true);
  });
});

describe("Cascading cancellation — combined refund math", () => {
  const periodStart = new Date("2026-01-01T00:00:00Z");
  const now = daysFromNow(periodStart, 180); // 6 months in → months_used = 6

  it("Pro + Featured + Concierge bundle, cancel at 6 months — three separate refunds", () => {
    const proRefund = computeCancellationRefund({
      paidAmountCents: TIER_PRICING.pro.discountedAnnualCents, // 100980
      fullMonthlyRateCents: TIER_PRICING.pro.fullMonthlyRateCents,
      periodStart,
      now,
    });
    const featuredRefund = computeCancellationRefund({
      paidAmountCents: TIER_PRICING.featured.discountedAnnualCents, // 610860
      fullMonthlyRateCents: TIER_PRICING.featured.fullMonthlyRateCents,
      periodStart,
      now,
    });
    const conciergeRefund = computeCancellationRefund({
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
