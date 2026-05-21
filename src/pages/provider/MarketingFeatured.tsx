import { Link, Navigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";
import { useSelectedFacility } from "@/contexts/SelectedFacilityContext";
import { useFacilitySubscription } from "@/hooks/useFacilitySubscription";
import { FeaturedMarketingDetail } from "@/components/provider/marketing/FeaturedMarketingDetail";
import { FeaturedManagementPanel } from "@/components/provider/marketing/FeaturedManagementPanel";
import { FeaturedAnalyticsWidget } from "@/components/provider/FeaturedAnalyticsWidget";

/**
 * /provider/marketing/featured — the unified Featured add-on hub.
 *
 *   • Free / non-Pro callers → bounce back to the Marketing Hub (which
 *     gates them with the upgrade lockwall).
 *   • Pro WITHOUT Featured  → render the marketing pitch + purchase CTAs.
 *   • Pro WITH Featured     → render the management UI + analytics so
 *     the provider can run the entire add-on (tagline, slot picker,
 *     active placements, performance) without bouncing through the
 *     billing area.
 */
export default function MarketingFeatured() {
  const { selectedFacility } = useSelectedFacility();
  const facilityId = selectedFacility?.id;
  const { data: subscription, isLoading } = useFacilitySubscription(facilityId);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl space-y-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-12 w-2/3" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  const isPro = subscription?.tier === "pro" && subscription?.status === "active";
  if (!isPro) return <Navigate to="/provider/marketing" replace />;
  if (!facilityId) return <Navigate to="/provider/marketing" replace />;

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
        {/* Breadcrumb */}
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

        {hasFeatured ? (
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
