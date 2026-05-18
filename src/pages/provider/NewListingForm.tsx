/**
 * NewListingForm — facility-build wizard host (post-auth).
 * ────────────────────────────────────────────────────────────────────
 * Phase W consolidation: this is the ONLY entry point into the
 * facility-build wizard (steps 3-7 of ProviderSignup). The legacy auth
 * + email-verify steps (1-2) in ProviderSignup are no longer reachable
 * — ProviderSignup now hard-pins its entry floor at `initialStep` and
 * blocks back-navigation below it.
 *
 * Canonical flow:
 *   1. /provider/onboarding → AccountStep   (create account)
 *   2.                     → VerifyEmailStep (6-digit code)
 *   3.                     → FindOrListStep (choose claim vs list)
 *      claim path → /provider/claim/:slug (ClaimWizard)
 *      list path  → /provider/onboarding/new-listing → THIS file →
 *                   ProviderSignup steps 3-7
 *   4. ProviderSignup step 7 publish → /provider/onboarding?step=plan
 *   5. PlanStep → /provider/dashboard
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
