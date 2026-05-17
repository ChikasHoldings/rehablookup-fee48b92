import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, CreditCard, Loader2, Sparkles, Star } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { PLANS, type Plan } from "@/lib/planConstants";
import { trackEvent } from "@/lib/analytics";
import { useProviderOnboardingState } from "@/hooks/useProviderOnboardingState";

interface PlanStepProps {
  onAdvance: () => void;
  onBack: () => void;
}

/**
 * Step 5 — Plan picker (Free vs Pro). Final step of the unified wizard.
 *
 * Round-30 merge: this step runs AFTER the listing is built/claimed.
 *
 * Free path: mark onboarding complete + go to dashboard. No Stripe.
 * Pro path:  hand the user to Stripe Checkout. On return:
 *            - ?checkout=cancel → toast + stay on this step.
 *            - ?checkout=success → render "Confirming your subscription..."
 *              and poll facility_subscriptions for an active Pro row
 *              for up to 10 seconds. Once we see one, mark complete and
 *              go to the dashboard.
 *
 * The webhook (stripe-webhook fn) is the source of truth for
 * facility_subscriptions; we don't duplicate its work. We just read
 * what it produces.
 */
export function PlanStep({ onAdvance, onBack }: PlanStepProps) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { advance } = useProviderOnboardingState();
  const [busy, setBusy] = useState<"free" | "pro" | null>(null);
  const [confirmingPro, setConfirmingPro] = useState(false);
  const confirmPollRef = useRef<number | null>(null);

  const checkoutResult = searchParams.get("checkout"); // 'success' | 'cancel' | null

  // Handle return-from-Checkout side effects on first render only.
  useEffect(() => {
    if (checkoutResult === "cancel") {
      toast.message("Checkout canceled — pick a plan to continue.");
      // Strip the param so a reload doesn't re-fire the toast.
      const next = new URLSearchParams(searchParams);
      next.delete("checkout");
      setSearchParams(next, { replace: true });
      return;
    }
    if (checkoutResult === "success") {
      setConfirmingPro(true);
      void confirmProSubscription();
      return;
    }
    // Round-30 merge: if the user is already Pro (e.g. they paid under
    // the old pre-build plan ordering, then completed building under
    // the new ordering), fast-track them out of this step.
    void (async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const userId = sessionData.session?.user.id;
        if (!userId) return;
        const { data: sub } = await supabase
          .from("facility_subscriptions")
          .select("tier, status")
          .eq("provider_id", userId)
          .eq("status", "active")
          .eq("tier", "pro")
          .limit(1)
          .maybeSingle();
        if (sub?.tier === "pro") {
          await advance({ plan: "pro", current_step: "completed" });
          try { await supabase.rpc("complete_provider_onboarding"); } catch { /* ignore */ }
          toast.success("Pro is active. Welcome to RehabLookup.");
          navigate("/provider/dashboard", { replace: true });
        }
      } catch (e) {
        console.warn("[PlanStep] pro fast-track check failed", e);
      }
    })();
    return () => {
      if (confirmPollRef.current != null) {
        window.clearTimeout(confirmPollRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only side-effect
  }, []);

  async function confirmProSubscription() {
    // Poll facility_subscriptions for an active Pro row for up to 10s.
    // The webhook normally lands within 1-2s, but we never want the
    // user to see a "stuck" state if the webhook is delayed.
    const deadline = Date.now() + 10_000;
    while (Date.now() < deadline) {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user.id;
      if (!userId) break;
      const { data } = await supabase
        .from("facility_subscriptions")
        .select("tier, status")
        .eq("provider_id", userId)
        .eq("status", "active")
        .eq("tier", "pro")
        .limit(1)
        .maybeSingle();
      if (data?.tier === "pro") {
        // profiles.plan='pro' is webhook-only (a DB guard rejects
        // authenticated client writes); we mark onboarding complete and
        // head to the dashboard.
        await advance({ plan: "pro", current_step: "completed" });
        try {
          await supabase.rpc("complete_provider_onboarding");
        } catch (e) {
          console.warn("[PlanStep] complete_provider_onboarding failed", e);
        }
        trackEvent("provider_onboarding_step_submit", {
          step_name: "plan",
          mode: null,
          plan: "pro",
        });
        toast.success("Pro is active. Welcome to RehabLookup.");
        const next = new URLSearchParams(searchParams);
        next.delete("checkout");
        next.delete("session_id");
        setSearchParams(next, { replace: true });
        setConfirmingPro(false);
        onAdvance();
        navigate("/provider/dashboard", { replace: true });
        return;
      }
      await new Promise((resolve) => {
        confirmPollRef.current = window.setTimeout(resolve, 750);
      });
    }
    // Timed out. The webhook may still land — leave the wizard at the
    // plan step; the user can reload and we'll poll again, or contact
    // support if Stripe charged but no subscription row appeared.
    setConfirmingPro(false);
    toast.error(
      "We couldn't confirm your subscription. Reload in a minute, or contact support if you were charged.",
    );
  }

  async function handleFree() {
    if (busy) return;
    setBusy("free");
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user.id;
      if (userId) {
        await supabase
          .from("profiles")
          .update({ plan: "free" } as never)
          .eq("user_id", userId);
      }
      await advance({ plan: "free", current_step: "completed" });
      try {
        await supabase.rpc("complete_provider_onboarding");
      } catch (e) {
        console.warn("[PlanStep] complete_provider_onboarding failed", e);
      }
      trackEvent("provider_onboarding_step_submit", {
        step_name: "plan",
        mode: null,
        plan: "free",
      });
      toast.success("You're all set. Welcome to RehabLookup.");
      onAdvance();
      navigate("/provider/dashboard", { replace: true });
    } catch (e) {
      console.error("[PlanStep] free select failed", e);
      toast.error("Couldn't save your plan. Please try again.");
      setBusy(null);
    }
  }

  async function handlePro() {
    if (busy) return;
    setBusy("pro");
    try {
      const origin = window.location.origin;
      const successUrl = `${origin}/provider/onboarding?step=plan&checkout=success&session_id={CHECKOUT_SESSION_ID}`;
      const cancelUrl = `${origin}/provider/onboarding?step=plan&checkout=cancel`;
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { successUrl, cancelUrl },
      });
      if (error) {
        console.error("[PlanStep] create-checkout failed", error);
        toast.error("Couldn't start Checkout. Please try again.");
        setBusy(null);
        return;
      }
      if (data?.error) {
        toast.error(data.error);
        setBusy(null);
        return;
      }
      if (data?.url) {
        // Server is the source of truth for plan state — the user comes
        // back via cancel_url or success_url and we read facility_
        // subscriptions to confirm.
        window.location.assign(data.url);
        return;
      }
      toast.error("Couldn't get a Checkout URL. Please try again.");
      setBusy(null);
    } catch (e) {
      console.error("[PlanStep] handlePro failed", e);
      toast.error("Couldn't start Checkout. Please try again.");
      setBusy(null);
    }
  }

  if (confirmingPro) {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-4 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#1B365D]" aria-hidden />
        <div>
          <p className="text-sm font-medium text-slate-900">Confirming your subscription…</p>
          <p className="text-xs text-slate-500 mt-1">Don't reload — this usually takes a couple of seconds.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <header>
        <div className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wide text-[#1B365D] font-semibold mb-1">
          <CreditCard className="h-3.5 w-3.5" aria-hidden />
          Final step
        </div>
        <h2 className="text-xl sm:text-2xl font-semibold text-slate-900">
          Choose your plan
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Your listing is live. Stay on Free or upgrade to Pro — you can switch anytime from your dashboard.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <PlanCard
          plan={PLANS.free}
          ctaLabel="Continue with Free"
          ctaBusy={busy === "free"}
          ctaDisabled={busy !== null}
          onSelect={handleFree}
        />
        <PlanCard
          plan={PLANS.pro}
          ctaLabel="Continue with Pro"
          ctaBusy={busy === "pro"}
          ctaDisabled={busy !== null}
          onSelect={handlePro}
        />
      </div>

      <div className="flex items-center justify-start pt-1">
        <Button variant="outline" size="sm" className="gap-1.5" onClick={onBack} disabled={busy !== null}>
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          Back
        </Button>
      </div>
    </div>
  );
}

function PlanCard({
  plan,
  ctaLabel,
  ctaBusy,
  ctaDisabled,
  onSelect,
}: {
  plan: Plan;
  ctaLabel: string;
  ctaBusy: boolean;
  ctaDisabled: boolean;
  onSelect: () => void;
}) {
  const isPro = plan.id === "pro";
  return (
    <div
      className={cn(
        "relative rounded-2xl border bg-white p-5 sm:p-6 flex flex-col",
        isPro ? "border-[#1B365D] shadow-md" : "border-slate-200",
      )}
    >
      {plan.badge && (
        <Badge className="absolute -top-2.5 right-4 bg-[#1B365D] text-white border-0 gap-1">
          <Star className="h-3 w-3" aria-hidden />
          {plan.badge}
        </Badge>
      )}
      <div className="flex items-center gap-2 mb-1">
        {isPro ? (
          <Sparkles className="h-4 w-4 text-[#1B365D]" aria-hidden />
        ) : null}
        <h3 className="text-lg font-semibold text-slate-900">{plan.name}</h3>
      </div>
      <p className="text-xs text-slate-500 mb-3">{plan.headline}</p>
      <div className="flex items-baseline gap-1 mb-4">
        <span className="text-3xl font-bold text-slate-900">
          {plan.priceMonthly === 0 ? "$0" : `$${plan.priceMonthly}`}
        </span>
        <span className="text-sm text-slate-500">/ month</span>
      </div>
      <ul className="space-y-2 text-sm text-slate-700 flex-1 mb-5">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-2">
            <Check className={cn("h-4 w-4 flex-shrink-0 mt-0.5", isPro ? "text-[#1B365D]" : "text-emerald-600")} aria-hidden />
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <Button
        onClick={onSelect}
        disabled={ctaDisabled}
        className={cn(
          "w-full gap-2",
          isPro
            ? "bg-[#1B365D] hover:bg-[#142a4a]"
            : "bg-white border border-[#1B365D] text-[#1B365D] hover:bg-[#1B365D]/5",
        )}
        variant={isPro ? "default" : "outline"}
      >
        {ctaBusy ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        ) : (
          <>
            {ctaLabel}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </>
        )}
      </Button>
      {plan.note && (
        <p className="text-[11px] text-slate-500 mt-2.5 text-center">{plan.note}</p>
      )}
    </div>
  );
}
