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

/**
 * Fire the plan-aware provider welcome email exactly once per
 * (email, plan) pair. The edge function is idempotent on
 * Idempotency-Key=`welcome-<email>-<plan>`, so repeat calls with the
 * same plan are no-ops; if the user switches plan later (free → pro
 * upgrade), the upgrade flow handles its own email path. Best-effort:
 * we never block the user's progress on this. Failures are logged
 * to console for ops to see in browser logs / Sentry.
 */
async function fireProviderWelcomeEmail(plan: "free" | "pro") {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData.session?.user;
    const email = user?.email;
    if (!email) return;
    const { data: profileRow } = await supabase
      .from("profiles")
      .select("first_name")
      .eq("user_id", user.id)
      .maybeSingle();
    void supabase.functions
      .invoke("send-provider-welcome-email", {
        body: {
          providerEmail: email,
          firstName: (profileRow as { first_name?: string } | null)?.first_name ?? "there",
          selectedPlan: plan,
        },
      })
      .catch((e) => console.warn("[PlanStep] welcome email send failed", e));
  } catch (e) {
    console.warn("[PlanStep] welcome email setup failed", e);
  }
}

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
  // Pull stateRow so we can tag the completion analytics with the
  // mode the user took (list vs claim). Without this, the funnel
  // attribution for "Pro signup" loses the upstream branch every
  // event ships with — analytics shows mode=null for 100% of Pro
  // completions, breaking claim-vs-list reporting.
  const { advance, data: stateRow } = useProviderOnboardingState();
  const onboardingMode = stateRow?.mode ?? null;
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
    // Phase X self-heal: if PlanStep mounts but onboarding_state still
    // reports current_step='build' (ProviderSignup's state advance
    // failed mid-publish), advance it here so the Onboarding canReach
    // gate doesn't bounce the user back to build. The publish itself
    // completed (the new ProviderSignup error path bails before
    // navigating), so this only kicks in for in-flight rows from
    // before the Phase X fix landed.
    void (async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const userId = sessionData.session?.user.id;
        if (!userId) return;
        const { data: stateRow } = await supabase
          .from("provider_onboarding_state")
          .select("current_step")
          .eq("user_id", userId)
          .maybeSingle();
        if ((stateRow as { current_step?: string } | null)?.current_step === "build") {
          await advance({ current_step: "plan" });
        }
      } catch (e) {
        console.warn("[PlanStep] state self-heal failed", e);
      }
    })();

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
          try {
            await supabase.rpc("complete_provider_onboarding");
          } catch (err) {
            // The onboarding state was already set via advance() above,
            // so we don't need to block on this RPC. But log it so we
            // can debug stuck-in-onboarding reports if they happen.
            console.warn("[PlanStep] complete_provider_onboarding RPC failed (non-fatal)", err);
          }
          // Fire the Pro-tier welcome email exactly once on completion.
          void fireProviderWelcomeEmail("pro");
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
    // Poll facility_subscriptions for an active Pro row. Round-30
    // audit raised the timeout from 10s → 30s — the Stripe webhook
    // normally lands within 1-2s, but cold-start + network + DB
    // contention can stretch to ~15s under load. 30s is well within
    // user attention span and dramatically reduces the "stuck"
    // outcome. The dashboard ProBenefitsWidget also runs a fallback
    // poll so even a 30s timeout here is recoverable on reload.
    const deadline = Date.now() + 30_000;
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
          mode: onboardingMode,
          plan: "pro",
        });
        // Fire the Pro-tier welcome email exactly once on Stripe
        // confirmation. Idempotent on (email, "pro"), so the
        // fast-track branch above firing it first is fine.
        void fireProviderWelcomeEmail("pro");
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
    // Timed out. The webhook may still land — route the user to the
    // dashboard where the fallback fast-track runs on mount and will
    // pick up a late-arriving subscription. Leaving them stranded on
    // the plan step was the round-30 audit's #1 critical issue.
    //
    // Audit fix (2026-05-23): strip ?checkout=success + ?session_id
    // BEFORE navigating away. Previously these params were only
    // stripped on the success branch (line 156-159), so a user who
    // timed out and hit Back / reloaded landed back on PlanStep with
    // the success param still in the URL and the poll re-fired from
    // zero — potentially looping a "Confirming your subscription…"
    // spinner every visit. The dashboard fallback handles the late
    // webhook landing without needing the param to persist.
    setConfirmingPro(false);
    const next = new URLSearchParams(searchParams);
    next.delete("checkout");
    next.delete("session_id");
    setSearchParams(next, { replace: true });
    toast.message(
      "Your payment is being processed — heading to your dashboard. If Pro doesn't activate within a minute, reload the dashboard or contact support.",
    );
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const uid = sessionData.session?.user.id;
      if (uid) {
        // Surface to admin so a webhook-delay > 30s is visible in ops.
        await supabase.from("admin_notifications").insert({
          type: "pro_activation_poll_timeout",
          title: "Pro activation polling timed out",
          message:
            `User ${uid} completed Stripe Checkout but the facility_subscriptions row didn't appear within 30s. Routed to dashboard with fallback recovery.`,
          metadata: { user_id: uid } as Record<string, unknown>,
        });
      }
    } catch { /* best-effort */ }
    navigate("/provider/dashboard", { replace: true });
  }

  async function handleFree() {
    if (busy) return;
    setBusy("free");
    try {
      // Round-30 audit fix: atomic plan + state + onboarding-complete
      // via single SECURITY DEFINER RPC. Previously the client did 3
      // separate writes; if the first one (profiles.plan='free')
      // failed silently, the user was marked complete with plan=NULL.
      const { error: rpcErr } = await supabase.rpc(
        "complete_provider_onboarding_with_plan",
        { p_plan: "free" },
      );
      if (rpcErr) {
        throw rpcErr;
      }
      trackEvent("provider_onboarding_step_submit", {
        step_name: "plan",
        mode: onboardingMode,
        plan: "free",
      });
      // Fire the Free-tier welcome email exactly once on completion.
      void fireProviderWelcomeEmail("free");
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
          {onboardingMode === "claim"
            ? "Your claim is in — we'll verify it and email you when it's approved. Pick a plan to finish setting up your account."
            : "Your listing is in — we'll review it and email you when it's live. Pick a plan to finish setting up your account."}
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
