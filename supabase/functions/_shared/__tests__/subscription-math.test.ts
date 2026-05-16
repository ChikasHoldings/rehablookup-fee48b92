// Deno test mirror of src/test/subscription-math.test.ts.
//
// Run locally with:
//   deno test supabase/functions/_shared/__tests__/
//
// Both this file and the Vitest copy import the same source module
// (../subscription-math.ts ↔
//  ../../../../supabase/functions/_shared/subscription-math.ts).
// Running both proves the math behaves identically in both runtimes
// the edge functions and the in-repo tests actually use.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  computeMonthsUsed,
  computeCancellationRefund,
  computeUpgradeProration,
  TIER_PRICING,
} from "../subscription-math.ts";

const DAY = 24 * 60 * 60 * 1000;
const periodStart = new Date("2026-01-01T00:00:00Z");
const daysFrom = (n: number) => new Date(periodStart.getTime() + n * DAY);

// ── computeMonthsUsed ─────────────────────────────────────────────
Deno.test("computeMonthsUsed: 30 minutes in -> 0", () => {
  assertEquals(
    computeMonthsUsed(periodStart, new Date(periodStart.getTime() + 30 * 60 * 1000)),
    0,
  );
});

Deno.test("computeMonthsUsed: exactly 30 days -> 1", () => {
  assertEquals(computeMonthsUsed(periodStart, daysFrom(30)), 1);
});

Deno.test("computeMonthsUsed: 31 days -> 2 (ceil)", () => {
  assertEquals(computeMonthsUsed(periodStart, daysFrom(31)), 2);
});

Deno.test("computeMonthsUsed: 125 days -> 5 (4 months + 5 days rounds up)", () => {
  assertEquals(computeMonthsUsed(periodStart, daysFrom(125)), 5);
});

Deno.test("computeMonthsUsed: negative time clamps to 0", () => {
  assertEquals(computeMonthsUsed(periodStart, daysFrom(-5)), 0);
});

// ── Annual branch — worked examples ───────────────────────────────
Deno.test("Annual Pro, $1009.80, cancel @ 4 months -> $613.80 refund", () => {
  const r = computeCancellationRefund({
    billingPeriod: "annual",
    paidAmountCents: 100980,
    fullMonthlyRateCents: TIER_PRICING.pro.fullMonthlyRateCents,
    periodStart,
    now: daysFrom(120),
  });
  assertEquals(r.monthsUsed, 4);
  assertEquals(r.refundCents, 61380);
});

Deno.test("Annual Pro, $1009.80, cancel @ 4 months + 5 days -> $514.80 refund (5 months billed)", () => {
  const r = computeCancellationRefund({
    billingPeriod: "annual",
    paidAmountCents: 100980,
    fullMonthlyRateCents: TIER_PRICING.pro.fullMonthlyRateCents,
    periodStart,
    now: daysFrom(125),
  });
  assertEquals(r.monthsUsed, 5);
  assertEquals(r.refundCents, 51480);
});

Deno.test("Annual Pro, $1009.80, cancel @ 11 months -> $0 (clamped)", () => {
  const r = computeCancellationRefund({
    billingPeriod: "annual",
    paidAmountCents: 100980,
    fullMonthlyRateCents: TIER_PRICING.pro.fullMonthlyRateCents,
    periodStart,
    now: daysFrom(330),
  });
  assertEquals(r.refundCents, 0);
});

Deno.test("Annual Featured, $6108.60, cancel @ 6 months -> $2514.60 refund", () => {
  // Spec rate: 610860¢ (matches the Stripe Featured Annual price).
  const r = computeCancellationRefund({
    billingPeriod: "annual",
    paidAmountCents: 610860,
    fullMonthlyRateCents: TIER_PRICING.featured.fullMonthlyRateCents,
    periodStart,
    now: daysFrom(180),
  });
  assertEquals(r.monthsUsed, 6);
  assertEquals(r.refundCents, 610860 - 6 * 59900);
});

Deno.test("Annual Concierge, $10,200, cancel < 1hr in -> full refund", () => {
  const r = computeCancellationRefund({
    billingPeriod: "annual",
    paidAmountCents: 1020000,
    fullMonthlyRateCents: TIER_PRICING.concierge.fullMonthlyRateCents,
    periodStart,
    now: new Date(periodStart.getTime() + 30 * 60 * 1000),
  });
  assertEquals(r.monthsUsed, 0);
  assertEquals(r.refundCents, 1020000);
});

// ── Annual branch — edge cases ────────────────────────────────────
Deno.test("Annual: paidAmount = 0 -> refund 0, no error", () => {
  const r = computeCancellationRefund({
    billingPeriod: "annual",
    paidAmountCents: 0,
    fullMonthlyRateCents: 9900,
    periodStart,
    now: daysFrom(90),
  });
  assertEquals(r.refundCents, 0);
});

Deno.test("Annual: cancellation after periodEnd -> refund 0", () => {
  const r = computeCancellationRefund({
    billingPeriod: "annual",
    paidAmountCents: 100980,
    fullMonthlyRateCents: 9900,
    periodStart,
    periodEnd: daysFrom(365),
    now: daysFrom(400),
  });
  assertEquals(r.refundCents, 0);
});

Deno.test("Annual: refund + charge are always integers", () => {
  const r = computeCancellationRefund({
    billingPeriod: "annual",
    paidAmountCents: 100980.7,
    fullMonthlyRateCents: 9900,
    periodStart,
    now: daysFrom(47),
  });
  assert(Number.isInteger(r.refundCents));
  assert(Number.isInteger(r.chargeForUseCents));
});

// ── Monthly branch — refund is always 0 ───────────────────────────
Deno.test("Monthly Pro, $99, cancel @ 10 days -> refund 0", () => {
  const r = computeCancellationRefund({
    billingPeriod: "monthly",
    paidAmountCents: 9900,
    fullMonthlyRateCents: TIER_PRICING.pro.fullMonthlyRateCents,
    periodStart,
    now: daysFrom(10),
  });
  assertEquals(r.refundCents, 0);
  assertEquals(r.monthsUsed, 1);
  assertEquals(r.chargeForUseCents, 9900);
});

Deno.test("Monthly Featured, $599, cancel @ 15 days -> refund 0", () => {
  const r = computeCancellationRefund({
    billingPeriod: "monthly",
    paidAmountCents: 59900,
    fullMonthlyRateCents: TIER_PRICING.featured.fullMonthlyRateCents,
    periodStart,
    now: daysFrom(15),
  });
  assertEquals(r.refundCents, 0);
  assertEquals(r.chargeForUseCents, 59900);
});

Deno.test("Monthly Concierge, $1000, cancel @ 1 day -> refund 0", () => {
  const r = computeCancellationRefund({
    billingPeriod: "monthly",
    paidAmountCents: 100000,
    fullMonthlyRateCents: TIER_PRICING.concierge.fullMonthlyRateCents,
    periodStart,
    now: daysFrom(1),
  });
  assertEquals(r.refundCents, 0);
});

// ── Upgrade proration — annual (computed) ─────────────────────────
const upgradeNow = new Date("2026-06-01T00:00:00Z");

Deno.test("Annual: Featured upgrade with 200 days left -> $3,938.63 prorated", () => {
  const r = computeUpgradeProration({
    currentBillingPeriod: "annual",
    addonFullAnnualCents: TIER_PRICING.featured.fullAnnualCents,
    addonMonthlyCents: TIER_PRICING.featured.fullMonthlyRateCents,
    periodEnd: new Date(upgradeNow.getTime() + 200 * DAY),
    now: upgradeNow,
  });
  assertEquals(r.handledBy, "computed");
  assertEquals(r.daysRemaining, 200);
  assertEquals(r.proratedChargeCents, 393863);
});

Deno.test("Annual: days_remaining = 0 -> prorated 0", () => {
  const r = computeUpgradeProration({
    currentBillingPeriod: "annual",
    addonFullAnnualCents: TIER_PRICING.featured.fullAnnualCents,
    addonMonthlyCents: TIER_PRICING.featured.fullMonthlyRateCents,
    periodEnd: upgradeNow,
    now: upgradeNow,
  });
  assertEquals(r.proratedChargeCents, 0);
});

Deno.test("Annual: days_remaining = 365 -> prorated ≈ full annual", () => {
  const r = computeUpgradeProration({
    currentBillingPeriod: "annual",
    addonFullAnnualCents: TIER_PRICING.featured.fullAnnualCents,
    addonMonthlyCents: TIER_PRICING.featured.fullMonthlyRateCents,
    periodEnd: new Date(upgradeNow.getTime() + 365 * DAY),
    now: upgradeNow,
  });
  assertEquals(r.proratedChargeCents, TIER_PRICING.featured.fullAnnualCents);
});

// ── Upgrade proration — monthly (stripe-native) ───────────────────
Deno.test("Monthly: Featured upgrade mid-month -> stripe-native, prorated charge null", () => {
  const r = computeUpgradeProration({
    currentBillingPeriod: "monthly",
    addonFullAnnualCents: TIER_PRICING.featured.fullAnnualCents,
    addonMonthlyCents: TIER_PRICING.featured.fullMonthlyRateCents,
    periodEnd: new Date(upgradeNow.getTime() + 15 * DAY),
    now: upgradeNow,
  });
  assertEquals(r.handledBy, "stripe-native");
  assertEquals(r.proratedChargeCents, null);
  assertEquals(r.daysRemaining, 15);
});

// ── Tier pricing sanity ───────────────────────────────────────────
Deno.test("TIER_PRICING.pro.discountedAnnualCents = 100980", () => {
  assertEquals(TIER_PRICING.pro.discountedAnnualCents, 100980);
});
Deno.test("TIER_PRICING.featured.discountedAnnualCents = 610860 (spec-canonical)", () => {
  assertEquals(TIER_PRICING.featured.discountedAnnualCents, 610860);
});
Deno.test("TIER_PRICING.concierge.discountedAnnualCents = 1020000", () => {
  assertEquals(TIER_PRICING.concierge.discountedAnnualCents, 1020000);
});
