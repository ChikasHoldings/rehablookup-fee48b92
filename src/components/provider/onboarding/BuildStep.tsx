import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useProviderOnboardingState } from "@/hooks/useProviderOnboardingState";

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
 * Step 4 — Build (now auto-redirect, post round-30 merge).
 *
 * No interstitial UI. As soon as the wizard reaches this step, we route
 * the user straight to the builder for their mode:
 *   - mode='list'  → /provider/onboarding/new-listing
 *   - mode='claim' → /provider/claim/<slug>
 *
 * The builder flows now finish by advancing the onboarding state to
 * 'plan' (instead of 'completed') so the wizard's PlanStep runs as the
 * final step. Free → mark complete + dashboard; Pro → Stripe Checkout.
 */
export function BuildStep({ onAdvance: _onAdvance, onBack: _onBack }: BuildStepProps) {
  const navigate = useNavigate();
  const { data: stateRow } = useProviderOnboardingState();

  const selectedFacilityId = stateRow?.selected_facility_id ?? null;
  const { data: selectedFacility } = useQuery({
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

  const target = useMemo(() => {
    if (mode === "claim") {
      // Wait for slug to resolve before redirecting.
      return slug ? `/provider/claim/${slug}` : null;
    }
    return "/provider/onboarding/new-listing";
  }, [mode, slug]);

  useEffect(() => {
    if (!target) return;
    navigate(target, { replace: true });
  }, [target, navigate]);

  return (
    <div className="flex items-center gap-2 text-sm text-slate-600 py-6">
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
      Opening the listing editor…
    </div>
  );
}
