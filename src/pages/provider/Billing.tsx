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
import {
  FEATURED_DIRECTORY_NOTE,
  FREE_DIRECTORY_BENEFITS,
  PRO_ACTIVE_DESTINATIONS,
  PRO_DIRECTORY_BENEFITS,
  PRO_DIRECTORY_TRUST_NOTE,
} from "@/lib/proDirectoryBenefits";

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
 * /provider/billing — "Plan & Billing".
 *
 * STRUCTURAL RULE: this page is JUST about Free vs Pro. Featured is named only
 * in a single helper-text link pointing at /provider/marketing, because it is a
 * separate advertising product with its own hub — never a Pro line item. The
 * Pro upgrade choices are the ONLY purchase surface on this page.
 *
 * The Pro capability list comes from src/lib/proDirectoryBenefits.ts. It is not
 * restated inline: the previous version of this page listed benefits Free
 * facilities already had (inquiries) and benefits Pro does not buy at all.
 *
 * Route stays mounted at /provider/billing (and /provider/subscription) to
 * preserve existing bookmarks; only the label changed.
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
    // Stop polling once the sub reaches a live Pro state. `trialing` counts as
    // Pro here (matches `isPro` below), so a trial doesn't leave the
    // "Processing your subscription…" spinner running alongside the Pro card.
    if (pollingActive && (subscription?.status === "active" || subscription?.status === "trialing")) {
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

  // Stripe's cancel_url is /provider/billing?checkout=cancel. Surface a
  // friendly, NON-error acknowledgement and strip the param so it can't
  // linger or re-fire on refresh. No subscription state changes on cancel —
  // nothing implies Pro. (This is distinct from checkout=success above, which
  // drives polling; cancel never starts polling since isCheckoutReturn only
  // matches "success".)
  const isCheckoutCancel = searchParams.get("checkout") === "cancel";
  useEffect(() => {
    if (!isCheckoutCancel) return;
    const next = new URLSearchParams(searchParams);
    next.delete("checkout");
    next.delete("session_id");
    setSearchParams(next, { replace: true });
    toast.message("Checkout canceled. No changes were made.");
  }, [isCheckoutCancel, searchParams, setSearchParams]);

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
          <title>Plan &amp; Billing | RehabLookup Provider</title>
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
        <title>Plan &amp; Billing | RehabLookup Provider</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="min-h-screen bg-slate-50">
        <div className="border-b border-slate-200 bg-white">
          <div className="container mx-auto max-w-3xl px-4 py-8 md:py-10">
            <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#1B365D]/70">
              Account
            </p>
            <h1 className="mt-1 font-display text-[26px] font-bold tracking-tight text-slate-900 sm:text-[30px]">
              Plan &amp; Billing
            </h1>
            <p className="mt-1.5 max-w-xl text-[15px] text-slate-600">
              Your listing plan and payment details. Free or Pro — switch any time.
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

        {/* The `incomplete` finalizing state renders once, in the main content
            slot below (IncompletePendingCard) — no separate top banner, so the
            provider never sees two identical "Finalizing your first invoice…"
            cards. */}

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
        ) : isIncomplete && subscription ? (
          // Pro checkout completed but the first invoice hasn't cleared yet.
          // Show ONLY a finalizing/pending state — never the upgrade cards —
          // so the provider can't start a second checkout (the server also
          // now blocks a duplicate checkout for incomplete subscriptions).
          <IncompletePendingCard
            onManage={handleManageBilling}
            managing={portalLoading}
            onRefresh={() => invalidateSub(facilityId)}
          />
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

/**
 * Shown when a facility has a Pro subscription in the `incomplete` state — the
 * checkout finished but Stripe hasn't confirmed the first invoice yet. We must
 * NOT offer upgrade choices here (that would let the provider start a second
 * checkout) and must NOT claim Pro is active before the webhook confirms.
 */
function IncompletePendingCard({
  onManage,
  managing,
  onRefresh,
}: {
  onManage: () => void;
  managing: boolean;
  onRefresh: () => void;
}) {
  return (
    <Card>
      <CardContent className="p-5 md:p-6 space-y-4">
        <div className="flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-[#1B365D]" aria-hidden />
          <div className="flex-1">
            <p className="font-semibold text-slate-900">Finalizing your first invoice…</p>
            <p className="text-xs text-slate-600 mt-0.5">
              Your Pro checkout is complete. We're waiting for the first payment to clear —
              this usually takes a few seconds. Your plan activates automatically once it does.
            </p>
          </div>
          <Badge variant="secondary">Pending</Badge>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={onRefresh}>
            Check again
          </Button>
          <Button variant="outline" size="sm" onClick={onManage} disabled={managing}>
            Manage payment
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * What Free actually includes. The last bullet used to read "Inquiries route
 * through our concierge first" — describing a retired workflow AND implying
 * that a Free facility's inquiries were intermediated. They are not: an inquiry
 * is pinned to the facility the seeker selected, on every tier.
 */
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
          {FREE_DIRECTORY_BENEFITS.map((benefit) => (
            <li key={benefit} className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-emerald-600" aria-hidden />
              {benefit}
            </li>
          ))}
        </ul>
        <p className="text-xs text-slate-500 leading-relaxed border-t border-slate-100 pt-3">
          Verification is earned through our review process and organic directory
          position is computed from listing signals — neither depends on your plan.
        </p>
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

        {/* What Pro is actually paying for, read from the shared contract so
            this list can never drift from the upgrade page or the dashboard. */}
        <div className="border-t border-slate-100 pt-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Included with Pro
          </p>
          <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
            {PRO_DIRECTORY_BENEFITS.map((benefit) => (
              <li key={benefit.key} className="flex items-start gap-2 text-xs text-slate-700">
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden />
                <span>
                  <span className="font-medium text-slate-900">{benefit.shortTitle}</span>
                  <span className="block text-[11px] leading-relaxed text-slate-500">
                    {benefit.items.join(" · ")}
                  </span>
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {PRO_ACTIVE_DESTINATIONS.filter((d) => d.href !== "/provider/billing").map((dest) => (
              <Button
                key={dest.href}
                asChild
                variant="outline"
                size="sm"
                className="h-7 gap-1 text-xs"
              >
                <Link to={dest.href}>{dest.label}</Link>
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-2 border-t border-slate-100 pt-3 text-xs leading-relaxed text-slate-500">
          <p>{PRO_DIRECTORY_TRUST_NOTE}</p>
          <p>
            {FEATURED_DIRECTORY_NOTE}{" "}
            <Link
              to="/provider/marketing"
              className="font-medium text-[#1B365D] underline underline-offset-2"
            >
              View Featured
            </Link>
            .
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
