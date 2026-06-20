/**
 * Resume-from-where-you-stopped router for the provider experience.
 *
 * Mid-onboarding providers (signed up, started the wizard, then closed
 * the tab) need to land back on the wizard when they next sign in —
 * NOT on /provider/dashboard, which would show empty KPI cards, empty
 * leads, and a confusing "where's my listing?" feeling.
 *
 * The wizard already self-routes to the right step (server is the
 * source of truth — see useProviderOnboardingState + Onboarding.tsx),
 * so getting them onto /provider/onboarding is enough; the wizard
 * resumes whichever step they were on.
 *
 * Source of truth: profiles.onboarding_completed_at
 *   NULL  → wizard not finished → land on /provider/onboarding
 *   SET   → wizard finished → land on /provider/dashboard (or returnTo)
 *
 * `current_step` on provider_onboarding_state can sometimes show
 * 'completed' before the trigger writes onboarding_completed_at; we
 * treat either flag as completion to avoid a bounce on the last hop.
 */

import { supabase } from "@/integrations/supabase/client";

export interface ProviderLandingDecision {
  path: string;
  /** Why we picked this path — useful for logs + tests. */
  reason:
    | "onboarding_complete"
    | "onboarding_incomplete"
    | "profile_missing"
    | "lookup_failed"
    | "state_completed_no_profile_flag";
  onboardingStep: string | null;
}

const ONBOARDING_PATH = "/provider/onboarding";
const DEFAULT_DASHBOARD_PATH = "/provider/dashboard";

/**
 * Decide where to send a provider right after authentication (login,
 * post-signup auto-login, or any auth-recovery flow).
 *
 * @param userId  auth.uid() of the signed-in user
 * @param returnTo optional caller-supplied target (e.g. from a `?return_to=`
 *                 query param). Honored only when onboarding is complete.
 */
export async function resolveProviderPostLoginPath(
  userId: string,
  returnTo?: string | null,
): Promise<ProviderLandingDecision> {
  if (!userId) {
    return { path: ONBOARDING_PATH, reason: "profile_missing", onboardingStep: null };
  }

  // Read both profile-level completion + state-row step in one round-trip.
  // The state row is optional (an empty wizard start has no row yet).
  const [profileRes, stateRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("onboarding_completed_at")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("provider_onboarding_state")
      .select("current_step")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);

  if (profileRes.error && !profileRes.data) {
    console.warn("[providerLanding] profile read failed", profileRes.error);
    return {
      path: returnTo || DEFAULT_DASHBOARD_PATH,
      reason: "lookup_failed",
      onboardingStep: null,
    };
  }

  const profile = profileRes.data as { onboarding_completed_at: string | null } | null;
  const stateRow = stateRes.data as { current_step: string | null } | null;
  const onboardingStep = stateRow?.current_step ?? null;

  if (!profile) {
    // Trigger hasn't populated yet (rare race after signup). Send to the
    // wizard — it will create the state row and AccountStep will seed
    // the profile on resume.
    return { path: ONBOARDING_PATH, reason: "profile_missing", onboardingStep };
  }

  // Profile completion flag is the canonical "done" signal.
  if (profile.onboarding_completed_at) {
    return {
      path: returnTo || DEFAULT_DASHBOARD_PATH,
      reason: "onboarding_complete",
      onboardingStep,
    };
  }

  // Defensive: if the state row says 'completed' but the profile flag
  // didn't catch up, trust the state row (this can happen for ~1s
  // around complete_provider_onboarding RPC fire).
  if (onboardingStep === "completed") {
    return {
      path: returnTo || DEFAULT_DASHBOARD_PATH,
      reason: "state_completed_no_profile_flag",
      onboardingStep,
    };
  }

  // Onboarding not finished. If the caller handed us an onboarding-scoped
  // returnTo — e.g. a claim deep-link
  // `/provider/onboarding?intent=claim&facility_slug=…` captured before the
  // sign-in round-trip — honor it so the claim intent + target facility
  // survive login. The bare wizard path would discard the query string and
  // strand the user at find_or_list with no facility selected. returnTo is
  // already safeReturnTo-sanitized at the Login boundary; we additionally
  // require it to be an onboarding path so a stale dashboard/returnTo can
  // never short-circuit the unfinished wizard.
  if (returnTo && isOnboardingPath(returnTo)) {
    return { path: returnTo, reason: "onboarding_incomplete", onboardingStep };
  }
  return { path: ONBOARDING_PATH, reason: "onboarding_incomplete", onboardingStep };
}

/** True if `pathname` is under the /provider/onboarding route family. */
export function isOnboardingPath(pathname: string): boolean {
  return pathname.startsWith("/provider/onboarding");
}
