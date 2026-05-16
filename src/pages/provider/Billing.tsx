import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CreditCard,
  ExternalLink,
  Sparkles,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useSelectedFacility } from "@/contexts/SelectedFacilityContext";
import { useQuery } from "@tanstack/react-query";
import { getCachedSession } from "@/lib/sessionCache";

interface FacilitySubscription {
  id: string;
  status: string | null;
  tier: string | null;
  has_featured: boolean | null;
  has_concierge_partner: boolean | null;
  billing_period: string | null;
  paid_amount_cents: number | null;
  price_cents: number | null;
  current_period_end: string | null;
  started_at: string | null;
  canceled_at: string | null;
  stripe_customer_id: string | null;
}

/**
 * Billing — provider subscription summary.
 *
 * Replaces the legacy credit-purchase + auto-reload + $399-Pro UX with
 * a minimal subscription-status surface backed by `facility_subscriptions`.
 * The new annual flat-fee monetization (Pro / Featured / Concierge) is
 * the only model supported here. To start or change a subscription,
 * providers are routed to `/for-providers` (sales) or the Stripe
 * customer portal (manage existing).
 */
export default function ProviderBilling() {
  const navigate = useNavigate();
  const { selectedFacility } = useSelectedFacility();
  const facilityId = selectedFacility?.id;
  const [searchParams, setSearchParams] = useSearchParams();
  const portalDebounceRef = useRef(false);
  const [portalLoading, setPortalLoading] = useState(false);

  // Clear ?canceled=true after Stripe portal return.
  useEffect(() => {
    if (searchParams.get("canceled") === "true") {
      const next = new URLSearchParams(searchParams);
      next.delete("canceled");
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const { data: subscription, isLoading } = useQuery({
    queryKey: ["facility-subscription", facilityId],
    queryFn: async (): Promise<FacilitySubscription | null> => {
      if (!facilityId) return null;
      const session = await getCachedSession();
      if (!session) return null;
      const { data, error } = await supabase
        .from("facility_subscriptions")
        .select(
          "id, status, tier, has_featured, has_concierge_partner, billing_period, paid_amount_cents, price_cents, current_period_end, started_at, canceled_at, stripe_customer_id",
        )
        .eq("facility_id", facilityId)
        .maybeSingle();
      if (error) {
        console.error("[Billing] subscription fetch failed", error);
        return null;
      }
      return data as FacilitySubscription | null;
    },
    enabled: !!facilityId,
    staleTime: 1000 * 30,
  });

  const handleManageSubscription = async () => {
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

  const isActive = subscription?.status === "active";
  const tierLabel = subscription
    ? subscription.has_featured && subscription.has_concierge_partner
      ? "Pro + Featured + Concierge"
      : subscription.has_featured
        ? "Pro + Featured"
        : subscription.has_concierge_partner
          ? "Pro + Concierge"
          : subscription.tier === "pro"
            ? "Pro"
            : "Free"
    : "Free";

  const fmtMoney = (cents: number | null | undefined) =>
    cents == null
      ? "—"
      : `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;

  return (
    <>
      <Helmet>
        <title>Billing | RehabLookup Provider</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="container mx-auto px-4 py-8 max-w-3xl space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            Billing &amp; Subscription
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your annual subscription, view invoices, and update your payment method.
          </p>
        </div>

        {/* Current subscription card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              Current subscription
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {isLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-3">
                  <Badge
                    variant={isActive ? "default" : "secondary"}
                    className={isActive ? "bg-emerald-600 hover:bg-emerald-700" : ""}
                  >
                    {tierLabel}
                  </Badge>
                  {isActive && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Active
                    </span>
                  )}
                  {!isActive && subscription?.status && (
                    <span className="text-xs text-muted-foreground capitalize">
                      {subscription.status.replace(/_/g, " ")}
                    </span>
                  )}
                </div>

                <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                  <div>
                    <dt className="text-muted-foreground">Billing period</dt>
                    <dd className="font-medium">
                      {subscription?.billing_period === "annual" ? "Annual" : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Annual total</dt>
                    <dd className="font-medium">{fmtMoney(subscription?.paid_amount_cents)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Monthly equivalent</dt>
                    <dd className="font-medium">{fmtMoney(subscription?.price_cents)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Renewal date</dt>
                    <dd className="font-medium">
                      {subscription?.current_period_end
                        ? new Date(subscription.current_period_end).toLocaleDateString()
                        : "—"}
                    </dd>
                  </div>
                </dl>

                <div className="flex flex-wrap gap-3 pt-2 border-t">
                  <Button
                    onClick={handleManageSubscription}
                    disabled={portalLoading || !subscription?.stripe_customer_id}
                    variant="outline"
                    className="gap-2"
                  >
                    {portalLoading ? "Opening…" : "Manage billing"}
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Button>
                  {!isActive && (
                    <Button onClick={() => navigate("/for-providers")} className="gap-2">
                      <Sparkles className="h-4 w-4" />
                      Upgrade options
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Plan comparison link */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Compare plans</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              See every tier side-by-side — Pro, Pro + Featured, Pro + Concierge Partner — with
              transparent annual pricing on a single page.
            </p>
            <Button asChild variant="outline" className="gap-2">
              <Link to="/for-providers">
                View plans &amp; pricing <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
