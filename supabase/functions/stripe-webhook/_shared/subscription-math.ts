// subscription-math.ts
// ─────────────────────
// Pure, deterministic refund + proration math for the
// Pro / Featured / Concierge subscription model — monthly default,
// annual = 15%-discount upsell.
//
// Two-branch rule:
//   • Monthly subscribers: Stripe handles cancellation natively. We
//     don't issue refunds — you used the month you paid for. The
//     math functions still return a deterministic shape so callers
//     can record a 0-refund audit row.
//   • Annual subscribers: custom math. months_used × full_monthly_rate
//     is what we keep; the rest is refunded. The 15% discount is
//     forfeited on partial years.
//
// HARD RULE: this module is pure. No DB calls, no Stripe calls,
// no environment reads, no I/O. Every input arrives as a parameter.
// Every output is computed in cents (integer math) so currency
// rounding stays auditable. The implementation is identical in
// Deno (edge functions) and Node/Vitest (in-repo tests).

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const DAYS_PER_MONTH = 30;
const DAYS_PER_YEAR = 365;
const ONE_HOUR_MS = 60 * 60 * 1000;

/**
 * Spec rule: "Partial months round UP. No free partial months."
 *
 * Edge cases:
 *   • elapsed < 1 hour       → 0 months  (instant-cancel grace)
 *   • exactly N × 30 days    → N months  (no extra month for the boundary)
 *   • elapsed > 0 and < 30d  → 1 month
 *   • negative elapsed       → 0 months  (now before periodStart — clamp)
 */
export function computeMonthsUsed(periodStart: Date, now: Date): number {
  const elapsedMs = now.getTime() - periodStart.getTime();
  if (elapsedMs < ONE_HOUR_MS) return 0;
  const elapsedDays = elapsedMs / MS_PER_DAY;
  return Math.ceil(elapsedDays / DAYS_PER_MONTH);
}

export type BillingPeriod = "monthly" | "annual";

export interface CancellationRefundInput {
  /** Which billing cadence the subscriber is on. Drives the refund branch. */
  billingPeriod: BillingPeriod;
  /** Amount actually paid in cents.
   *   • monthly: the monthly amount charged ($99 / $599 / $1,000)
   *   • annual:  the discounted annual ($1,009.80 / $6,108.60 / $10,200) */
  paidAmountCents: number;
  /** Full UN-discounted monthly rate in cents (Pro=9900, Featured=59900, Concierge=100000).
   *  Only meaningful on the annual branch — monthly cancellation never refunds. */
  fullMonthlyRateCents: number;
  /** When the current billing period started. */
  periodStart: Date;
  /** When the period would end (only used to short-circuit refund=0 if already past). */
  periodEnd?: Date;
  /** Override the "now" timestamp — defaults to actual now. */
  now?: Date;
}

export interface CancellationRefundResult {
  monthsUsed: number;
  chargeForUseCents: number;
  refundCents: number;
}

/**
 * Two-branch cancellation math:
 *
 *   billingPeriod === 'monthly'
 *     The subscriber paid for the current month and used it. Refund
 *     is always 0; we treat the whole month as charged. Stripe's
 *     cancel-at-period-end handles the "no further renewals" piece
 *     natively, so this function exists only to produce a deterministic
 *     audit-row shape (and to centralise the "no monthly refund" policy
 *     so it can't drift across handlers).
 *     Returns: { monthsUsed: 1, chargeForUseCents: paidAmountCents, refundCents: 0 }
 *
 *   billingPeriod === 'annual'
 *     Spec formula:
 *       months_used    = ceil((now - period_start) / 30 days) (special cases above)
 *       charge_for_use = months_used × full_monthly_rate_cents
 *       refund         = max(0, paid_amount_cents − charge_for_use)
 *
 * Idempotency note: this is purely deterministic — same inputs yield
 * same outputs forever. Callers store the result in
 * `subscription_cancellations` keyed by subscription_id + scope so a
 * retry produces a no-op insert.
 */
export function computeCancellationRefund(
  input: CancellationRefundInput,
): CancellationRefundResult {
  const paid = Math.max(0, Math.floor(input.paidAmountCents));

  // Monthly branch: no refund, ever. Stripe handles the cancel-at-
  // period-end + final invoice. We log a 0-refund row for audit.
  if (input.billingPeriod === "monthly") {
    return {
      monthsUsed: 1,
      chargeForUseCents: paid,
      refundCents: 0,
    };
  }

  // Annual branch: existing math.
  const now = input.now ?? new Date();
  const monthlyRate = Math.max(0, Math.floor(input.fullMonthlyRateCents));

  // Cancellation requested after the period already ended — no refund.
  // Stripe wouldn't have charged a renewal yet (different event); this
  // path covers race conditions where the cancel webhook fires after
  // period_end. Refund = 0.
  if (input.periodEnd && now.getTime() >= input.periodEnd.getTime()) {
    const monthsUsed = computeMonthsUsed(input.periodStart, input.periodEnd);
    return {
      monthsUsed,
      chargeForUseCents: monthsUsed * monthlyRate,
      refundCents: 0,
    };
  }

  const monthsUsed = computeMonthsUsed(input.periodStart, now);
  const chargeForUseCents = monthsUsed * monthlyRate;
  const refundCents = Math.max(0, paid - chargeForUseCents);

  return { monthsUsed, chargeForUseCents, refundCents };
}

export interface UpgradeProrationInput {
  /** Which interval the EXISTING parent subscription is on. Drives the branch. */
  currentBillingPeriod: BillingPeriod;
  /** The add-on's full annual price in cents BEFORE the 15% discount.
   *  Featured = 599 × 12 × 100 = 718800. Concierge = 1000 × 12 × 100 = 1200000.
   *  The 15% discount only applies at next renewal, not on the partial period.
   *  Only used on the annual branch. */
  addonFullAnnualCents: number;
  /** The add-on's monthly rate in cents (Featured=59900, Concierge=100000).
   *  Returned as the caller's reference rate when the monthly branch fires;
   *  Stripe-native proration uses this when computing the partial month. */
  addonMonthlyCents: number;
  /** End of the parent subscription's current period. */
  periodEnd: Date;
  /** Override the "now" timestamp — defaults to actual now. */
  now?: Date;
}

export interface UpgradeProrationResult {
  /** Where the charge originates.
   *   • 'stripe-native': the caller should let Stripe prorate on the
   *     subscriptions.update call (proration_behavior: 'create_prorations').
   *     proratedChargeCents is null in that case — Stripe computes it.
   *   • 'computed': we calculated proratedChargeCents in this module. */
  handledBy: "stripe-native" | "computed";
  daysRemaining: number;
  dailyRateCents: number;
  proratedChargeCents: number | null;
}

/**
 * Two-branch upgrade proration:
 *
 *   currentBillingPeriod === 'monthly'
 *     Stripe handles partial-month proration natively when you add a
 *     subscription item with proration_behavior: 'create_prorations'.
 *     We return handledBy: 'stripe-native' and a null proratedChargeCents
 *     — the caller should NOT compute its own number, just pass through
 *     to Stripe.
 *
 *   currentBillingPeriod === 'annual'
 *     Custom math, since we want the add-on to align with the parent
 *     annual period:
 *       daily_rate       = addon_full_annual_cents / 365
 *       days_remaining   = floor((period_end - now) / 1 day)   (whole days only)
 *       prorated_charge  = round(daily_rate × days_remaining)
 *     If days_remaining <= 0 (upgrade after period_end) → prorated_charge = 0.
 *     The caller should NOT issue a Stripe charge in that case.
 *
 * `daysRemaining` is floored (no partial days charged) and
 * `proratedChargeCents` is rounded to the nearest cent — both choices
 * documented here so the rounding behavior is transparent and auditable.
 */
export function computeUpgradeProration(
  input: UpgradeProrationInput,
): UpgradeProrationResult {
  const now = input.now ?? new Date();
  const elapsedMs = input.periodEnd.getTime() - now.getTime();
  const daysRemaining = elapsedMs > 0 ? Math.floor(elapsedMs / MS_PER_DAY) : 0;

  if (input.currentBillingPeriod === "monthly") {
    // Stripe handles the partial-month charge natively. We surface the
    // monthly daily-rate equivalent for any UI that wants to show the
    // customer a preview, but the authoritative number comes from Stripe.
    const monthlyCents = Math.max(0, Math.floor(input.addonMonthlyCents));
    const monthlyDailyRate = Math.round(monthlyCents / DAYS_PER_MONTH);
    return {
      handledBy: "stripe-native",
      daysRemaining,
      dailyRateCents: monthlyDailyRate,
      proratedChargeCents: null,
    };
  }

  // Annual branch: existing math.
  const addonAnnualCents = Math.max(0, Math.floor(input.addonFullAnnualCents));
  // Daily rate stored as a fractional value temporarily; we only
  // round the FINAL charge so the daily-rate display can show
  // accurate cents-with-fractional precision if needed.
  const dailyRateFloat = addonAnnualCents / DAYS_PER_YEAR;
  const proratedChargeCents = Math.round(dailyRateFloat * daysRemaining);

  return {
    handledBy: "computed",
    daysRemaining,
    dailyRateCents: Math.round(dailyRateFloat),
    proratedChargeCents,
  };
}

// ──────────────────────────────────────────────────────────────────────
// Tier constants — single source of truth for the math.
//
// `fullMonthlyRateCents` is the UN-discounted monthly figure used in
// the cancellation formula (full monthly rate × months used). This
// is intentionally HIGHER than the discounted annual ÷ 12 because the
// spec says cancelling mid-year forfeits the 15% discount.
//
// `discountedAnnualCents` is what Stripe actually charges at renewal
// (or initial purchase) — full_annual × 0.85.
//
// `fullAnnualCents` is full_monthly × 12, used for upgrade proration
// (no discount applies on a partial period).
// ──────────────────────────────────────────────────────────────────────

export const TIER_PRICING = {
  pro: {
    fullMonthlyRateCents: 9900,
    fullAnnualCents: 9900 * 12,                  // 118800
    discountedAnnualCents: Math.round(9900 * 12 * 0.85), // 100980
  },
  featured: {
    fullMonthlyRateCents: 59900,
    fullAnnualCents: 59900 * 12,                 // 718800
    // Spec-canonical value: $6,108.60. Pure arithmetic gives $6,109.80
    // (59900 × 12 × 0.85 = 610980); the $1.20 delta is a $-rounding
    // choice the spec made. Stripe charges 610860 cents and the math
    // module must match so the refund formula stays self-consistent.
    discountedAnnualCents: 610860, // $6,108.60
  },
  concierge: {
    fullMonthlyRateCents: 100000,
    fullAnnualCents: 100000 * 12,                // 1200000
    discountedAnnualCents: Math.round(100000 * 12 * 0.85), // 1020000
  },
} as const;

export type TierName = keyof typeof TIER_PRICING;
