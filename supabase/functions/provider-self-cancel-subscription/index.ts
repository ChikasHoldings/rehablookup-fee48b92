// ⚠ AUTO-GENERATED HEADER ⚠
// _shared modules have been inlined into this file so that
// `supabase functions deploy --use-api` (server-side bundler)
// can deploy without resolving local relative imports. The
// canonical sources live under supabase/functions/_shared/ —
// don't edit the inlined copies below; edit the originals and
// re-run `python3 scripts/inline-shared.py provider-self-cancel-subscription`.

// ── URL imports (dedup'd) ──────────────────────────────────
import { SupabaseClient, createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2?target=denonext";
import { z } from "https://esm.sh/zod@3.23.8?target=denonext";
import Stripe from "https://esm.sh/stripe@18.5.0?target=denonext";

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
  /** Add-ons are billed as their own Stripe subscriptions, so cancelling
   *  the Pro sub alone does NOT stop them — they must be stopped explicitly. */
  featured_stripe_subscription_id: string | null;
  concierge_stripe_subscription_id: string | null;
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
 * Stop a Stripe subscription so it STOPS BILLING. This is the core of a
 * cancellation — refunds and DB flag updates are meaningless if Stripe keeps
 * charging the card at the next renewal.
 *
 *   mode 'now'           → cancel immediately (annual self-cancel, admin
 *                          cancel, and webhook teardown at period end).
 *   mode 'at_period_end' → schedule cancellation for the period boundary so a
 *                          monthly subscriber keeps the access they already
 *                          paid for; Stripe fires subscription.deleted at the
 *                          boundary, which the webhook turns into a full teardown.
 *
 * Idempotent: an already-canceled / no-longer-existing subscription (e.g. when
 * this runs from the subscription.deleted webhook, where Stripe has already
 * removed it) is treated as success. Never throws — returns ok=false and alerts
 * an admin on a genuine Stripe error so the caller can decide whether to
 * surface it rather than silently leaving the customer billed.
 */
async function stopStripeSubscription(
  stripe: Stripe,
  supabase: SupabaseClient,
  subId: string | null,
  mode: "now" | "at_period_end",
): Promise<{ ok: boolean; alreadyGone: boolean }> {
  if (!subId) return { ok: true, alreadyGone: true };
  try {
    if (mode === "now") {
      await stripe.subscriptions.cancel(subId);
    } else {
      await stripe.subscriptions.update(subId, { cancel_at_period_end: true });
    }
    return { ok: true, alreadyGone: false };
  } catch (err) {
    const code = (err as { code?: string })?.code;
    const msg = err instanceof Error ? err.message : String(err);
    // Already canceled / no longer exists → nothing left to stop; treat as done.
    if (
      code === "resource_missing" ||
      /no such subscription|already canceled|already cancelled/i.test(msg)
    ) {
      return { ok: true, alreadyGone: true };
    }
    console.error(
      `[cancel-subscription] stopStripeSubscription(${mode}) failed for ${subId}`,
      err,
    );
    await notifyAdmin(supabase, {
      type: "subscription_stripe_cancel_failed",
      title: `Stripe ${mode === "now" ? "cancellation" : "cancel-at-period-end"} failed`,
      message:
        `Could not ${mode === "now" ? "cancel" : "schedule cancellation for"} Stripe ` +
        `subscription ${subId}. The customer may continue to be billed — manual ` +
        `cancellation in the Stripe dashboard is required.`,
      metadata: { stripe_subscription_id: subId, mode, error: msg },
    });
    return { ok: false, alreadyGone: false };
  }
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
    /** When true AND the subscriber is monthly, schedule cancellation at the
     *  period boundary (keep access already paid for, no refund) instead of
     *  cancelling immediately. Set by the provider self-cancel flow, whose UI
     *  promises "you keep access until period end". Annual subscribers and the
     *  webhook teardown ignore this and always cancel immediately. */
    deferMonthlyToPeriodEnd?: boolean;
  },
): Promise<CancelResult> {
  const supabase = clientFromEnv();
  const stripe = stripeFromEnv();

  const { data: subRow, error: subError } = await supabase
    .from("facility_subscriptions")
    .select(
      "id, facility_id, provider_id, stripe_subscription_id, stripe_customer_id, featured_stripe_subscription_id, concierge_stripe_subscription_id, status, tier, has_featured, has_concierge_partner, paid_amount_cents, price_cents, billing_period, period_start, current_period_end, canceled_at",
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

  // FEATURED-ONLY ROWS HAVE NO PRO TO CANCEL.
  // ─────────────────────────────────────────
  // Featured is independent advertising, so a facility can hold it with
  // tier='free' and stripe_subscription_id=NULL (migration 20260902000000). For
  // such a row "cancel everything" means "cancel Featured" — there is no Pro
  // piece. Without this re-route, scope='all' would either throw on
  // stopStripeSubscription(null) in the deferred branch or run a Pro refund
  // against a subscription that does not exist.
  //
  // Narrow by construction: it only fires when the row is NOT a Pro row, so a
  // Pro or Pro+Featured cancellation is completely unaffected.
  const isProRow = subscription.tier === "pro";
  const effectiveScope: CancelScope =
    options.scope === "all" && !isProRow ? "addon-featured" : options.scope;
  if (effectiveScope !== options.scope) {
    console.log(
      "[cancel-subscription] non-Pro row: routing scope='all' to 'addon-featured'",
      { subscriptionId: subscription.id, tier: subscription.tier },
    );
  }

  if (effectiveScope === "all") {
    // Monthly self-cancel: keep the access already paid for this period and
    // stop Stripe from renewing. No refund (monthly is non-refundable by
    // policy), no immediate deactivation. The full teardown (status=canceled,
    // benefit revoke, facility suspend) runs when Stripe fires
    // customer.subscription.deleted at the period boundary — the webhook routes
    // that through the immediate path below. This is what makes the provider
    // UI promise ("you keep access until period end") true.
    if (isMonthly && options.deferMonthlyToPeriodEnd === true) {
      const stopped = await stopStripeSubscription(
        stripe, supabase, subscription.stripe_subscription_id, "at_period_end",
      );
      if (!stopped.ok) {
        // Surface the failure so the caller can tell the user to retry, rather
        // than confirming a cancellation Stripe never recorded (which would
        // keep billing them). Nothing has been mutated yet at this point.
        throw new Error(
          "Could not schedule cancellation with Stripe; no changes applied. Please try again.",
        );
      }
      if (subscription.has_featured) {
        await stopStripeSubscription(
          stripe, supabase, subscription.featured_stripe_subscription_id, "at_period_end",
        );
      }
      if (subscription.has_concierge_partner) {
        await stopStripeSubscription(
          stripe, supabase, subscription.concierge_stripe_subscription_id, "at_period_end",
        );
      }
      await supabase
        .from("facility_subscriptions")
        .update({ cancel_at_period_end: true, updated_at: new Date().toISOString() })
        .eq("id", subscription.id);
      // Access, placements, and flags all stay intact until period end; the
      // webhook tears everything down on subscription.deleted. Refunds = 0.
      result.totalRefundCents = 0;
      return result;
    }

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

    // 3.5) Stop every Stripe subscription so billing actually halts. Add-ons
    // are separate Stripe subs, so cancelling Pro alone leaves them charging.
    // Idempotent — an already-deleted sub (e.g. when this runs from the
    // subscription.deleted webhook) is treated as success and no-ops.
    await stopStripeSubscription(stripe, supabase, subscription.stripe_subscription_id, "now");
    if (subscription.featured_stripe_subscription_id) {
      await stopStripeSubscription(stripe, supabase, subscription.featured_stripe_subscription_id, "now");
    }
    if (subscription.concierge_stripe_subscription_id) {
      await stopStripeSubscription(stripe, supabase, subscription.concierge_stripe_subscription_id, "now");
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
        cancel_at_period_end: false,
        has_featured: false,
        has_concierge_partner: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", subscription.id);
  } else if (effectiveScope === "addon-featured") {
    // Round-31 audit fix: previously this early-exited on
    // `!subscription.has_featured`, which made the refund + audit
    // path unreachable if a prior webhook delivery had already
    // flipped the flag (e.g. customer.subscription.updated detected
    // item removal and flipped the flag, then this scope='addon-
    // featured' call retries). refundOnePiece has its own
    // idempotency guard (findExistingCancellation by scope tag), so
    // it's safe to always invoke — duplicate refunds are blocked at
    // that layer. We still surface to admin if we hit the unusual
    // case where the flag is cleared but no audit row exists.
    if (!subscription.has_featured) {
      const { data: existingCancel } = await supabase
        .from("subscription_cancellations")
        .select("id")
        .eq("subscription_id", subscription.id)
        .eq("reason", SCOPE_TAGS.featured)
        .maybeSingle();
      if (!existingCancel) {
        await notifyAdmin(supabase, {
          type: "addon_flag_cleared_without_audit_row",
          title: "Featured flag cleared but no cancellation audit",
          message: `facility_subscriptions.id=${subscription.id} has has_featured=false but no subscription_cancellations row for scope:featured. Proceeding with refund path which is idempotent — investigate the out-of-band flag clear.`,
          metadata: {
            facility_subscription_id: subscription.id,
            scope: "addon-featured",
          },
        });
      }
      // Fall through to refundOnePiece; it'll no-op if cancellation
      // row exists, or process if it doesn't.
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

    // Stop the Featured add-on's own Stripe subscription so it stops billing.
    await stopStripeSubscription(stripe, supabase, subscription.featured_stripe_subscription_id, "now");
    await deactivateFeaturedPlacements(supabase, subscription.id);
    await supabase
      .from("facility_subscriptions")
      .update({ has_featured: false, updated_at: new Date().toISOString() })
      .eq("id", subscription.id);
  } else if (effectiveScope === "addon-concierge") {
    // Same logic as addon-featured above — drop the early-exit,
    // surface the flag-cleared-without-audit-row anomaly, and let
    // refundOnePiece handle dedup.
    if (!subscription.has_concierge_partner) {
      const { data: existingCancel } = await supabase
        .from("subscription_cancellations")
        .select("id")
        .eq("subscription_id", subscription.id)
        .eq("reason", SCOPE_TAGS.concierge)
        .maybeSingle();
      if (!existingCancel) {
        await notifyAdmin(supabase, {
          type: "addon_flag_cleared_without_audit_row",
          title: "Concierge flag cleared but no cancellation audit",
          message: `facility_subscriptions.id=${subscription.id} has has_concierge_partner=false but no subscription_cancellations row for scope:concierge. Proceeding with refund path which is idempotent — investigate the out-of-band flag clear.`,
          metadata: {
            facility_subscription_id: subscription.id,
            scope: "addon-concierge",
          },
        });
      }
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

    // Stop the Concierge add-on's own Stripe subscription so it stops billing.
    await stopStripeSubscription(stripe, supabase, subscription.concierge_stripe_subscription_id, "now");
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

// ── provider-self-cancel-subscription entrypoint body ─────────────────────────
// provider-self-cancel-subscription
// ──────────────────────────────────
// Self-service cancellation endpoint for providers. Wraps the shared
// cancelSubscriptionAndRefund executor — same logic the admin endpoint
// uses, but the caller is the provider themselves and ownership is
// checked against facilities.user_id = auth.uid().
//
// triggeredBy stays = user.id so Stripe refund.reason gets tagged
// 'duplicate' (which Stripe interprets as a non-customer-initiated
// refund). For self-cancellation, we tag it 'requested_by_customer'
// which is the proper reason when the customer self-cancels.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const RequestSchema = z.object({
  subscription_id: z.string().uuid(),
  scope: z.enum(["all", "addon-featured", "addon-concierge"]),
  reason: z.string().trim().max(500).optional().or(z.literal("")),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json", Allow: "POST, OPTIONS" },
    });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const userClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } },
  );
  const { data: { user }, error: authErr } = await userClient.auth.getUser();
  if (authErr || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized", code: "auth_failed" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(
      JSON.stringify({ error: "Validation failed", issues: parsed.error.issues }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  // Ownership: verify the caller is the provider on this subscription.
  const { data: subOwner } = await admin
    .from("facility_subscriptions")
    .select("provider_id")
    .eq("id", parsed.data.subscription_id)
    .maybeSingle();
  if (!subOwner) {
    return new Response(JSON.stringify({ error: "Subscription not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (subOwner.provider_id !== user.id) {
    return new Response(JSON.stringify({ error: "Not your subscription", code: "forbidden" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const result = await cancelSubscriptionAndRefund(parsed.data.subscription_id, {
      scope: parsed.data.scope,
      // Self-cancellation reason — Stripe's "requested_by_customer" reason.
      reason: parsed.data.reason
        ? `self-cancel: ${parsed.data.reason}`
        : "self-cancel: provider initiated",
      // triggeredBy stays null on self-cancellations so the Stripe refund
      // reason maps to 'requested_by_customer' (rather than 'duplicate'
      // which we use for admin-initiated refunds).
      triggeredBy: null,
      // Monthly self-cancel keeps the access already paid for (Stripe
      // cancel_at_period_end); annual cancels immediately with a refund.
      deferMonthlyToPeriodEnd: true,
    });
    return new Response(JSON.stringify({ ok: true, ...result }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[provider-self-cancel-subscription] failed", err);

    // Round-30 split-brain guard: cancelSubscriptionAndRefund may have
    // issued the Stripe refund(s) before throwing. If the DB write to
    // mark the row 'canceled' didn't happen, the user keeps Pro/Featured/
    // Concierge benefits AFTER getting refunded. Attempt a synchronous
    // fallback that just flips the status flag, then surface to admin
    // so a human reconciles whatever state Stripe is in vs the DB.
    const errMessage = err instanceof Error ? err.message : String(err);
    let fallbackOk = false;
    try {
      const { error: fbErr } = await admin
        .from("facility_subscriptions")
        .update({
          status: "canceled",
          canceled_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", parsed.data.subscription_id);
      fallbackOk = !fbErr;
      if (fbErr) {
        console.error("[provider-self-cancel-subscription] fallback DB update failed", fbErr);
      }
    } catch (fbCatch) {
      console.error("[provider-self-cancel-subscription] fallback DB update threw", fbCatch);
    }
    try {
      await admin.from("admin_notifications").insert({
        type: "cancellation_split_brain",
        title: "Self-cancel failed mid-flight",
        message:
          `cancelSubscriptionAndRefund threw for subscription ${parsed.data.subscription_id} ` +
          `(scope=${parsed.data.scope}, user=${user.id}). Error: ${errMessage}. ` +
          `Fallback row-status update ${fallbackOk ? "succeeded" : "ALSO FAILED"}. ` +
          `Reconcile with Stripe.`,
        metadata: {
          subscription_id: parsed.data.subscription_id,
          scope: parsed.data.scope,
          user_id: user.id,
          last_error: errMessage,
          fallback_ok: fallbackOk,
        } as Record<string, unknown>,
      });
    } catch (adminErr) {
      console.error("[provider-self-cancel-subscription] admin_notifications insert failed", adminErr);
    }

    return new Response(
      JSON.stringify({
        error: errMessage,
        code: "execution_failed",
        partial_recovery: fallbackOk,
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
