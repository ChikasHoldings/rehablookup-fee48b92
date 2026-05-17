/**
 * NewListingForm
 * ──────────────
 * Mount point for the existing multi-step ProviderSignup form, post-auth.
 * Reached via /provider/onboarding/new-listing after the user signs up at
 * /auth/signup and picks "List a new facility" on /provider/onboarding.
 *
 * Renders ProviderSignup with `initialStep={3}` so it skips the auth-account
 * and email-verification stages (already handled in /auth/signup) and jumps
 * straight to the Facility step. ProviderSignup detects this mode and
 * resolves `userId` from the active session.
 *
 * Auth gate: this route assumes a signed-in provider. If the visitor isn't
 * signed in, kick them back to /auth/signup with a returnTo pointing here.
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
        navigate(`/auth/signup?${search}`, { replace: true });
        return;
      }
      // Plan-selection gate. A user who lands here without picking
      // a plan (e.g., direct URL, abandoned wizard) must go through
      // the wizard's PlanStep before publishing a listing.
      const userId = session.user.id;
      const [{ data: profile }, { data: stateRow }] = await Promise.all([
        supabase.from("profiles").select("plan, onboarding_completed_at").eq("user_id", userId).maybeSingle(),
        supabase.from("provider_onboarding_state").select("plan").eq("user_id", userId).maybeSingle(),
      ]);
      if (cancelled) return;
      const hasPlan =
        (profile as { plan?: string | null } | null)?.plan != null ||
        (stateRow as { plan?: string | null } | null)?.plan != null ||
        (profile as { onboarding_completed_at?: string | null } | null)?.onboarding_completed_at != null;
      if (!hasPlan) {
        navigate("/provider/onboarding?step=plan", { replace: true });
        return;
      }
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
