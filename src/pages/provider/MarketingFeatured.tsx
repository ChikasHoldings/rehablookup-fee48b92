import { Link, useSearchParams } from "react-router-dom";
import { useEffect } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { useSelectedFacility } from "@/contexts/SelectedFacilityContext";
import { useFacilitySubscription } from "@/hooks/useFacilitySubscription";
import { isActiveProRow } from "@/lib/proAccess";
import { FeaturedMarketingDetail } from "@/components/provider/marketing/FeaturedMarketingDetail";
import { FeaturedManagementPanel } from "@/components/provider/marketing/FeaturedManagementPanel";
import { FeaturedAnalyticsWidget } from "@/components/provider/FeaturedAnalyticsWidget";
import { LockedFeaturePreview } from "@/components/provider/LockedFeaturePreview";
import { FeaturedManagementSample } from "@/components/provider/featured/FeaturedManagementSample";

/**
 * /provider/marketing/featured — Featured placement management.
 *
 *   • Legacy retired-bundle holder → point at the hub's retired-product state.
 *     (Concierge is retired; this page must not sell it as "the upgrade".)
 *   • No Featured, not Pro   → preview of the management UI, plus a factual
 *     note about the current checkout prerequisite. Server-side gating (RLS +
 *     create-checkout-session intent='add_addon') remains the source of truth.
 *   • No Featured, Pro       → purchase flow.
 *   • Featured active        → management UI + performance (tagline, slot
 *     picker, active placements).
 *
 * Featured is ADVERTISING, billed per location, separate from Pro. Nothing here
 * may present it as a Pro benefit or as an organic-ranking change.
 */
export default function MarketingFeatured() {
  const { selectedFacility } = useSelectedFacility();
  const facilityId = selectedFacility?.id;
  const { data: subscription, isLoading, isError, refetch } = useFacilitySubscription(facilityId);

  // Stripe redirects back here after an add-on checkout. The page otherwise
  // gave no confirmation; surface success/cancel and refresh the add-on state.
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  useEffect(() => {
    const status = searchParams.get("checkout");
    if (status !== "success" && status !== "cancel") return;
    if (status === "success") {
      toast.success(
        "Payment received — your Featured placement is activating. It'll appear here within a minute.",
      );
      queryClient.invalidateQueries({ queryKey: ["facility-subscription", facilityId] });
    } else {
      toast.info("Checkout canceled — no charge was made.");
    }
    const next = new URLSearchParams(searchParams);
    next.delete("checkout");
    next.delete("addon");
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams, queryClient, facilityId]);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl space-y-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-12 w-2/3" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2 text-sm">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" aria-hidden />
            <div>
              <p className="font-medium text-foreground">Couldn't load your subscription.</p>
              <p className="text-muted-foreground mt-0.5">
                We weren't able to check your Featured status. Try refreshing.
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={() => refetch()}>Retry</Button>
        </div>
      </div>
    );
  }

  if (!facilityId) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2 text-sm">
            <AlertCircle className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" aria-hidden />
            <div>
              <p className="font-medium text-foreground">No facility selected.</p>
              <p className="text-muted-foreground mt-0.5">
                Pick a facility from the header dropdown to manage Featured placements.
              </p>
            </div>
          </div>
          <Button asChild variant="outline">
            <Link to="/provider/listings">Go to listings</Link>
          </Button>
        </div>
      </div>
    );
  }

  const isPro = isActiveProRow(subscription);
  const hasFeatured = subscription?.has_featured === true;
  // A legacy retired add-on is mutually exclusive with Featured server-side, so
  // a holder must not be shown the Featured purchase pitch — its CTA would 409.
  // The product itself is retired and is NOT marketed here; the Featured hub
  // owns the retired-product state and the support path.
  const hasRetiredBundle = subscription?.has_concierge_partner === true;
  // The Featured add-on bills independently of Pro — use its own period end,
  // falling back to the Pro period for rows activated before that column was
  // backfilled by the webhook.
  const featuredPeriodEnd =
    subscription?.featured_current_period_end ?? subscription?.current_period_end;
  const periodEndStr = featuredPeriodEnd
    ? new Date(featuredPeriodEnd).toLocaleDateString("en-US", {
        month: "long", day: "numeric", year: "numeric",
      })
    : null;

  return (
    <>
      <Helmet>
        <title>
          {hasFeatured ? "Manage Featured placements" : "Featured placements"} | RehabLookup Provider
        </title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="container mx-auto px-4 py-8 max-w-4xl space-y-6">
        <div>
          <Button variant="ghost" size="sm" className="gap-1.5" asChild>
            <Link to="/provider/marketing">
              <ArrowLeft className="h-4 w-4" />
              Featured
            </Link>
          </Button>
          <div className="mt-3 flex flex-col gap-1.5 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                Featured placements
              </h1>
              {hasFeatured && periodEndStr && (
                <p className="mt-1 text-sm text-muted-foreground">
                  Paid through {periodEndStr}.
                  {" "}
                  <Link to="/provider/billing" className="underline-offset-2 hover:underline">
                    Manage billing
                  </Link>
                </p>
              )}
            </div>
            {hasFeatured && (
              <Badge className="bg-emerald-600 hover:bg-emerald-600 self-start sm:self-auto">
                Active
              </Badge>
            )}
          </div>
        </div>

        {/* A retired legacy add-on is mutually exclusive with Featured, so the
            purchase pitch would 409. Send the holder to the hub, which owns the
            retired-product state — we do not market the retired product. */}
        {hasRetiredBundle ? (
          <div className="rounded-lg border border-slate-300 bg-slate-50 p-6 space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">
              A legacy add-on is active on this facility
            </h2>
            <p className="text-sm text-slate-700 leading-relaxed">
              This facility holds a legacy placement add-on that RehabLookup no longer
              sells, and it can't be combined with Featured. Your existing exposure is
              unaffected.
            </p>
            <Button asChild variant="outline" className="gap-1.5">
              <Link to="/provider/marketing">Back to Featured</Link>
            </Button>
          </div>
        ) : !isPro && !hasFeatured ? (
          <LockedFeaturePreview
            title="Featured placements"
            subtitle="Sponsored rotation on the local directory pages for your area"
            tier="featured"
            valueStatement={
              <>
                Featured rotates your facility through a fair pool of sponsored slots
                on the state, city, and near-me pages for your area, plus the
                treatment-type and insurance pages you match. <strong>Flat-fee ad
                inventory</strong> — no bidding wars, no per-click charges, and calls
                go directly to your admissions line. Placements are clearly labeled
                sponsored and <strong>do not change your organic directory
                position</strong>.
              </>
            }
            bullets={[
              "Billed per location, separately from your listing plan",
              "Slot caps per geo (30/state, 15/major metro, 8/smaller city) keep rotation share meaningful",
              "Pick which placements you want from a live availability list",
              "Waitlist when a geo fills — never a price hike for existing subscribers",
            ]}
            ctaLabel="See Featured pricing"
            ctaTo="/provider/marketing"
            secondaryAction={{ label: "Plan & Billing", to: "/provider/billing" }}
            footnote="Featured checkout currently requires an active Pro subscription on this facility — a limitation of the current billing integration, not of the Featured product."
          >
            <FeaturedManagementSample />
          </LockedFeaturePreview>
        ) : hasFeatured ? (
          <>
            <FeaturedAnalyticsWidget facilityId={facilityId} />
            <FeaturedManagementPanel facilityId={facilityId} subscription={subscription!} />
          </>
        ) : (
          <FeaturedMarketingDetail facilityId={facilityId} />
        )}
      </div>
    </>
  );
}
