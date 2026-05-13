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
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return;
      if (!session?.user) {
        const search = new URLSearchParams({
          returnTo: "/provider/onboarding/new-listing",
        }).toString();
        navigate(`/auth/signup?${search}`, { replace: true });
        return;
      }
      setChecking(false);
    });
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
