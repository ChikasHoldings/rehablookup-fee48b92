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

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.2?target=denonext";

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
