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
import { fmtMoney, TIER_PRICING } from "@/lib/billingPricing";

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
  const [searchParams, setSearchParams] = useSearchParams();
  const isCheckoutReturn = searchParams.get("checkout") === "success";

  const [pollingActive, setPollingActive] = useState(isCheckoutReturn);
  const { data: subscription, isLoading } = useFacilitySubscription(facilityId, {
    pollWhilePending: pollingActive,
  });
  const invalidateSub = useInvalidateFacilitySubscription();

  const portalDebounceRef = useRef(false);
  const [portalLoading, setPortalLoading] = useState(false);

  const [pollingTimedOut, setPollingTimedOut] = useState(false);
  useEffect(() => {
    if (!pollingActive) return;
    const t = setTimeout(() => {
      setPollingTimedOut(true);
      setPollingActive(false);
    }, 90_000);
    return () => clearTimeout(t);
  }, [pollingActive]);
  useEffect(() => {
    if (pollingActive && subscription?.status === "active") {
      setPollingActive(false);
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

  const handleManageBilling = async () => {
    if (portalDebounceRef.current) return;
    portalDebounceRef.current = true;
    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.url) {
        const url = new URL(data.url);
        if (!url.hostname.endsWith("stripe.com")) throw new Error("Invalid portal URL");
        window.open(data.url, "_blank");
      } else {
        throw new Error("No portal URL returned");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to open billing portal.";
      console.error("[Subscription] portal error", err);
      toast.error(message);
    } finally {
      setPortalLoading(false);
      setTimeout(() => { portalDebounceRef.current = false; }, 4000);
    }
  };

  const handleProUpgrade = async (interval: "monthly" | "annual") => {
    if (!facilityId) return;
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout-session", {
        body: {
          facility_id: facilityId,
          intent: "initial_subscription",
          billing_period: interval,
          items: [{ product: "pro" }],
        },
      });
      if (error) throw error;
      if (data?.error || !data?.url) {
        throw new Error(data?.error ?? "Checkout URL missing");
      }
      const url = new URL(data.url);
      if (!url.hostname.endsWith("stripe.com")) {
        throw new Error("Invalid checkout URL");
      }
      window.location.assign(data.url);
    } catch (err) {
      console.error("[Subscription] upgrade failed", err);
      toast.error(err instanceof Error ? err.message : "Failed to start checkout");
    }
  };

  const isPro = subscription?.tier === "pro" && subscription?.status === "active";
  const isMonthlyPro = isPro && subscription?.billing_period === "monthly";
  const isAnnualPro = isPro && subscription?.billing_period === "annual";

  const daysUntilRenewal = isAnnualPro && subscription?.current_period_end
    ? Math.floor((new Date(subscription.current_period_end).getTime() - Date.now()) / (24 * 60 * 60 * 1000))
    : null;
  const showRenewalSwitchBanner =
    isAnnualPro && daysUntilRenewal !== null && daysUntilRenewal >= 0 && daysUntilRenewal <= 60;

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

  return (
    <>
      <Helmet>
        <title>Subscription | RehabLookup Provider</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="container mx-auto px-4 py-8 max-w-3xl space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            Subscription
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your account plan. Free or Pro — pick what fits.
          </p>
        </div>

        {checkoutPolling && (
          <Card>
            <CardContent className="p-5 flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-[#1B365D]" />
              <div className="flex-1">
                <p className="font-medium text-slate-900">
                  {pollingTimedOut
                    ? "Still finalizing your subscription…"
                    : "Processing your subscription…"}
                </p>
                <p className="text-xs text-slate-600 mt-0.5">
                  {pollingTimedOut
                    ? "Your payment was successful, but we're still finalizing the setup. Refresh this page in a minute, or contact support if anything looks off."
                    : "Your payment succeeded. We're activating your account — this usually takes a few seconds."}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {isMonthlyPro && subscription && (
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

        {isPro && subscription ? (
          <ProSubscriptionCard
            subscription={subscription}
            onManageBilling={handleManageBilling}
            managingPortal={portalLoading}
            onCancel={() => navigate("/provider/billing/cancel")}
          />
        ) : (
          <>
            <FreeSubscriptionCard />
            <ProUpgradeChoices onChoose={handleProUpgrade} />
          </>
        )}
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
}: {
  subscription: NonNullable<ReturnType<typeof useFacilitySubscription>["data"]>;
  onManageBilling: () => void;
  managingPortal: boolean;
  onCancel: () => void;
}) {
  const interval = subscription.billing_period;
  const intervalLabel = interval === "annual" ? "Annual — saving 15%" : "Monthly";
  const nextChargeDateStr = subscription.current_period_end
    ? new Date(subscription.current_period_end).toLocaleDateString("en-US", {
        month: "long", day: "numeric", year: "numeric",
      })
    : "—";
  const nextChargeAmount = fmtMoney(subscription.paid_amount_cents);
  const nextChargeLine = interval === "annual"
    ? `Renews ${nextChargeDateStr} — ${nextChargeAmount}`
    : `Next charge: ${nextChargeDateStr} — ${nextChargeAmount}`;

  let savingsLine: string | null = null;
  if (interval === "annual") {
    const savedCents =
      subscription.discount_applied_cents ??
      (TIER_PRICING.pro.fullAnnualCents - TIER_PRICING.pro.annualCents);
    savingsLine = `You saved ${fmtMoney(savedCents)} with annual billing.`;
  }

  return (
    <Card>
      <CardContent className="p-5 md:p-6 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-[#1B365D]" aria-hidden />
            <p className="font-semibold text-slate-900 text-lg">Your subscription</p>
          </div>
          <Badge className="bg-[#1B365D] hover:bg-[#1B365D] text-base px-3 py-1">Pro</Badge>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Badge variant="secondary" className="font-medium">{intervalLabel}</Badge>
          {subscription.cancel_at_period_end && (
            <Badge variant="destructive">Cancels at period end</Badge>
          )}
        </div>

        <div className="space-y-1 text-sm">
          <p className="text-slate-700">{nextChargeLine}</p>
          {savingsLine && <p className="text-emerald-700 font-medium">{savingsLine}</p>}
        </div>

        <div className="flex flex-wrap gap-3 pt-2 border-t border-slate-100">
          <Button
            onClick={onManageBilling}
            disabled={managingPortal || !subscription.stripe_customer_id}
            variant="outline"
            className="gap-2"
          >
            <Settings2 className="h-4 w-4" />
            {managingPortal ? "Opening…" : "Payment method & invoices"}
          </Button>
          <Button onClick={onCancel} variant="ghost" className="gap-2 text-slate-600">
            Cancel subscription
          </Button>
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
