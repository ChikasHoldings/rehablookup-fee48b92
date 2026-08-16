// ⚠ AUTO-GENERATED HEADER ⚠
// _shared modules have been inlined into this file so that
// `supabase functions deploy --use-api` (server-side bundler)
// doesn't need to resolve any local relative imports. The
// canonical sources live under supabase/functions/_shared/ —
// don't edit the inlined copies below; edit the originals and
// re-run `scripts/inline-stripe-webhook-shared.sh`.

// ── URL imports (dedup'd) ──────────────────────────────────
import Stripe from "https://esm.sh/stripe@18.5.0?target=denonext";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.2?target=denonext";
import { Resend } from "https://esm.sh/resend@2.0.0?target=denonext";
import {
  getSubscriptionPeriodEndDate,
  getSubscriptionPeriodEndISO,
  getSubscriptionPeriodStartDate,
  getSubscriptionPeriodStartISO,
} from "../_shared/stripe-subscription-period.ts";
import {
  normalizeFacilityIdMetadata,
  resolveProFacilityId,
} from "../_shared/pro-checkout-facility.ts";

// ── inlined from _shared/subscription-math.ts ─────────────
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

// ── inlined from _shared/cancel-subscription.ts ─────────────
// cancel-subscription.ts
// ──────────────────────
// Executor for facility-subscription cancellation. Computes refund(s)
// using subscription-math.ts (pure), issues Stripe refunds, records
// audit rows in subscription_cancellations, deactivates dependent
// featured_placements / concierge_partner_facilities, and updates the
// facility_subscriptions row's flags.
//
// Idempotency: callers can invoke this any number of times for the
// same (subscription_id, scope). The function looks up existing
// subscription_cancellations rows by `subscription_id` + the
// reason-tag suffix ("scope:pro" / "scope:featured" / "scope:concierge")
// before issuing any Stripe refund. A second call returns the existing
// refund totals without double-charging.
//
// All Stripe writes go through the existing _shared/stripe.ts helper.
// All Postgres writes are scoped to a single supabase client built
// with the SERVICE_ROLE key (callers don't pass clients — kept
// internal so privilege boundaries don't leak).

export type CancelScope = "all" | "addon-featured" | "addon-concierge";

export interface CancelResult {
  proRefundCents?: number;
  featuredRefundCents?: number;
  conciergeRefundCents?: number;
  totalRefundCents: number;
  stripeRefundIds: string[];
  cancellationRowIds: string[];
}

/** Reason-tag stored in `subscription_cancellations.reason` so the
 *  idempotency lookup can detect "this scope already cancelled". */
const SCOPE_TAGS = {
  pro: "scope:pro",
  featured: "scope:featured",
  concierge: "scope:concierge",
} as const;

interface FacilitySubscription {
  id: string;
  facility_id: string;
  provider_id: string | null;
  stripe_subscription_id: string | null;
  stripe_customer_id: string | null;
  status: string;
  tier: string;
  has_featured: boolean;
  has_concierge_partner: boolean;
  paid_amount_cents: number | null;
  price_cents: number;
  /** 'monthly' | 'annual' — drives the refund branch in subscription-math.
   *  Default 'annual' guards rows from before the monthly+annual schema
   *  correction; the webhook keeps this column in sync going forward. */
  billing_period: "monthly" | "annual";
  period_start: string | null;
  current_period_end: string | null;
  canceled_at: string | null;
}

function clientFromEnv(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );
}

function stripeFromEnv(): Stripe {
  return new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
    apiVersion: "2025-04-30.basil" as Stripe.LatestApiVersion,
  });
}

/**
 * Look up the most-recent successful Stripe charge for a subscription
 * (the renewal or initial invoice). Returns the charge id so refunds
 * target the right payment intent.
 */
async function findRefundableChargeId(
  stripe: Stripe,
  stripeSubId: string | null,
): Promise<string | null> {
  if (!stripeSubId) return null;
  try {
    const invoices = await stripe.invoices.list({ subscription: stripeSubId, limit: 5 });
    for (const inv of invoices.data) {
      if (inv.status === "paid" && inv.charge) {
        return typeof inv.charge === "string" ? inv.charge : inv.charge.id;
      }
    }
  } catch (err) {
    console.error("[cancel-subscription] findRefundableChargeId failed", err);
  }
  return null;
}

/**
 * Idempotency: check if we've already recorded a cancellation row for
 * (subscription_id, scope_tag). Returns the existing row when found.
 */
async function findExistingCancellation(
  supabase: SupabaseClient,
  subscriptionId: string,
  scopeTag: string,
): Promise<{ id: string; refund_amount_cents: number; stripe_refund_id: string | null } | null> {
  const { data } = await supabase
    .from("subscription_cancellations")
    .select("id, refund_amount_cents, stripe_refund_id")
    .eq("subscription_id", subscriptionId)
    .eq("reason", scopeTag)
    .maybeSingle();
  return (data as { id: string; refund_amount_cents: number; stripe_refund_id: string | null } | null) ?? null;
}

/**
 * Refund one tier (or add-on) and record the audit row. Returns the
 * refund amount in cents (0 if math says no refund) and the Stripe
 * refund id (null when amount = 0 or no Stripe charge found).
 *
 * Skips entirely if an existing cancellation row for this scope is
 * already present — that's how idempotency is enforced.
 */
async function refundOnePiece(args: {
  supabase: SupabaseClient;
  stripe: Stripe;
  subscription: FacilitySubscription;
  tier: TierName;
  scopeTag: string;
  paidAmountCents: number;
  triggeredBy?: string | null;
  reasonNote?: string | null;
}): Promise<{ refundCents: number; stripeRefundId: string | null; rowId: string | null }> {
  const { supabase, stripe, subscription, tier, scopeTag, paidAmountCents, triggeredBy, reasonNote } = args;

  // Idempotency
  const existing = await findExistingCancellation(supabase, subscription.id, scopeTag);
  if (existing) {
    return {
      refundCents: existing.refund_amount_cents,
      stripeRefundId: existing.stripe_refund_id,
      rowId: existing.id,
    };
  }

  const fullMonthlyRateCents = TIER_PRICING[tier].fullMonthlyRateCents;
  const periodStart = subscription.period_start
    ? new Date(subscription.period_start)
    : new Date();
  const periodEnd = subscription.current_period_end
    ? new Date(subscription.current_period_end)
    : undefined;

  const refund = computeCancellationRefund({
    billingPeriod: subscription.billing_period,
    paidAmountCents,
    fullMonthlyRateCents,
    periodStart,
    periodEnd,
  });

  // Issue Stripe refund (only when > 0 AND we have a charge to refund).
  let stripeRefundId: string | null = null;
  if (refund.refundCents > 0) {
    const chargeId = await findRefundableChargeId(stripe, subscription.stripe_subscription_id);
    if (chargeId) {
      try {
        const refundObj = await stripe.refunds.create({
          charge: chargeId,
          amount: refund.refundCents,
          reason: triggeredBy ? "duplicate" : "requested_by_customer",
          metadata: {
            subscription_id: subscription.id,
            facility_id: subscription.facility_id,
            scope: scopeTag,
            note: reasonNote ?? "",
            triggered_by: triggeredBy ?? "",
          },
        });
        stripeRefundId = refundObj.id;
      } catch (err) {
        console.error(`[cancel-subscription] Stripe refund failed (${scopeTag})`, err);
        // Continue — we still record the cancellation row with stripe_refund_id=null
        // so an admin can issue the refund manually if needed. Throwing here would
        // leave the subscription in a half-cancelled state.
        await notifyAdmin(supabase, {
          type: "subscription_refund_failed",
          title: `Refund failed for ${scopeTag}`,
          message: `Stripe refund of ${refund.refundCents}¢ failed for facility_subscriptions.id=${subscription.id} (charge=${chargeId}, ${scopeTag}). Cancellation row recorded without refund; manual refund required.`,
          metadata: {
            facility_subscription_id: subscription.id,
            charge_id: chargeId,
            scope_tag: scopeTag,
            attempted_refund_cents: refund.refundCents,
            error: err instanceof Error ? err.message : String(err),
          },
        });
      }
    } else {
      console.warn(
        `[cancel-subscription] no refundable charge for sub ${subscription.id} (${scopeTag}) — recording cancellation without Stripe refund`,
      );
      if (refund.refundCents > 0) {
        await notifyAdmin(supabase, {
          type: "subscription_refund_missing_charge",
          title: `No refundable charge for ${scopeTag}`,
          message: `Owed ${refund.refundCents}¢ for facility_subscriptions.id=${subscription.id} (${scopeTag}) but no underlying Stripe charge was found. Manual review required.`,
          metadata: {
            facility_subscription_id: subscription.id,
            stripe_subscription_id: subscription.stripe_subscription_id,
            scope_tag: scopeTag,
            owed_refund_cents: refund.refundCents,
          },
        });
      }
    }
  }

  // Audit row
  const { data: inserted, error } = await supabase
    .from("subscription_cancellations")
    .insert({
      subscription_id: subscription.id,
      months_used: refund.monthsUsed,
      full_monthly_rate_cents: fullMonthlyRateCents,
      paid_amount_cents: paidAmountCents,
      charged_for_use_cents: refund.chargeForUseCents,
      refund_amount_cents: refund.refundCents,
      stripe_refund_id: stripeRefundId,
      reason: scopeTag,
      canceled_by: triggeredBy ?? null,
    })
    .select("id")
    .single();

  if (error || !inserted) {
    console.error(`[cancel-subscription] failed to insert cancellation row (${scopeTag})`, error);
    await notifyAdmin(supabase, {
      type: "subscription_cancellation_row_insert_failed",
      title: `Cancellation audit row insert failed (${scopeTag})`,
      message: `subscription_cancellations insert errored for facility_subscriptions.id=${subscription.id} (${scopeTag}). Refund may still have been issued; reconcile manually.`,
      metadata: {
        facility_subscription_id: subscription.id,
        scope_tag: scopeTag,
        attempted_refund_cents: refund.refundCents,
        stripe_refund_id: stripeRefundId,
        error: error?.message ?? "unknown",
      },
    });
    return { refundCents: refund.refundCents, stripeRefundId, rowId: null };
  }
  return { refundCents: refund.refundCents, stripeRefundId, rowId: (inserted as { id: string }).id };
}

/**
 * Best-effort admin alert. Never throws — failure to notify is itself
 * just console-logged so it can't cascade and break the refund path.
 */
async function notifyAdmin(
  supabase: SupabaseClient,
  args: { type: string; title: string; message: string; metadata: Record<string, unknown> },
): Promise<void> {
  try {
    await supabase.from("admin_notifications").insert({
      type: args.type,
      title: args.title,
      message: args.message,
      metadata: args.metadata,
    });
  } catch (err) {
    console.warn("[cancel-subscription] admin notification insert failed", err);
  }
}

/**
 * Deactivate every featured_placements row tied to a subscription.
 * Idempotent — re-running just bumps deactivated_at on rows already
 * inactive (the WHERE active=true filter scopes this safely).
 */
async function deactivateFeaturedPlacements(supabase: SupabaseClient, subscriptionId: string): Promise<void> {
  const { error } = await supabase
    .from("featured_placements")
    .update({ active: false, deactivated_at: new Date().toISOString() })
    .eq("subscription_id", subscriptionId)
    .eq("active", true);
  if (error) console.error("[cancel-subscription] deactivateFeaturedPlacements failed", error);
}

async function deactivateConciergeGeosForSub(supabase: SupabaseClient, subscriptionId: string): Promise<void> {
  const { error } = await supabase
    .from("concierge_partner_facilities")
    .update({ active: false, deactivated_at: new Date().toISOString() })
    .eq("subscription_id", subscriptionId)
    .eq("active", true);
  if (error) console.error("[cancel-subscription] deactivateConciergeGeosForSub failed", error);
}

/**
 * Public API.
 *
 * scope='all'              — cancel Pro AND every active add-on. Three
 *                            separate refunds, three audit rows.
 * scope='addon-featured'   — cancel JUST Featured. Pro stays active.
 * scope='addon-concierge'  — cancel JUST Concierge Partner.
 *
 * Idempotent on (subscription_id, scope). The webhook's
 * stripe_webhook_events guard provides outer idempotency; this
 * function's per-scope cancellation lookup provides inner idempotency
 * so an admin manual call AFTER the webhook has already cancelled
 * Pro doesn't double-refund.
 */
export async function cancelSubscriptionAndRefund(
  subscriptionId: string,
  options: {
    scope: CancelScope;
    reason?: string;
    triggeredBy?: string | null;
  },
): Promise<CancelResult> {
  const supabase = clientFromEnv();
  const stripe = stripeFromEnv();

  const { data: subRow, error: subError } = await supabase
    .from("facility_subscriptions")
    .select(
      "id, facility_id, provider_id, stripe_subscription_id, stripe_customer_id, status, tier, has_featured, has_concierge_partner, paid_amount_cents, price_cents, billing_period, period_start, current_period_end, canceled_at",
    )
    .eq("id", subscriptionId)
    .single();

  if (subError || !subRow) {
    throw new Error(`facility_subscription ${subscriptionId} not found`);
  }
  const subscription = subRow as FacilitySubscription;

  const refundIds: string[] = [];
  const rowIds: string[] = [];
  const result: CancelResult = {
    totalRefundCents: 0,
    stripeRefundIds: refundIds,
    cancellationRowIds: rowIds,
  };

  // Per-tier paid amount. For annual subscribers, this is the
  // discounted annual ($1,009.80 / $6,108.60 / $10,200). For monthly,
  // it's the monthly amount actually charged this period (full rate,
  // no discount). The math module returns refund=0 on the monthly
  // branch regardless, so this value just feeds the audit row.
  const isMonthly = subscription.billing_period === "monthly";
  const paidForPro = isMonthly
    ? TIER_PRICING.pro.fullMonthlyRateCents
    : TIER_PRICING.pro.discountedAnnualCents;
  const paidForFeatured = isMonthly
    ? TIER_PRICING.featured.fullMonthlyRateCents
    : TIER_PRICING.featured.discountedAnnualCents;
  const paidForConcierge = isMonthly
    ? TIER_PRICING.concierge.fullMonthlyRateCents
    : TIER_PRICING.concierge.discountedAnnualCents;

  if (options.scope === "all") {
    // 1) Pro
    const pro = await refundOnePiece({
      supabase, stripe, subscription,
      tier: "pro",
      scopeTag: SCOPE_TAGS.pro,
      paidAmountCents: paidForPro,
      triggeredBy: options.triggeredBy ?? null,
      reasonNote: options.reason ?? null,
    });
    result.proRefundCents = pro.refundCents;
    if (pro.stripeRefundId) refundIds.push(pro.stripeRefundId);
    if (pro.rowId) rowIds.push(pro.rowId);

    // 2) Featured (only if currently held)
    if (subscription.has_featured) {
      const f = await refundOnePiece({
        supabase, stripe, subscription,
        tier: "featured",
        scopeTag: SCOPE_TAGS.featured,
        paidAmountCents: paidForFeatured,
        triggeredBy: options.triggeredBy ?? null,
        reasonNote: options.reason ?? null,
      });
      result.featuredRefundCents = f.refundCents;
      if (f.stripeRefundId) refundIds.push(f.stripeRefundId);
      if (f.rowId) rowIds.push(f.rowId);
    }

    // 3) Concierge (only if currently held)
    if (subscription.has_concierge_partner) {
      const c = await refundOnePiece({
        supabase, stripe, subscription,
        tier: "concierge",
        scopeTag: SCOPE_TAGS.concierge,
        paidAmountCents: paidForConcierge,
        triggeredBy: options.triggeredBy ?? null,
        reasonNote: options.reason ?? null,
      });
      result.conciergeRefundCents = c.refundCents;
      if (c.stripeRefundId) refundIds.push(c.stripeRefundId);
      if (c.rowId) rowIds.push(c.rowId);
    }

    // 4) Deactivate dependent rows
    await deactivateFeaturedPlacements(supabase, subscription.id);
    await deactivateConciergeGeosForSub(supabase, subscription.id);

    // 5) Mark subscription cancelled
    await supabase
      .from("facility_subscriptions")
      .update({
        status: "canceled",
        canceled_at: new Date().toISOString(),
        has_featured: false,
        has_concierge_partner: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", subscription.id);
  } else if (options.scope === "addon-featured") {
    if (!subscription.has_featured) {
      return result; // nothing to do
    }
    const f = await refundOnePiece({
      supabase, stripe, subscription,
      tier: "featured",
      scopeTag: SCOPE_TAGS.featured,
      paidAmountCents: paidForFeatured,
      triggeredBy: options.triggeredBy ?? null,
      reasonNote: options.reason ?? null,
    });
    result.featuredRefundCents = f.refundCents;
    if (f.stripeRefundId) refundIds.push(f.stripeRefundId);
    if (f.rowId) rowIds.push(f.rowId);

    await deactivateFeaturedPlacements(supabase, subscription.id);
    await supabase
      .from("facility_subscriptions")
      .update({ has_featured: false, updated_at: new Date().toISOString() })
      .eq("id", subscription.id);
  } else if (options.scope === "addon-concierge") {
    if (!subscription.has_concierge_partner) {
      return result;
    }
    const c = await refundOnePiece({
      supabase, stripe, subscription,
      tier: "concierge",
      scopeTag: SCOPE_TAGS.concierge,
      paidAmountCents: paidForConcierge,
      triggeredBy: options.triggeredBy ?? null,
      reasonNote: options.reason ?? null,
    });
    result.conciergeRefundCents = c.refundCents;
    if (c.stripeRefundId) refundIds.push(c.stripeRefundId);
    if (c.rowId) rowIds.push(c.rowId);

    await deactivateConciergeGeosForSub(supabase, subscription.id);
    // Concierge INCLUDES Featured exposure — its activation seeds
    // featured_placements (homepage/national, international/global, state,
    // city). Deactivate them too so they stop rotating and stop counting
    // against placement caps once Concierge is canceled.
    await deactivateFeaturedPlacements(supabase, subscription.id);
    await supabase
      .from("facility_subscriptions")
      .update({ has_concierge_partner: false, updated_at: new Date().toISOString() })
      .eq("id", subscription.id);
  }

  result.totalRefundCents =
    (result.proRefundCents ?? 0) +
    (result.featuredRefundCents ?? 0) +
    (result.conciergeRefundCents ?? 0);

  return result;
}

// ── inlined from _shared/concierge-addon.ts ─────────────
// ============================================================================
// Concierge Marketing Add-On activation / deactivation — single source of truth.
//
// activateConciergePartner:
//   - Flip facility_subscriptions.has_concierge_partner=true, store the
//     Concierge Stripe sub id alongside the canonical (Pro) row keyed on
//     facility_id.
//   - Auto-opt-in the facility to the concierge network (so it becomes
//     match-eligible immediately) and stamp concierge_opted_in_at.
//     concierge_terms_accepted_at stays null — explicit terms acceptance
//     is collected by BillingConcierge so the EKRA paper-trail is honest.
//   - Seed one concierge_partner_facilities row for the facility's home
//     geo (state + city) with a broad level_of_care default, so the
//     facility is instantly eligible for advisor matching in its own
//     home market. Provider refines via BillingConcierge "Add geo".
//   - Re-activate any previously deactivated partner rows on re-purchase
//     (UNIQUE on (facility_id, geo_state, geo_city) ⇒ rebuy after
//     cancel flips active=true rather than inserting).
//
// deactivateConciergePartner:
//   - Flip has_concierge_partner=false, clear concierge_stripe_subscription_id.
//   - Mark all active concierge_partner_facilities rows for this sub
//     active=false, deactivated_at=now().
//   - Does NOT auto-revert concierge_network_opted_in — that's the
//     provider's choice (they may want to stay opted in unpaid, just
//     without the partner badge).
//
// Idempotent under Stripe webhook retries.
// ============================================================================

interface FacilityRow {
  id: string;
  state: string | null;
  city: string | null;
  concierge_network_opted_in: boolean | null;
  concierge_opted_in_at: string | null;
  concierge_accepted_care_types: string[] | null;
}

// Broad default LoC seed — mirrors the levelOfCareMap used by
// match-concierge-intake (detox / inpatient / residential / php / iop /
// outpatient / sober_living). Over-broad here is fine; the matching
// algorithm intersects with the seeker's specific LoC need.
const DEFAULT_LEVELS_OF_CARE = [
  "detox",
  "inpatient",
  "residential",
  "php",
  "iop",
  "outpatient",
  "sober_living",
] as const;

export interface ActivateConciergeResult {
  has_concierge_partner_set: boolean;
  network_opted_in_set: boolean;
  partner_rows_inserted: number;
  partner_rows_reactivated: number;
  // H5: set to the INCOMING Stripe sub id when activation was refused because a
  // DIFFERENT Concierge sub is already tracked for this facility (a duplicate
  // purchase within the checkout→webhook window). The caller cancels + refunds
  // this id so the orphaned live sub stops double-charging. null = no duplicate.
  duplicateSubscriptionId: string | null;
  failed: { step: string; error: string }[];
}

export async function activateConciergePartner(
  supabase: SupabaseClient,
  args: {
    facilityId: string;
    stripeSubscriptionId: string;
    currentPeriodEnd: string | null;
  },
): Promise<ActivateConciergeResult> {
  const result: ActivateConciergeResult = {
    has_concierge_partner_set: false,
    network_opted_in_set: false,
    partner_rows_inserted: 0,
    partner_rows_reactivated: 0,
    duplicateSubscriptionId: null,
    failed: [],
  };

  const { data: facSubRow, error: subLookupErr } = await supabase
    .from("facility_subscriptions")
    .select("id, facility_id, has_concierge_partner, concierge_stripe_subscription_id")
    .eq("facility_id", args.facilityId)
    .maybeSingle();
  if (subLookupErr) {
    result.failed.push({ step: "subscription_lookup", error: subLookupErr.message });
    return result;
  }
  if (!facSubRow) {
    result.failed.push({
      step: "subscription_lookup",
      error: "no facility_subscriptions row exists; Pro upgrade must precede Concierge",
    });
    return result;
  }

  const facSubId = (facSubRow as { id: string }).id;

  // H5 duplicate-purchase orphan guard: Concierge is already active on a
  // DIFFERENT Stripe subscription. Overwriting concierge_stripe_subscription_id
  // would strand that live sub (untracked, still billing the provider). Keep
  // the existing sub, hand the incoming duplicate back to the caller to cancel
  // + refund, and stop — the existing sub already owns the partner rows. A
  // re-run for the SAME sub id (Stripe retry) falls through to the idempotent path.
  const existingConciergeSubId =
    (facSubRow as { concierge_stripe_subscription_id: string | null }).concierge_stripe_subscription_id;
  if (
    (facSubRow as { has_concierge_partner: boolean }).has_concierge_partner === true &&
    existingConciergeSubId &&
    existingConciergeSubId !== args.stripeSubscriptionId
  ) {
    result.duplicateSubscriptionId = args.stripeSubscriptionId;
    return result;
  }

  // 1. Flip the partner flag + record the Stripe sub id.
  const { error: flagErr } = await supabase
    .from("facility_subscriptions")
    .update({
      has_concierge_partner: true,
      concierge_stripe_subscription_id: args.stripeSubscriptionId,
      // Persist the add-on sub's own period (it bills independently of Pro).
      concierge_current_period_end: args.currentPeriodEnd,
      updated_at: new Date().toISOString(),
    })
    .eq("id", facSubId);
  if (flagErr) {
    result.failed.push({ step: "flag_update", error: flagErr.message });
    return result;
  }
  result.has_concierge_partner_set = true;

  // 2. Read the facility to seed geo + opt-in.
  const { data: facility, error: facErr } = await supabase
    .from("facilities")
    .select(
      "id, state, city, concierge_network_opted_in, concierge_opted_in_at, concierge_accepted_care_types",
    )
    .eq("id", args.facilityId)
    .maybeSingle();
  if (facErr) {
    result.failed.push({ step: "facility_lookup", error: facErr.message });
    return result;
  }
  if (!facility) {
    result.failed.push({ step: "facility_lookup", error: "facility row not found" });
    return result;
  }
  const fac = facility as FacilityRow;

  // 3. Auto-opt-in to the matching network if not already in (matching
  //    gates on concierge_network_opted_in=true). Don't auto-set
  //    concierge_terms_accepted_at — that's collected in the UI.
  if (!fac.concierge_network_opted_in) {
    const optInUpdate: Record<string, unknown> = {
      concierge_network_opted_in: true,
      updated_at: new Date().toISOString(),
    };
    if (!fac.concierge_opted_in_at) {
      optInUpdate.concierge_opted_in_at = new Date().toISOString();
    }
    // Seed broad default accepted-care-types if the field is null/empty
    // so the facility scores in the careType dimension of matching.
    if (!fac.concierge_accepted_care_types || (Array.isArray(fac.concierge_accepted_care_types) && fac.concierge_accepted_care_types.length === 0)) {
      optInUpdate.concierge_accepted_care_types = [...DEFAULT_LEVELS_OF_CARE];
    }
    const { error: optInErr } = await supabase
      .from("facilities")
      .update(optInUpdate)
      .eq("id", args.facilityId);
    if (optInErr) {
      result.failed.push({ step: "network_opt_in", error: optInErr.message });
    } else {
      result.network_opted_in_set = true;
    }
  }

  // 4. Seed the home-geo concierge_partner_facilities row. UNIQUE on
  //    (facility_id, geo_state, geo_city) — re-purchase reactivates.
  if (fac.state && fac.state.trim().length > 0) {
    const geoState = fac.state.trim().toUpperCase();
    const geoCity = fac.city && fac.city.trim().length > 0 ? fac.city.trim() : null;

    const { data: existing } = await supabase
      .from("concierge_partner_facilities")
      .select("id, active")
      .eq("facility_id", args.facilityId)
      .eq("geo_state", geoState)
      .eq("geo_city", geoCity as never)
      .maybeSingle();

    if (existing) {
      const wasInactive = (existing as { active: boolean }).active === false;
      if (wasInactive) {
        const { error: reactErr } = await supabase
          .from("concierge_partner_facilities")
          .update({
            subscription_id: facSubId,
            level_of_care: [...DEFAULT_LEVELS_OF_CARE],
            active: true,
            activated_at: new Date().toISOString(),
            deactivated_at: null,
          })
          .eq("id", (existing as { id: string }).id);
        if (reactErr) {
          result.failed.push({ step: "partner_row_reactivate", error: reactErr.message });
        } else {
          result.partner_rows_reactivated++;
        }
      }
    } else {
      const { error: insErr } = await supabase.from("concierge_partner_facilities").insert({
        facility_id: args.facilityId,
        subscription_id: facSubId,
        geo_state: geoState,
        geo_city: geoCity,
        level_of_care: [...DEFAULT_LEVELS_OF_CARE],
        active: true,
        activated_at: new Date().toISOString(),
      });
      if (insErr) {
        result.failed.push({ step: "partner_row_insert", error: insErr.message });
      } else {
        result.partner_rows_inserted++;
      }
    }
  }

  // 5. Concierge INCLUDES Featured exposure: seed featured_placements for the
  //    national homepage + the facility's local state/city + the international
  //    pages. The Phase-0 paywall guard accepts has_concierge_partner (set in
  //    step 1), so these writes are authorized. Idempotent; failures non-fatal.
  {
    const slugify = (s: string): string =>
      s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const featuredSeeds: { type: string; value: string }[] = [
      { type: "homepage", value: "national" },
      { type: "international", value: "global" },
    ];
    if (fac.state && fac.state.trim().length > 0) {
      const stateSlug = slugify(fac.state);
      if (stateSlug.length >= 2 && stateSlug !== "unknown" && stateSlug !== "n-a") {
        featuredSeeds.push({ type: "state", value: stateSlug });
      }
    }
    if (fac.city && fac.city.trim().length > 0) {
      const citySlug = slugify(fac.city);
      if (citySlug.length >= 2 && citySlug !== "unknown" && citySlug !== "n-a") {
        featuredSeeds.push({ type: "city", value: citySlug });
      }
    }
    for (const seed of featuredSeeds) {
      const { data: existingFp } = await supabase
        .from("featured_placements")
        .select("id, active")
        .eq("facility_id", args.facilityId)
        .eq("placement_type", seed.type)
        .eq("placement_value", seed.value)
        .maybeSingle();
      if (existingFp) {
        if ((existingFp as { active: boolean }).active === false) {
          const { error: reErr } = await supabase
            .from("featured_placements")
            .update({
              subscription_id: facSubId,
              active: true,
              activated_at: new Date().toISOString(),
              deactivated_at: null,
            })
            .eq("id", (existingFp as { id: string }).id);
          if (reErr) result.failed.push({ step: `featured_${seed.type}_reactivate`, error: reErr.message });
        }
      } else {
        const { error: insErr } = await supabase.from("featured_placements").insert({
          facility_id: args.facilityId,
          subscription_id: facSubId,
          placement_type: seed.type,
          placement_value: seed.value,
          active: true,
          activated_at: new Date().toISOString(),
        });
        if (insErr) result.failed.push({ step: `featured_${seed.type}_insert`, error: insErr.message });
      }
    }
  }

  return result;
}

export interface DeactivateConciergeResult {
  has_concierge_partner_cleared: boolean;
  partner_rows_deactivated: number;
  failed: { step: string; error: string }[];
}

export async function deactivateConciergePartner(
  supabase: SupabaseClient,
  args: { facilityId?: string; stripeSubscriptionId?: string },
): Promise<DeactivateConciergeResult> {
  const result: DeactivateConciergeResult = {
    has_concierge_partner_cleared: false,
    partner_rows_deactivated: 0,
    failed: [],
  };

  let query = supabase
    .from("facility_subscriptions")
    .select("id, facility_id, has_concierge_partner, has_featured");
  if (args.facilityId) {
    query = query.eq("facility_id", args.facilityId);
  } else if (args.stripeSubscriptionId) {
    query = query.eq("concierge_stripe_subscription_id", args.stripeSubscriptionId);
  } else {
    result.failed.push({ step: "lookup_args", error: "either facilityId or stripeSubscriptionId required" });
    return result;
  }
  const { data: facSubRow, error: lookupErr } = await query.maybeSingle();
  if (lookupErr) {
    result.failed.push({ step: "subscription_lookup", error: lookupErr.message });
    return result;
  }
  if (!facSubRow) {
    return result;
  }

  const facSubId = (facSubRow as { id: string }).id;
  const hasFeatured = (facSubRow as { has_featured: boolean }).has_featured === true;

  const { error: flagErr } = await supabase
    .from("facility_subscriptions")
    .update({
      has_concierge_partner: false,
      concierge_stripe_subscription_id: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", facSubId);
  if (flagErr) {
    result.failed.push({ step: "flag_clear", error: flagErr.message });
  } else {
    result.has_concierge_partner_cleared = true;
  }

  const { data: deactivatedRows, error: partnerErr } = await supabase
    .from("concierge_partner_facilities")
    .update({ active: false, deactivated_at: new Date().toISOString() })
    .eq("subscription_id", facSubId)
    .eq("active", true)
    .select("id");
  if (partnerErr) {
    result.failed.push({ step: "partner_rows_deactivate", error: partnerErr.message });
  } else {
    result.partner_rows_deactivated = (deactivatedRows ?? []).length;
  }

  // Concierge activation also seeds featured_placements (homepage/national,
  // international/global, state, city) — its included advertising exposure.
  // Deactivate those on cancel so they stop rotating AND stop counting against
  // placement caps (get_placement_availability counts active rows regardless
  // of the subscription flags). Skip if Featured is (still) active and thus
  // owns the shared rows — mutually exclusive in practice, but guard anyway.
  if (!hasFeatured) {
    const { error: fpErr } = await supabase
      .from("featured_placements")
      .update({ active: false, deactivated_at: new Date().toISOString() })
      .eq("subscription_id", facSubId)
      .eq("active", true);
    if (fpErr) {
      result.failed.push({ step: "featured_placements_deactivate", error: fpErr.message });
    }
  }

  return result;
}

export async function notifyConciergeAddonPartialFailure(
  supabase: SupabaseClient,
  args: {
    eventType: string;
    facilityId?: string;
    stripeSubscriptionId?: string;
    stripeEventId?: string | null;
    result: ActivateConciergeResult | DeactivateConciergeResult;
  },
): Promise<void> {
  if (args.result.failed.length === 0) return;
  try {
    await supabase.from("admin_notifications").insert({
      type: "concierge_addon_partial_failure",
      title: `Concierge add-on sync had ${args.result.failed.length} failure(s)`,
      message:
        `Event ${args.eventType} for facility ${args.facilityId ?? "?"} / sub ${args.stripeSubscriptionId ?? "?"} ` +
        `couldn't fully sync the Concierge partner state. Steps that failed: ` +
        args.result.failed.map((f) => f.step).join(", "),
      metadata: {
        facility_id: args.facilityId ?? null,
        stripe_subscription_id: args.stripeSubscriptionId ?? null,
        stripe_event_id: args.stripeEventId ?? null,
        event_type: args.eventType,
        failures: args.result.failed,
      },
    });
  } catch (err) {
    console.warn("[concierge-addon] admin notification failed", err);
  }
}

// ── inlined from _shared/featured-addon.ts ─────────────
// ============================================================================
// Featured Add-On activation / deactivation — single source of truth.
//
// activateFeaturedAddon:
//   - Flip facility_subscriptions.has_featured=true, store the Featured
//     Stripe sub id alongside the canonical (Pro) row keyed on facility_id.
//   - Seed featured_placements rows for the facility's geography so the
//     facility appears in homepage / state / city / search rotations on
//     purchase. Treatment-type + insurance slots remain provider-driven
//     via the slot-selector UI (BillingPlacements add-flow).
//   - Re-activate any previously deactivated placements (re-purchase
//     after a cancel/refund).
//
// deactivateFeaturedAddon:
//   - Flip has_featured=false, clear featured_stripe_subscription_id.
//   - Set all featured_placements rows for this subscription to
//     active=false, deactivated_at=now().
//
// Idempotency: both helpers are safe to re-run on Stripe retries.
// has_featured flips are guarded; placement seeding uses upsert
// semantics; deactivation is a WHERE active=true filter.
// ============================================================================

interface FacilityRow {
  id: string;
  state: string | null;
  city: string | null;
}

export interface ActivateFeaturedResult {
  has_featured_set: boolean;
  placements_inserted: number;
  placements_reactivated: number;
  // H5: set to the INCOMING Stripe sub id when activation was refused because a
  // DIFFERENT Featured sub is already tracked for this facility (a duplicate
  // purchase within the checkout→webhook window). The caller cancels + refunds
  // this id so the orphaned live sub stops double-charging. null = no duplicate.
  duplicateSubscriptionId: string | null;
  failed: { step: string; error: string }[];
}

// Slugify matches src/lib/featuredBucket.ts so server-side seeds line up
// with the bucket tokens client-side resolveSearchBucket() produces.
function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function buildSeedPlacements(facility: FacilityRow): { type: string; value: string }[] {
  const out: { type: string; value: string }[] = [];
  // Featured is LOCAL/REGIONAL only — NO homepage/national seed. National +
  // international exposure is reserved for the Concierge Partner upgrade. We
  // seed the facility's own state + city pages, derived from its address.
  // State pool — slugified to match what StatePage queries (stateData.slug)
  // and what AddFeaturedPlacementForm derives.
  if (facility.state && facility.state.trim().length > 0) {
    const stateSlug = slugify(facility.state);
    if (stateSlug.length >= 2 && stateSlug !== "unknown" && stateSlug !== "n-a") {
      out.push({ type: "state", value: stateSlug });
    }
  }
  // City pool — slugified to match the resolveSearchBucket() / CityPage output.
  if (facility.city && facility.city.trim().length > 0) {
    const citySlug = slugify(facility.city);
    if (citySlug.length >= 2 && citySlug !== "unknown" && citySlug !== "n-a") {
      out.push({ type: "city", value: citySlug });
    }
  }
  return out;
}

export async function activateFeaturedAddon(
  supabase: SupabaseClient,
  args: {
    facilityId: string;
    stripeSubscriptionId: string;
    currentPeriodEnd: string | null;
  },
): Promise<ActivateFeaturedResult> {
  const result: ActivateFeaturedResult = {
    has_featured_set: false,
    placements_inserted: 0,
    placements_reactivated: 0,
    duplicateSubscriptionId: null,
    failed: [],
  };

  const { data: facSubRow, error: subLookupErr } = await supabase
    .from("facility_subscriptions")
    .select("id, facility_id, has_featured, featured_stripe_subscription_id")
    .eq("facility_id", args.facilityId)
    .maybeSingle();
  if (subLookupErr) {
    result.failed.push({ step: "subscription_lookup", error: subLookupErr.message });
    return result;
  }
  if (!facSubRow) {
    result.failed.push({
      step: "subscription_lookup",
      error: "no facility_subscriptions row exists; Pro upgrade must precede Featured",
    });
    return result;
  }

  const facSubId = (facSubRow as { id: string }).id;

  // H5 duplicate-purchase orphan guard: Featured is already active on a
  // DIFFERENT Stripe subscription. Overwriting featured_stripe_subscription_id
  // would strand that live sub (untracked, still billing the provider). Keep
  // the existing sub, hand the incoming duplicate back to the caller to cancel
  // + refund, and stop — the existing sub already owns the placements. A re-run
  // for the SAME sub id (Stripe retry) falls through to the idempotent path.
  const existingFeaturedSubId =
    (facSubRow as { featured_stripe_subscription_id: string | null }).featured_stripe_subscription_id;
  if (
    (facSubRow as { has_featured: boolean }).has_featured === true &&
    existingFeaturedSubId &&
    existingFeaturedSubId !== args.stripeSubscriptionId
  ) {
    result.duplicateSubscriptionId = args.stripeSubscriptionId;
    return result;
  }

  const { error: flagErr } = await supabase
    .from("facility_subscriptions")
    .update({
      has_featured: true,
      featured_stripe_subscription_id: args.stripeSubscriptionId,
      // Persist the add-on sub's own period (it bills independently of Pro).
      featured_current_period_end: args.currentPeriodEnd,
      updated_at: new Date().toISOString(),
    })
    .eq("id", facSubId);
  if (flagErr) {
    result.failed.push({ step: "flag_update", error: flagErr.message });
    return result;
  }
  result.has_featured_set = true;

  const { data: facility, error: facErr } = await supabase
    .from("facilities")
    .select("id, state, city")
    .eq("id", args.facilityId)
    .maybeSingle();
  if (facErr) {
    result.failed.push({ step: "facility_lookup", error: facErr.message });
    return result;
  }
  if (!facility) {
    result.failed.push({ step: "facility_lookup", error: "facility row not found" });
    return result;
  }

  const seeds = buildSeedPlacements(facility as FacilityRow);

  for (const seed of seeds) {
    const { data: existing } = await supabase
      .from("featured_placements")
      .select("id, active")
      .eq("facility_id", args.facilityId)
      .eq("placement_type", seed.type)
      .eq("placement_value", seed.value)
      .maybeSingle();

    if (existing) {
      const wasInactive = (existing as { active: boolean }).active === false;
      if (wasInactive) {
        const { error: reactErr } = await supabase
          .from("featured_placements")
          .update({
            subscription_id: facSubId,
            active: true,
            activated_at: new Date().toISOString(),
            deactivated_at: null,
          })
          .eq("id", (existing as { id: string }).id);
        if (reactErr) {
          result.failed.push({
            step: `placement_reactivate:${seed.type}:${seed.value}`,
            error: reactErr.message,
          });
        } else {
          result.placements_reactivated++;
        }
      }
      continue;
    }

    const { error: insErr } = await supabase.from("featured_placements").insert({
      facility_id: args.facilityId,
      subscription_id: facSubId,
      placement_type: seed.type,
      placement_value: seed.value,
      active: true,
      activated_at: new Date().toISOString(),
    });
    if (insErr) {
      result.failed.push({
        step: `placement_insert:${seed.type}:${seed.value}`,
        error: insErr.message,
      });
    } else {
      result.placements_inserted++;
    }
  }

  return result;
}

export interface DeactivateFeaturedResult {
  has_featured_cleared: boolean;
  placements_deactivated: number;
  failed: { step: string; error: string }[];
}

export async function deactivateFeaturedAddon(
  supabase: SupabaseClient,
  args: { facilityId?: string; stripeSubscriptionId?: string },
): Promise<DeactivateFeaturedResult> {
  const result: DeactivateFeaturedResult = {
    has_featured_cleared: false,
    placements_deactivated: 0,
    failed: [],
  };

  let query = supabase
    .from("facility_subscriptions")
    .select("id, facility_id, has_featured, has_concierge_partner");
  if (args.facilityId) {
    query = query.eq("facility_id", args.facilityId);
  } else if (args.stripeSubscriptionId) {
    query = query.eq("featured_stripe_subscription_id", args.stripeSubscriptionId);
  } else {
    result.failed.push({ step: "lookup_args", error: "either facilityId or stripeSubscriptionId required" });
    return result;
  }
  const { data: facSubRow, error: lookupErr } = await query.maybeSingle();
  if (lookupErr) {
    result.failed.push({ step: "subscription_lookup", error: lookupErr.message });
    return result;
  }
  if (!facSubRow) {
    return result;
  }

  const facSubId = (facSubRow as { id: string }).id;
  const hasConcierge = (facSubRow as { has_concierge_partner: boolean }).has_concierge_partner === true;

  const { error: flagErr } = await supabase
    .from("facility_subscriptions")
    .update({
      has_featured: false,
      featured_stripe_subscription_id: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", facSubId);
  if (flagErr) {
    result.failed.push({ step: "flag_clear", error: flagErr.message });
  } else {
    result.has_featured_cleared = true;
  }

  // Concierge Partner is the mutually-exclusive upgrade that INCLUDES Featured
  // exposure and OWNS the shared featured_placements rows (homepage/national,
  // international, state, city) for this subscription. When Featured is being
  // retired BECAUSE Concierge superseded it, the Featured Stripe sub's
  // subscription.deleted event must NOT deactivate those placements — Concierge
  // still needs them. Only deactivate when Concierge is not (also) active.
  if (hasConcierge) {
    return result;
  }

  const { data: deactivatedRows, error: placeErr } = await supabase
    .from("featured_placements")
    .update({ active: false, deactivated_at: new Date().toISOString() })
    .eq("subscription_id", facSubId)
    .eq("active", true)
    .select("id");
  if (placeErr) {
    result.failed.push({ step: "placement_deactivate", error: placeErr.message });
  } else {
    result.placements_deactivated = (deactivatedRows ?? []).length;
  }

  return result;
}

export async function notifyFeaturedAddonPartialFailure(
  supabase: SupabaseClient,
  args: {
    eventType: string;
    facilityId?: string;
    stripeSubscriptionId?: string;
    stripeEventId?: string | null;
    result: ActivateFeaturedResult | DeactivateFeaturedResult;
  },
): Promise<void> {
  if (args.result.failed.length === 0) return;
  try {
    await supabase.from("admin_notifications").insert({
      type: "featured_addon_partial_failure",
      title: `Featured add-on sync had ${args.result.failed.length} failure(s)`,
      message:
        `Event ${args.eventType} for facility ${args.facilityId ?? "?"} / sub ${args.stripeSubscriptionId ?? "?"} ` +
        `couldn't fully sync the Featured add-on state. Steps that failed: ` +
        args.result.failed.map((f) => f.step).join(", "),
      metadata: {
        facility_id: args.facilityId ?? null,
        stripe_subscription_id: args.stripeSubscriptionId ?? null,
        stripe_event_id: args.stripeEventId ?? null,
        event_type: args.eventType,
        failures: args.result.failed,
      },
    });
  } catch (err) {
    console.warn("[featured-addon] admin notification failed", err);
  }
}

// ─────────────────────────────────────────────────────────────────────────
// H5: duplicate add-on purchase recovery.
//
// When a provider buys the same add-on twice inside the checkout→webhook
// window (double-click, or re-buy before the first activation lands), Stripe
// creates a second subscription. The first already delivers the placements, so
// the second is pure double-billing. The activation helper refuses to overwrite
// the tracked sub id (that would orphan the live original); this cancels + FULLY
// refunds the redundant incoming sub. Idempotent via a subscription_cancellations
// row keyed on the duplicate sub id, so Stripe retries never double-refund.
// ─────────────────────────────────────────────────────────────────────────
async function refundAndCancelDuplicateAddon(
  stripe: Stripe,
  supabase: SupabaseClient,
  args: {
    product: "featured" | "concierge";
    facilityId: string;
    facSubId: string | null;
    duplicateSubId: string;
    keptSubId: string | null;
    stripeEventId: string | null;
  },
): Promise<void> {
  const reason = `duplicate:${args.product}:${args.duplicateSubId}`;
  try {
    // Idempotency: skip if we've already recovered this duplicate sub.
    if (args.facSubId) {
      const { data: existing } = await supabase
        .from("subscription_cancellations")
        .select("id")
        .eq("subscription_id", args.facSubId)
        .eq("reason", reason)
        .maybeSingle();
      if (existing) return;
    }

    // Full refund of the duplicate's latest paid invoice — it delivered no
    // incremental value (the kept sub already provides the add-on).
    const invoices = await stripe.invoices.list({ subscription: args.duplicateSubId, limit: 5 });
    let chargeId: string | null = null;
    let paidCents = 0;
    for (const inv of invoices.data) {
      if (inv.status === "paid" && inv.charge) {
        chargeId = typeof inv.charge === "string" ? inv.charge : inv.charge.id;
        paidCents = inv.amount_paid;
        break;
      }
    }
    let stripeRefundId: string | null = null;
    if (paidCents > 0 && chargeId) {
      const refundObj = await stripe.refunds.create({
        charge: chargeId,
        amount: paidCents,
        reason: "duplicate",
        metadata: {
          facility_id: args.facilityId,
          scope: reason,
          note: `Full refund: duplicate ${args.product} add-on purchase`,
        },
      });
      stripeRefundId = refundObj.id;
    }

    // Cancel the redundant Stripe sub so it stops billing.
    try {
      await stripe.subscriptions.cancel(args.duplicateSubId);
    } catch (cancelErr) {
      console.error("[stripe-webhook] duplicate add-on Stripe cancel failed", cancelErr);
    }

    // Audit + idempotency row (written even for the 0-refund case so a retry
    // short-circuits on the existence check above).
    if (args.facSubId) {
      await supabase.from("subscription_cancellations").insert({
        subscription_id: args.facSubId,
        reason,
        refund_amount_cents: paidCents,
        charged_for_use_cents: 0,
        full_monthly_rate_cents: TIER_PRICING[args.product].fullMonthlyRateCents,
        months_used: 0,
        paid_amount_cents: paidCents,
        stripe_refund_id: stripeRefundId,
        canceled_by: null,
      });
    }

    await supabase.from("admin_notifications").insert({
      type: "duplicate_addon_refunded",
      title: `Duplicate ${args.product} add-on auto-refunded`,
      message:
        `Facility ${args.facilityId} purchased the ${args.product} add-on twice. ` +
        `Kept sub ${args.keptSubId ?? "?"}; canceled + refunded the duplicate ` +
        `${args.duplicateSubId} ($${(paidCents / 100).toFixed(2)}` +
        `${stripeRefundId ? "" : ", no paid charge found to refund"}).`,
      metadata: {
        facility_id: args.facilityId,
        product: args.product,
        kept_subscription_id: args.keptSubId,
        duplicate_subscription_id: args.duplicateSubId,
        refund_amount_cents: paidCents,
        stripe_refund_id: stripeRefundId,
        stripe_event_id: args.stripeEventId,
      } as Record<string, unknown>,
    });
  } catch (err) {
    console.error("[stripe-webhook] duplicate add-on refund/cancel failed", err);
    await supabase.from("admin_notifications").insert({
      type: "duplicate_addon_refund_failed",
      title: `Duplicate ${args.product} add-on refund needs manual review`,
      message:
        `Facility ${args.facilityId} has a duplicate ${args.product} add-on ` +
        `(sub ${args.duplicateSubId}), but the automatic cancel/refund failed. ` +
        `Review in Stripe and cancel + refund the duplicate manually.`,
      metadata: {
        facility_id: args.facilityId,
        product: args.product,
        duplicate_subscription_id: args.duplicateSubId,
        error: err instanceof Error ? err.message : String(err),
      } as Record<string, unknown>,
    }).then(() => undefined, () => undefined);
  }
}

// ── inlined from _shared/pro-benefits.ts ─────────────
// ============================================================================
// Pro benefits activation / deactivation — single source of truth.
//
// Both checkout.session.completed (pro_subscription mode) and
// customer.subscription.created (Stripe-portal upgrades, admin manual subs,
// etc.) call activateProBenefits() so the benefits flip happens regardless
// of which event arrives first. subscription.deleted + the cancel-subscription
// shared module call deactivateProBenefits() to revert.
//
// ── WHAT PRO BUYS, AND WHAT IT DOES NOT (Stage-3 entitlement amendment) ─────
//
// Pro is a $99/mo PRODUCT tier. Paying for it buys product features:
// public facility phone + Call CTA, enhanced-profile media (video / virtual
// tour), the raised photo cap, and provider analytics.
//
// Paying for it does NOT buy trust, position, or visibility inventory:
//
//   • NOT verification. `facilities.verified` is a factual directory state
//     owned by the verification pipeline. This module must never write it.
//   • NOT organic ranking. `facilities.calculated_ranking_score` is derived
//     from neutral evidence signals by calculate-ranking-scores. This module
//     previously added a flat +50 to it on activation and subtracted 50 on
//     cancellation, which made organic position directly purchasable. That
//     is retired.
//   • NOT Featured. `facilities.featured` is a visibility flag; Pro is not
//     Featured and must not set it. Paid Featured inventory is represented
//     by featured_placements + facility_subscriptions.has_featured and is
//     served by get-featured-rotation into a separately labeled rail.
//
// So this module now writes exactly ONE thing: `profiles.plan`. That is not
// a no-op — the plan mirror drives the storage photo-cap trigger, and every
// other Pro entitlement (phone, media, is_pro) is derived live from
// facility_subscriptions via has_active_pro(), which the webhook maintains
// separately. Pro still activates; it just no longer reaches into trust,
// ranking or Featured state.
//
// Idempotency: the plan mirror is a plain idempotent UPDATE, so retries and
// duplicate webhook deliveries are safe by construction. The previous
// featured=false→true transition guard existed only to stop the +50 from
// double-applying and is no longer needed.
// ============================================================================

export interface ActivateResult {
  /**
   * Retained for interface compatibility with existing webhook call sites,
   * which log its length. Always empty: activation no longer mutates any
   * facility row. Facility-level Pro entitlement is derived from
   * facility_subscriptions by has_active_pro(), not stamped onto facilities.
   */
  facilitiesUpdated: string[];
  alreadyActive: string[];
  failed: { id: string; error: string }[];
  profilePlanMirrored: boolean;
  profileMirrorError?: string;
}

/**
 * Activate Pro benefits for the provider by mirroring `profiles.plan = 'pro'`
 * (drives the photo-cap trigger).
 *
 * Deliberately does NOT write `facilities.featured`,
 * `facilities.calculated_ranking_score`, or `facilities.verified` — payment
 * does not buy Featured placement, organic ranking, or trust.
 *
 * @param userId  The provider's auth user id.
 */
export async function activateProBenefits(
  supabase: SupabaseClient,
  userId: string,
): Promise<ActivateResult> {
  const result: ActivateResult = {
    facilitiesUpdated: [],
    alreadyActive: [],
    failed: [],
    profilePlanMirrored: false,
  };

  const { error: planErr } = await supabase
    .from("profiles")
    .update({ plan: "pro" })
    .eq("user_id", userId);
  if (planErr) {
    result.profileMirrorError = planErr.message;
  } else {
    result.profilePlanMirrored = true;
  }

  return result;
}

export interface DeactivateResult {
  /**
   * Retained for interface compatibility with existing webhook call sites,
   * which log its length. Always empty: deactivation no longer mutates any
   * facility row.
   */
  facilitiesReverted: string[];
  failed: { id: string; error: string }[];
  profilePlanReverted: boolean;
  profileMirrorError?: string;
}

/**
 * Revert Pro benefits for the provider by mirroring `profiles.plan = 'free'`.
 *
 * Deliberately does NOT clear `facilities.featured` or subtract from
 * `facilities.calculated_ranking_score`.
 *
 * Cancelling Pro must not strip a facility of an independent Featured
 * entitlement it may legitimately hold — after Stage 3, Featured is a
 * separate purchase tracked in featured_placements /
 * facility_subscriptions.has_featured, and a provider who buys Featured
 * without Pro (or keeps Featured after dropping Pro) must keep it. The old
 * `featured = false` write here was the mirror image of the activation
 * write: it treated one boolean as though it belonged to Pro.
 *
 * Losing Pro still correctly removes the Pro product features, because those
 * are derived live from facility_subscriptions via has_active_pro() rather
 * than stamped onto the facility row.
 */
export async function deactivateProBenefits(
  supabase: SupabaseClient,
  userId: string,
): Promise<DeactivateResult> {
  const result: DeactivateResult = {
    facilitiesReverted: [],
    failed: [],
    profilePlanReverted: false,
  };

  const { error: planErr } = await supabase
    .from("profiles")
    .update({ plan: "free" })
    .eq("user_id", userId);
  if (planErr) {
    result.profileMirrorError = planErr.message;
  } else {
    result.profilePlanReverted = true;
  }

  return result;
}

/**
 * Post an admin_notifications row when benefit activation/deactivation
 * partially fails. Best-effort — failure to notify is itself logged but
 * not propagated.
 */
export async function notifyProBenefitsPartialFailure(
  supabase: SupabaseClient,
  args: {
    userId: string;
    eventType: string;
    result: ActivateResult | DeactivateResult;
    stripeEventId?: string | null;
  },
): Promise<void> {
  const failures = args.result.failed.length;
  const mirrorErr = "profileMirrorError" in args.result ? args.result.profileMirrorError : undefined;
  if (failures === 0 && !mirrorErr) return;
  try {
    await supabase.from("admin_notifications").insert({
      type: "pro_benefits_partial_failure",
      title: `Pro benefits sync had ${failures + (mirrorErr ? 1 : 0)} failure(s)`,
      message:
        `Event ${args.eventType} for user ${args.userId} couldn't fully apply Pro benefits. ` +
        (mirrorErr ? `Profile mirror error: ${mirrorErr}. ` : "") +
        (failures > 0 ? `Failed facility updates: ${failures}.` : ""),
      metadata: {
        user_id: args.userId,
        event_type: args.eventType,
        stripe_event_id: args.stripeEventId ?? null,
        profile_mirror_error: mirrorErr ?? null,
        failed_facilities: args.result.failed,
      },
    });
  } catch (err) {
    console.warn("[pro-benefits] admin notification failed", err);
  }
}

// ── inlined from _shared/resilient-email-sender.ts ─────────────
/**
 * Resilient Email Sender
 * 
 * Wraps Resend with:
 * - Automatic retry with exponential backoff (up to 3 attempts)
 * - Suppressed email checking
 * - Full send tracking (sent/failed/retried/dlq) via email_tracking_events
 * - Dead-letter logging for persistent failures
 * 
 * Usage:
 *   import { sendEmailWithRetry } from "../_shared/resilient-email-sender.ts";
 *   const result = await sendEmailWithRetry(supabase, resend, { ...emailParams }, { emailType: "provider_welcome" });
 */

interface EmailParams {
  from: string;
  to: string | string[];
  subject: string;
  html: string;
  headers?: Record<string, string>;
  replyTo?: string | string[];
}

interface SendOptions {
  /** Category for tracking (e.g., "provider_welcome", "lead_notification"). REQUIRED. */
  emailType: string;
  /**
   * Unique key for idempotency. STRONGLY RECOMMENDED for any event-driven
   * email so retries (function re-invocations, cron re-runs, webhook re-deliveries)
   * never produce duplicate sends. Format: `<event>-<id>` (e.g. `lead-new-${leadId}-${facilityId}`).
   */
  idempotencyKey?: string;
  /** Max retry attempts (default: 3) */
  maxRetries?: number;
  /** Whether to check suppressed_emails before sending (default: true) */
  checkSuppression?: boolean;
  /** Additional metadata to store with the tracking event */
  metadata?: Record<string, unknown>;
}

/**
 * Default inter-send delay for bulk email loops (ms).
 * Keeps sends well under Resend's 10 req/s rate limit.
 * Import and use: `await sleep(BULK_SEND_DELAY_MS)` after each send in a loop.
 */
export const BULK_SEND_DELAY_MS = 200;

/** Default max emails per single function invocation */
export const BULK_BATCH_LIMIT = 50;

interface SendResult {
  success: boolean;
  /** True if the email was already sent (idempotency dedup) */
  deduplicated?: boolean;
  /** True if the recipient is suppressed */
  suppressed?: boolean;
  /** Resend email ID on success */
  emailId?: string;
  /** Error message on failure */
  error?: string;
  /** Number of attempts made */
  attempts: number;
  /** Whether the email was sent to dead-letter after all retries */
  deadLettered?: boolean;
  /** ISO timestamp of the original "sent" event when deduplicated. */
  firstSentAt?: string;
}

// SupabaseClient generic enough for service role usage
// deno-lint-ignore no-explicit-any
type SupabaseClient = any;

const LOG_PREFIX = "[RESILIENT-EMAIL]";

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Send an email with retry logic, tracking, and suppression checking.
 */
export async function sendEmailWithRetry(
  supabase: SupabaseClient,
  resend: InstanceType<typeof Resend>,
  params: EmailParams,
  options: SendOptions = { emailType: "general" }
): Promise<SendResult> {
  const {
    emailType = "general",
    idempotencyKey,
    maxRetries = 3,
    checkSuppression = true,
    metadata,
  } = options;

  // Normalize to array
  const toArray = Array.isArray(params.to) ? params.to : [params.to];
  const normalizedParams = { ...params, to: toArray };
  const recipientEmail = toArray[0]?.toLowerCase();
  if (!recipientEmail) {
    return { success: false, error: "No recipient email", attempts: 0 };
  }

  // 1. Idempotency check
  if (idempotencyKey) {
    const { data: existing } = await supabase
      .from("email_tracking_events")
      .select("id, created_at")
      .eq("email_id", idempotencyKey)
      .eq("email_type", emailType)
      .eq("event_type", "sent")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (existing) {
      console.log(`${LOG_PREFIX} Dedup hit: ${idempotencyKey}`);
      return {
        success: true,
        deduplicated: true,
        attempts: 0,
        emailId: idempotencyKey,
        firstSentAt: existing.created_at ?? undefined,
      };
    }
  }

  // 2. Suppression check
  if (checkSuppression) {
    const { data: suppressed } = await supabase
      .from("suppressed_emails")
      .select("email")
      .eq("email", recipientEmail)
      .maybeSingle();

    if (suppressed) {
      console.log(`${LOG_PREFIX} Suppressed: ${recipientEmail}`);
      await trackEvent(supabase, {
        emailId: idempotencyKey || crypto.randomUUID(),
        emailType,
        eventType: "suppressed",
        recipientEmail,
        metadata: { ...metadata, reason: "suppressed_email" },
      });
      return { success: false, suppressed: true, attempts: 0 };
    }
  }

  // 3. Retry loop with exponential backoff
  const trackingId = idempotencyKey || crypto.randomUUID();
  let lastError = "";

  // Auto-generate plain-text fallback for better deliverability
  const plainText = normalizedParams.html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/tr>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<a[^>]+href="([^"]*)"[^>]*>([^<]*)<\/a>/gi, "$2 ($1)")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const sendParams: Record<string, unknown> = {
        from: normalizedParams.from,
        to: normalizedParams.to,
        subject: normalizedParams.subject,
        html: normalizedParams.html,
        text: plainText,
      };
      if (normalizedParams.headers) sendParams.headers = normalizedParams.headers;
      if (normalizedParams.replyTo) sendParams.reply_to = normalizedParams.replyTo;

      // deno-lint-ignore no-explicit-any
      const { data, error } = await (resend.emails as any).send(sendParams);

      if (error) {
        lastError = error.message || JSON.stringify(error);
        console.error(`${LOG_PREFIX} Attempt ${attempt}/${maxRetries} failed:`, lastError);

        // Don't retry on permanent errors (validation, domain issues)
        if (isPermanentError(lastError)) {
          await trackEvent(supabase, {
            emailId: trackingId,
            emailType,
            eventType: "failed",
            recipientEmail,
            metadata: { ...metadata, error: lastError, attempt, permanent: true },
          });
          return { success: false, error: lastError, attempts: attempt };
        }

        // Track retry
        if (attempt < maxRetries) {
          await trackEvent(supabase, {
            emailId: trackingId,
            emailType,
            eventType: "retry",
            recipientEmail,
            metadata: { ...metadata, error: lastError, attempt },
          });
          // Exponential backoff: 1s, 2s, 4s
          await sleep(1000 * Math.pow(2, attempt - 1));
        }
        continue;
      }

      // Success
      await trackEvent(supabase, {
        emailId: trackingId,
        emailType,
        eventType: "sent",
        recipientEmail,
        metadata: { ...metadata, resendId: data?.id, attempt },
      });

      console.log(`${LOG_PREFIX} Sent to ${recipientEmail} (attempt ${attempt})`);
      return { success: true, emailId: data?.id, attempts: attempt };

    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      console.error(`${LOG_PREFIX} Attempt ${attempt}/${maxRetries} exception:`, lastError);

      if (attempt < maxRetries) {
        await trackEvent(supabase, {
          emailId: trackingId,
          emailType,
          eventType: "retry",
          recipientEmail,
          metadata: { ...metadata, error: lastError, attempt },
        });
        await sleep(1000 * Math.pow(2, attempt - 1));
      }
    }
  }

  // All retries exhausted — dead-letter
  await trackEvent(supabase, {
    emailId: trackingId,
    emailType,
    eventType: "dlq",
    recipientEmail,
    metadata: { ...metadata, error: lastError, maxRetries },
  });

  // Persist to email_send_failures so admins can review on the daily digest.
  // Failures here must NEVER break the caller — swallow any insert error.
  try {
    await supabase.from("email_send_failures").insert({
      email_type: emailType,
      recipient_email: recipientEmail,
      subject: normalizedParams.subject,
      error_message: lastError,
      attempts: maxRetries,
      idempotency_key: idempotencyKey ?? null,
      metadata: metadata ?? null,
    });
  } catch (err) {
    console.error(`${LOG_PREFIX} DLQ insert failed:`, err);
  }

  console.error(`${LOG_PREFIX} Dead-lettered after ${maxRetries} attempts: ${recipientEmail}`);
  return { success: false, error: lastError, attempts: maxRetries, deadLettered: true };
}

/**
 * Determine if an error is permanent (no point retrying).
 */
function isPermanentError(errorMsg: string): boolean {
  const lower = errorMsg.toLowerCase();
  return (
    lower.includes("validation_error") ||
    lower.includes("verify a domain") ||
    lower.includes("invalid") && lower.includes("email") ||
    lower.includes("missing required") ||
    lower.includes("not found") ||
    lower.includes("blocked") ||
    lower.includes("spam")
  );
}

/**
 * Track an email event in email_tracking_events.
 */
async function trackEvent(
  supabase: SupabaseClient,
  params: {
    emailId: string;
    emailType: string;
    eventType: string;
    recipientEmail: string;
    metadata?: Record<string, unknown>;
  }
) {
  try {
    await supabase.from("email_tracking_events").insert({
      email_id: params.emailId,
      email_type: params.emailType,
      event_type: params.eventType,
      recipient_email: params.recipientEmail,
      event_data: params.metadata || null,
    });
  } catch (err) {
    // Never let tracking failures break email sending
    console.error(`${LOG_PREFIX} Tracking insert failed:`, err);
  }
}

// ── stripe-webhook entrypoint body ─────────────────────────
// Version tracking for deployment verification
// 1.4.0 (2026-07-02 entitlement audit): payment-confirmation gates — no Pro
// activation for unpaid/incomplete sessions; 'incomplete' is stored verbatim
// (never promoted into the past_due grace window); benefits activate on the
// incomplete→active transition; subscription_events records real status.
const VERSION = "1.4.0";
const DEPLOYED_AT = "2026-05-16T00:00:00Z";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Production logging with version
const generateRequestId = () => crypto.randomUUID().slice(0, 8);
const logStep = (step: string, details?: Record<string, unknown>) => {
  const timestamp = new Date().toISOString();
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] [${VERSION}] [${timestamp}] ${step}${detailsStr}`);
};

// Legacy product IDs that map to Pro tier
const PRO_PRODUCT_IDS = [
  "prod_TbalLOPujTIoUe", // legacy professional
  "prod_Tbyz1bf6iYyzYd", // professional
  "prod_TbalOeJZA2ZoJl", // legacy featured
  "prod_TbyzJVNOQL71NN", // featured
];

// New flat-fee monetization lookup keys (created by
// scripts/stripe-setup-monetization.ts). Six keys = three SKUs × two
// billing intervals. The webhook resolves both billing_period and the
// tier/addon flags from the lookup_key + price.recurring.interval.
const LOOKUP_KEYS = {
  PRO_MONTHLY: "rl_pro_monthly_v1",
  PRO_ANNUAL: "rl_pro_annual_v1",
  FEATURED_MONTHLY: "rl_featured_monthly_v1",
  FEATURED_ANNUAL: "rl_featured_annual_v1",
  CONCIERGE_MONTHLY: "rl_concierge_monthly_v1",
  CONCIERGE_ANNUAL: "rl_concierge_annual_v1",
} as const;

const PRO_KEYS = [LOOKUP_KEYS.PRO_MONTHLY, LOOKUP_KEYS.PRO_ANNUAL] as const;
const FEATURED_KEYS = [LOOKUP_KEYS.FEATURED_MONTHLY, LOOKUP_KEYS.FEATURED_ANNUAL] as const;
const CONCIERGE_KEYS = [LOOKUP_KEYS.CONCIERGE_MONTHLY, LOOKUP_KEYS.CONCIERGE_ANNUAL] as const;

// Per-tier full monthly rates in cents. Used both to compute the
// monthly_equivalent for cancellation math AND, on annual subscriptions,
// to reconstruct original_annual_cents + discount_applied_cents.
const FULL_MONTHLY_CENTS = {
  pro: 9900,        // $99
  featured: 59900,  // $599
  concierge: 100000, // $1,000
} as const;

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
 * older code path that follows in checkout.session.completed).
 */
function deriveTierFlagsFromSubscription(sub: Stripe.Subscription) {
  let isPro = false;
  let hasFeatured = false;
  let hasConcierge = false;
  let paidAmountCents = 0;
  let interval: "month" | "year" | null = null;
  for (const item of sub.items.data) {
    const lookupKey = item.price.lookup_key as string | null;
    const itemInterval = item.price.recurring?.interval as "month" | "year" | undefined;
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
    paidAmountCents += (item.price.unit_amount ?? 0) * (item.quantity ?? 1);
  }
  // Fall back: if the checkout metadata tagged this as a Pro
  // subscription but no lookup_key matched (legacy create-checkout
  // path), treat the whole subscription as Pro.
  const metaType = ((sub.metadata as Record<string, string> | null)?.type ?? "").toLowerCase();
  const metaPlanTier = ((sub.metadata as Record<string, string> | null)?.plan_tier ?? "").toLowerCase();
  if (!isPro && (metaType === "pro_subscription" || metaPlanTier === "pro")) {
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

// Sentry instrumentation. initSentry() is idempotent + no-ops when
// SENTRY_DSN is unset, so this is safe to leave wired even before the
// operator sets the env var.
import { initSentry, withSentry, captureEdgeException } from "../_shared/sentry.ts";
initSentry({ functionSlug: "stripe-webhook" });

Deno.serve(withSentry("stripe-webhook", async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Hoisted so the outer catch can release the dedup claim: both are declared
  // inside the try below, but the catch needs them to make Stripe's retry
  // effective. See the release block in that catch.
  let claimedEventId: string | null = null;
  let adminClientForCleanup: SupabaseClient | null = null;

  try {
    logStep("Webhook received");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const resend = resendApiKey ? new Resend(resendApiKey) : null;

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );
    adminClientForCleanup = supabaseAdmin;

    const body = await req.text();
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

    let event: Stripe.Event;
    
    // Verify webhook signature if secret is configured (production)
    const signature = req.headers.get("stripe-signature");
    
    // SECURITY: Always require webhook signature verification
    if (!webhookSecret) {
      logStep("CRITICAL - STRIPE_WEBHOOK_SECRET not configured, rejecting request");
      return new Response(JSON.stringify({ error: "Webhook not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!signature) {
      logStep("Rejected - Missing stripe-signature header");
      return new Response(JSON.stringify({ error: "Missing signature" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
      logStep("Event verified with signature", { type: event.type, id: event.id });
    } catch (signatureError) {
      logStep("Webhook signature verification failed", { error: String(signatureError) });
      // 401 (not 400): the stripe-signature header IS the auth credential
      // for this endpoint. An invalid HMAC means the caller can't prove
      // they're Stripe, so it's an authentication failure, not a malformed
      // body. Matches the contract documented in supabase/functions/
      // _tests/stripe-webhook-e2e_test.ts.
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ============================================================
    // GLOBAL EVENT DEDUPLICATION
    // Stripe retries deliver the same evt_xxx multiple times. Even though
    // our financial uniques (credit_transactions, lead_unlocks, pro_subscriptions)
    // already prevent double-spend, retried events still re-run downstream
    // side effects (notifications, emails). Claim the event atomically; if
    // someone else already owns it, ack 200 and exit.
    // ============================================================
    try {
      const { data: claimed, error: claimError } = await supabaseAdmin.rpc(
        "claim_stripe_webhook_event",
        { p_event_id: event.id, p_event_type: event.type }
      );

      if (claimError) {
        // Round-31 audit fix: previously the dedup-failure path
        // logged + alerted but kept processing. That risks double-
        // activation on retry (duplicate provider_notifications,
        // duplicate Pro benefits, possible double-refund attempts).
        // The safer outcome is to surface to admin AND return 500 so
        // Stripe retries the event later — the next retry is far
        // more likely to find the dedup table healthy than to land
        // a duplicate side-effect after a flaky retry.
        logStep("ERROR - claim_stripe_webhook_event failed; returning 500 so Stripe retries", {
          eventId: event.id,
          error: claimError.message,
        });
        try {
          const { error: notifyErr } = await supabaseAdmin.from("admin_notifications").insert({
            type: "webhook_dedup_failure",
            title: "Stripe webhook dedup-claim failed",
            message: `claim_stripe_webhook_event errored for ${event.type} (${event.id}). Webhook returned 500 so Stripe retries. If retries keep failing, check stripe_webhook_events table + RPC health.`,
            metadata: {
              stripe_event_id: event.id,
              stripe_event_type: event.type,
              error: claimError.message,
            },
          });
          if (notifyErr) {
            console.error("[stripe-webhook] CRITICAL: dedup-failure admin notification ALSO failed", notifyErr);
          }
        } catch (insertErr) {
          console.error("[stripe-webhook] CRITICAL: dedup-failure admin notification threw", insertErr);
        }
        return new Response(
          JSON.stringify({ error: "dedup_claim_failed", retryable: true }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      } else if (claimed === false) {
        logStep("Duplicate Stripe event ignored", { eventId: event.id, type: event.type });
        return new Response(JSON.stringify({ received: true, duplicate: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // We own the event from here on; the outer catch must release this
      // claim if processing fails, or Stripe's retry is ignored as a duplicate.
      claimedEventId = event.id;
    } catch (dedupErr) {
      // Round-31 audit fix: same as the !claimError branch — if the
      // dedup machinery is unavailable, return 500 so Stripe retries,
      // rather than risk processing the event twice on a flaky retry
      // window. Stripe will give up after ~3 days of retries, by
      // which time the dedup table will be healthy again.
      logStep("ERROR - dedup check threw; returning 500 so Stripe retries", { error: String(dedupErr) });
      try {
        await supabaseAdmin.from("admin_notifications").insert({
          type: "webhook_dedup_failure",
          title: "Stripe webhook dedup-claim threw",
          message: `dedup check for ${event.type} (${event.id}) threw: ${String(dedupErr).slice(0, 300)}. Returning 500 so Stripe retries.`,
          metadata: {
            stripe_event_id: event.id,
            stripe_event_type: event.type,
            error: String(dedupErr),
          },
        });
      } catch (insertErr) {
        console.error("[stripe-webhook] CRITICAL: dedup-threw admin notification ALSO failed", insertErr);
      }
      return new Response(
        JSON.stringify({ error: "dedup_check_threw", retryable: true }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ==========================================
    // Handle checkout.session.completed
    // Handles: Lead unlocks, Credit purchases, Pro subscriptions, Additional listing slots
    // ==========================================
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const metadataType = session.metadata?.type;
      const purchaseType = session.metadata?.purchase_type;
      
      logStep("Checkout session completed", { 
        mode: session.mode, 
        type: metadataType,
        purchaseType,
        customerId: session.customer 
      });

      // INTERNATIONAL PLACEMENT PAYMENT — retired 2026-05-20.
      // The paid international placement product is fully wound down.
      // The five international edge functions return 410 Gone and the
      // create-checkout-session never produces sessions with
      // metadata.type='international_placement' any more. If a stale
      // session somehow lands here (e.g. a webhook retry for a
      // session created pre-retirement), log + emit an admin
      // notification + return 200 so Stripe stops retrying. We do NOT
      // attempt to write to the dropped international_* tables.
      if (session.mode === "payment" && metadataType === "international_placement") {
        logStep("⚠️ International placement webhook hit after product retirement", {
          sessionId: session.id,
          email: session.metadata?.client_email || session.customer_email,
        });
        try {
          await supabaseAdmin.from("admin_notifications").insert({
            type: "retired_product_webhook",
            title: "⚠️ International placement webhook fired after retirement",
            message: `Stripe delivered an 'international_placement' session ${session.id} after the product was retired. Refund manually if needed.`,
            metadata: {
              session_id: session.id,
              payment_intent_id: session.payment_intent,
              client_email: session.metadata?.client_email || session.customer_email,
              client_name: session.metadata?.client_name,
              client_country: session.metadata?.client_country,
              amount_total: session.amount_total,
            },
          });
        } catch (e) {
          logStep("Failed to write retirement-warning admin notification", { error: String(e) });
        }
        return new Response(JSON.stringify({ received: true, retired: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Legacy `additional_listing_slot`, `lead_unlock`, `credit_purchase`,
      // and `concierge_placement` (domestic $299) checkout sessions are no
      // longer issued — the monetization rebuild dropped those flows. The
      // handler blocks that processed them were removed; any in-flight
      // legacy event falls through to the no-op below. The corresponding
      // edge functions (create-concierge-checkout, purchase-credits,
      // purchase-listing-slot, verify-unlock-payment) return HTTP 410.

      // PRO_SUBSCRIPTION (annual)
      if (session.mode === "subscription" && metadataType === "pro_subscription") {
        // create-checkout-session used to write `provider_user_id`;
        // it now writes both (canonical `user_id` + the legacy key as
        // a fallback during the rollover window). Accept either so
        // in-flight sessions don't silently no-op.
        const userId =
          session.metadata?.user_id ?? session.metadata?.provider_user_id;
        const subscriptionId = session.subscription as string;
        const customerId = session.customer as string;

        // create-checkout used to emit `facility_id: ""` whenever the caller
        // didn't supply one — which the onboarding PlanStep and the
        // UpgradeDialog never did. An empty string is falsy, so the guard
        // below skipped the ONLY facility_subscriptions writer in the
        // codebase: the provider was charged, activateProBenefits flipped
        // profiles.plan, but every Pro gate (useProStatus, useFacility-
        // Subscription, has_active_pro) reads the missing row and reported
        // Free. create-checkout now resolves the id up front; this fallback
        // repairs sessions that were already open when that shipped.
        let ownedFacilityId: string | null = null;
        if (!normalizeFacilityIdMetadata(session.metadata?.facility_id) && userId) {
          const { data: ownedFacility, error: ownedErr } = await supabaseAdmin
            .from("facilities")
            .select("id")
            .eq("user_id", userId)
            // Earliest-created = the provider's primary listing. Must match
            // create-checkout's ordering so a redelivery resolves identically.
            .order("created_at", { ascending: true })
            .limit(1)
            .maybeSingle();
          if (ownedErr) {
            logStep("Facility fallback lookup failed", { error: ownedErr.message, userId });
          } else {
            ownedFacilityId = (ownedFacility as { id?: string } | null)?.id ?? null;
          }
        }
        const facilityResolution = resolveProFacilityId({
          metadataFacilityId: session.metadata?.facility_id,
          ownedFacilityId,
        });
        const facilityId = facilityResolution.facilityId;
        if (facilityResolution.source === "owner-fallback") {
          logStep("Recovered facility_id from provider ownership", { facilityId, userId });
        }

        // Paid, but there is nothing to attach the subscription to. Never
        // return a silent 200 here — that is money taken with no record.
        if (subscriptionId && userId && !facilityId) {
          logStep("Pro checkout completed with no resolvable facility", { userId, subscriptionId });
          try {
            await supabaseAdmin.from("admin_notifications").insert({
              type: "pro_activation_no_facility",
              title: "Pro payment received but no facility to activate",
              message:
                `User ${userId} completed Stripe Checkout for Pro (subscription ${subscriptionId}, ` +
                `event ${event.id}) but owns no facility row, so facility_subscriptions could not be ` +
                `written and Pro is NOT active. Usually an unapproved claim. Approve the claim then ` +
                `re-run activation, or refund the subscription.`,
              metadata: {
                user_id: userId,
                stripe_subscription_id: subscriptionId,
                stripe_customer_id: customerId,
                stripe_event_id: event.id,
              } as Record<string, unknown>,
            });
          } catch (adminErr) {
            logStep("admin_notifications insert failed (pro no-facility)", {
              error: adminErr instanceof Error ? adminErr.message : String(adminErr),
            });
          }
        }

        if (subscriptionId && facilityId && userId) {
          logStep("Activating Pro subscription", { subscriptionId, facilityId });

          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          // Basil (2025-03-31+) moved the billing period onto the subscription
          // ITEM. Reading the removed top-level field yielded `new Date(NaN)`,
          // whose .toISOString() threw a RangeError HERE — before the
          // facility_subscriptions upsert below — so a paid Pro checkout
          // activated nothing. A null period is stored rather than thrown on.
          const currentPeriodEnd = getSubscriptionPeriodEndISO(subscription);

          // Payment-confirmation gate (2026-07-02 entitlement audit): a
          // Checkout session can complete while payment is still pending
          // (async payment methods, abandoned 3DS/SCA → subscription status
          // 'incomplete'). Previously this handler wrote status:'active'
          // unconditionally, granting Pro before Stripe confirmed money.
          // Now: benefits only when the session is paid or the subscription
          // is already active/trialing. Otherwise the row is stored as
          // 'incomplete' — has_active_pro() ignores it, and the
          // customer.subscription.updated handler activates benefits when
          // Stripe reports the transition to 'active'.
          const paymentConfirmed =
            session.payment_status === "paid" ||
            subscription.status === "active" ||
            subscription.status === "trialing";

          // Derive new monetization flags from the subscription items.
          // Falls back to bare Pro ($99/mo) if no new lookup keys
          // matched. The pre-rebuild $399 bundle is fully retired.
          const flagsCheckout = deriveTierFlagsFromSubscription(subscription);
          const monthlyEquivalentCents = flagsCheckout.matched_new_lookup_keys
            ? (FULL_MONTHLY_CENTS.pro +
                (flagsCheckout.has_featured ? FULL_MONTHLY_CENTS.featured : 0) +
                (flagsCheckout.has_concierge_partner ? FULL_MONTHLY_CENTS.concierge : 0))
            : FULL_MONTHLY_CENTS.pro;
          // Annual subscriptions track period_start AND current_monthly_period_start
          // (the helpers that read monthly elapsed time look at the latter first,
          // falling back to period_start for annual). For monthly, both point at the
          // current 30-day window's start; for annual they stay aligned.
          const periodStartISO =
            getSubscriptionPeriodStartISO(subscription) ?? new Date().toISOString();

          const { error: proError } = await supabaseAdmin
            .from("facility_subscriptions")
            .upsert({
              provider_id: userId,
              facility_id: facilityId,
              stripe_subscription_id: subscriptionId,
              stripe_customer_id: customerId,
              status: paymentConfirmed ? "active" : "incomplete",
              price_cents: monthlyEquivalentCents,
              tier: "pro",
              has_featured: flagsCheckout.has_featured,
              has_concierge_partner: flagsCheckout.has_concierge_partner,
              billing_period: flagsCheckout.billing_period ?? "annual",
              paid_amount_cents: flagsCheckout.matched_new_lookup_keys
                ? flagsCheckout.paid_amount_cents
                : null,
              original_annual_cents: flagsCheckout.original_annual_cents,
              discount_applied_cents: flagsCheckout.discount_applied_cents,
              period_start: periodStartISO,
              current_monthly_period_start: periodStartISO,
              started_at: new Date().toISOString(),
              current_period_end: currentPeriodEnd,
              updated_at: new Date().toISOString(),
            }, { onConflict: "facility_id" });

          if (proError) {
            // Round-30 surfacing: the customer paid Stripe but the DB
            // never recorded the subscription. Without surfacing this,
            // ops doesn't know the activation failed and the user
            // sees "free" with no Pro benefits. Insert an admin alert
            // so this is visible + actionable. We deliberately DO NOT
            // send a "Pro activated" notification to the provider
            // here, because that would be a lie.
            logStep("Error creating pro_subscription", { error: proError.message });
            try {
              await supabaseAdmin.from("admin_notifications").insert({
                type: "pro_activation_db_failure",
                title: "Pro activation failed at DB write",
                message:
                  `Stripe charged the customer (event ${event.id}) but the ` +
                  `facility_subscriptions upsert failed: ${proError.message}. ` +
                  `User ${userId} / facility ${facilityId} / subscription ${subscriptionId}. ` +
                  `Manual reconciliation required.`,
                metadata: {
                  user_id: userId,
                  facility_id: facilityId,
                  stripe_subscription_id: subscriptionId,
                  stripe_event_id: event.id,
                  db_error: proError.message,
                } as Record<string, unknown>,
              });
            } catch (adminErr) {
              logStep("admin_notifications insert failed (pro activation)", {
                error: adminErr instanceof Error ? adminErr.message : String(adminErr),
              });
            }
          } else if (!paymentConfirmed) {
            // Row recorded as 'incomplete' — no benefits until Stripe
            // confirms payment (customer.subscription.updated → active).
            logStep("Pro subscription recorded as incomplete — payment not confirmed yet", {
              facilityId,
              sessionPaymentStatus: session.payment_status,
              subscriptionStatus: subscription.status,
            });
          } else {
            logStep("Pro subscription activated", { facilityId, currentPeriodEnd });

            // Activate Pro benefits across every facility the provider
            // owns. The shared helper guards on `featured === true` so
            // a webhook retry doesn't double-apply the +50 ranking
            // boost. profiles.plan mirror is part of the helper.
            const proResult = await activateProBenefits(supabaseAdmin, userId);
            logStep("Pro benefits activation result (checkout.session.completed)", {
              updated: proResult.facilitiesUpdated.length,
              already: proResult.alreadyActive.length,
              failed: proResult.failed.length,
            });
            await notifyProBenefitsPartialFailure(supabaseAdmin, {
              userId,
              eventType: "checkout.session.completed",
              result: proResult,
              stripeEventId: event.id,
            });

            await supabaseAdmin.from("provider_notifications").insert({
              user_id: userId,
              facility_id: facilityId,
              type: "subscription_active",
              title: "Pro Subscription Activated!",
              message: "Your public phone number and Call button are now live on your listing, along with enhanced profile media and up to 5 facility listings.",
              metadata: { subscription_id: subscriptionId },
            });
          }
        }
        
        return new Response(JSON.stringify({ received: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // ==========================================
    // Handle customer.subscription.updated
    // Keeps current_period_end and status in sync on renewals/changes
    // ==========================================
    if (event.type === "customer.subscription.updated") {
      const subscription = event.data.object as Stripe.Subscription;
      logStep("Subscription updated", { 
        subscriptionId: subscription.id, 
        status: subscription.status,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      });

      const currentPeriodEnd = getSubscriptionPeriodEndISO(subscription);
      // Round-31 audit fix + 2026-07-02 entitlement audit: map Stripe's
      // status enum onto the stored statuses explicitly.
      //   incomplete        → incomplete. It was previously mapped to
      //                       past_due, but has_active_pro() grants a
      //                       dunning GRACE window for past_due — which
      //                       would entitle a never-paid (3DS-abandoned)
      //                       subscription. 'incomplete' grants nothing;
      //                       benefits activate on the incomplete→active
      //                       transition below.
      //   incomplete_expired → canceled (the 23h window timed out)
      //   trialing          → active (we don't offer trials but if
      //                       Stripe creates one, treat as active)
      const mappedStatus =
        subscription.status === "active" ? "active"
        : subscription.status === "trialing" ? "active"
        : subscription.status === "past_due" ? "past_due"
        : subscription.status === "incomplete" ? "incomplete"
        : subscription.status === "incomplete_expired" ? "canceled"
        : subscription.status === "canceled" ? "canceled"
        : subscription.status === "unpaid" ? "past_due"
        : subscription.status === "paused" ? "past_due"
        : subscription.status;

      // Detect mid-period add-on removal by comparing DB-stored add-on flags
      // with the current subscription items. If Featured/Concierge were active
      // and the lookup key is no longer present in the items, the provider
      // dropped that add-on — refund + deactivate dependent rows via the
      // shared cancel module. cancelSubscriptionAndRefund handles flag
      // persistence + audit row + Stripe refund, so we skip the manual
      // flag-update below for the affected add-on.
      const { data: priorSubRow } = await supabaseAdmin
        .from("facility_subscriptions")
        .select("id, has_featured, has_concierge_partner")
        .eq("stripe_subscription_id", subscription.id)
        .maybeSingle();
      const currentFlags = deriveTierFlagsFromSubscription(subscription);
      const droppedFeatured = priorSubRow?.has_featured === true && !currentFlags.has_featured;
      const droppedConcierge = priorSubRow?.has_concierge_partner === true && !currentFlags.has_concierge_partner;
      if (priorSubRow && (droppedFeatured || droppedConcierge)) {
        try {
          if (droppedFeatured) {
            const r = await cancelSubscriptionAndRefund(priorSubRow.id, {
              scope: "addon-featured",
              reason: "stripe webhook: featured item removed from subscription",
            });
            logStep("Featured add-on refunded on item removal", { refundCents: r.featuredRefundCents, refundIds: r.stripeRefundIds });
          }
          if (droppedConcierge) {
            const r = await cancelSubscriptionAndRefund(priorSubRow.id, {
              scope: "addon-concierge",
              reason: "stripe webhook: concierge item removed from subscription",
            });
            logStep("Concierge add-on refunded on item removal", { refundCents: r.conciergeRefundCents, refundIds: r.stripeRefundIds });
          }
        } catch (addonErr) {
          logStep("ERROR refunding removed add-on", { error: String(addonErr) });
        }
      }

      // Only write the period when Stripe actually gave us one — otherwise the
      // status/cancel flags still sync, but a previously-stored good period
      // end is left intact rather than being nulled out.
      const { error: updateError } = await supabaseAdmin
        .from("facility_subscriptions")
        .update({
          status: mappedStatus,
          ...(currentPeriodEnd ? { current_period_end: currentPeriodEnd } : {}),
          cancel_at_period_end: subscription.cancel_at_period_end ?? false,
          updated_at: new Date().toISOString(),
        })
        .eq("stripe_subscription_id", subscription.id);

      // Add-on subscriptions (Featured/Concierge) are SEPARATE Stripe subs that
      // renew independently and store their period in their own column. The
      // update above keys on the Pro stripe_subscription_id, so an add-on's
      // renewal event would otherwise leave its period stale. These two updates
      // are no-ops for the Pro sub (its id isn't in the add-on columns) and
      // refresh the add-on period when it's an add-on sub that renewed.
      if (currentPeriodEnd) {
        await supabaseAdmin
          .from("facility_subscriptions")
          .update({ featured_current_period_end: currentPeriodEnd, updated_at: new Date().toISOString() })
          .eq("featured_stripe_subscription_id", subscription.id);
        await supabaseAdmin
          .from("facility_subscriptions")
          .update({ concierge_current_period_end: currentPeriodEnd, updated_at: new Date().toISOString() })
          .eq("concierge_stripe_subscription_id", subscription.id);
      }

      if (updateError) {
        logStep("Error updating subscription", { error: updateError.message });
      } else {
        logStep("Subscription updated successfully", { status: mappedStatus, currentPeriodEnd, cancelAtPeriodEnd: subscription.cancel_at_period_end });

        // Fetch the pro_subscription record for all status-change handling below
        const { data: proSub } = await supabaseAdmin
          .from("facility_subscriptions")
          .select("provider_id, facility_id")
          .eq("stripe_subscription_id", subscription.id)
          .maybeSingle();

        // Re-assert the Pro plan mirror when a past_due subscription is paid
        // and returns to active. Benefits were only applied at
        // checkout.session.completed and never re-applied on recovery, so the
        // profiles.plan mirror (and with it the photo cap) could stay stale.
        const previousStatus = (event.data.previous_attributes as Record<string, unknown>)?.status as string | undefined;

        // First-time activation for a subscription that was recorded as
        // 'incomplete' at checkout (async/3DS payment confirmed later).
        // activateProBenefits is idempotent, so a webhook retry is safe.
        if (mappedStatus === "active" && previousStatus === "incomplete" && proSub) {
          logStep("Incomplete subscription confirmed paid — activating Pro benefits", {
            facilityId: proSub.facility_id,
          });
          const proResult = await activateProBenefits(supabaseAdmin, proSub.provider_id);
          logStep("Pro benefits activation result (incomplete→active)", {
            updated: proResult.facilitiesUpdated.length,
            already: proResult.alreadyActive.length,
            failed: proResult.failed.length,
          });
          await notifyProBenefitsPartialFailure(supabaseAdmin, {
            userId: proSub.provider_id,
            eventType: "customer.subscription.updated (incomplete→active)",
            result: proResult,
            stripeEventId: event.id,
          });
          await supabaseAdmin.from("provider_notifications").insert({
            user_id: proSub.provider_id,
            facility_id: proSub.facility_id,
            type: "subscription_active",
            title: "Pro Subscription Activated!",
            message: "Your payment was confirmed — your public phone number and Call button are live, along with enhanced profile media and up to 5 facility listings.",
            metadata: { subscription_id: subscription.id },
          });
        }

        if (mappedStatus === "active" && previousStatus === "past_due" && proSub) {
          logStep("Subscription recovered from past_due — restoring Pro benefits", { facilityId: proSub.facility_id });
          // This path used to re-apply the retired Pro side effects inline —
          // facilities.featured = true and calculated_ranking_score += 50 —
          // rather than going through the shared pro-benefits module. It was a
          // second, independent way to buy Featured placement and organic
          // rank, and it would have survived the shared-module fix untouched.
          //
          // Recovery from past_due needs no facility write at all: the Pro
          // product features are derived live from facility_subscriptions by
          // has_active_pro(), which already treats past_due as entitled and
          // resolves cleanly the moment the row returns to active. The plan
          // mirror is re-asserted through the shared module so the photo-cap
          // trigger stays correct.
          const recoveryResult = await activateProBenefits(supabaseAdmin, proSub.provider_id);
          logStep("Pro plan mirror re-asserted on recovery", {
            profileMirrored: recoveryResult.profilePlanMirrored,
            failed: recoveryResult.failed.length,
          });
          await notifyProBenefitsPartialFailure(supabaseAdmin, {
            userId: proSub.provider_id,
            eventType: "customer.subscription.updated:past_due_recovery",
            result: recoveryResult,
            stripeEventId: event.id,
          });
          await supabaseAdmin.from("provider_notifications").insert({
            user_id: proSub.provider_id,
            facility_id: proSub.facility_id,
            type: "subscription_recovered",
            title: "Pro Subscription Restored",
            message: "Your payment was received and your Pro features are fully restored — your public phone number and Call button are active again.",
            metadata: { subscription_id: subscription.id },
          });
          logStep("Recovery notification sent to provider");
        }

        // Notify provider on status transitions (past_due, cancel_at_period_end)
        if ((mappedStatus === "past_due" || subscription.cancel_at_period_end) && proSub) {
            if (mappedStatus === "past_due") {
              await supabaseAdmin.from("provider_notifications").insert({
                user_id: proSub.provider_id,
                facility_id: proSub.facility_id,
                type: "subscription_past_due",
                title: "Subscription Payment Past Due",
                message: "Your Pro subscription payment is past due. Please update your payment method to avoid losing Pro benefits.",
                metadata: { subscription_id: subscription.id, status: "past_due" },
              });
              logStep("Past-due notification sent to provider");
            }

            if (subscription.cancel_at_period_end) {
              const endDateValue = getSubscriptionPeriodEndDate(subscription);
              const endDate = endDateValue
                ? endDateValue.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
                : null;
              await supabaseAdmin.from("provider_notifications").insert({
                user_id: proSub.provider_id,
                facility_id: proSub.facility_id,
                type: "subscription_pending_cancel",
                title: "Pro Cancellation Scheduled",
                // Without a resolvable period the date is omitted rather than
                // rendered as "Invalid Date" in the provider's notification.
                message: endDate
                  ? `Your Pro subscription will end on ${endDate}. You'll retain Pro benefits until then. You can resubscribe anytime.`
                  : `Your Pro subscription is scheduled to end at the close of the current billing period. You'll retain Pro benefits until then. You can resubscribe anytime.`,
                metadata: { subscription_id: subscription.id, cancel_date: endDate },
              });
              logStep("Pending cancellation notification sent to provider");
            }
        }
      }
    }

    // ==========================================
    // Handle invoice.payment_failed
    // ==========================================
    if (event.type === "invoice.payment_failed") {
      const invoice = event.data.object as Stripe.Invoice;
      const invoiceType = invoice.metadata?.type;
      
      // Skip if this is an international placement fee — handled separately below
      if (invoiceType === "international_placement_fee") {
        logStep("Skipping general payment_failed handler for international invoice");
      } else {
      logStep("Payment failed", { invoiceId: invoice.id, amountDue: invoice.amount_due });

      // M7: reflect past_due in our DB right here. The status flip otherwise
      // lives ONLY in customer.subscription.updated; if that event is missed,
      // delayed, or out-of-order, the row would wrongly stay 'active' after a
      // failed charge. Idempotent; the .neq guard avoids resurrecting an
      // already-canceled sub. (has_active_pro keeps Pro during this grace
      // window — teardown still happens on subscription.deleted.)
      const failedSubId =
        typeof (invoice as { subscription?: unknown }).subscription === "string"
          ? (invoice as { subscription: string }).subscription
          : ((invoice as { subscription?: { id?: string } }).subscription?.id ?? null);
      if (failedSubId) {
        const { error: pastDueErr } = await supabaseAdmin
          .from("facility_subscriptions")
          .update({ status: "past_due", updated_at: new Date().toISOString() })
          .eq("stripe_subscription_id", failedSubId)
          .neq("status", "canceled")
          // A failed FIRST invoice on a never-paid subscription must not
          // promote 'incomplete' into the past_due grace window —
          // has_active_pro() grants benefits for past_due.
          .neq("status", "incomplete");
        if (pastDueErr) logStep("WARN failed to set past_due on payment_failed", { error: pastDueErr.message });
      }

      const customerId = invoice.customer as string;
      const customer = await stripe.customers.retrieve(customerId);
      
      if (customer.deleted) {
        logStep("Customer deleted, skipping");
        return new Response(JSON.stringify({ received: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const customerEmail = (customer as Stripe.Customer).email;
      const customerName = (customer as Stripe.Customer).name || "Provider";
      const amountDue = (invoice.amount_due / 100).toFixed(2);
      const currency = invoice.currency.toUpperCase();

      // Find user
      const { data: profiles } = await supabaseAdmin
        .from("profiles")
        .select("user_id, first_name, last_name")
        .eq("email", customerEmail)
        .limit(1);

      const profile = profiles?.[0];
      const providerName = profile ? `${profile.first_name} ${profile.last_name}` : customerName;

      let facilityName = "Unknown Facility";
      let facilityId = null;
      if (profile?.user_id) {
        const { data: facilities } = await supabaseAdmin
          .from("facilities")
          .select("id, name")
          .eq("user_id", profile.user_id)
          .limit(1);

        if (facilities?.[0]) {
          facilityName = facilities[0].name;
          facilityId = facilities[0].id;
        }
      }

      // Round-31 audit fix: if neither profile nor facility resolved,
      // the Stripe customer is detached from our app (deleted account,
      // out-of-band data wipe, email change). Don't send a customer-
      // facing email — they may be a stale or stranger inbox. Just
      // record an admin alert and exit so ops can reconcile.
      if (!profile && !facilityId) {
        logStep("Payment failed but no matching profile or facility — skipping customer email", { customerEmail });
        try {
          await supabaseAdmin.from("admin_notifications").insert({
            type: "payment_failed_orphan_customer",
            title: "Payment failed for orphaned Stripe customer",
            message:
              `Stripe customer ${customerId} (${customerEmail}) had a payment fail ` +
              `but no matching profiles or facilities row exists. ` +
              `Likely a deleted-app-side account or stale email. Manual reconcile in Stripe.`,
            metadata: {
              customer_id: customerId,
              customer_email: customerEmail,
              invoice_id: invoice.id,
              amount_due: amountDue,
              currency,
            } as Record<string, unknown>,
          });
        } catch (adminErr) {
          console.error("[stripe-webhook] orphan-customer admin notify failed", adminErr);
        }
        return new Response(JSON.stringify({ received: true, orphan: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Create admin notification
      await supabaseAdmin.from("admin_notifications").insert({
        type: "payment_failed",
        title: "Subscription Payment Failed",
        message: `Payment of ${currency} ${amountDue} failed for ${facilityName} (${providerName})`,
        metadata: {
          customer_id: customerId,
          customer_email: customerEmail,
          amount_due: amountDue,
          currency,
          invoice_id: invoice.id,
          facility_id: facilityId,
          facility_name: facilityName,
          provider_name: providerName,
        },
      });

      // Create provider notification
      if (profile?.user_id) {
        await supabaseAdmin.from("provider_notifications").insert({
          user_id: profile.user_id,
          facility_id: facilityId,
          type: "payment_failed",
          title: "Payment Failed",
          message: `Your subscription payment of ${currency} ${amountDue} failed. Please update your payment method.`,
          metadata: { amount_due: amountDue, currency, invoice_id: invoice.id },
        });
      }

      // Send emails
      if (resend && customerEmail) {
        try {
          await sendEmailWithRetry(supabaseAdmin, resend, {
            from: "RehabLookup <no-reply@rehablookup.com>",
            to: [customerEmail],
            subject: "Action Required: Payment Failed",
            html: `
              <div style="font-family: Arial, Helvetica, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background-color: #1B365D; background: #1B365D; padding: 30px; border-radius: 12px 12px 0 0;">
                  <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-family: Arial, Helvetica, sans-serif;">Payment Failed</h1>
                </div>
                <div style="background: #fff; padding: 30px; border: 1px solid #e5e7eb; border-top: none;">
                  <p style="color: #374151;">Hi ${providerName},</p>
                  <p style="color: #374151;">We were unable to process your payment of <strong>${currency} ${amountDue}</strong>.</p>
                  <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0;">
                    <p style="margin: 0; color: #991b1b;"><strong>Important:</strong> Your subscription may be suspended if payment is not updated.</p>
                  </div>
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="https://rehablookup.com/provider/billing" style="background: #1B365D; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600;">Update Payment Method</a>
                  </div>
                </div>
              </div>
            `,
          }, {
            emailType: "stripe_payment_failed",
              idempotencyKey: `stripe-payment-failed-${event.id}`,
          });
          logStep("Payment failure email sent");
        } catch (emailError) {
          logStep("Email send failed", { error: String(emailError) });
        }
      }
      }
    }

    // ==========================================
    // Handle invoice.payment_succeeded
    // ==========================================
    if (event.type === "invoice.payment_succeeded") {
      const invoice = event.data.object as Stripe.Invoice;
      logStep("Invoice payment succeeded", { invoiceId: invoice.id, amountPaid: invoice.amount_paid });

      // Idempotency: check if this event was already processed
      const { data: existingPaymentEvent } = await supabaseAdmin
        .from("subscription_events")
        .select("id")
        .eq("stripe_event_id", event.id)
        .maybeSingle();

      if (existingPaymentEvent) {
        logStep("Payment event already processed (duplicate webhook), skipping", { eventId: event.id });
      } else if (invoice.subscription) {
        const customerId = invoice.customer as string;
        const customer = await stripe.customers.retrieve(customerId);
        
        if (!customer.deleted) {
          const customerEmail = (customer as Stripe.Customer).email;

          let userId = null;
          let facilityId = null;
          let planName = "Unknown";
          let planTier: string | null = null;

          const { data: profiles } = await supabaseAdmin
            .from("profiles")
            .select("user_id")
            .eq("email", customerEmail)
            .limit(1);

          if (profiles?.[0]) {
            userId = profiles[0].user_id;
            const { data: facilities } = await supabaseAdmin
              .from("facilities")
              .select("id")
              .eq("user_id", userId)
              .limit(1);
            facilityId = facilities?.[0]?.id || null;
          }

          try {
            const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string, {
              expand: ["items.data.price.product"],
            });
            const product = subscription.items.data[0]?.price?.product as Stripe.Product;
            planName = product?.name || "Subscription";
            if (product?.id && PRO_PRODUCT_IDS.includes(product.id)) planTier = "pro";
          } catch (e) {
            logStep("Failed to get subscription details", { error: String(e) });
          }

          await supabaseAdmin.from("subscription_events").insert({
            event_type: "payment_succeeded",
            stripe_event_id: event.id,
            stripe_customer_id: customerId,
            stripe_subscription_id: invoice.subscription as string,
            user_id: userId,
            facility_id: facilityId,
            plan_name: planName,
            plan_tier: planTier,
            amount_cents: invoice.amount_paid,
            currency: invoice.currency.toUpperCase(),
            status: "completed",
            metadata: {
              invoice_id: invoice.id,
              customer_email: customerEmail,
              billing_reason: invoice.billing_reason,
            },
          });
          logStep("Payment event recorded");

          // Round-31 audit fix: previously gated only on
          // billing_reason='subscription_cycle'. Stripe also sends
          // payment_succeeded for subscription_update_cycle, manual
          // invoices, etc., and the billing_reason enum is mutable.
          // The authoritative renewal signal is: the subscription's
          // current_period_end advanced past what we have stored.
          //
          // Detection logic:
          //   1. Read current_period_end from the subscription (which
          //      Stripe just renewed).
          //   2. Compare to the DB-stored current_period_end.
          //   3. If the new end is later than the stored end, it's a
          //      true period boundary crossing → reset reminders.
          //
          // Falls back to billing_reason='subscription_cycle' if the
          // subscription read fails (network blip), so we don't lose
          // the reset on the most common path.
          let shouldResetReminders = false;
          if (invoice.subscription) {
            const stripeSubId = invoice.subscription as string;
            try {
              const sub = await stripe.subscriptions.retrieve(stripeSubId);
              const newPeriodEnd = getSubscriptionPeriodEndISO(sub);
              const { data: facSubRow } = await supabaseAdmin
                .from("facility_subscriptions")
                .select("current_period_end")
                .eq("stripe_subscription_id", stripeSubId)
                .maybeSingle();
              const storedEnd = (facSubRow as { current_period_end: string | null } | null)?.current_period_end ?? null;
              // True renewal = new period_end strictly LATER than stored.
              // (Equal = same period, no boundary crossing. Earlier = clock
              // skew or a Stripe-side downgrade we should not act on here.)
              if (storedEnd && newPeriodEnd && newPeriodEnd > storedEnd) {
                shouldResetReminders = true;
              } else if (!storedEnd && invoice.billing_reason === "subscription_cycle") {
                // First time seeing this sub in our DB, and Stripe says
                // it's a renewal → trust them.
                shouldResetReminders = true;
              }
            } catch (e) {
              logStep("Could not retrieve subscription for renewal detection; falling back to billing_reason check", { error: String(e) });
              if (invoice.billing_reason === "subscription_cycle") shouldResetReminders = true;
            }
          }

          if (shouldResetReminders && invoice.subscription) {
            const { error: resetErr } = await supabaseAdmin
              .from("facility_subscriptions")
              .update({
                renewal_reminder_60d_sent_at: null,
                renewal_reminder_30d_sent_at: null,
                renewal_reminder_14d_sent_at: null,
                renewal_reminder_7d_sent_at: null,
                updated_at: new Date().toISOString(),
              })
              .eq("stripe_subscription_id", invoice.subscription as string);
            if (resetErr) {
              logStep("Failed to reset renewal reminder milestones", { error: resetErr.message });
            } else {
              logStep("Renewal reminder milestones reset for new period");
            }
          }

          // Send payment confirmation notification + email to provider (renewals & first payments)
          if (userId && facilityId) {
            const amountFormatted = (invoice.amount_paid / 100).toFixed(2);
            const currencyUpper = invoice.currency.toUpperCase();
            const isRenewal = invoice.billing_reason === "subscription_cycle";
            const isPro = planTier === "pro";

            await supabaseAdmin.from("provider_notifications").insert({
              user_id: userId,
              facility_id: facilityId,
              type: "payment_confirmation",
              title: isRenewal ? "Subscription Renewed" : "Payment Confirmed",
              message: isRenewal
                ? `Your ${planName} subscription has been renewed. ${currencyUpper} ${amountFormatted} charged.`
                : `Payment of ${currencyUpper} ${amountFormatted} for ${planName} confirmed.`,
              metadata: {
                amount_cents: invoice.amount_paid,
                currency: currencyUpper,
                invoice_id: invoice.id,
                billing_reason: invoice.billing_reason,
                plan_tier: planTier,
              },
            });

            // Send payment confirmation email
            if (resend && customerEmail) {
              try {
                const { data: providerProfile } = await supabaseAdmin
                  .from("profiles")
                  .select("first_name")
                  .eq("user_id", userId)
                  .maybeSingle();
                const firstName = providerProfile?.first_name || "Provider";

                const proBenefits = isPro
                  ? `<div style="background: #ecfdf5; border-left: 4px solid #059669; padding: 15px; margin: 20px 0;">
                       <p style="margin: 0; color: #047857; font-weight: 600;">Your Pro Benefits Are Active</p>
                       <p style="margin: 8px 0 0; color: #047857;">✓ Featured placement & priority ranking</p>
                       <p style="margin: 4px 0 0; color: #047857;">✓ Up to 5 facility listings</p>
                     </div>`
                  : "";

                await sendEmailWithRetry(supabaseAdmin, resend, {
                  from: "RehabLookup <no-reply@rehablookup.com>",
                  to: [customerEmail],
                  subject: isRenewal ? `✅ Subscription Renewed — ${planName}` : `✅ Payment Confirmed — ${planName}`,
                  html: `
                    <div style="font-family: Arial, Helvetica, sans-serif; max-width: 600px; margin: 0 auto;">
                      <div style="background-color: #1B365D; padding: 30px; border-radius: 12px 12px 0 0;">
                        <h1 style="color: #ffffff; margin: 0; font-size: 24px;">✅ ${isRenewal ? "Subscription Renewed" : "Payment Confirmed"}</h1>
                      </div>
                      <div style="background: #fff; padding: 30px; border: 1px solid #e5e7eb; border-top: none;">
                        <p style="color: #374151;">Hi ${firstName},</p>
                        <p style="color: #374151;">Your payment of <strong>${currencyUpper} ${amountFormatted}</strong> for <strong>${planName}</strong> has been processed successfully.</p>
                        ${proBenefits}
                        <div style="text-align: center; margin: 30px 0;">
                          <a href="https://rehablookup.com/provider/billing" style="background: #1B365D; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600;">View Billing</a>
                        </div>
                      </div>
                    </div>
                  `,
                }, {
                  emailType: "stripe_payment_success",
                idempotencyKey: `stripe-payment-success-${event.id}`,
                });
                logStep("Payment confirmation email sent to provider");
              } catch (emailError) {
                logStep("Payment confirmation email failed", { error: String(emailError) });
              }
            }
          }
        }
      }
    }

    // ==========================================
    // Handle customer.subscription.created
    // ==========================================
    if (event.type === "customer.subscription.created") {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;
      logStep("Subscription created", { subscriptionId: subscription.id, customerId });

      // Idempotency: skip if already processed.
      const { data: existingSubCreated } = await supabaseAdmin
        .from("subscription_events")
        .select("id")
        .eq("stripe_event_id", event.id)
        .maybeSingle();

      if (existingSubCreated) {
        logStep("Subscription created event already processed, skipping", { eventId: event.id });
      } else {

      // Add-on subscriptions (Featured/Concierge purchased separately
      // from Pro) carry a metadata.type marker set by create-checkout-
      // session. Route those to the dedicated activation helpers and
      // skip the Pro-subscription path below.
      const subMetadataType = subscription.metadata?.type as string | undefined;
      const addonFacilityId = subscription.metadata?.facility_id as string | undefined;

      // Round-31 audit fix: Pro downgrade-then-upgrade race detection.
      // If the user already has an active Pro facility_subscriptions
      // row tied to a DIFFERENT stripe_subscription_id, this new
      // sub.created event is suspicious — possibly a user who hit
      // "cancel at period end" then tried to upgrade before the
      // period ended (Stripe creates a NEW subscription for the new
      // billing cycle). Surface to admin so the duplicate-billing
      // window can be reconciled. Add-on subs (featured/concierge)
      // are scoped per-facility so they can legitimately coexist with
      // an existing Pro — only check for the Pro-path collision.
      if (!subMetadataType || subMetadataType === "pro_subscription") {
        // Need to resolve the user via the customer email lookup first.
        try {
          const cust = await stripe.customers.retrieve(customerId);
          if (!cust.deleted) {
            const custEmail = (cust as Stripe.Customer).email;
            if (custEmail) {
              // Scope to THIS provider. Without the provider_id filter the
              // query matched any active Pro row in the table, so every new
              // Pro subscriber past the first raised a bogus
              // "duplicate_active_pro_subscription" alert — noise that buries
              // the real activation failures during a signup push.
              const { data: dupProfile } = await supabaseAdmin
                .from("profiles")
                .select("user_id")
                .eq("email", custEmail)
                .limit(1)
                .maybeSingle();
              const dupProviderId = (dupProfile as { user_id?: string } | null)?.user_id ?? null;
              const { data: existingProRow } = dupProviderId
                ? await supabaseAdmin
                    .from("facility_subscriptions")
                    .select("id, stripe_subscription_id, status, tier, current_period_end")
                    .eq("provider_id", dupProviderId)
                    .eq("status", "active")
                    .eq("tier", "pro")
                    .neq("stripe_subscription_id", subscription.id)
                    .limit(1)
                    .maybeSingle()
                : { data: null };
              if (existingProRow) {
                logStep("Pro downgrade-then-upgrade race detected — existing active Pro row found", {
                  newStripeSubId: subscription.id,
                  existingStripeSubId: (existingProRow as { stripe_subscription_id: string }).stripe_subscription_id,
                });
                try {
                  await supabaseAdmin.from("admin_notifications").insert({
                    type: "duplicate_active_pro_subscription",
                    title: "Duplicate active Pro subscription detected",
                    message:
                      `New Stripe subscription ${subscription.id} created for ${custEmail}, ` +
                      `but a different active Pro facility_subscriptions row already exists ` +
                      `(stripe_sub=${(existingProRow as { stripe_subscription_id: string }).stripe_subscription_id}). ` +
                      `Likely a cancel-then-upgrade race during the cancel-at-period-end window. ` +
                      `Reconcile: either keep the new sub + cancel the old, or refund the new + keep the old.`,
                    metadata: {
                      new_stripe_subscription_id: subscription.id,
                      existing_stripe_subscription_id: (existingProRow as { stripe_subscription_id: string }).stripe_subscription_id,
                      customer_email: custEmail,
                      stripe_event_id: event.id,
                    } as Record<string, unknown>,
                  });
                } catch (adminErr) {
                  console.error("[stripe-webhook] duplicate-Pro admin notify failed", adminErr);
                }
                // Continue processing — the new sub's
                // activateProBenefits is idempotent on featured=true,
                // so a second Pro activation won't double-apply
                // benefits. The admin alert ensures a human reconciles.
              }
            }
          }
        } catch (lookupErr) {
          logStep("Pro-duplicate detection lookup failed (non-blocking)", { error: String(lookupErr) });
        }
      }

      if (subMetadataType === "featured_addon" && addonFacilityId) {
        const periodEnd = getSubscriptionPeriodEndISO(subscription);
        const addonResult = await activateFeaturedAddon(supabaseAdmin, {
          facilityId: addonFacilityId,
          stripeSubscriptionId: subscription.id,
          currentPeriodEnd: periodEnd,
        });
        logStep("Featured add-on activated via subscription.created", {
          facilityId: addonFacilityId,
          stripeSubId: subscription.id,
          placementsInserted: addonResult.placements_inserted,
          placementsReactivated: addonResult.placements_reactivated,
          failed: addonResult.failed.length,
        });
        await notifyFeaturedAddonPartialFailure(supabaseAdmin, {
          eventType: "customer.subscription.created",
          facilityId: addonFacilityId,
          stripeSubscriptionId: subscription.id,
          stripeEventId: event.id,
          result: addonResult,
        });

        // H5: a duplicate Featured purchase was detected — the helper KEPT the
        // existing live sub and refused to overwrite it. Cancel + fully refund
        // the redundant incoming sub, then stop (Featured is already live, so
        // this is NOT an activation failure).
        if (addonResult.duplicateSubscriptionId) {
          const { data: keptRow } = await supabaseAdmin
            .from("facility_subscriptions")
            .select("id, featured_stripe_subscription_id")
            .eq("facility_id", addonFacilityId)
            .maybeSingle();
          await refundAndCancelDuplicateAddon(stripe, supabaseAdmin, {
            product: "featured",
            facilityId: addonFacilityId,
            facSubId: (keptRow as { id: string } | null)?.id ?? null,
            duplicateSubId: addonResult.duplicateSubscriptionId,
            keptSubId:
              (keptRow as { featured_stripe_subscription_id: string | null } | null)
                ?.featured_stripe_subscription_id ?? null,
            stripeEventId: event.id,
          });
          return new Response(JSON.stringify({ received: true, duplicate_refunded: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Round-31 audit fix: previously even a fully-failed activation
        // (e.g. no Pro subscription row exists) still wrote
        // 'featured_addon_activated' to subscription_events AND sent
        // "Featured is live" to the provider. The customer paid Stripe
        // but had no placements. Now: if has_featured_set is false,
        // surface a critical admin alert + DO NOT send the
        // false-positive notification.
        const activationOk = addonResult.has_featured_set === true;

        await supabaseAdmin.from("subscription_events").insert({
          event_type: activationOk ? "featured_addon_activated" : "featured_addon_activation_failed",
          stripe_event_id: event.id,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscription.id,
          facility_id: addonFacilityId,
          plan_tier: null,
          status: subscription.status,
          metadata: {
            placements_inserted: addonResult.placements_inserted,
            placements_reactivated: addonResult.placements_reactivated,
            failed: addonResult.failed,
          },
        });

        if (!activationOk) {
          // Customer paid but activation didn't land. Critical: alert
          // ops so the manual recovery (often: create the missing
          // facility_subscriptions row, then retry) can happen.
          try {
            await supabaseAdmin.from("admin_notifications").insert({
              type: "featured_addon_activation_failed",
              title: "Featured add-on activation FAILED after payment",
              message:
                `Stripe subscription ${subscription.id} was created for ` +
                `featured_addon on facility ${addonFacilityId}, but the ` +
                `activation helper returned failed steps: ` +
                `${JSON.stringify(addonResult.failed).slice(0, 300)}. ` +
                `Customer paid but Featured is NOT live. Manual recovery required.`,
              metadata: {
                facility_id: addonFacilityId,
                stripe_subscription_id: subscription.id,
                stripe_event_id: event.id,
                failed_steps: addonResult.failed,
              } as Record<string, unknown>,
            });
          } catch (adminErr) {
            console.error("[stripe-webhook] admin notify failed (featured addon fail)", adminErr);
          }
          return new Response(JSON.stringify({ received: true, activation_failed: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const { data: facSubProvider } = await supabaseAdmin
          .from("facility_subscriptions")
          .select("provider_id")
          .eq("facility_id", addonFacilityId)
          .maybeSingle();
        if (facSubProvider) {
          await supabaseAdmin.from("provider_notifications").insert({
            user_id: (facSubProvider as { provider_id: string }).provider_id,
            facility_id: addonFacilityId,
            type: "featured_addon_active",
            title: "Featured is live",
            message:
              "Your facility is now in the Featured rotation across your state, city, and near-me pages. Upgrade to Concierge Partner for national + homepage exposure plus direct client placements.",
            metadata: { stripe_subscription_id: subscription.id },
          });
        }

        return new Response(JSON.stringify({ received: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (subMetadataType === "concierge_addon" && addonFacilityId) {
        const periodEnd = getSubscriptionPeriodEndISO(subscription);
        // Round-31 audit fix: pass user-selected levels of care
        // (collected at checkout time by create-checkout-session and
        // stored in subscription.metadata.levels_of_care as a
        // comma-separated string). Empty / missing falls back to
        // default in activateConciergePartner.
        const rawLOC = subscription.metadata?.levels_of_care;
        const levelsOfCare = typeof rawLOC === "string" && rawLOC.length > 0
          ? rawLOC.split(",").map((s) => s.trim()).filter(Boolean)
          : undefined;
        const concierge = await activateConciergePartner(supabaseAdmin, {
          facilityId: addonFacilityId,
          stripeSubscriptionId: subscription.id,
          currentPeriodEnd: periodEnd,
          levelsOfCare,
        });
        logStep("Concierge add-on activated via subscription.created", {
          facilityId: addonFacilityId,
          stripeSubId: subscription.id,
          partnerRowsInserted: concierge.partner_rows_inserted,
          partnerRowsReactivated: concierge.partner_rows_reactivated,
          networkOptedIn: concierge.network_opted_in_set,
          failed: concierge.failed.length,
        });
        await notifyConciergeAddonPartialFailure(supabaseAdmin, {
          eventType: "customer.subscription.created",
          facilityId: addonFacilityId,
          stripeSubscriptionId: subscription.id,
          stripeEventId: event.id,
          result: concierge,
        });

        // H5: a duplicate Concierge purchase was detected — the helper KEPT the
        // existing live sub and refused to overwrite it. Cancel + fully refund
        // the redundant incoming sub, then stop (Concierge is already live, so
        // this is NOT an activation failure).
        if (concierge.duplicateSubscriptionId) {
          const { data: keptRow } = await supabaseAdmin
            .from("facility_subscriptions")
            .select("id, concierge_stripe_subscription_id")
            .eq("facility_id", addonFacilityId)
            .maybeSingle();
          await refundAndCancelDuplicateAddon(stripe, supabaseAdmin, {
            product: "concierge",
            facilityId: addonFacilityId,
            facSubId: (keptRow as { id: string } | null)?.id ?? null,
            duplicateSubId: concierge.duplicateSubscriptionId,
            keptSubId:
              (keptRow as { concierge_stripe_subscription_id: string | null } | null)
                ?.concierge_stripe_subscription_id ?? null,
            stripeEventId: event.id,
          });
          return new Response(JSON.stringify({ received: true, duplicate_refunded: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Round-31 audit fix: don't write 'activated' event or send
        // "Concierge is live" notification if activation actually
        // failed (e.g. no Pro subscription row exists for facility).
        const conciergeActivationOk = concierge.has_concierge_partner_set === true;

        await supabaseAdmin.from("subscription_events").insert({
          event_type: conciergeActivationOk ? "concierge_addon_activated" : "concierge_addon_activation_failed",
          stripe_event_id: event.id,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscription.id,
          facility_id: addonFacilityId,
          plan_tier: null,
          status: subscription.status,
          metadata: {
            partner_rows_inserted: concierge.partner_rows_inserted,
            partner_rows_reactivated: concierge.partner_rows_reactivated,
            network_opted_in_set: concierge.network_opted_in_set,
            failed: concierge.failed,
          },
        });

        if (!conciergeActivationOk) {
          try {
            await supabaseAdmin.from("admin_notifications").insert({
              type: "concierge_addon_activation_failed",
              title: "Concierge add-on activation FAILED after payment",
              message:
                `Stripe subscription ${subscription.id} was created for ` +
                `concierge_addon on facility ${addonFacilityId}, but the ` +
                `activation helper returned failed steps: ` +
                `${JSON.stringify(concierge.failed).slice(0, 300)}. ` +
                `Customer paid but Concierge is NOT live. Manual recovery required.`,
              metadata: {
                facility_id: addonFacilityId,
                stripe_subscription_id: subscription.id,
                stripe_event_id: event.id,
                failed_steps: concierge.failed,
              } as Record<string, unknown>,
            });
          } catch (adminErr) {
            console.error("[stripe-webhook] admin notify failed (concierge addon fail)", adminErr);
          }
          return new Response(JSON.stringify({ received: true, activation_failed: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Mutual-exclusivity supersede: this Concierge upgrade was bought while
        // Featured was active (flagged at checkout via metadata.supersede_featured).
        // Concierge activation SUCCEEDED above and already carries the local
        // state/city placements (same facility_subscriptions row) plus national +
        // international, so retire the now-redundant Featured add-on to stop
        // double-billing. We intentionally do NOT deactivate featured_placements
        // here — they're shared on the facility_subscriptions row and now owned by
        // Concierge (the rotation pool accepts has_concierge_partner). Conditional
        // on activation success so we never strip Featured without Concierge live.
        if (subscription.metadata?.supersede_featured === "true") {
          try {
            const { data: supSub } = await supabaseAdmin
              .from("facility_subscriptions")
              .select("id, featured_stripe_subscription_id")
              .eq("facility_id", addonFacilityId)
              .maybeSingle();
            const featuredSubId =
              (supSub as { featured_stripe_subscription_id: string | null } | null)
                ?.featured_stripe_subscription_id ?? null;
            const facSubId = (supSub as { id: string } | null)?.id ?? null;

            // Prorated refund for the unused Featured period so the provider isn't
            // double-charged when they upgrade mid-period. Monthly Featured gets no
            // refund (standard SaaS — computeCancellationRefund returns 0); annual
            // Featured is refunded the unused months. We source the period + interval
            // from Stripe because our DB doesn't track Featured's own period_start /
            // billing_period separately, and refund against the Featured sub's OWN
            // charge (not the Pro charge). Idempotent via a subscription_cancellations
            // row keyed on the Featured sub id, so webhook retries don't double-refund.
            if (featuredSubId && facSubId) {
              const supersedeReason = `supersede:featured:${featuredSubId}`;
              try {
                const { data: existingRefund } = await supabaseAdmin
                  .from("subscription_cancellations")
                  .select("id")
                  .eq("subscription_id", facSubId)
                  .eq("reason", supersedeReason)
                  .maybeSingle();
                if (!existingRefund) {
                  const featuredSub = await stripe.subscriptions.retrieve(featuredSubId);
                  const interval = featuredSub.items?.data?.[0]?.price?.recurring?.interval ?? "month";
                  const billingPeriod = interval === "year" ? "annual" : "monthly";
                  // Latest paid invoice → charge + amount actually paid for this sub.
                  const invoices = await stripe.invoices.list({ subscription: featuredSubId, limit: 5 });
                  let chargeId: string | null = null;
                  let paidCents = 0;
                  for (const inv of invoices.data) {
                    if (inv.status === "paid" && inv.charge) {
                      chargeId = typeof inv.charge === "string" ? inv.charge : inv.charge.id;
                      paidCents = inv.amount_paid;
                      break;
                    }
                  }
                  const refund = computeCancellationRefund({
                    billingPeriod,
                    paidAmountCents: paidCents,
                    fullMonthlyRateCents: TIER_PRICING.featured.fullMonthlyRateCents,
                    periodStart: getSubscriptionPeriodStartDate(featuredSub) ?? undefined,
                    periodEnd: getSubscriptionPeriodEndDate(featuredSub) ?? undefined,
                  });
                  let stripeRefundId: string | null = null;
                  if (refund.refundCents > 0 && chargeId) {
                    const refundObj = await stripe.refunds.create({
                      charge: chargeId,
                      amount: refund.refundCents,
                      reason: "duplicate",
                      metadata: {
                        facility_id: addonFacilityId,
                        scope: supersedeReason,
                        note: "Prorated refund: Featured superseded by Concierge upgrade",
                      },
                    });
                    stripeRefundId = refundObj.id;
                    logStep("Supersede prorated Featured refund issued", {
                      facilityId: addonFacilityId, refundCents: refund.refundCents, stripeRefundId,
                    });
                  }
                  // Audit + idempotency row (recorded even for the 0-refund monthly
                  // case so a retry short-circuits on the existence check above).
                  await supabaseAdmin.from("subscription_cancellations").insert({
                    subscription_id: facSubId,
                    reason: supersedeReason,
                    refund_amount_cents: refund.refundCents,
                    charged_for_use_cents: refund.chargeForUseCents,
                    full_monthly_rate_cents: TIER_PRICING.featured.fullMonthlyRateCents,
                    months_used: refund.monthsUsed,
                    paid_amount_cents: paidCents,
                    stripe_refund_id: stripeRefundId,
                    canceled_by: null,
                  });
                }
              } catch (refundErr) {
                console.error("[stripe-webhook] supersede prorated refund failed", refundErr);
                await supabaseAdmin.from("admin_notifications").insert({
                  type: "supersede_featured_refund_failed",
                  title: "Featured supersede refund needs manual review",
                  message:
                    `Concierge upgrade superseded Featured for facility ${addonFacilityId}, ` +
                    `but the automatic prorated refund failed. Review Featured subscription ` +
                    `${featuredSubId} in Stripe and refund the unused (annual) period manually if owed.`,
                  metadata: {
                    facility_id: addonFacilityId,
                    featured_stripe_subscription_id: featuredSubId,
                    error: refundErr instanceof Error ? refundErr.message : String(refundErr),
                  } as Record<string, unknown>,
                }).then(() => undefined);
              }
            }

            if (featuredSubId) {
              try {
                await stripe.subscriptions.cancel(featuredSubId);
              } catch (cancelErr) {
                console.error("[stripe-webhook] supersede: Featured Stripe cancel failed", cancelErr);
              }
            }
            await supabaseAdmin
              .from("facility_subscriptions")
              .update({
                has_featured: false,
                featured_stripe_subscription_id: null,
                featured_current_period_end: null,
                updated_at: new Date().toISOString(),
              })
              .eq("facility_id", addonFacilityId);
            await supabaseAdmin.from("subscription_events").insert({
              event_type: "featured_superseded_by_concierge",
              stripe_event_id: event.id,
              stripe_customer_id: customerId,
              stripe_subscription_id: subscription.id,
              facility_id: addonFacilityId,
              plan_tier: null,
              status: subscription.status,
              metadata: { superseded_featured_stripe_subscription_id: featuredSubId },
            });
            logStep("Featured superseded by Concierge upgrade", { facilityId: addonFacilityId, featuredSubId });
          } catch (supErr) {
            console.error("[stripe-webhook] supersede-featured cleanup failed", supErr);
          }
        }

        const { data: facSubProvider } = await supabaseAdmin
          .from("facility_subscriptions")
          .select("provider_id")
          .eq("facility_id", addonFacilityId)
          .maybeSingle();
        if (facSubProvider) {
          await supabaseAdmin.from("provider_notifications").insert({
            user_id: (facSubProvider as { provider_id: string }).provider_id,
            facility_id: addonFacilityId,
            type: "concierge_addon_active",
            title: "Concierge Partner is live",
            message:
              "Your facility is now a Concierge Partner — featured nationally on our homepage, across your state and city pages, and on our international pages, plus surfaced to our advisors with a verified-partner badge when seekers match your geography and level of care.",
            metadata: { stripe_subscription_id: subscription.id },
          });
        }

        return new Response(JSON.stringify({ received: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const customer = await stripe.customers.retrieve(customerId);

      if (!customer.deleted) {
        const customerEmail = (customer as Stripe.Customer).email;
        const customerName = (customer as Stripe.Customer).name || "Provider";

        const priceItem = subscription.items.data[0];
        let planName = "Subscription";
        let planTier: string | null = null;
        let productId: string | null = null;
        const amount = priceItem?.price?.unit_amount || 0;
        const currency = (priceItem?.price?.currency || "usd").toUpperCase();

        // Try the new flat-fee monetization lookup keys first.
        // If the subscription has any of the six (Pro / Featured /
        // Concierge × monthly / annual), derive tier + addon flags and
        // billing_period from those. Falls through to the legacy
        // PRO_PRODUCT_IDS check otherwise.
        const flags = deriveTierFlagsFromSubscription(subscription);
        if (flags.matched_new_lookup_keys) {
          planTier = flags.tier;
          const intervalSuffix = flags.billing_period === "monthly" ? "monthly" : "annual";
          // Concierge is the mutually-exclusive upgrade that already includes
          // Featured exposure, so it supersedes the Featured label if both
          // flags are ever set (a Pro + Featured + Concierge combo no longer
          // exists as a purchasable state).
          planName = flags.has_concierge_partner
            ? `Pro + Concierge (${intervalSuffix})`
            : flags.has_featured
              ? `Pro + Featured (${intervalSuffix})`
              : `Pro (${intervalSuffix})`;
        } else if (priceItem?.price?.product) {
          const product = await stripe.products.retrieve(priceItem.price.product as string);
          planName = product.name;
          productId = product.id;
          if (productId && PRO_PRODUCT_IDS.includes(productId)) planTier = "pro";
        }

        const { data: profiles } = await supabaseAdmin
          .from("profiles")
          .select("user_id, first_name, last_name")
          .eq("email", customerEmail)
          .limit(1);

        const profile = profiles?.[0];
        const providerName = profile ? `${profile.first_name} ${profile.last_name}` : customerName;

        let facilityName = "New Provider";
        let facilityId = null;
        if (profile?.user_id) {
          const { data: facilities } = await supabaseAdmin
            .from("facilities")
            .select("id, name")
            .eq("user_id", profile.user_id)
            .limit(1);
          
          if (facilities?.[0]) {
            facilityName = facilities[0].name;
            facilityId = facilities[0].id;
          }
        }

        // Pro upgrade — activate full benefits (profile.plan mirror,
        // facilities.featured, +50 ranking) via the shared helper. The
        // helper is idempotent so this branch is safe to re-enter on
        // webhook retry. Partial failures emit an admin notification.
        //
        // 2026-07-02 entitlement audit: gate on the subscription actually
        // being active/trialing. Stripe emits customer.subscription.created
        // for 'incomplete' (3DS/SCA pending) subscriptions too — granting
        // benefits there is Pro-before-payment. The incomplete→active
        // transition is handled by customer.subscription.updated.
        const subscriptionEntitled =
          subscription.status === "active" || subscription.status === "trialing";
        if (profile?.user_id && planTier === "pro" && subscriptionEntitled) {
          const proResult = await activateProBenefits(supabaseAdmin, profile.user_id);
          logStep("Pro benefits activation result", {
            userId: profile.user_id,
            updated: proResult.facilitiesUpdated.length,
            already: proResult.alreadyActive.length,
            failed: proResult.failed.length,
            profileMirrored: proResult.profilePlanMirrored,
          });
          await notifyProBenefitsPartialFailure(supabaseAdmin, {
            userId: profile.user_id,
            eventType: "customer.subscription.created",
            result: proResult,
            stripeEventId: event.id,
          });

          const { data: suspendedFacilities } = await supabaseAdmin
            .from("facilities")
            .select("id, name")
            .eq("user_id", profile.user_id)
            .eq("suspended", true);

          if (suspendedFacilities && suspendedFacilities.length > 0) {
            for (const sf of suspendedFacilities) {
              await supabaseAdmin
                .from("facilities")
                .update({
                  suspended: false,
                  updated_at: new Date().toISOString(),
                })
                .eq("id", sf.id);
            }
            logStep("Suspended facilities reactivated on upgrade", {
              count: suspendedFacilities.length,
              names: suspendedFacilities.map(f => f.name),
            });

            // Notify provider
            await supabaseAdmin.from("provider_notifications").insert({
              user_id: profile.user_id,
              facility_id: facilityId,
              type: "facilities_reactivated",
              title: "Facilities Reactivated",
              message: `${suspendedFacilities.length} listing(s) have been reactivated with your Pro upgrade!`,
              metadata: {
                reactivated_facility_ids: suspendedFacilities.map(f => f.id),
                reactivated_facility_names: suspendedFacilities.map(f => f.name),
              },
            });
          }
        }

        // Record event
        await supabaseAdmin.from("subscription_events").insert({
          event_type: "subscription_created",
          stripe_event_id: event.id,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscription.id,
          user_id: profile?.user_id || null,
          facility_id: facilityId,
          plan_name: planName,
          plan_tier: planTier,
          amount_cents: amount,
          currency: currency,
          // Record the REAL Stripe status — previously hardcoded "active",
          // which made an unpaid 'incomplete' subscription look confirmed
          // in the admin event history.
          status: subscription.status,
          metadata: {
            customer_email: customerEmail,
            provider_name: providerName,
            facility_name: facilityName,
            product_id: productId,
          },
        });

        // Admin notification
        await supabaseAdmin.from("admin_notifications").insert({
          type: "new_subscription",
          title: "New Subscription Created",
          message: `${facilityName} subscribed to ${planName} (${currency} ${(amount / 100).toFixed(2)}/mo)`,
          metadata: {
            customer_id: customerId,
            customer_email: customerEmail,
            subscription_id: subscription.id,
            plan_name: planName,
            amount: (amount / 100).toFixed(2),
            currency,
            facility_id: facilityId,
            facility_name: facilityName,
            provider_name: providerName,
          },
        });

        // Send admin email
        if (resend) {
          try {
            await sendEmailWithRetry(supabaseAdmin, resend, {
              from: "RehabLookup <no-reply@rehablookup.com>",
              to: ["help@rehablookup.com"],
              subject: `🎉 New Subscription - ${facilityName}`,
              html: `
                <div style="font-family: Arial, Helvetica, sans-serif; max-width: 600px; margin: 0 auto;">
                  <div style="background-color: #1B365D; background: #1B365D; padding: 30px; border-radius: 12px 12px 0 0;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-family: Arial, Helvetica, sans-serif;">🎉 New Subscription</h1>
                  </div>
                  <div style="background: #fff; padding: 30px; border: 1px solid #e5e7eb; border-top: none;">
                    <p style="color: #374151;">A new provider has subscribed!</p>
                    <div style="background: #ecfdf5; border-left: 4px solid #059669; padding: 15px; margin: 20px 0;">
                      <p style="margin: 0; color: #047857;"><strong>Facility:</strong> ${facilityName}</p>
                      <p style="margin: 8px 0 0; color: #047857;"><strong>Provider:</strong> ${providerName}</p>
                      <p style="margin: 8px 0 0; color: #047857;"><strong>Plan:</strong> ${planName}</p>
                      <p style="margin: 8px 0 0; color: #047857;"><strong>Amount:</strong> ${currency} ${(amount / 100).toFixed(2)}/month</p>
                    </div>
                  </div>
                </div>
              `,
            }, {
              emailType: "stripe_new_subscription_admin",
              idempotencyKey: `stripe-new-sub-admin-${event.id}`,
            });
          } catch (emailError) {
            logStep("Email failed", { error: String(emailError) });
          }
        }
      }
      } // end idempotency check
    }

    // ==========================================
    // Handle customer.subscription.deleted
    // ==========================================
    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;
      logStep("Subscription deleted", { subscriptionId: subscription.id });

      // Idempotency: check if this event was already processed
      const { data: existingDeleteEvent } = await supabaseAdmin
        .from("subscription_events")
        .select("id")
        .eq("stripe_event_id", event.id)
        .maybeSingle();

      if (existingDeleteEvent) {
        logStep("Subscription deleted event already processed, skipping", { eventId: event.id });
      } else {

      // Add-on subscriptions (Featured/Concierge) — keyed off
      // metadata.type set when the sub was created via
      // create-checkout-session. Deactivate the helper's row(s) and
      // skip the full Pro cancellation path below.
      const delMetadataType = subscription.metadata?.type as string | undefined;
      const delAddonFacilityId = subscription.metadata?.facility_id as string | undefined;
      if (delMetadataType === "featured_addon") {
        const deactivateRes = await deactivateFeaturedAddon(supabaseAdmin, {
          facilityId: delAddonFacilityId,
          stripeSubscriptionId: subscription.id,
        });
        logStep("Featured add-on deactivated via subscription.deleted", {
          stripeSubId: subscription.id,
          placementsDeactivated: deactivateRes.placements_deactivated,
          failed: deactivateRes.failed.length,
        });
        await notifyFeaturedAddonPartialFailure(supabaseAdmin, {
          eventType: "customer.subscription.deleted",
          facilityId: delAddonFacilityId,
          stripeSubscriptionId: subscription.id,
          stripeEventId: event.id,
          result: deactivateRes,
        });

        await supabaseAdmin.from("subscription_events").insert({
          event_type: "featured_addon_deactivated",
          stripe_event_id: event.id,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscription.id,
          facility_id: delAddonFacilityId ?? null,
          plan_tier: null,
          status: "canceled",
          metadata: {
            placements_deactivated: deactivateRes.placements_deactivated,
          },
        });

        return new Response(JSON.stringify({ received: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (delMetadataType === "concierge_addon") {
        const conciergeRes = await deactivateConciergePartner(supabaseAdmin, {
          facilityId: delAddonFacilityId,
          stripeSubscriptionId: subscription.id,
        });
        logStep("Concierge add-on deactivated via subscription.deleted", {
          stripeSubId: subscription.id,
          partnerRowsDeactivated: conciergeRes.partner_rows_deactivated,
          failed: conciergeRes.failed.length,
        });
        await notifyConciergeAddonPartialFailure(supabaseAdmin, {
          eventType: "customer.subscription.deleted",
          facilityId: delAddonFacilityId,
          stripeSubscriptionId: subscription.id,
          stripeEventId: event.id,
          result: conciergeRes,
        });

        await supabaseAdmin.from("subscription_events").insert({
          event_type: "concierge_addon_deactivated",
          stripe_event_id: event.id,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscription.id,
          facility_id: delAddonFacilityId ?? null,
          plan_tier: null,
          status: "canceled",
          metadata: {
            partner_rows_deactivated: conciergeRes.partner_rows_deactivated,
          },
        });

        return new Response(JSON.stringify({ received: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const customer = await stripe.customers.retrieve(customerId);

      if (!customer.deleted) {
        const customerEmail = (customer as Stripe.Customer).email;

        const { data: profiles } = await supabaseAdmin
          .from("profiles")
          .select("user_id, first_name, last_name")
          .eq("email", customerEmail)
          .limit(1);

        if (profiles?.[0]) {
          const { data: facilities } = await supabaseAdmin
            .from("facilities")
            .select("id, name")
            .eq("user_id", profiles[0].user_id)
            .limit(1);

          if (facilities?.[0]) {
            // Resolve the facility_subscriptions row id so cancelSubscriptionAndRefund
            // can refund per-tier (Pro + every active add-on), record audit
            // rows, and flip the row to canceled with has_featured=false +
            // has_concierge_partner=false in a single transactional call.
            const { data: subRow } = await supabaseAdmin
              .from("facility_subscriptions")
              .select("id")
              .eq("stripe_subscription_id", subscription.id)
              .maybeSingle();

            if (subRow?.id) {
              try {
                const cancelResult = await cancelSubscriptionAndRefund(subRow.id, {
                  scope: "all",
                  reason: subscription.cancellation_details?.reason
                    ? `stripe webhook: ${subscription.cancellation_details.reason}`
                    : "stripe webhook: subscription.deleted",
                });
                logStep("Cancellation refunds issued", {
                  totalRefundCents: cancelResult.totalRefundCents,
                  refundIds: cancelResult.stripeRefundIds,
                  rowIds: cancelResult.cancellationRowIds,
                });
              } catch (cancelErr) {
                logStep("ERROR running cancelSubscriptionAndRefund", { error: String(cancelErr) });
                // Round-30: await the admin notification so we know
                // whether it landed, and check the fallback DB update
                // — if BOTH fail, we've fully lost the signal and must
                // console.error so ops sees it in function logs.
                let adminNotifyOk = false;
                try {
                  const { error: notifyErr } = await supabaseAdmin.from("admin_notifications").insert({
                    type: "subscription_cancel_refund_failed",
                    title: "Refund executor failed on subscription.deleted",
                    message: `cancelSubscriptionAndRefund threw for facility_subscriptions.id=${subRow.id} (stripe_sub=${subscription.id}). Attempting force-cancel; manual review required.`,
                    metadata: {
                      facility_subscription_id: subRow.id,
                      stripe_subscription_id: subscription.id,
                      stripe_event_id: event.id,
                      error: String(cancelErr),
                    },
                  });
                  adminNotifyOk = !notifyErr;
                  if (notifyErr) logStep("WARN admin notify failed", { error: notifyErr.message });
                } catch (notifyThrowErr) {
                  logStep("WARN admin notify threw", { error: String(notifyThrowErr) });
                }
                // Fallback: at minimum mark the row canceled.
                const { error: fallbackErr } = await supabaseAdmin
                  .from("facility_subscriptions")
                  .update({
                    status: "canceled",
                    canceled_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                  })
                  .eq("id", subRow.id);
                if (fallbackErr) {
                  logStep("CRITICAL fallback row-cancel ALSO failed", { error: fallbackErr.message });
                  if (!adminNotifyOk) {
                    console.error(
                      `[stripe-webhook] CRITICAL: Stripe subscription ${subscription.id} ` +
                      `was canceled but BOTH the refund executor AND the fallback ` +
                      `row-cancel + admin notification failed. The facility_subscriptions row ` +
                      `is now permanently inconsistent with Stripe. Manual reconciliation REQUIRED.`,
                    );
                  }
                }
              }
            } else {
              logStep("No facility_subscriptions row found for cancelled Stripe sub — skipping refund executor", { stripeSubId: subscription.id });
            }

            // Revert Pro benefits via the shared helper (idempotent on
            // featured=false; mirrors profiles.plan='free').
            const providerId = profiles[0].user_id;
            const revertResult = await deactivateProBenefits(supabaseAdmin, providerId);
            logStep("Pro benefits revert result", {
              reverted: revertResult.facilitiesReverted.length,
              failed: revertResult.failed.length,
              profileReverted: revertResult.profilePlanReverted,
            });
            await notifyProBenefitsPartialFailure(supabaseAdmin, {
              userId: providerId,
              eventType: "customer.subscription.deleted",
              result: revertResult,
              stripeEventId: event.id,
            });

            // DOWNGRADE: re-read the full facility set for the
            // suspend-extras step below.
            const { data: allFacilities } = await supabaseAdmin
              .from("facilities")
              .select("id")
              .eq("user_id", providerId);
            if (allFacilities) {

              // DOWNGRADE: Suspend extra facilities beyond the free-tier limit of 1
              // Keep the oldest facility (by created_at) active, suspend the rest
              if (allFacilities.length > 1) {
                // Fetch all facilities with created_at to determine which to keep
                const { data: allFacilitiesOrdered } = await supabaseAdmin
                  .from("facilities")
                  .select("id, name, created_at")
                  .eq("user_id", providerId)
                  .order("created_at", { ascending: true });

                if (allFacilitiesOrdered && allFacilitiesOrdered.length > 1) {
                  // Keep the first (oldest) facility active, suspend the rest
                  const facilitiesToSuspend = allFacilitiesOrdered.slice(1);
                  for (const sf of facilitiesToSuspend) {
                    await supabaseAdmin
                      .from("facilities")
                      .update({
                        suspended: true,
                        updated_at: new Date().toISOString(),
                      })
                      .eq("id", sf.id);
                  }
                  logStep("Extra facilities suspended on downgrade", {
                    kept: allFacilitiesOrdered[0].name,
                    suspended: facilitiesToSuspend.map(f => f.name),
                  });

                  // Notify provider about suspended facilities
                  await supabaseAdmin.from("provider_notifications").insert({
                    user_id: providerId,
                    facility_id: allFacilitiesOrdered[0].id,
                    type: "facilities_suspended",
                    title: "Facilities Paused",
                    message: `${facilitiesToSuspend.length} additional listing(s) have been paused. Upgrade to Pro to reactivate them. No data has been deleted.`,
                    metadata: {
                      suspended_facility_ids: facilitiesToSuspend.map(f => f.id),
                      suspended_facility_names: facilitiesToSuspend.map(f => f.name),
                    },
                  });
                }
              }
            }

            // Record event
            await supabaseAdmin.from("subscription_events").insert({
              event_type: "subscription_cancelled",
              stripe_event_id: event.id,
              stripe_customer_id: customerId,
              stripe_subscription_id: subscription.id,
              user_id: profiles[0].user_id,
              facility_id: facilities[0].id,
              status: "cancelled",
              metadata: {
                customer_email: customerEmail,
                provider_name: `${profiles[0].first_name} ${profiles[0].last_name}`,
                facility_name: facilities[0].name,
                cancel_reason: subscription.cancellation_details?.reason || null,
              },
            });

            // Admin notification
            await supabaseAdmin.from("admin_notifications").insert({
              type: "subscription_cancelled",
              title: "Subscription Cancelled",
              message: `${facilities[0].name} has cancelled their subscription`,
              metadata: {
                facility_id: facilities[0].id,
                facility_name: facilities[0].name,
                provider_name: `${profiles[0].first_name} ${profiles[0].last_name}`,
                customer_email: customerEmail,
              },
            });

            // Provider notification
            await supabaseAdmin.from("provider_notifications").insert({
              user_id: profiles[0].user_id,
              facility_id: facilities[0].id,
              type: "subscription_cancelled",
              title: "Pro Subscription Cancelled",
              message: "Your Pro features have been removed — your public phone number and Call button are no longer shown. Your listing, its directory position and its verification status are unchanged. Upgrade again to restore them.",
              metadata: { subscription_id: subscription.id },
            });

            logStep("Subscription cancellation processed");

            // Send admin email
            if (resend) {
              try {
                await sendEmailWithRetry(supabaseAdmin, resend, {
                  from: "RehabLookup <no-reply@rehablookup.com>",
                  to: ["help@rehablookup.com"],
                  subject: `⚠️ Subscription Cancelled - ${facilities[0].name}`,
                  html: `
                    <div style="font-family: Arial, Helvetica, sans-serif; max-width: 600px; margin: 0 auto;">
                      <div style="background-color: #1B365D; background: #1B365D; padding: 30px; border-radius: 12px 12px 0 0;">
                        <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-family: Arial, Helvetica, sans-serif;">⚠️ Subscription Cancelled</h1>
                      </div>
                      <div style="background: #fff; padding: 30px; border: 1px solid #e5e7eb; border-top: none;">
                        <div style="background: #fffbeb; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
                          <p style="margin: 0; color: #92400e;"><strong>Facility:</strong> ${facilities[0].name}</p>
                          <p style="margin: 8px 0 0; color: #92400e;"><strong>Provider:</strong> ${profiles[0].first_name} ${profiles[0].last_name}</p>
                        </div>
                        <p style="color: #6b7280; font-size: 14px;">Consider reaching out to understand why they cancelled.</p>
                      </div>
                    </div>
                  `,
                }, {
                  emailType: "stripe_cancel_admin",
                idempotencyKey: `stripe-cancel-admin-${event.id}`,
                });
              } catch (emailError) {
                logStep("Cancel admin email failed", { error: String(emailError) });
              }

              // Send cancellation email to provider
              if (customerEmail) {
                try {
                  await sendEmailWithRetry(supabaseAdmin, resend, {
                    from: "RehabLookup <no-reply@rehablookup.com>",
                    to: [customerEmail],
                    subject: `Your Pro Subscription Has Been Cancelled`,
                    html: `
                      <div style="font-family: Arial, Helvetica, sans-serif; max-width: 600px; margin: 0 auto;">
                        <div style="background-color: #1B365D; padding: 30px; border-radius: 12px 12px 0 0;">
                          <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Pro Subscription Cancelled</h1>
                        </div>
                        <div style="background: #fff; padding: 30px; border: 1px solid #e5e7eb; border-top: none;">
                          <p style="color: #374151;">Hi ${profiles[0].first_name},</p>
                          <p style="color: #374151;">Your Pro subscription for <strong>${facilities[0].name}</strong> has been cancelled.</p>
                          <div style="background: #fffbeb; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
                            <p style="margin: 0; color: #92400e; font-weight: 600;">What This Means</p>
                            <p style="margin: 8px 0 0; color: #92400e;">• Featured placement & priority ranking removed</p>
                            <p style="margin: 4px 0 0; color: #92400e;">• Extra listings paused (data preserved)</p>
                          </div>
                          <p style="color: #374151;">Your data is safe — nothing has been deleted. You can resubscribe anytime to restore all Pro benefits.</p>
                          <div style="text-align: center; margin: 30px 0;">
                            <a href="https://rehablookup.com/provider/billing" style="background: #1B365D; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600;">Resubscribe to Pro</a>
                          </div>
                        </div>
                      </div>
                    `,
                  }, {
                    emailType: "stripe_cancel_provider",
                  idempotencyKey: `stripe-cancel-provider-${event.id}`,
                  });
                  logStep("Cancellation email sent to provider");
                } catch (provEmailError) {
                  logStep("Provider cancel email failed", { error: String(provEmailError) });
                }
              }
            }
          }
        }
      }
      } // end idempotency check
    }

    // ==========================================
    // payment_intent.payment_failed handler retired — it processed
    // placement_invoices failures, which is the dead pay-per-admission
    // flow. The placement_invoices table was dropped in the
    // monetization rebuild. International + concierge payment failure
    // handling continues below.


    // ==========================================
    // Handle charge.refunded (international payments + out-of-band
    // subscription refunds via Stripe dashboard)
    // ==========================================
    if (event.type === "charge.refunded") {
      const charge = event.data.object as Stripe.Charge;
      const paymentIntentId = charge.payment_intent as string;

      if (paymentIntentId) {
        logStep("Processing refund", { chargeId: charge.id, paymentIntentId });

        // International placement payments retired 2026-05-20 — the
        // international_payments table is dropped. The branch below
        // handles every other refund (Pro/Featured/Concierge
        // subscription refunds issued via Stripe dashboard) and
        // surfaces them to admin for reconciliation.
        {
          // Round-30: out-of-band subscription refund detection.
          // If an admin issues a refund via Stripe dashboard for a
          // Pro/Featured/Concierge subscription (not via the
          // cancel-subscription helper), our own audit trail
          // never records it. Look up the customer and surface to
          // admin so the in-DB state can be reconciled.
          const customerId = typeof charge.customer === "string"
            ? charge.customer
            : charge.customer?.id ?? null;
          if (customerId) {
            const { data: facSub } = await supabaseAdmin
              .from("facility_subscriptions")
              .select("id, facility_id, provider_id, tier, status")
              .eq("stripe_customer_id", customerId)
              .maybeSingle();
            if (facSub) {
              const refundId = charge.refunds?.data?.[0]?.id ?? null;
              const refundAmountCents = charge.amount_refunded ?? null;
              logStep("Out-of-band subscription refund detected", {
                customerId,
                facSubId: facSub.id,
                refundAmountCents,
              });
              try {
                await supabaseAdmin.from("admin_notifications").insert({
                  type: "out_of_band_subscription_refund",
                  title: "Out-of-band subscription refund (Stripe dashboard)",
                  message:
                    `A Stripe-dashboard refund was issued for subscription ` +
                    `${facSub.id} (tier=${facSub.tier}, status=${facSub.status}, ` +
                    `customer=${customerId}). ` +
                    `Refund ${refundAmountCents != null ? `$${(refundAmountCents/100).toFixed(2)}` : "(amount unknown)"} ` +
                    `via charge ${charge.id}. The cancel-subscription helper was bypassed; ` +
                    `reconcile DB state if the subscription should be canceled.`,
                  metadata: {
                    facility_subscription_id: facSub.id,
                    facility_id: facSub.facility_id,
                    provider_id: facSub.provider_id,
                    tier: facSub.tier,
                    current_status: facSub.status,
                    stripe_charge_id: charge.id,
                    stripe_refund_id: refundId,
                    stripe_customer_id: customerId,
                    refund_amount_cents: refundAmountCents,
                  } as Record<string, unknown>,
                });
              } catch (adminErr) {
                logStep("admin_notifications insert failed (oob refund)", {
                  error: adminErr instanceof Error ? adminErr.message : String(adminErr),
                });
              }
            }
          }
        }
      }
    }

    // ==========================================
    // International facility invoice webhook handlers
    // (invoice.paid + invoice.payment_failed for international placement)
    //
    // RETIRED 2026-05-20 with the paid international placement product.
    // The international_facility_invoices and international_placement_cases
    // tables are dropped. If a stale Stripe invoice event with
    // metadata.type='international_placement_fee' still arrives (e.g.
    // delayed retry of a pre-retirement invoice), we acknowledge it,
    // record an admin_notifications row for visibility, and return 200
    // so Stripe stops retrying.
    // ==========================================
    if ((event.type === "invoice.paid" || event.type === "invoice.payment_failed")) {
      const invoice = event.data.object as Stripe.Invoice;
      const invoiceType = invoice.metadata?.type;
      if (invoiceType === "international_placement_fee") {
        logStep("⚠️ International invoice webhook fired after retirement", {
          eventType: event.type,
          stripeInvoiceId: invoice.id,
        });
        try {
          await supabaseAdmin.from("admin_notifications").insert({
            type: "retired_product_webhook",
            title: `⚠️ International invoice ${event.type} after retirement`,
            message: `Stripe delivered an 'international_placement_fee' invoice event (${event.type}) for ${invoice.id} after the product was retired. Refund or reconcile manually if needed.`,
            metadata: {
              event_type: event.type,
              stripe_invoice_id: invoice.id,
              amount_paid: invoice.amount_paid,
              metadata: invoice.metadata,
            },
          });
        } catch (e) {
          logStep("Failed to write retirement-warning admin notification", { error: String(e) });
        }
      }
    }

    // Close out the dedup claim so the row doesn't sit in 'received'
    // forever (cleanup_old_stripe_webhook_events otherwise force-finalizes
    // it an hour later).
    try {
      await supabaseAdmin.rpc("mark_stripe_webhook_event_processed", {
        p_event_id: event.id,
        p_status: "processed",
      });
    } catch (markErr) {
      logStep("Could not mark event processed (non-fatal)", { error: String(markErr) });
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });

    // Release the dedup claim before returning 500. claim_stripe_webhook_event
    // commits its row up front, so without this the Stripe retry re-claims,
    // gets `claimed === false`, and returns 200 {duplicate:true} — silently
    // skipping every side effect. The 500 below only actually buys a retry if
    // the claim is gone, so a mid-handler failure would otherwise drop the
    // event permanently (lost Pro activation, missed refund, stale
    // subscription row). Deleting rather than marking 'failed' is what makes
    // the row re-claimable; the financial uniques (credit_transactions,
    // lead_unlocks, pro_subscriptions) still prevent double-spend on reprocess.
    if (claimedEventId && adminClientForCleanup) {
      try {
        const { error: releaseErr } = await adminClientForCleanup
          .from("stripe_webhook_events")
          .delete()
          .eq("event_id", claimedEventId);
        if (releaseErr) {
          logStep("CRITICAL - could not release dedup claim; Stripe retry will be ignored", {
            eventId: claimedEventId,
            error: releaseErr.message,
          });
        } else {
          logStep("Released dedup claim so Stripe's retry reprocesses", { eventId: claimedEventId });
        }
      } catch (releaseErr) {
        logStep("CRITICAL - releasing dedup claim threw; Stripe retry will be ignored", {
          eventId: claimedEventId,
          error: String(releaseErr),
        });
      }
    }

    // Stripe-side will retry on 500 anyway — but the operator needs to
    // see the original exception in Sentry to debug WHY it 500'd.
    await captureEdgeException(error, { functionSlug: "stripe-webhook" });
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}));
