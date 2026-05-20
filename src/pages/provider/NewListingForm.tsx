/**
 * NewListingForm — "add another facility" entry for ALREADY-onboarded
 * providers.
 * ────────────────────────────────────────────────────────────────────
 * 2026-05-20 unification: this is the only surface that mounts
 * <ProviderSignup/> as a standalone page anymore. First-time signups
 * are owned end-to-end by the unified wizard at /provider/onboarding,
 * which embeds ProviderSignup inline through BuildStep.
 *
 * Gate matrix:
 *   - Signed-out         → redirect into /provider/onboarding (so the
 *                          user gets the full Account → Verify → Find or
 *                          List → Build → Plan flow).
 *   - Signed-in + NOT yet onboarded → same redirect; they need to
 *                          finish the wizard first (closes the
 *                          publish-without-plan loophole).
 *   - Signed-in + already onboarded → render <ProviderSignup
 *                          initialStep={3}/> standalone. The publish
 *                          handler skips PlanStep (plan already chosen)
 *                          and sends the user back to /provider/dashboard
 *                          with a success toast.
 */

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import ProviderSignup from "@/pages/ProviderSignup";
import { supabase } from "@/integrations/supabase/client";

export default function NewListingForm() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<"checking" | "render">("checking");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData.session;
      if (cancelled) return;
      if (!session?.user) {
        // Anon visitor — send into the unified wizard. No returnTo: the
        // unified flow ends at /provider/dashboard, so bouncing back to
        // /new-listing post-verify would loop (NewListingForm would
        // immediately redirect them back into the wizard for not being
        // onboarded yet).
        navigate("/provider/onboarding", { replace: true });
        return;
      }
      // Signed-in: confirm they're already onboarded. If not, route
      // them through the unified wizard first.
      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarding_completed_at")
        .eq("user_id", session.user.id)
        .maybeSingle();
      if (cancelled) return;
      const onboarded = !!(profile as { onboarding_completed_at?: string | null } | null)?.onboarding_completed_at;
      if (!onboarded) {
        navigate("/provider/onboarding", { replace: true });
        return;
      }
      setPhase("render");
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  if (phase === "checking") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden />
      </div>
    );
  }

  return <ProviderSignup initialStep={3} />;
}
