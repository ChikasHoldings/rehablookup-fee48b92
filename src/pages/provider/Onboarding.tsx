/**
 * Unified provider onboarding wizard — /provider/onboarding.
 *
 * One route that renders the current step based on the server-side
 * `provider_onboarding_state.current_step`. ?step=… can be used for back
 * navigation but the server is the source of truth — jumping ahead
 * bounces the visitor back to their authoritative current step.
 *
 * Persistent stepper (5 visible tiles: Account → Verify → Find or List
 * → Plan → Build/Edit; verify_email + verify_phone collapse into one
 * "Verify" tile).
 *
 * Resume contract:
 *  - Signed-out + no row: render Step 1 (Account). After submit, the
 *    Account step seeds the onboarding-state row with
 *    current_step='verify_email' and signs the user in.
 *  - Signed-in + row exists + onboarding_completed_at IS NULL: render
 *    the step that matches current_step.
 *  - Signed-in + already-onboarded
 *    (profiles.onboarding_completed_at IS NOT NULL): redirect to
 *    /provider/dashboard with a flash toast "You're already onboarded."
 *  - ?intent=claim&facility_id=… on a signed-out visitor: the param
 *    survives through Account submit and the AccountStep seeds
 *    selected_facility_id when the row is created.
 */

import { useEffect, useMemo } from "react";
import { useNavigate, useSearchParams, Navigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  useProviderOnboardingState,
  ONBOARDING_STEPS,
  canReach,
  type OnboardingStep,
} from "@/hooks/useProviderOnboardingState";
import { OnboardingStepper } from "@/components/provider/onboarding/OnboardingStepper";
import { AccountStep } from "@/components/provider/onboarding/AccountStep";
import { PlaceholderStep } from "@/components/provider/onboarding/PlaceholderStep";

/** profiles row fields the wizard reads to decide whether to redirect. */
interface ProfileGate {
  onboarding_completed_at: string | null;
  email_verified_at: string | null;
  phone_verified_at: string | null;
}

function useProviderProfile() {
  return useQuery({
    queryKey: ["provider-onboarding-profile"],
    queryFn: async (): Promise<ProfileGate | null> => {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user.id;
      if (!userId) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("onboarding_completed_at, email_verified_at, phone_verified_at")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) {
        console.error("[Onboarding] profile load failed", error);
        return null;
      }
      return (data as unknown as ProfileGate) ?? null;
    },
    staleTime: 1000 * 5,
  });
}

export default function ProviderOnboarding() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const { data: stateRow, isLoading: stateLoading, refetch: refetchState } =
    useProviderOnboardingState();
  const { data: profile, isLoading: profileLoading } = useProviderProfile();

  const queryStep = searchParams.get("step") as OnboardingStep | null;
  const serverStep: OnboardingStep = stateRow?.current_step ?? "account";

  // Resolved visible step: ?step= when the user can reach it, otherwise
  // serverStep (and we silently strip the param). Already-onboarded
  // users are redirected below before this resolves.
  const resolved: OnboardingStep = useMemo(() => {
    if (!queryStep) return serverStep;
    if (!ONBOARDING_STEPS.includes(queryStep)) return serverStep;
    if (!canReach(queryStep, serverStep)) return serverStep;
    return queryStep;
  }, [queryStep, serverStep]);

  // Strip a stale ?step= if the user tried to jump ahead. Surfaced as a
  // toast so the redirect isn't silent.
  useEffect(() => {
    if (queryStep && !canReach(queryStep, serverStep)) {
      toast.message("Let's finish the current step first.");
      const next = new URLSearchParams(searchParams);
      next.delete("step");
      setSearchParams(next, { replace: true });
    }
  }, [queryStep, serverStep, searchParams, setSearchParams]);

  // Already-onboarded → bounce to dashboard.
  if (profile?.onboarding_completed_at) {
    toast.success("You're already onboarded.");
    return <Navigate to="/provider/dashboard" replace />;
  }

  if (stateLoading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden />
      </div>
    );
  }

  const handleSelectStep = (target: OnboardingStep) => {
    if (target === serverStep) return;
    const next = new URLSearchParams(searchParams);
    if (target === serverStep) next.delete("step");
    else next.set("step", target);
    setSearchParams(next, { replace: false });
  };

  const handleBack = () => {
    const idx = ONBOARDING_STEPS.indexOf(resolved);
    if (idx <= 0) return;
    const prev = ONBOARDING_STEPS[idx - 1];
    handleSelectStep(prev);
  };

  return (
    <>
      <Helmet>
        <title>Get started — RehabLookup for providers</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <Header />
      <main className="container mx-auto px-4 md:px-6 lg:px-8 py-8 md:py-12 max-w-3xl">
        <header className="mb-6 md:mb-8">
          <h1 className="font-display text-2xl md:text-3xl font-bold text-slate-900">
            List or claim your facility
          </h1>
          <p className="text-sm text-slate-600 mt-1.5">
            One quick flow — account, verification, and your listing.
          </p>
        </header>

        <div className="mb-6">
          <OnboardingStepper
            current={resolved}
            serverCurrent={serverStep}
            onSelect={handleSelectStep}
          />
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7 shadow-sm">
          {resolved === "account" && <AccountStep onAdvance={() => void refetchState()} />}
          {resolved === "verify_email" && (
            <PlaceholderStep
              title="Verify your email"
              serverStep="verify_email"
              onBack={handleBack}
            />
          )}
          {resolved === "verify_phone" && (
            <PlaceholderStep
              title="Verify your phone"
              serverStep="verify_phone"
              onBack={handleBack}
            />
          )}
          {resolved === "find_or_list" && (
            <PlaceholderStep
              title="Find or list your facility"
              serverStep="find_or_list"
              onBack={handleBack}
            />
          )}
          {resolved === "plan" && (
            <PlaceholderStep
              title="Choose your plan"
              serverStep="plan"
              onBack={handleBack}
            />
          )}
          {resolved === "build" && (
            <PlaceholderStep
              title="Build your listing"
              serverStep="build"
              onBack={handleBack}
            />
          )}
          {resolved === "completed" && (
            <CompletedBounce onBounce={() => navigate("/provider/dashboard", { replace: true })} />
          )}
        </section>
      </main>
      <Footer />
    </>
  );
}

function CompletedBounce({ onBounce }: { onBounce: () => void }) {
  useEffect(() => {
    onBounce();
  }, [onBounce]);
  return (
    <div className="flex items-center gap-2 text-sm text-slate-600">
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
      Finishing up…
    </div>
  );
}
