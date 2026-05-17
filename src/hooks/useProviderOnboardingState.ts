import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Canonical step list for the unified provider onboarding wizard.
 * The order here drives the stepper UI's progress bar AND the
 * "can the user jump here?" gate (only completed steps + the current
 * step are reachable; future steps bounce back).
 *
 * `verify_phone` is retained in the canonical list for backward
 * compatibility with any in-flight onboarding_state rows that were
 * created before the 2026-05-17 refactor that moved phone verification
 * out of Step 3 and into the listing-details step. The wizard no longer
 * advances any user TO 'verify_phone', and the shell routes both
 * 'verify_phone' and 'find_or_list' to the same FindOrListStep so
 * existing rows resume seamlessly.
 */
export const ONBOARDING_STEPS = [
  "account",
  "verify_email",
  "verify_phone",
  "find_or_list",
  "plan",
  "build",
  "completed",
] as const;

export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

export type OnboardingMode = "list" | "claim" | null;
export type OnboardingPlan = "free" | "pro" | null;

export interface ProviderOnboardingStateRow {
  id: string;
  user_id: string;
  current_step: OnboardingStep;
  mode: OnboardingMode;
  plan: OnboardingPlan;
  selected_facility_id: string | null;
  initial_facility_name: string | null;
  draft_facility_data: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

/**
 * Visible stepper tiles. The legacy 'verify_phone' substep is grouped
 * with 'find_or_list' so any in-flight row carrying that value lands on
 * the Find-or-List tile (which is where the user would have been
 * advanced next anyway).
 */
export const VISIBLE_STEPS = [
  { key: "account",       label: "Account",       group: ["account"] },
  { key: "verify",        label: "Verify Email",  group: ["verify_email"] },
  { key: "find_or_list",  label: "Find or List",  group: ["find_or_list", "verify_phone"] },
  { key: "plan",          label: "Plan",          group: ["plan"] },
  { key: "build",         label: "Build / Edit",  group: ["build"] },
] as const;

export function stepIndex(step: OnboardingStep): number {
  return ONBOARDING_STEPS.indexOf(step);
}

/**
 * Whether `target` is reachable given that the server says the user is
 * currently at `serverCurrent`. Completed steps (anything before
 * serverCurrent in the canonical order) AND serverCurrent itself are
 * reachable; future steps are not.
 */
export function canReach(target: OnboardingStep, serverCurrent: OnboardingStep): boolean {
  return stepIndex(target) <= stepIndex(serverCurrent);
}

/**
 * Reads the current user's onboarding-state row. Returns null when the
 * user is signed out or hasn't started onboarding yet (e.g. fresh
 * /provider/onboarding visit before Account form submit).
 */
export function useProviderOnboardingState() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["provider-onboarding-state"],
    queryFn: async (): Promise<ProviderOnboardingStateRow | null> => {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user.id;
      if (!userId) return null;

      const { data, error } = await supabase
        .from("provider_onboarding_state")
        .select("id, user_id, current_step, mode, plan, selected_facility_id, initial_facility_name, draft_facility_data, created_at, updated_at")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) {
        console.error("[useProviderOnboardingState] load failed", error);
        return null;
      }
      return data as unknown as ProviderOnboardingStateRow | null;
    },
    staleTime: 1000 * 5,
  });

  const advance = useCallback(
    async (next: Partial<Pick<ProviderOnboardingStateRow,
      "current_step" | "mode" | "plan" | "selected_facility_id" |
      "initial_facility_name" | "draft_facility_data">>) => {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user.id;
      if (!userId) throw new Error("Not authenticated");

      // Upsert keyed on user_id (UNIQUE), so the first call from the
      // Account submit creates the row, every subsequent call updates.
      const { error } = await supabase
        .from("provider_onboarding_state")
        .upsert({ user_id: userId, ...next } as never, { onConflict: "user_id" });
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ["provider-onboarding-state"] });
    },
    [queryClient],
  );

  return { ...query, advance };
}
