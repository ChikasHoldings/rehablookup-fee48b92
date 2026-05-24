import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Check, Loader2, Sparkles, Star } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/lib/analytics";
import { WELCOME_COPY } from "@/lib/onboardingWelcomeCopy";

interface ProfileForWelcome {
  user_id: string;
  first_name: string | null;
  plan: "free" | "pro" | null;
  welcomed_at: string | null;
  onboarding_completed_at: string | null;
}

const QUERY_KEY = ["provider-welcome-modal-profile"] as const;
const seenKey = (userId: string) => `rl-provider-welcomed:${userId}`;

// A short, curated orientation list (not the whole sidebar) so the
// modal stays scannable. Action-oriented destinations only.
const ORIENTATION = [
  { label: "Inquiries", href: "/provider/inquiries", description: "Reply to families within 24h" },
  { label: "Your listing", href: "/provider/listings", description: "Photos, services, and details" },
  { label: "Analytics", href: "/provider/analytics", description: "Views, sources, and trends" },
] as const;

/**
 * One-time welcome modal shown on the first dashboard load after the
 * onboarding wizard completes.
 *
 * Intrusiveness fix (root cause): the previous version persisted
 * `welcomed_at` with `void supabase.from(...).update(...)`. A supabase-js
 * builder is a lazy thenable — it only fires the request on `.then()`/
 * `await`. `void` never thened it, so `welcomed_at` was never written and
 * the modal reappeared on every login/refresh. Now we:
 *   1. gate on a per-user localStorage flag set the instant we show, so
 *      it never re-pops in the same browser even if the network write
 *      fails;
 *   2. actually await the DB write (cross-device source of truth) and
 *      patch the query cache so it can't re-trigger within the session;
 *   3. delay the open briefly so the dashboard paints first — a gentle
 *      follow-up rather than a gate on first paint.
 */
export function WelcomeModal() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const shownRef = useRef(false);

  const { data: profile } = useQuery({
    queryKey: QUERY_KEY,
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

  useEffect(() => {
    if (shownRef.current) return;
    if (!profile) return;
    if (!profile.onboarding_completed_at) return;
    if (profile.welcomed_at) return;

    // First-line guard: if this browser already saw the welcome for this
    // user, never show again — independent of the DB write succeeding.
    let alreadySeen = false;
    try {
      alreadySeen = localStorage.getItem(seenKey(profile.user_id)) === "1";
    } catch {
      /* private mode / storage disabled — fall through to DB gate */
    }
    if (alreadySeen) return;

    shownRef.current = true;

    // Mark seen immediately (local + persisted) so a refresh mid-display
    // can't re-trigger.
    try {
      localStorage.setItem(seenKey(profile.user_id), "1");
    } catch {
      /* ignore */
    }

    // Patch the cache so any re-read in this session sees welcomed_at set.
    queryClient.setQueryData<ProfileForWelcome | null>(QUERY_KEY, (old) =>
      old ? { ...old, welcomed_at: new Date().toISOString() } : old,
    );

    // Persist to the DB — AWAITED this time (the old `void` never fired).
    void (async () => {
      const { error } = await supabase
        .from("profiles")
        .update({ welcomed_at: new Date().toISOString() } as never)
        .eq("user_id", profile.user_id);
      if (error) {
        // Non-fatal: the localStorage guard already prevents re-popping
        // in this browser; the DB write is the cross-device backstop.
        console.warn("[WelcomeModal] welcomed_at persist failed", error.message);
      }
    })();

    trackEvent("provider_onboarding_completed", { plan: profile.plan ?? "free" });

    // Gentle delay so the dashboard renders first.
    const t = window.setTimeout(() => setOpen(true), 650);
    return () => window.clearTimeout(t);
  }, [profile, queryClient]);

  if (!profile) return null;

  const plan = profile.plan === "pro" ? "pro" : "free";
  const offer = plan === "pro" ? WELCOME_COPY.proOffer : WELCOME_COPY.freeOffer;
  const firstName = profile.first_name?.trim() || "there";

  function close() {
    setOpen(false);
  }

  function handleOffer() {
    if (busy) return;
    setBusy(true);
    trackEvent("welcome_modal_offer_clicked", {
      plan,
      offer_type: plan === "pro" ? "featured" : "pro_upgrade",
    });
    navigate(plan === "pro" ? "/provider/marketing/featured" : "/provider/billing?upgrade=pro");
    setOpen(false);
  }

  const OfferIcon = plan === "pro" ? Star : Sparkles;

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : close())}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-[440px]">
        {/* Header band */}
        <DialogHeader className="space-y-0 border-b border-slate-100 px-6 pb-5 pt-6 text-left">
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-emerald-50 ring-1 ring-emerald-100">
            <Check className="h-5 w-5 text-emerald-600" aria-hidden />
          </div>
          <DialogTitle className="text-[19px] font-semibold tracking-tight text-slate-900">
            You're all set, {firstName}
          </DialogTitle>
          <DialogDescription className="mt-1 text-sm text-slate-600">
            Your facility is live on RehabLookup. Here's where to go next.
          </DialogDescription>
        </DialogHeader>

        {/* Orientation — compact, scannable */}
        <div className="px-6 py-4">
          <div className="grid gap-1">
            {ORIENTATION.map((s) => (
              <Link
                key={s.href}
                to={s.href}
                onClick={close}
                className="group flex items-center gap-3 rounded-lg px-2.5 py-2 transition-colors hover:bg-slate-50"
              >
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-medium text-slate-900 group-hover:text-[#1B365D]">
                    {s.label}
                  </span>
                  <span className="block truncate text-xs text-slate-500">{s.description}</span>
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 text-slate-300 transition-colors group-hover:text-[#1B365D]" aria-hidden />
              </Link>
            ))}
          </div>
        </div>

        {/* Offer — the conversion focus */}
        <div className="px-6 pb-2">
          <div className="rounded-xl border border-[#1B365D]/15 bg-gradient-to-br from-[#1B365D]/[0.06] to-transparent p-4">
            <div className="flex items-center gap-1.5">
              <OfferIcon className="h-3.5 w-3.5 text-[#1B365D]" aria-hidden />
              <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#1B365D]">
                {offer.eyebrow}
              </span>
            </div>
            <h3 className="mt-1.5 text-[15px] font-semibold text-slate-900">{offer.title}</h3>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">{offer.body}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between gap-3 px-6 pb-6 pt-3">
          <button
            type="button"
            onClick={close}
            disabled={busy}
            className="text-sm font-medium text-slate-500 transition-colors hover:text-slate-700 disabled:opacity-50"
          >
            Maybe later
          </button>
          <Button
            onClick={handleOffer}
            disabled={busy}
            className="gap-2 bg-[#1B365D] hover:bg-[#142a4a]"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <>
                {offer.cta}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
