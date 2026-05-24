import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { useSelectedFacility } from "@/contexts/SelectedFacilityContext";
import { useFacilitySubscription } from "@/hooks/useFacilitySubscription";
import { FeaturedMarketingDetail } from "@/components/provider/marketing/FeaturedMarketingDetail";
import { FeaturedManagementPanel } from "@/components/provider/marketing/FeaturedManagementPanel";
import { FeaturedAnalyticsWidget } from "@/components/provider/FeaturedAnalyticsWidget";
import { LockedFeaturePreview } from "@/components/provider/LockedFeaturePreview";
import { FeaturedManagementSample } from "@/components/provider/featured/FeaturedManagementSample";

/**
 * /provider/marketing/featured — the unified Featured add-on surface.
 *
 *   • Free / non-Pro callers → render the page WITH a locked preview
 *     of the management UI so they can see what they'd be unlocking,
 *     plus an Upgrade CTA. The preview is inert (pointer-events: none)
 *     and clearly marked. Server-side gating (RLS + create-checkout-
 *     session intent='add_addon' Pro check) is the source of truth.
 *   • Pro WITHOUT Featured  → marketing pitch + purchase CTAs.
 *   • Pro WITH Featured     → management UI + analytics (tagline, slot
 *     picker, active placements, performance).
 */
export default function MarketingFeatured() {
  const { selectedFacility } = useSelectedFacility();
  const facilityId = selectedFacility?.id;
  const { data: subscription, isLoading, isError, refetch } = useFacilitySubscription(facilityId);

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
                We weren't able to check your Pro / Featured status. Try refreshing.
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

  const isPro = subscription?.tier === "pro" && subscription?.status === "active";
  const hasFeatured = subscription?.has_featured === true;
  const periodEndStr = subscription?.current_period_end
    ? new Date(subscription.current_period_end).toLocaleDateString("en-US", {
        month: "long", day: "numeric", year: "numeric",
      })
    : null;

  return (
    <>
      <Helmet>
        <title>
          {hasFeatured ? "Manage Featured placements" : "Featured Placements"} | RehabLookup Provider
        </title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="container mx-auto px-4 py-8 max-w-4xl space-y-6">
        <div>
          <Button variant="ghost" size="sm" className="gap-1.5" asChild>
            <Link to="/provider/marketing">
              <ArrowLeft className="h-4 w-4" />
              Marketing Hub
            </Link>
          </Button>
          <div className="mt-3 flex flex-col gap-1.5 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                Featured placements
              </h1>
              {hasFeatured && periodEndStr && (
                <p className="mt-1 text-sm text-muted-foreground">
                  Paid through {periodEndStr}
                  {subscription?.billing_period === "monthly" ? " (monthly)" : " (annual)"}.
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

        {!isPro ? (
          <LockedFeaturePreview
            title="Featured Placements"
            subtitle="Phone-rotation on our highest-traffic pages"
            tier="featured"
            valueStatement={
              <>
                Featured rotates your facility through a fair pool on homepage,
                state, city, search, treatment-type, insurance, and article
                pages relevant to your operating geography. <strong>Flat-fee
                ad inventory</strong> — no bidding wars, no per-click charges,
                calls go directly to your admissions line.
              </>
            }
            bullets={[
              "Slot caps per geo (30/state, 15/major metro, 8/smaller city) keep rotation share meaningful",
              "Pick which placements you want from a live availability list",
              "Waitlist when a geo fills — never a price hike for existing subscribers",
            ]}
            ctaLabel="Upgrade to Pro to unlock"
            ctaTo="/provider/billing?upgrade=pro"
            secondaryAction={{ label: "See full pricing", to: "/for-providers" }}
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
