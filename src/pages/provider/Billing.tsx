import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useSelectedFacility } from "@/contexts/SelectedFacilityContext";
import {
  useFacilitySubscription,
  useInvalidateFacilitySubscription,
} from "@/hooks/useFacilitySubscription";
import { CurrentPlanCard } from "@/components/provider/billing/CurrentPlanCard";
import {
  PlanComparisonGrid,
} from "@/components/provider/billing/PlanComparisonGrid";
import { SwitchToAnnualBanner } from "@/components/provider/billing/SwitchToAnnualBanner";
import type { BillingInterval } from "@/components/provider/billing/BillingIntervalToggle";

/**
 * /provider/billing — main billing surface for facilities.
 *
 * Composition:
 *  • SwitchToAnnualBanner — shown only to monthly Pro subscribers
 *  • CurrentPlanCard      — current state + Upgrade / Manage / Cancel
 *  • PlanComparisonGrid   — Pro / Featured / Concierge with interval toggle
 *  • PendingCheckoutState — appears when ?checkout=success is in URL
 *
 * The detailed upgrade wizard, slot picker, and Concierge geo selector
 * live on follow-up routes (/provider/billing/upgrade,
 * /provider/billing/placements, /provider/billing/concierge) — this page
 * is the gateway.
 */
export default function ProviderBilling() {
  const navigate = useNavigate();
  const { selectedFacility } = useSelectedFacility();
  const facilityId = selectedFacility?.id;
  const [searchParams, setSearchParams] = useSearchParams();
  const isCheckoutReturn = searchParams.get("checkout") === "success";

  // Poll for the subscription_created webhook to land for ~90s after a
  // successful Stripe Checkout. Stop earlier once the subscription is
  // active (the effect below clears the polling flag).
  const [pollingActive, setPollingActive] = useState(isCheckoutReturn);
  const { data: subscription, isLoading } = useFacilitySubscription(facilityId, {
    pollWhilePending: pollingActive,
  });
  const invalidateSub = useInvalidateFacilitySubscription();

  const portalDebounceRef = useRef(false);
  const [portalLoading, setPortalLoading] = useState(false);

  // Default the comparison grid's interval toggle to whatever the
  // subscriber currently has, falling back to monthly for Free.
  const [interval, setInterval] = useState<BillingInterval>("monthly");
  useEffect(() => {
    if (subscription?.billing_period === "annual") setInterval("annual");
  }, [subscription?.billing_period]);

  // Cap polling at 90s — if the webhook still hasn't landed by then,
  // surface a recovery message instead of spinning forever.
  const [pollingTimedOut, setPollingTimedOut] = useState(false);
  useEffect(() => {
    if (!pollingActive) return;
    const t = setTimeout(() => {
      setPollingTimedOut(true);
      setPollingActive(false);
    }, 90_000);
    return () => clearTimeout(t);
  }, [pollingActive]);

  // Stop polling as soon as the subscription lands active.
  useEffect(() => {
    if (pollingActive && subscription?.status === "active") {
      setPollingActive(false);
    }
  }, [pollingActive, subscription?.status]);

  const checkoutPolling = pollingActive && (!subscription || subscription.status !== "active");

  // Auto-clear ?checkout=success once the subscription lands active.
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

  const handleUpgrade = (_target: "pro" | "featured" | "concierge") => {
    // TODO(monetization PR-3 follow-up): route to /provider/billing/upgrade
    // multi-step modal with the right preselection. For this PR, navigate
    // to the sales page where checkout is wired up.
    navigate("/for-providers#interest");
  };

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
      console.error("[Billing] portal error", err);
      toast.error(message);
    } finally {
      setPortalLoading(false);
      setTimeout(() => { portalDebounceRef.current = false; }, 4000);
    }
  };

  const isMonthlyPro =
    subscription?.tier === "pro" &&
    subscription?.status === "active" &&
    subscription?.billing_period === "monthly";

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Skeleton className="h-12 w-2/3 mb-6" />
        <Skeleton className="h-48 w-full mb-6" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Billing | RehabLookup Provider</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="container mx-auto px-4 py-8 max-w-4xl space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            Billing &amp; Subscription
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your plan, payment method, and add-ons.
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

        <CurrentPlanCard
          subscription={subscription ?? null}
          onUpgradeClick={() => handleUpgrade("pro")}
          onManageBillingClick={handleManageBilling}
          managingPortal={portalLoading}
        />

        <PlanComparisonGrid
          subscription={subscription ?? null}
          interval={interval}
          onIntervalChange={setInterval}
          onUpgrade={handleUpgrade}
        />
      </div>
    </>
  );
}
