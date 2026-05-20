import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  useProviderOnboardingState,
  type ProviderOnboardingStateRow,
} from "@/hooks/useProviderOnboardingState";
import ProviderSignup from "@/pages/ProviderSignup";
import ClaimWizard from "@/pages/provider/ClaimWizard";

interface BuildStepProps {
  onAdvance: () => void;
  onBack: () => void;
}

interface FacilityName {
  id: string;
  name: string;
  slug: string | null;
}

/**
 * Step 4 — Build / Edit.
 *
 * 2026-05-20 unification: the build form now renders INSIDE the unified
 * wizard rather than redirecting away. mode='list' embeds the
 * ProviderSignup form (steps 3-7 of the legacy listing builder), and
 * mode='claim' embeds the ClaimWizard form, both with the wizard host's
 * Header/Footer/Helmet suppressed via their `embedded` prop. Both
 * publishers route success to /provider/onboarding?step=plan.
 *
 * Failure modes handled inline:
 *   - mode='claim' but selected_facility_id can't be resolved to a slug:
 *     render an explainer + "Pick a different facility" CTA that
 *     advances state back to find_or_list rather than dead-ending in
 *     a spinner.
 *   - mode is null (state row missing the mode): render a similar
 *     "back to find_or_list" CTA.
 */
export function BuildStep({ onAdvance: _onAdvance, onBack }: BuildStepProps) {
  const navigate = useNavigate();
  const { data: stateRow, advance } = useProviderOnboardingState();

  const selectedFacilityId = stateRow?.selected_facility_id ?? null;
  const {
    data: selectedFacility,
    isLoading: facilityLoading,
  } = useQuery({
    queryKey: ["provider-onboarding-build-facility", selectedFacilityId],
    enabled: !!selectedFacilityId,
    queryFn: async (): Promise<FacilityName | null> => {
      if (!selectedFacilityId) return null;
      const { data } = await supabase
        .from("public_facilities")
        .select("id, name, slug")
        .eq("id", selectedFacilityId)
        .maybeSingle();
      return (data as unknown as FacilityName) ?? null;
    },
    staleTime: Infinity,
  });

  const mode = stateRow?.mode ?? null;
  const slug = selectedFacility?.slug ?? null;

  // Wired into ClaimWizard's "This isn't right" button so a user who
  // picked the wrong facility doesn't have to leave the wizard. Resets
  // the claim-mode pre-seed and bounces to find_or_list.
  const handleCancelClaim = useCallback(async () => {
    try {
      await advance({
        mode: null,
        selected_facility_id: null,
        current_step: "find_or_list",
      } as Partial<ProviderOnboardingStateRow>);
    } catch (e) {
      console.error("[BuildStep] reset to find_or_list failed", e);
    }
    navigate("/provider/onboarding?step=find_or_list", { replace: true });
  }, [advance, navigate]);

  // Mode missing — defensive fallback. FindOrListStep should always
  // set this before advancing to 'build'; if it's null here, the
  // user got into an inconsistent state. Offer a one-click recovery.
  if (mode === null) {
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" aria-hidden />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-900">
              We don't have a facility selected yet.
            </p>
            <p className="text-xs text-amber-700 mt-1">
              Head back to the previous step to pick or list one.
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={onBack}>
          Back to find or list
        </Button>
      </div>
    );
  }

  // Claim mode without a resolvable slug — likely a deleted /
  // un-approved facility, or the public_facilities view didn't return
  // a row under RLS. Same recovery path as missing mode.
  if (mode === "claim") {
    if (facilityLoading) {
      return (
        <div className="flex items-center gap-2 text-sm text-slate-600 py-6">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Loading the facility…
        </div>
      );
    }
    if (!slug) {
      return (
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" aria-hidden />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-900">
                We couldn't load the facility you picked.
              </p>
              <p className="text-xs text-amber-700 mt-1">
                It may have been removed or is awaiting approval. Pick a
                different one to continue your claim.
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={() => void handleCancelClaim()}>
            Pick a different facility
          </Button>
        </div>
      );
    }
    return (
      <ClaimWizard
        embedded
        slugProp={slug}
        onCancel={() => void handleCancelClaim()}
      />
    );
  }

  // Default: mode='list' — embed the listing builder.
  return <ProviderSignup embedded initialStep={3} />;
}
