import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CreditCard,
  Loader2,
  Settings2,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useSelectedFacility } from "@/contexts/SelectedFacilityContext";
import {
  useFacilitySubscription,
  useInvalidateFacilitySubscription,
} from "@/hooks/useFacilitySubscription";
import { SwitchToAnnualBanner } from "@/components/provider/billing/SwitchToAnnualBanner";
import { SwitchToMonthlyAtRenewalBanner } from "@/components/provider/billing/SwitchToMonthlyAtRenewalBanner";
import { ProUpgradeChoices } from "@/components/provider/subscription/ProUpgradeChoices";
import { BillingDetailsCard } from "@/components/provider/billing/BillingDetailsCard";
import { fmtMoney, TIER_PRICING } from "@/lib/billingPricing";
import { useActivePromotion } from "@/hooks/useActivePromotion";
import { PromoCountdownBanner } from "@/components/provider/promo/PromoCountdownBanner";
import { PlanGraceBanner } from "@/components/provider/PlanGraceBanner";

/**
 * Validate a Stripe URL returned by an edge function before we hand it
 * to window.open / window.location. Requires https + an *.stripe.com
 * host. A malicious edge function response can otherwise redirect the
 * user to a phishing target that just has "stripe.com" in the URL.
 */
function isSafeStripeUrl(rawUrl: string | null | undefined): rawUrl is string {
  if (!rawUrl) return false;
  try {
    const u = new URL(rawUrl);
    return u.protocol === "https:" && u.hostname.endsWith("stripe.com");
  } catch {
    return false;
  }
}

/**
 * /provider/subscription — Subscription management.
 *
 * STRUCTURAL RULE: this page is JUST about Free vs Pro. Featured and
 * Concierge are NEVER named here except in a single helper-text link
 * pointing to /provider/marketing. The Pro upgrade choices are the
 * ONLY purchase surface on this page. Add-on management lives in
 * /provider/marketing.
 *
 * Route remains mounted at /provider/billing for now to preserve
 * existing bookmarks.
 */
export default function ProviderSubscription() {
  const navigate = useNavigate();
  const { selectedFacility } = useSelectedFacility();
  const facilityId = selectedFacility?.id;
  const { promo: activePromo } = useActivePromotion(facilityId);
  const proPromoId = activePromo?.target_product === "pro" ? activePromo.id : null;
  const [searchParams, setSearchParams] = useSearchParams();
  const isCheckoutReturn = searchParams.get("checkout") === "success";

  const [pollingActive, setPollingActive] = useState(isCheckoutReturn);
  const {
    data: subscription,
    isLoading,
    isError,
    refetch: refetchSubscription,
  } = useFacilitySubscription(facilityId, {
    pollWhilePending: pollingActive,
  });
  const invalidateSub = useInvalidateFacilitySubscription();

  const portalDebounceRef = useRef(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const proUpgradeDebounceRef = useRef(false);
  const [proUpgradeBusy, setProUpgradeBusy] = useState<"monthly" | "annual" | null>(null);

  // The hook owns the decaying polling schedule (2s → 4s → 8s, ~3 min
  // total). We watch the query's pending state via a ref to decide when
  // to surface the manual "Check now" escalation. `pollingStartedAt`
  // also drives an elapsed-time hint so the user knows how long Stripe
  // has been taking.
  const [pollingStartedAt, setPollingStartedAt] = useState<number | null>(
    isCheckoutReturn ? Date.now() : null,
  );
  const [elapsedSec, setElapsedSec] = useState(0);
  useEffect(() => {
    if (!pollingActive || !pollingStartedAt) return;
    const t = setInterval(() => {
      setElapsedSec(Math.floor((Date.now() - pollingStartedAt) / 1000));
    }, 1000);
    return () => clearInterval(t);
  }, [pollingActive, pollingStartedAt]);
  // The decaying schedule exhausts around the 30th attempt (~3 minutes
  // of clock time). At that point the hook stops polling on its own.
  // We watch elapsedSec rather than try to inspect the React Query
  // internals — once we hit 180s with no `active` status, surface the
  // manual escalation.
  const pollingTimedOut = pollingActive && elapsedSec >= 180;
  useEffect(() => {
    if (pollingActive && subscription?.status === "active") {
      setPollingActive(false);
      setPollingStartedAt(null);
    }
  }, [pollingActive, subscription?.status]);

  useEffect(() => {
    if (isCheckoutReturn && subscription?.status === "active") {
      const next = new URLSearchParams(searchParams);
      next.delete("checkout");
      next.delete("session_id");
      setSearchParams(next, { replace: true });
      toast.success("Subscription active. Welcome aboard!");
      invalidateSub(facilityId);
    }
  }, [isCheckoutReturn, subscription?.status, searchParams, setSearchParams, invalidateSub, facilityId]);

  // 2026-05-20 hardening: handle the two upsell-deep-link query params
  // that callers across the panel use (WelcomeModal, ProviderSidebar,
  // KPI strip, missed-leads, performance panel, RedirectedInquiries,
  // CentralizedEngagementAnalytics, useProviderSearch, etc.). Without
  // these handlers, the user lands on the page with no signal that
  // they came in via an upgrade CTA — they have to find the upgrade
  // buttons themselves. The toast surfaces the action; the URL strip
  // keeps the param from re-firing on every re-render.
  //
  //   ?upgrade=pro  — generic "they clicked an upgrade CTA" intent
  //   ?signup=retry — they bailed out of /signup/subscription and
  //                   are being routed here to try again
  const upgradeIntent = searchParams.get("upgrade");
  const signupRetry = searchParams.get("signup");
  useEffect(() => {
    if (isLoading) return;
    const isPaidOrIssue = subscription?.tier === "pro";
    if (upgradeIntent === "pro") {
      if (!isPaidOrIssue) {
        toast.message("Pick monthly or annual below to upgrade to Pro.");
      } else {
        toast.info("You're already on Pro.");
      }
      const next = new URLSearchParams(searchParams);
      next.delete("upgrade");
      setSearchParams(next, { replace: true });
    }
    if (signupRetry === "retry") {
      toast.message("Pick a billing period below to retry your Pro upgrade.");
      const next = new URLSearchParams(searchParams);
      next.delete("signup");
      setSearchParams(next, { replace: true });
    }
  }, [upgradeIntent, signupRetry, isLoading, subscription?.tier, searchParams, setSearchParams]);

  // Both edge functions return { error, code, retryable } in the body
  // when they fail (classifyStripeError). Surface the friendly message
  // and add an inline Retry action when the server says it's safe.
  const surfaceStripeError = (
    data: { error?: string; code?: string; retryable?: boolean } | null | undefined,
    fallback: string,
    onRetry?: () => void,
  ) => {
    const message = data?.error ?? fallback;
    const retryable = Boolean(data?.retryable) && onRetry;
    if (retryable) {
      toast.error(message, { action: { label: "Try again", onClick: onRetry! } });
    } else {
      toast.error(message);
    }
  };

  const handleManageBilling = async () => {
    if (portalDebounceRef.current) return;
    portalDebounceRef.current = true;
    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");
      // A transport-level error (network down, function not deployed):
      // we don't have a classified body, so fall back to a generic message.
      if (error) {
        console.error("[Subscription] portal transport error", error);
        toast.error("Couldn't reach the billing portal. Check your connection and try again.");
        return;
      }
      if (data?.error) {
        surfaceStripeError(data, "Failed to open billing portal.", handleManageBilling);
        return;
      }
      if (!isSafeStripeUrl(data?.url)) {
        toast.error("Billing portal returned an invalid URL. Please contact support.");
        return;
      }
      window.open(data.url, "_blank", "noopener,noreferrer");
    } finally {
      setPortalLoading(false);
      setTimeout(() => { portalDebounceRef.current = false; }, 4000);
    }
  };

  const handleProUpgrade = async (interval: "monthly" | "annual") => {
    if (!facilityId) return;
    // Guard against double-clicks launching two checkout sessions while the
    // redirect is in flight (mirrors handleManageBilling's debounce).
    if (proUpgradeDebounceRef.current) return;
    proUpgradeDebounceRef.current = true;
    setProUpgradeBusy(interval);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout-session", {
        body: {
          facility_id: facilityId,
          intent: "initial_subscription",
          billing_period: interval,
          items: [{ product: "pro" }],
          ...(proPromoId ? { promo_id: proPromoId } : {}),
        },
      });
      if (error) {
        console.error("[Subscription] upgrade transport error", error);
        toast.error("Couldn't reach checkout. Check your connection and try again.");
        return;
      }
      if (data?.error) {
        surfaceStripeError(data, "Failed to start checkout.", () => handleProUpgrade(interval));
        return;
      }
      if (!isSafeStripeUrl(data?.url)) {
        toast.error("Checkout returned an invalid URL. Please contact support.");
        return;
      }
      window.location.assign(data.url);
    } catch (err) {
      // Truly unexpected (e.g. crash in our own code path).
      console.error("[Subscription] upgrade unexpected error", err);
      toast.error("Something went wrong. Please try again.");
    } finally {
      // Re-enable on any non-redirect path (errors/returns). On the success
      // path window.location.assign unloads the page, so this is a harmless
      // no-op there.
      setProUpgradeBusy(null);
      setTimeout(() => { proUpgradeDebounceRef.current = false; }, 4000);
    }
  };

  // Status semantics:
  //   active            → Pro is live
  //   trialing          → Pro is live (Stripe trial)
  //   past_due | unpaid → Pro is technically still live but the latest
  //                       invoice failed; surface a payment-issue banner
  //   incomplete        → Checkout finished but the first invoice hasn't
  //                       cleared; pending state
  //   canceled          → Not Pro
  const status = subscription?.status ?? null;
  const isProTier = subscription?.tier === "pro";
  const isPro = isProTier && (status === "active" || status === "trialing");
  const isPaymentIssue = isProTier && (status === "past_due" || status === "unpaid");
  const isIncomplete = isProTier && status === "incomplete";
  const isCancelScheduled = isPro && subscription?.cancel_at_period_end === true;
  const isMonthlyPro = isPro && subscription?.billing_period === "monthly";
  const isAnnualPro = isPro && subscription?.billing_period === "annual";

  const daysUntilRenewal = isAnnualPro && subscription?.current_period_end
    ? Math.floor((new Date(subscription.current_period_end).getTime() - Date.now()) / (24 * 60 * 60 * 1000))
    : null;
  const showRenewalSwitchBanner =
    isAnnualPro && !isCancelScheduled &&
    daysUntilRenewal !== null && daysUntilRenewal >= 0 && daysUntilRenewal <= 60;

  const checkoutPolling = pollingActive && (!subscription || subscription.status !== "active");

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <Skeleton className="h-12 w-2/3 mb-6" />
        <Skeleton className="h-48 w-full mb-6" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <Helmet>
          <title>Subscription | RehabLookup Provider</title>
          <meta name="robots" content="noindex, nofollow" />
        </Helmet>
        <Card>
          <CardContent className="p-6 flex flex-col items-center text-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-destructive/10 flex items-center justify-center">
              <AlertCircle className="h-6 w-6 text-destructive" aria-hidden />
            </div>
            <div>
              <p className="font-semibold text-foreground">Couldn't load your subscription</p>
              <p className="text-sm text-muted-foreground mt-1">
                We weren't able to reach the billing system. Your plan and any active
                add-ons aren't affected — this is just a display issue.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetchSubscription()} className="gap-2">
              <RefreshCw className="h-4 w-4" aria-hidden />
              Try again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Subscription | RehabLookup Provider</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="min-h-screen bg-slate-50">
        <div className="border-b border-slate-200 bg-white">
          <div className="container mx-auto max-w-3xl px-4 py-8 md:py-10">
            <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#1B365D]/70">
              Billing
            </p>
            <h1 className="mt-1 font-display text-[26px] font-bold tracking-tight text-slate-900 sm:text-[30px]">
              Subscription
            </h1>
            <p className="mt-1.5 max-w-xl text-[15px] text-slate-600">
              Your account plan. Free or Pro — pick what fits and switch any time.
            </p>
          </div>
        </div>
        <div className="container mx-auto max-w-3xl space-y-6 px-4 py-8">

        {/* Courtesy-period countdown + upgrade CTA (no-op without a grant) */}
        <PlanGraceBanner />

        {checkoutPolling && (
          <Card>
            <CardContent className="p-5 flex items-center gap-3">
              {pollingTimedOut ? null : (
                <Loader2 className="h-5 w-5 animate-spin text-[#1B365D]" />
              )}
              <div className="flex-1">
                <p className="font-medium text-slate-900">
                  {pollingTimedOut
                    ? "Still finalizing your subscription…"
                    : "Processing your subscription…"}
                </p>
                <p className="text-xs text-slate-600 mt-0.5">
                  {pollingTimedOut
                    ? "Your payment was successful, but activation is taking longer than usual. Click below to check again, or contact support if it stays in this state."
                    : `Your payment succeeded. We're activating your account — this usually takes a few seconds.${elapsedSec >= 15 ? ` (${elapsedSec}s elapsed)` : ""}`}
                </p>
              </div>
              {pollingTimedOut && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // Re-arm the decaying schedule. The hook will retry
                    // 2s → 4s → 8s and stop after ~3 more minutes.
                    setPollingStartedAt(Date.now());
                    setElapsedSec(0);
                    setPollingActive(true);
                    invalidateSub(facilityId);
                  }}
                >
                  Check now
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Payment-issue banner. We don't downgrade UI to Free for
            past_due / unpaid — the user still owns a Pro subscription;
            Stripe just needs them to fix their card. Surface it
            prominently so they take action before Stripe cancels. */}
        {isPaymentIssue && subscription && (
          <Card className="border-destructive/40 bg-destructive/5">
            <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-5 w-5 text-destructive" aria-hidden />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-destructive">Payment failed on your last invoice</p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Update your card in the Stripe portal to keep your Pro benefits
                  active. Stripe will retry automatically.
                </p>
              </div>
              <Button
                onClick={handleManageBilling}
                disabled={portalLoading || !subscription.stripe_customer_id}
                size="sm"
                variant="destructive"
                className="gap-2 shrink-0"
              >
                <Settings2 className="h-4 w-4" aria-hidden />
                {portalLoading ? "Opening…" : "Update payment"}
              </Button>
            </CardContent>
          </Card>
        )}

        {isIncomplete && (
          <Card>
            <CardContent className="p-5 flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden />
              <div className="flex-1">
                <p className="font-medium text-foreground">Finalizing your first invoice…</p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Stripe is settling your first charge. Pro benefits unlock as soon
                  as it clears — this usually takes under a minute. If it stays here,
                  open the billing portal to check your payment method, or contact
                  support.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleManageBilling}
                disabled={portalLoading}
                className="shrink-0"
              >
                Billing portal
              </Button>
            </CardContent>
          </Card>
        )}

        {isMonthlyPro && subscription && !isCancelScheduled && (
          <SwitchToAnnualBanner
            subscription={subscription}
            onSwitched={() => invalidateSub(facilityId)}
          />
        )}

        {showRenewalSwitchBanner && subscription && (
          <SwitchToMonthlyAtRenewalBanner
            subscription={subscription}
            onSwitched={() => invalidateSub(facilityId)}
          />
        )}

        {(isPro || isPaymentIssue) && subscription ? (
          <>
            <ProSubscriptionCard
              subscription={subscription}
              onManageBilling={handleManageBilling}
              managingPortal={portalLoading}
              onCancel={() => navigate("/provider/billing/cancel")}
              isCancelScheduled={isCancelScheduled}
            />
            {facilityId && (
              <BillingDetailsCard
                facilityId={facilityId}
                onManage={handleManageBilling}
                managing={portalLoading}
              />
            )}
          </>
        ) : (
          <>
            <PromoCountdownBanner facilityId={facilityId} targets={["pro"]} />
            <FreeSubscriptionCard />
            <ProUpgradeChoices onChoose={handleProUpgrade} busy={proUpgradeBusy} />
          </>
        )}
        </div>
      </div>
    </>
  );
}

function FreeSubscriptionCard() {
  return (
    <Card>
      <CardContent className="p-5 md:p-6 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-slate-500" aria-hidden />
            <p className="font-semibold text-slate-900 text-lg">
              You're on the Free plan
            </p>
          </div>
          <Badge variant="secondary">Free</Badge>
        </div>
        <ul className="space-y-1.5 text-sm text-slate-700">
          <li className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-emerald-600" aria-hidden />
            Listing visible in the directory
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-emerald-600" aria-hidden />
            Edit description, treatments, hours, logo, up to 5 photos
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-emerald-600" aria-hidden />
            SAMHSA-listed contact shown publicly
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-emerald-600" aria-hidden />
            Inquiries route through our concierge first
          </li>
        </ul>
      </CardContent>
    </Card>
  );
}

function ProSubscriptionCard({
  subscription,
  onManageBilling,
  managingPortal,
  onCancel,
  isCancelScheduled,
}: {
  subscription: NonNullable<ReturnType<typeof useFacilitySubscription>["data"]>;
  onManageBilling: () => void;
  managingPortal: boolean;
  onCancel: () => void;
  isCancelScheduled: boolean;
}) {
  const interval = subscription.billing_period;
  const intervalLabel = interval === "annual" ? "Annual — saving 15%" : "Monthly";
  const periodEndStr = subscription.current_period_end
    ? new Date(subscription.current_period_end).toLocaleDateString("en-US", {
        month: "long", day: "numeric", year: "numeric",
      })
    : "—";
  const nextChargeAmount = fmtMoney(subscription.paid_amount_cents);
  const nextChargeLine = isCancelScheduled
    ? `Access ends ${periodEndStr}`
    : interval === "annual"
      ? `Renews ${periodEndStr} — ${nextChargeAmount}`
      : `Next charge: ${periodEndStr} — ${nextChargeAmount}`;

  let savingsLine: string | null = null;
  if (interval === "annual" && !isCancelScheduled) {
    const savedCents =
      subscription.discount_applied_cents ??
      (TIER_PRICING.pro.fullAnnualCents - TIER_PRICING.pro.annualCents);
    savingsLine = `You saved ${fmtMoney(savedCents)} with annual billing.`;
  }

  return (
    <Card className={isCancelScheduled ? "border-amber-300/60" : undefined}>
      <CardContent className="p-5 md:p-6 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-[#1B365D]" aria-hidden />
            <p className="font-semibold text-slate-900 text-lg">Your subscription</p>
          </div>
          <Badge className="bg-[#1B365D] hover:bg-[#1B365D] text-base px-3 py-1">Pro</Badge>
        </div>

        {isCancelScheduled && (
          <div className="rounded-lg border border-amber-300/60 bg-amber-50 dark:bg-amber-950/20 p-3 flex items-start gap-2.5">
            <AlertTriangle className="h-4 w-4 mt-0.5 text-amber-700 dark:text-amber-400 shrink-0" aria-hidden />
            <div className="min-w-0">
              <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
                Your subscription is scheduled to cancel
              </p>
              <p className="text-xs text-amber-800/80 dark:text-amber-300/80 mt-0.5">
                You'll keep Pro access until <strong>{periodEndStr}</strong>. To stay
                on Pro, open the billing portal and turn cancellation off.
              </p>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2.5">
          <Badge variant="secondary" className="font-medium">{intervalLabel}</Badge>
        </div>

        <div className="space-y-1 text-sm">
          <p className="text-slate-700">{nextChargeLine}</p>
          {savingsLine && <p className="text-emerald-700 font-medium">{savingsLine}</p>}
        </div>

        <div className="flex flex-wrap gap-3 pt-2 border-t border-slate-100">
          <Button
            onClick={onManageBilling}
            disabled={managingPortal || !subscription.stripe_customer_id}
            variant={isCancelScheduled ? "default" : "outline"}
            className="gap-2"
          >
            <Settings2 className="h-4 w-4" aria-hidden />
            {managingPortal ? "Opening…" : isCancelScheduled ? "Manage in Stripe portal" : "Payment method & invoices"}
          </Button>
          {!isCancelScheduled && (
            <Button onClick={onCancel} variant="ghost" className="gap-2 text-slate-600">
              Cancel subscription
            </Button>
          )}
        </div>

        <p className="text-xs text-slate-500 leading-relaxed pt-2 border-t border-slate-100">
          Looking for marketing options like Featured placements or Concierge
          Partner? Those are available under{" "}
          <Link to="/provider/marketing" className="font-medium text-[#1B365D] underline underline-offset-2">
            Marketing
          </Link>{" "}
          in your dashboard.
        </p>
      </CardContent>
    </Card>
  );
}
