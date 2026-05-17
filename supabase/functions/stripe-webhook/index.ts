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

async function deactivateConciergePartner(supabase: SupabaseClient, subscriptionId: string): Promise<void> {
  const { error } = await supabase
    .from("concierge_partner_facilities")
    .update({ active: false, deactivated_at: new Date().toISOString() })
    .eq("subscription_id", subscriptionId)
    .eq("active", true);
  if (error) console.error("[cancel-subscription] deactivateConciergePartner failed", error);
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
    await deactivateConciergePartner(supabase, subscription.id);

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

    await deactivateConciergePartner(supabase, subscription.id);
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

  // 1. Flip the partner flag + record the Stripe sub id.
  const { error: flagErr } = await supabase
    .from("facility_subscriptions")
    .update({
      has_concierge_partner: true,
      concierge_stripe_subscription_id: args.stripeSubscriptionId,
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
    .select("id, facility_id, has_concierge_partner");
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
  // National homepage pool — `"national"` matches the token used by
  // src/pages/Index.tsx and src/lib/featuredBucket.ts.
  out.push({ type: "homepage", value: "national" });
  // State pool — state is stored as a 2-letter abbreviation in
  // facilities.state; the rotation accepts either form.
  if (facility.state && facility.state.trim().length > 0) {
    out.push({ type: "state", value: facility.state.trim().toUpperCase() });
  }
  // City pool — slugified to match the resolveSearchBucket() output.
  if (facility.city && facility.city.trim().length > 0) {
    out.push({ type: "city", value: slugify(facility.city) });
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

  const { error: flagErr } = await supabase
    .from("facility_subscriptions")
    .update({
      has_featured: true,
      featured_stripe_subscription_id: args.stripeSubscriptionId,
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
    .select("id, facility_id, has_featured");
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
// Idempotency: benefit flips guard on `facilities.featured`. The +50 ranking
// boost is applied only when featured transitions false → true.
// ============================================================================

const RANKING_BOOST = 50;

export interface ActivateResult {
  facilitiesUpdated: string[];
  alreadyActive: string[];
  failed: { id: string; error: string }[];
  profilePlanMirrored: boolean;
  profileMirrorError?: string;
}

/**
 * Activate Pro benefits for every facility owned by the provider:
 *  - `facilities.featured = true`
 *  - `facilities.calculated_ranking_score += 50` (only when transitioning
 *    from `featured=false`, so retries are no-ops)
 * Also mirrors `profiles.plan = 'pro'` (drives the photo-cap trigger).
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

  // Mirror profile plan first so the photo-cap trigger sees the upgrade
  // even if a downstream facility update is in flight.
  const { error: planErr } = await supabase
    .from("profiles")
    .update({ plan: "pro" })
    .eq("user_id", userId);
  if (planErr) {
    result.profileMirrorError = planErr.message;
  } else {
    result.profilePlanMirrored = true;
  }

  const { data: facilities, error: facListErr } = await supabase
    .from("facilities")
    .select("id, featured, calculated_ranking_score")
    .eq("user_id", userId);
  if (facListErr) {
    result.failed.push({ id: "*list*", error: facListErr.message });
    return result;
  }

  for (const f of facilities ?? []) {
    const facilityId = (f as { id: string }).id;
    const alreadyBoosted = (f as { featured?: boolean | null }).featured === true;
    if (alreadyBoosted) {
      result.alreadyActive.push(facilityId);
      continue;
    }
    const currentScore = (f as { calculated_ranking_score?: number | null }).calculated_ranking_score ?? 0;
    const { error: updErr } = await supabase
      .from("facilities")
      .update({
        featured: true,
        calculated_ranking_score: currentScore + RANKING_BOOST,
        updated_at: new Date().toISOString(),
      })
      .eq("id", facilityId);
    if (updErr) {
      result.failed.push({ id: facilityId, error: updErr.message });
    } else {
      result.facilitiesUpdated.push(facilityId);
    }
  }

  return result;
}

export interface DeactivateResult {
  facilitiesReverted: string[];
  failed: { id: string; error: string }[];
  profilePlanReverted: boolean;
  profileMirrorError?: string;
}

/**
 * Revert Pro benefits for every facility owned by the provider:
 *  - `facilities.featured = false`
 *  - `facilities.calculated_ranking_score -= 50` (only when currently
 *    featured, so retries are no-ops; clamps to 0)
 * Also mirrors `profiles.plan = 'free'`.
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

  const { data: facilities, error: facListErr } = await supabase
    .from("facilities")
    .select("id, featured, calculated_ranking_score")
    .eq("user_id", userId);
  if (facListErr) {
    result.failed.push({ id: "*list*", error: facListErr.message });
    return result;
  }

  for (const f of facilities ?? []) {
    const facilityId = (f as { id: string }).id;
    const wasBoosted = (f as { featured?: boolean | null }).featured === true;
    if (!wasBoosted) continue;
    const currentScore = (f as { calculated_ranking_score?: number | null }).calculated_ranking_score ?? 0;
    const newScore = Math.max(0, currentScore - RANKING_BOOST);
    const { error: updErr } = await supabase
      .from("facilities")
      .update({
        featured: false,
        calculated_ranking_score: newScore,
        updated_at: new Date().toISOString(),
      })
      .eq("id", facilityId);
    if (updErr) {
      result.failed.push({ id: facilityId, error: updErr.message });
    } else {
      result.facilitiesReverted.push(facilityId);
    }
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
const VERSION = "1.2.0";
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

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
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 400,
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
        logStep("WARN - claim_stripe_webhook_event failed, processing anyway", {
          eventId: event.id,
          error: claimError.message,
        });
        // Surface dedup-claim failures to an admin so silent retries
        // don't accumulate unnoticed. Best-effort insert.
        await supabaseAdmin.from("admin_notifications").insert({
          type: "webhook_dedup_failure",
          title: "Stripe webhook dedup-claim failed",
          message: `claim_stripe_webhook_event errored for ${event.type} (${event.id}). Event was processed but downstream side-effects may run twice on retry.`,
          metadata: {
            stripe_event_id: event.id,
            stripe_event_type: event.type,
            error: claimError.message,
          },
        }).then(({ error: notifyErr }) => {
          if (notifyErr) logStep("WARN - admin_notifications insert failed", { error: notifyErr.message });
        });
      } else if (claimed === false) {
        logStep("Duplicate Stripe event ignored", { eventId: event.id, type: event.type });
        return new Response(JSON.stringify({ received: true, duplicate: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } catch (dedupErr) {
      logStep("WARN - dedup check threw, processing anyway", { error: String(dedupErr) });
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

      // INTERNATIONAL PLACEMENT PAYMENT
      if (session.mode === "payment" && metadataType === "international_placement") {
        const clientEmail = session.metadata?.client_email || session.customer_email;
        const clientName = session.metadata?.client_name;
        const clientCountry = session.metadata?.client_country;
        const userId = session.metadata?.user_id || null;
        const paymentIntentId = session.payment_intent as string;

        logStep("Processing international placement payment", { 
          sessionId: session.id, 
          email: clientEmail,
          paymentIntentId 
        });

        // Check if payment already processed (idempotency)
        const { data: existingPayment } = await supabaseAdmin
          .from("international_payments")
          .select("id, status")
          .eq("stripe_checkout_session_id", session.id)
          .maybeSingle();

        if (existingPayment?.status === "succeeded") {
          logStep("Payment already processed, skipping", { paymentId: existingPayment.id });
          return new Response(JSON.stringify({ received: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Upsert payment record
        const { error: paymentError } = await supabaseAdmin
          .from("international_payments")
          .upsert({
            id: existingPayment?.id,
            user_id: userId || null,
            email: clientEmail || "",
            stripe_checkout_session_id: session.id,
            stripe_payment_intent_id: paymentIntentId,
            amount_cents: 9900,
            currency: "USD",
            status: "succeeded",
            client_name: clientName,
            client_country: clientCountry,
            metadata: {
              stripe_customer_id: session.customer,
              idempotency_key: session.metadata?.idempotency_key,
            },
            updated_at: new Date().toISOString(),
          }, { onConflict: "stripe_checkout_session_id" });

        if (paymentError) {
          logStep("Error updating payment record", { error: paymentError.message });
        } else {
          logStep("International payment recorded successfully");
        }

        // CREATE PENDING CASE RECORD (safety net for abandoned intake forms)
        const { data: existingCase } = await supabaseAdmin
          .from("international_placement_cases")
          .select("id")
          .eq("stripe_checkout_session_id", session.id)
          .maybeSingle();

        if (!existingCase) {
          const { error: caseError } = await supabaseAdmin
            .from("international_placement_cases")
            .insert({
              client_name: clientName || "Pending Intake",
              client_email: clientEmail || "",
              client_country: clientCountry || "Unknown",
              user_id: userId || null,
              stripe_checkout_session_id: session.id,
              stripe_payment_intent_id: paymentIntentId,
              seeker_fee_amount_cents: 9900,
              seeker_fee_status: "paid",
              status: "pending_intake",
              intake_data: {},
            });

          if (caseError) {
            logStep("Error creating pending case", { error: caseError.message });
          } else {
            logStep("Pending international case created for follow-up");
          }
        }

        // Create admin notification
        await supabaseAdmin.from("admin_notifications").insert({
          type: "international_payment",
          title: "New International Placement Payment",
          message: `${clientName} from ${clientCountry} paid $99 for international placement`,
          metadata: {
            session_id: session.id,
            payment_intent_id: paymentIntentId,
            client_name: clientName,
            client_email: clientEmail,
            client_country: clientCountry,
          },
        });

        return new Response(JSON.stringify({ received: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // DEPRECATED: Domestic concierge is now FREE. This handler is retained only as a
      // safety net for any legacy in-flight Stripe sessions that may still resolve.
      // No new checkout sessions are created — create-concierge-checkout has been removed.
      if (session.mode === "payment" && session.metadata?.service === "concierge_placement") {
        const email = session.customer_email || "";
        const userId = session.metadata?.user_id || null;
        const checkoutSessionId = session.id;
        const paymentIntentId = session.payment_intent as string;

        logStep("Processing domestic concierge payment", { 
          sessionId: checkoutSessionId, 
          email,
          userId 
        });

        // Check if inquiry already exists — search by checkout_session_id first, then draft_id fallback
        let existingInquiry: { id: string; payment_status: string } | null = null;
        
        const { data: bySession } = await supabaseAdmin
          .from("concierge_inquiries")
          .select("id, payment_status")
          .eq("checkout_session_id", checkoutSessionId)
          .maybeSingle();
        
        existingInquiry = bySession;

        // Fallback: look up by draft_id from Stripe metadata
        if (!existingInquiry && session.metadata?.draft_id) {
          const { data: byDraft } = await supabaseAdmin
            .from("concierge_inquiries")
            .select("id, payment_status")
            .eq("draft_id", session.metadata.draft_id)
            .maybeSingle();
          
          if (byDraft) {
            existingInquiry = byDraft;
            logStep("Found existing inquiry by draft_id fallback", { draftId: session.metadata.draft_id, inquiryId: byDraft.id });
          }
        }

        if (existingInquiry) {
          // Update payment status and link checkout session if not already paid
          const updatePayload: Record<string, unknown> = {
            checkout_session_id: checkoutSessionId,
            stripe_payment_intent_id: paymentIntentId,
            stripe_customer_id: session.customer as string,
            updated_at: new Date().toISOString(),
          };

          if (existingInquiry.payment_status !== "paid" && existingInquiry.payment_status !== "succeeded") {
            updatePayload.payment_status = "paid";
          }

          await supabaseAdmin
            .from("concierge_inquiries")
            .update(updatePayload)
            .eq("id", existingInquiry.id);
          logStep("Updated existing inquiry payment status", { inquiryId: existingInquiry.id });
        } else {
          // Create pending inquiry record (safety net — only if no draft exists at all)
          const { error: inquiryError } = await supabaseAdmin
            .from("concierge_inquiries")
            .insert({
              user_id: userId || null,
              user_name: "Pending Intake",
              user_email: email,
              user_phone: "",
              status: "pending_intake",
              payment_status: "paid",
              payment_amount_cents: 0,
              checkout_session_id: checkoutSessionId,
              stripe_payment_intent_id: paymentIntentId,
              stripe_customer_id: session.customer as string,
              idempotency_key: `intake_${checkoutSessionId}`,
              intake_data: {},
            });

          if (inquiryError) {
            logStep("Error creating pending concierge inquiry", { error: inquiryError.message });
          } else {
            logStep("Pending concierge inquiry created for follow-up");

            // Create admin notification for abandoned payment
            await supabaseAdmin.from("admin_notifications").insert({
              type: "concierge_payment_pending_intake",
              title: "Concierge Payment - Pending Intake",
              message: `Payment received from ${email || "unknown"} but intake form not yet submitted`,
              metadata: {
                session_id: checkoutSessionId,
                payment_intent_id: paymentIntentId,
                email,
                user_id: userId,
              },
            });
          }
        }

        return new Response(JSON.stringify({ received: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Legacy `additional_listing_slot`, `lead_unlock`, and
      // `credit_purchase` checkout sessions are no longer issued —
      // the monetization rebuild dropped those flows. The handler
      // blocks that processed them were removed; any in-flight legacy
      // event will fall through to the no-op below.

      // PRO_SUBSCRIPTION (annual)
      if (session.mode === "subscription" && metadataType === "pro_subscription") {
        const facilityId = session.metadata?.facility_id;
        const userId = session.metadata?.user_id;
        const subscriptionId = session.subscription as string;
        const customerId = session.customer as string;

        if (subscriptionId && facilityId && userId) {
          logStep("Activating Pro subscription", { subscriptionId, facilityId });

          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          const currentPeriodEnd = new Date(subscription.current_period_end * 1000).toISOString();

          // Derive new monetization flags from the subscription items.
          // Falls back to legacy price_cents if no new lookup keys
          // matched (older subscriptions still flow through here).
          const flagsCheckout = deriveTierFlagsFromSubscription(subscription);
          const monthlyEquivalentCents = flagsCheckout.matched_new_lookup_keys
            ? (FULL_MONTHLY_CENTS.pro +
                (flagsCheckout.has_featured ? FULL_MONTHLY_CENTS.featured : 0) +
                (flagsCheckout.has_concierge_partner ? FULL_MONTHLY_CENTS.concierge : 0))
            : 39900;
          // Annual subscriptions track period_start AND current_monthly_period_start
          // (the helpers that read monthly elapsed time look at the latter first,
          // falling back to period_start for annual). For monthly, both point at the
          // current 30-day window's start; for annual they stay aligned.
          const periodStartISO = new Date(subscription.current_period_start * 1000).toISOString();

          const { error: proError } = await supabaseAdmin
            .from("facility_subscriptions")
            .upsert({
              provider_id: userId,
              facility_id: facilityId,
              stripe_subscription_id: subscriptionId,
              stripe_customer_id: customerId,
              status: "active",
              unlock_discount_percent: 20,
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
            logStep("Error creating pro_subscription", { error: proError.message });
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
              message: "You now have 20% off all lead unlocks, featured placement, priority search ranking, and can list up to 5 facilities.",
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

      const currentPeriodEnd = new Date(subscription.current_period_end * 1000).toISOString();
      const mappedStatus = subscription.status === "active" ? "active"
        : subscription.status === "past_due" ? "past_due"
        : subscription.status === "canceled" ? "canceled"
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

      const { error: updateError } = await supabaseAdmin
        .from("facility_subscriptions")
        .update({
          status: mappedStatus,
          current_period_end: currentPeriodEnd,
          cancel_at_period_end: subscription.cancel_at_period_end ?? false,
          updated_at: new Date().toISOString(),
        })
        .eq("stripe_subscription_id", subscription.id);

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

        // BUGFIX: Restore Pro benefits when a past_due subscription is paid and returns to active.
        // Previously, benefits were only applied at checkout.session.completed and never re-applied
        // on recovery from past_due, leaving providers without featured/ranking boost after recovery.
        const previousStatus = (event.data.previous_attributes as Record<string, unknown>)?.status as string | undefined;
        if (mappedStatus === "active" && previousStatus === "past_due" && proSub) {
          logStep("Subscription recovered from past_due — restoring Pro benefits", { facilityId: proSub.facility_id });
          const { data: allFacilities } = await supabaseAdmin
            .from("facilities")
            .select("id, calculated_ranking_score, featured")
            .eq("user_id", proSub.provider_id);
          if (allFacilities) {
            for (const f of allFacilities) {
              // Only add the +50 boost if it wasn't already applied (featured=true means boost is active)
              const alreadyBoosted = f.featured === true;
              const currentScore = f.calculated_ranking_score ?? 0;
              await supabaseAdmin
                .from("facilities")
                .update({
                  featured: true,
                  calculated_ranking_score: alreadyBoosted ? currentScore : currentScore + 50,
                  updated_at: new Date().toISOString(),
                })
                .eq("id", f.id);
            }
            logStep("Pro benefits restored on all provider facilities", { count: allFacilities.length });
          }
          await supabaseAdmin.from("provider_notifications").insert({
            user_id: proSub.provider_id,
            facility_id: proSub.facility_id,
            type: "subscription_recovered",
            title: "Pro Subscription Restored",
            message: "Your payment was received and your Pro benefits have been fully restored — featured placement, ranking boost, and lead discounts are all active again.",
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
              const endDate = new Date(subscription.current_period_end * 1000).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
              await supabaseAdmin.from("provider_notifications").insert({
                user_id: proSub.provider_id,
                facility_id: proSub.facility_id,
                type: "subscription_pending_cancel",
                title: "Pro Cancellation Scheduled",
                message: `Your Pro subscription will end on ${endDate}. You'll retain Pro benefits until then. You can resubscribe anytime.`,
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

          // On renewal (subscription_cycle), clear the renewal_reminder_*_sent_at
          // milestones so the daily cron can fire the 60/30/14/7-day reminders
          // for the new period. First payment of a subscription is
          // `subscription_create`; we skip resets in that case since the
          // columns are already NULL on a fresh row.
          if (invoice.billing_reason === "subscription_cycle" && invoice.subscription) {
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
                ? `Your ${planName} subscription has been renewed. ${currencyUpper} ${amountFormatted} charged.${isPro ? " Your 20% discount on leads and placement fees continues." : ""}`
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
                       <p style="margin: 8px 0 0; color: #047857;">✓ 20% discount on lead unlocks & placement fees</p>
                       <p style="margin: 4px 0 0; color: #047857;">✓ Featured placement & priority ranking</p>
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

      if (subMetadataType === "featured_addon" && addonFacilityId) {
        const periodEnd = subscription.current_period_end
          ? new Date(subscription.current_period_end * 1000).toISOString()
          : null;
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

        await supabaseAdmin.from("subscription_events").insert({
          event_type: "featured_addon_activated",
          stripe_event_id: event.id,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscription.id,
          facility_id: addonFacilityId,
          plan_tier: null,
          status: subscription.status,
          metadata: {
            placements_inserted: addonResult.placements_inserted,
            placements_reactivated: addonResult.placements_reactivated,
          },
        });

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
              "Your facility is now in the Featured rotation on the homepage, statewide directory, your city, and global search results.",
            metadata: { stripe_subscription_id: subscription.id },
          });
        }

        return new Response(JSON.stringify({ received: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (subMetadataType === "concierge_addon" && addonFacilityId) {
        const periodEnd = subscription.current_period_end
          ? new Date(subscription.current_period_end * 1000).toISOString()
          : null;
        const concierge = await activateConciergePartner(supabaseAdmin, {
          facilityId: addonFacilityId,
          stripeSubscriptionId: subscription.id,
          currentPeriodEnd: periodEnd,
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

        await supabaseAdmin.from("subscription_events").insert({
          event_type: "concierge_addon_activated",
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
          },
        });

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
              "Your facility is now a Concierge Partner. Our advisors will surface your listing with a verified-partner badge when seekers match your geography and level of care.",
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
          planName =
            flags.has_featured && flags.has_concierge_partner
              ? `Pro + Featured + Concierge (${intervalSuffix})`
              : flags.has_featured
                ? `Pro + Featured (${intervalSuffix})`
                : flags.has_concierge_partner
                  ? `Pro + Concierge (${intervalSuffix})`
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
        if (profile?.user_id && planTier === "pro") {
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
          status: "active",
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
              to: ["Support@rehablookup.com"],
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
                // Surface to admin so the silent fallback (mark canceled
                // without refund) is visible.
                await supabaseAdmin.from("admin_notifications").insert({
                  type: "subscription_cancel_refund_failed",
                  title: "Refund executor failed on subscription.deleted",
                  message: `cancelSubscriptionAndRefund threw for facility_subscriptions.id=${subRow.id} (stripe_sub=${subscription.id}). Refund and benefit-revert did NOT complete; row was force-canceled. Manual review required.`,
                  metadata: {
                    facility_subscription_id: subRow.id,
                    stripe_subscription_id: subscription.id,
                    stripe_event_id: event.id,
                    error: String(cancelErr),
                  },
                }).then(({ error: notifyErr }) => {
                  if (notifyErr) logStep("WARN admin notify failed", { error: notifyErr.message });
                });
                // Fallback: at minimum mark the row canceled.
                await supabaseAdmin
                  .from("facility_subscriptions")
                  .update({
                    status: "canceled",
                    canceled_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                  })
                  .eq("id", subRow.id);
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
              message: "Your Pro benefits have been removed. Upgrade again to restore discounts and featured placement.",
              metadata: { subscription_id: subscription.id },
            });

            logStep("Subscription cancellation processed");

            // Send admin email
            if (resend) {
              try {
                await sendEmailWithRetry(supabaseAdmin, resend, {
                  from: "RehabLookup <no-reply@rehablookup.com>",
                  to: ["Support@rehablookup.com"],
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
                            <p style="margin: 8px 0 0; color: #92400e;">• Lead unlock & placement fee discounts (20%) removed</p>
                            <p style="margin: 4px 0 0; color: #92400e;">• Featured placement & priority ranking removed</p>
                            <p style="margin: 4px 0 0; color: #92400e;">• Extra listings paused (data preserved)</p>
                          </div>
                          <p style="color: #374151;">Your data is safe — nothing has been deleted. You can resubscribe anytime to restore all Pro benefits.</p>
                          <div style="text-align: center; margin: 30px 0;">
                            <a href="https://rehablookup.com/provider/pro-upgrade" style="background: #1B365D; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600;">Resubscribe to Pro</a>
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
    // Handle charge.refunded (international payments)
    // ==========================================
    if (event.type === "charge.refunded") {
      const charge = event.data.object as Stripe.Charge;
      const paymentIntentId = charge.payment_intent as string;
      
      if (paymentIntentId) {
        logStep("Processing refund", { chargeId: charge.id, paymentIntentId });

        // Check if this is an international payment
        const { data: intlPayment } = await supabaseAdmin
          .from("international_payments")
          .select("id, email, client_name")
          .eq("stripe_payment_intent_id", paymentIntentId)
          .maybeSingle();

        if (intlPayment) {
          logStep("Refunding international payment", { paymentId: intlPayment.id });

          const { error: updateError } = await supabaseAdmin
            .from("international_payments")
            .update({
              status: "refunded",
              updated_at: new Date().toISOString(),
              metadata: {
                refund_id: charge.refunds?.data[0]?.id,
                refunded_at: new Date().toISOString(),
              },
            })
            .eq("id", intlPayment.id);

          if (updateError) {
            logStep("Error updating payment to refunded", { error: updateError.message });
          } else {
            logStep("International payment marked as refunded");

            // Create admin notification
            await supabaseAdmin.from("admin_notifications").insert({
              type: "international_refund",
              title: "International Payment Refunded",
              message: `Refunded $99 to ${intlPayment.client_name} (${intlPayment.email})`,
              metadata: {
                payment_id: intlPayment.id,
                charge_id: charge.id,
                payment_intent_id: paymentIntentId,
              },
            });
          }
        }
      }
    }

    // ==========================================
    // Handle invoice.paid for International Facility Invoices
    // ==========================================
    if (event.type === "invoice.paid") {
      const invoice = event.data.object as Stripe.Invoice;
      const invoiceId = invoice.metadata?.invoice_id;
      const invoiceType = invoice.metadata?.type;

      if (invoiceType === "international_placement_fee" && invoiceId) {
        logStep("International facility invoice paid", { invoiceId, stripeInvoiceId: invoice.id });

        // Idempotency: check if already marked paid
        const { data: existingInvoice } = await supabaseAdmin
          .from("international_facility_invoices")
          .select("id, status")
          .eq("id", invoiceId)
          .maybeSingle();

        if (existingInvoice?.status === "paid") {
          logStep("International invoice already paid (duplicate webhook), skipping", { invoiceId });
        } else {
          const { error: updateError } = await supabaseAdmin
            .from("international_facility_invoices")
            .update({
              status: "paid",
              paid_at: new Date().toISOString(),
              stripe_payment_intent_id: invoice.payment_intent as string,
            })
            .eq("id", invoiceId);

          if (updateError) {
            logStep("Error updating invoice to paid", { error: updateError.message });
          } else {
            // Update case status
            const { data: dbInvoice } = await supabaseAdmin
              .from("international_facility_invoices")
              .select("case_id")
              .eq("id", invoiceId)
              .single();

            if (dbInvoice?.case_id) {
              await supabaseAdmin
                .from("international_placement_cases")
                .update({ facility_fee_status: "paid" })
                .eq("id", dbInvoice.case_id);

              await supabaseAdmin.from("international_case_events").insert({
                case_id: dbInvoice.case_id,
                event_type: "facility_fee_paid",
                actor_type: "system",
                event_data: { 
                  invoice_id: invoiceId,
                  stripe_invoice_id: invoice.id,
                  amount_paid: invoice.amount_paid,
                },
              });
            }

            // Create admin notification
            await supabaseAdmin.from("admin_notifications").insert({
              type: "international_invoice_paid",
              title: "International Invoice Paid",
              message: `Facility paid $${(invoice.amount_paid / 100).toLocaleString()} for international placement`,
              metadata: {
                invoice_id: invoiceId,
                stripe_invoice_id: invoice.id,
                case_id: invoice.metadata?.case_id,
              },
            });

            logStep("International facility invoice marked as paid");
          }
        }
      }
    }

    // ==========================================
    // Handle invoice.payment_failed for International Facility Invoices  
    // ==========================================
    if (event.type === "invoice.payment_failed") {
      const invoice = event.data.object as Stripe.Invoice;
      const invoiceType = invoice.metadata?.type;
      const invoiceId = invoice.metadata?.invoice_id;

      if (invoiceType === "international_placement_fee" && invoiceId) {
        logStep("International facility invoice payment failed", { invoiceId });

        await supabaseAdmin
          .from("international_facility_invoices")
          .update({ status: "uncollectible" })
          .eq("id", invoiceId);

        const { data: dbInvoice } = await supabaseAdmin
          .from("international_facility_invoices")
          .select("case_id")
          .eq("id", invoiceId)
          .single();

        if (dbInvoice?.case_id) {
          await supabaseAdmin.from("international_case_events").insert({
            case_id: dbInvoice.case_id,
            event_type: "facility_invoice_payment_failed",
            actor_type: "system",
            event_data: { invoice_id: invoiceId, stripe_invoice_id: invoice.id },
          });
        }

        await supabaseAdmin.from("admin_notifications").insert({
          type: "international_invoice_failed",
          title: "International Invoice Payment Failed",
          message: `Payment failed for international placement invoice`,
          metadata: {
            invoice_id: invoiceId,
            stripe_invoice_id: invoice.id,
            case_id: invoice.metadata?.case_id,
          },
        });
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
