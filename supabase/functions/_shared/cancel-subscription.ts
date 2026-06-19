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

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.2?target=denonext";
import Stripe from "https://esm.sh/stripe@18.5.0?target=denonext";
import {
  computeCancellationRefund,
  TIER_PRICING,
  type TierName,
} from "./subscription-math.ts";

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

  if (options.scope === "all") {
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
  } else if (options.scope === "addon-featured") {
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
  } else if (options.scope === "addon-concierge") {
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
