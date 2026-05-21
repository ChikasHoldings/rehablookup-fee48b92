import { Link, Navigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";
import { useSelectedFacility } from "@/contexts/SelectedFacilityContext";
import { useFacilitySubscription } from "@/hooks/useFacilitySubscription";
import { ConciergeMarketingDetail } from "@/components/provider/marketing/ConciergeMarketingDetail";
import { ConciergeManagementPanel } from "@/components/provider/marketing/ConciergeManagementPanel";
import { ConciergeAnalyticsWidget } from "@/components/provider/marketing/ConciergeAnalyticsWidget";

/**
 * /provider/marketing/concierge — the unified Concierge Partner hub.
 *
 *   • Free / non-Pro callers       → bounce back to the Marketing Hub.
 *   • Pro WITHOUT Concierge        → render the marketing pitch + EKRA
 *                                    explainer + purchase CTAs.
 *   • Pro WITH Concierge Partner   → render analytics + geo management
 *                                    in one place (no more bouncing to
 *                                    /provider/billing/concierge).
 */
export default function MarketingConcierge() {
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

  const hasConcierge = subscription?.has_concierge_partner === true;
  const periodEndStr = subscription?.current_period_end
    ? new Date(subscription.current_period_end).toLocaleDateString("en-US", {
        month: "long", day: "numeric", year: "numeric",
      })
    : null;

  return (
    <>
      <Helmet>
        <title>
          {hasConcierge ? "Manage Concierge Partner" : "Concierge Partner"} | RehabLookup Provider
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
                Concierge Partner
              </h1>
              {hasConcierge && periodEndStr && (
                <p className="mt-1 text-sm text-muted-foreground">
                  Paid through {periodEndStr}.{" "}
                  <Link to="/provider/billing" className="underline-offset-2 hover:underline">
                    Manage billing
                  </Link>
                </p>
              )}
            </div>
            {hasConcierge && (
              <Badge className="bg-emerald-600 hover:bg-emerald-600 self-start sm:self-auto">
                Active
              </Badge>
            )}
          </div>
        </div>

        {hasConcierge ? (
          <>
            <ConciergeAnalyticsWidget facilityId={facilityId} />
            <ConciergeManagementPanel facilityId={facilityId} subscription={subscription!} />
          </>
        ) : (
          <ConciergeMarketingDetail facilityId={facilityId} />
        )}
      </div>
    </>
  );
}
