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

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.2?target=denonext";

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
