import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Building2, Camera, CheckCircle2, ClipboardEdit, Sparkles, Video } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import {
  PLAN_LIMITS,
  resolvePlan,
  type PlanTier,
} from "@/lib/planLimits";
import { useProviderOnboardingState } from "@/hooks/useProviderOnboardingState";
import { PlanGate } from "./PlanGate";

interface BuildStepProps {
  onAdvance: () => void;
  onBack: () => void;
}

interface ProfileWithPlan {
  plan: PlanTier | null;
}

interface FacilityName {
  id: string;
  name: string;
  slug: string | null;
}

/**
 * Step 5 — Build / Edit.
 *
 * This step is a wrapper, not a rebuild. Per spec §8: "DO NOT
 * rebuild [the builder or claim editor] — the provider panel and
 * its builder are well-built; we only add gates and limits."
 *
 * What this step actually does:
 *   1. Shows a plan banner so the user can see their photo/video
 *      caps before they start uploading.
 *   2. Surfaces the two plan-gated controls (photos counter +
 *      video upload tile) so a Free user can see the upgrade
 *      affordance before they hit the cap inside the builder.
 *   3. Hands off to the existing flow:
 *      - mode='list'  → /provider/onboarding/new-listing
 *        (the existing ProviderSignup component mounted at
 *         initialStep={3})
 *      - mode='claim' → /provider/claim/<slug>
 *        (the existing ClaimWizard)
 *   4. The hand-off-target flows write
 *      provider_onboarding_state.current_step='completed' on
 *      successful publish/submit; the wizard then redirects to
 *      /provider/dashboard via the shell's already-onboarded
 *      check.
 */
export function BuildStep({ onAdvance, onBack }: BuildStepProps) {
  const navigate = useNavigate();
  const { data: stateRow } = useProviderOnboardingState();
  const [busy, setBusy] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["provider-onboarding-profile-plan"],
    queryFn: async (): Promise<ProfileWithPlan | null> => {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user.id;
      if (!userId) return null;
      const { data } = await supabase
        .from("profiles")
        .select("plan")
        .eq("user_id", userId)
        .maybeSingle();
      return (data as unknown as ProfileWithPlan) ?? null;
    },
    staleTime: 1000 * 5,
  });

  // For mode='claim' we need to know the slug of the selected facility
  // so the Continue link can route directly to /provider/claim/<slug>.
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

  const plan: PlanTier = resolvePlan(profile?.plan);
  const limits = PLAN_LIMITS[plan];
  const mode = stateRow?.mode ?? null;

  const continueHref = useMemo(() => {
    if (mode === "claim" && selectedFacility?.slug) {
      return `/provider/claim/${selectedFacility.slug}`;
    }
    // list mode (or claim mode with no slug yet — fallback to builder)
    return "/provider/onboarding/new-listing";
  }, [mode, selectedFacility?.slug]);

  // Best-effort: stash the wizard's intent on the session so the
  // hand-off-target form can know to write current_step='completed'
  // when the publish succeeds. The form will look for this key.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      sessionStorage.setItem(
        "provider-onboarding-handoff",
        JSON.stringify({
          mode,
          plan,
          selectedFacilityId,
          initialName: stateRow?.initial_facility_name ?? null,
        }),
      );
    } catch {
      /* sessionStorage write failures are non-blocking */
    }
  }, [mode, plan, selectedFacilityId, stateRow?.initial_facility_name]);

  if (!stateRow) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <header>
        <div className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wide text-[#1B365D] font-semibold mb-1">
          <ClipboardEdit className="h-3.5 w-3.5" aria-hidden />
          Step 5 of 5
        </div>
        <h2 className="text-xl sm:text-2xl font-semibold text-slate-900">
          {mode === "claim" ? "Claim and enrich your listing" : "Build your listing"}
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          {mode === "claim"
            ? "Verify ownership, then fill in the details that help families choose your facility."
            : "Add the photos, services, and insurance info families look for."}
        </p>
      </header>

      <PlanBanner plan={plan} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Photos preview */}
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2 mb-2">
            <Camera className="h-4 w-4 text-slate-500" aria-hidden />
            <h3 className="text-sm font-semibold text-slate-900">Photos</h3>
          </div>
          <p className="text-xs text-slate-600 mb-3">
            Up to <span className="font-semibold">{limits.photos}</span>{" "}
            {limits.photos === 1 ? "photo" : "photos"} on your current plan.
          </p>
          {plan === "free" && (
            <p className="text-[11px] text-slate-500">
              Pro plans unlock up to 10 photos.
            </p>
          )}
        </div>

        {/* Video preview — gated for Free */}
        <PlanGate
          current={plan}
          requires="pro"
          feature="video"
          lockedLabel="Pro only"
          returnTo="/provider/onboarding?step=build"
        >
          <div className="rounded-xl border border-slate-200 bg-white p-4 h-full">
            <div className="flex items-center gap-2 mb-2">
              <Video className="h-4 w-4 text-slate-500" aria-hidden />
              <h3 className="text-sm font-semibold text-slate-900">Facility video</h3>
            </div>
            <p className="text-xs text-slate-600 mb-3">
              Add a single short video tour of your facility.
            </p>
            <p className="text-[11px] text-slate-500">
              {plan === "pro" ? "1 video on your current plan." : "Available on Pro."}
            </p>
          </div>
        </PlanGate>
      </div>

      {/* What's next + continue */}
      <section className="rounded-xl border border-[#1B365D]/20 bg-[#1B365D]/5 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="h-9 w-9 flex-shrink-0 rounded-lg bg-[#1B365D]/10 flex items-center justify-center">
            {mode === "claim" ? (
              <CheckCircle2 className="h-4 w-4 text-[#1B365D]" aria-hidden />
            ) : (
              <Building2 className="h-4 w-4 text-[#1B365D]" aria-hidden />
            )}
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-900">
              {mode === "claim"
                ? selectedFacility
                  ? `Continue claiming ${selectedFacility.name}`
                  : "Continue claiming your facility"
                : `Continue to the listing builder${stateRow.initial_facility_name ? ` — ${stateRow.initial_facility_name}` : ""}`}
            </p>
            <p className="text-xs text-slate-600 mt-0.5">
              {mode === "claim"
                ? "We'll verify your role, collect documents, and publish your enriched listing."
                : "We'll collect your services, insurance accepted, photos, and more."}
            </p>
            <Button
              onClick={() => {
                setBusy(true);
                navigate(continueHref);
              }}
              disabled={busy || (mode === "claim" && !selectedFacility?.slug)}
              className="mt-3 bg-[#1B365D] hover:bg-[#142a4a] gap-2"
            >
              {mode === "claim" ? "Continue to claim editor" : "Continue to builder"}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Button>
          </div>
        </div>
      </section>

      <div className="flex items-center justify-start pt-1">
        <Button variant="outline" size="sm" className="gap-1.5" onClick={onBack}>
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          Back
        </Button>
      </div>

      {/* Silences "onAdvance unused" — onAdvance is reserved for the
          future direct-publish path where the builder is inlined in
          this step. Today, hand-off-target flows write
          current_step='completed' themselves and the wizard shell
          redirects on next render. */}
      {false && <span onClick={onAdvance} />}
    </div>
  );
}

function PlanBanner({ plan }: { plan: PlanTier }) {
  if (plan === "pro") {
    return (
      <div className="flex items-center gap-2.5 rounded-lg border border-[#1B365D] bg-[#1B365D]/5 px-3.5 py-2.5">
        <Sparkles className="h-4 w-4 text-[#1B365D] flex-shrink-0" aria-hidden />
        <p className="text-sm text-slate-900">
          You're on <Badge className="bg-[#1B365D] text-white border-0 mx-0.5">Pro</Badge> —
          up to {PLAN_LIMITS.pro.photos} photos and {PLAN_LIMITS.pro.videos} facility video.
        </p>
      </div>
    );
  }
  return (
    <div className={cn("flex items-center gap-2.5 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5")}>
      <Building2 className="h-4 w-4 text-slate-500 flex-shrink-0" aria-hidden />
      <p className="text-sm text-slate-700">
        You're on the <Badge variant="outline" className="mx-0.5">Free</Badge> plan —
        up to {PLAN_LIMITS.free.photos} photos. Pro unlocks 10 photos + 1 video.
      </p>
    </div>
  );
}
