import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Loader2, PartyPopper, Sparkles, Star } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/lib/analytics";
import { DASHBOARD_SECTIONS, WELCOME_COPY } from "@/lib/onboardingWelcomeCopy";

interface ProfileForWelcome {
  user_id: string;
  first_name: string | null;
  plan: "free" | "pro" | null;
  welcomed_at: string | null;
  onboarding_completed_at: string | null;
}

/**
 * One-time welcome modal — shows on the first dashboard load after
 * the unified onboarding wizard completes (welcomed_at IS NULL +
 * onboarding_completed_at IS NOT NULL). On display, sets welcomed_at
 * so the modal never reappears for the same user.
 *
 * Plan-aware offer (no trial — we sell Pro at $99/mo, no free trial):
 *   - Free → "Upgrade to Pro — $99/month" CTA. Routes to
 *     /provider/billing?upgrade=pro.
 *   - Pro → "Add Featured" CTA. Featured is a marketing add-on, not
 *     a plan. Routes to /provider/marketing/featured.
 */
export function WelcomeModal() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["provider-welcome-modal-profile"],
    queryFn: async (): Promise<ProfileForWelcome | null> => {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user.id;
      if (!userId) return null;
      const { data } = await supabase
        .from("profiles")
        .select("user_id, first_name, plan, welcomed_at, onboarding_completed_at")
        .eq("user_id", userId)
        .maybeSingle();
      return (data as unknown as ProfileForWelcome | null) ?? null;
    },
    staleTime: 1000 * 30,
  });

  // Show the modal once when:
  //   - profile loaded
  //   - onboarding completed (so we don't congratulate someone who
  //     hasn't finished the wizard)
  //   - welcomed_at not yet set
  // On show, immediately persist welcomed_at so a tab refresh or a
  // route navigation doesn't re-trigger the modal.
  useEffect(() => {
    if (!profile) return;
    if (!profile.onboarding_completed_at) return;
    if (profile.welcomed_at) return;

    setOpen(true);
    void supabase
      .from("profiles")
      .update({ welcomed_at: new Date().toISOString() } as never)
      .eq("user_id", profile.user_id);
    trackEvent("provider_onboarding_completed", { plan: profile.plan ?? "free" });
  }, [profile]);

  if (!profile) return null;

  const plan = profile.plan === "pro" ? "pro" : "free";
  const offer = plan === "pro" ? WELCOME_COPY.proOffer : WELCOME_COPY.freeOffer;
  const firstName = profile.first_name?.trim() || "there";

  async function handleOffer() {
    if (busy) return;
    setBusy(true);
    trackEvent("welcome_modal_offer_clicked", { plan, offer_type: plan === "pro" ? "featured" : "pro_upgrade" });
    try {
      if (plan === "pro") {
        // Featured add-on — route to the marketing page that owns the
        // Checkout flow for Featured slots.
        navigate("/provider/marketing/featured");
        setOpen(false);
        return;
      }

      // Free → Pro upgrade. No free trial — Pro is $99/month flat.
      navigate("/provider/billing?upgrade=pro");
      setOpen(false);
    } catch (e) {
      console.error("[WelcomeModal] offer click failed", e);
      toast.error("Something went wrong. Please try again.");
      setBusy(false);
    }
  }

  function handleDismiss() {
    setOpen(false);
  }

  const offerTitle = offer.title;
  const offerCta = offer.cta;

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : handleDismiss())}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wide text-[#1B365D] font-semibold mb-1">
            <PartyPopper className="h-3.5 w-3.5" aria-hidden />
            You're in
          </div>
          <DialogTitle>Welcome to RehabLookup, {firstName}.</DialogTitle>
          <DialogDescription>
            Your facility is live. Here's where to find what.
          </DialogDescription>
        </DialogHeader>

        <ul className="space-y-2 text-sm">
          {DASHBOARD_SECTIONS.map((s) => (
            <li key={s.href} className="flex items-start gap-2">
              <span aria-hidden className="mt-1.5 inline-block h-1.5 w-1.5 rounded-full bg-[#1B365D] flex-shrink-0" />
              <span>
                <Link
                  to={s.href}
                  onClick={() => setOpen(false)}
                  className="font-medium text-slate-900 hover:text-[#1B365D] hover:underline"
                >
                  {s.label}
                </Link>
                <span className="text-slate-600"> — {s.description}</span>
              </span>
            </li>
          ))}
        </ul>

        <section className="rounded-xl border border-[#1B365D]/20 bg-[#1B365D]/5 p-4 mt-2">
          <div className="flex items-center gap-1.5 mb-1">
            {plan === "pro" ? (
              <Star className="h-3.5 w-3.5 text-[#1B365D]" aria-hidden />
            ) : (
              <Sparkles className="h-3.5 w-3.5 text-[#1B365D]" aria-hidden />
            )}
            <Badge variant="outline" className="border-[#1B365D]/30 text-[#1B365D] text-[10px] uppercase tracking-wide">
              {offer.eyebrow}
            </Badge>
          </div>
          <h3 className="text-base font-semibold text-slate-900">{offerTitle}</h3>
          <p className="text-xs text-slate-600 mt-1">{offer.body}</p>
        </section>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={handleDismiss} disabled={busy}>
            Maybe later
          </Button>
          <Button
            onClick={handleOffer}
            disabled={busy}
            className="bg-[#1B365D] hover:bg-[#142a4a] gap-2"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <>
                {offerCta}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
