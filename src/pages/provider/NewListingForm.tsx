/**
 * NewListingForm
 * ──────────────
 * Mount point for the existing multi-step ProviderSignup form, post-auth.
 * Round-30 merge: the wizard's BuildStep now auto-redirects here as soon
 * as the wizard reaches it; the user no longer sees an interstitial
 * "Continue to builder" screen. Plan selection has been moved AFTER this
 * route — ProviderSignup's Step 7 "Publish" now advances onboarding-state
 * to current_step='plan' and redirects to /provider/onboarding?step=plan.
 *
 * Renders ProviderSignup with `initialStep={3}` so it skips the auth-account
 * and email-verification stages (already handled in the wizard) and jumps
 * straight to the Facility step. ProviderSignup detects this mode and
 * resolves `userId` from the active session.
 *
 * Auth gate: signed-out visitors land in the unified onboarding wizard
 * with a returnTo pointing here.
 */

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import ProviderSignup from "@/pages/ProviderSignup";
import { supabase } from "@/integrations/supabase/client";

export default function NewListingForm() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData.session;
      if (cancelled) return;
      if (!session?.user) {
        const search = new URLSearchParams({
          returnTo: "/provider/onboarding/new-listing",
        }).toString();
        navigate(`/provider/onboarding?${search}`, { replace: true });
        return;
      }
      // Round-30 merge: the pre-plan gate that previously bounced
      // planless users back to the wizard was removed. Plan now runs
      // AFTER publish, so we let everyone through.
      setChecking(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden />
      </div>
    );
  }

  return <ProviderSignup initialStep={3} />;
}
