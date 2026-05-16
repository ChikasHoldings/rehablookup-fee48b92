import { Link, Navigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useSelectedFacility } from "@/contexts/SelectedFacilityContext";
import { useFacilitySubscription } from "@/hooks/useFacilitySubscription";
import { ConciergeMarketingDetail } from "@/components/provider/marketing/ConciergeMarketingDetail";

/**
 * /provider/marketing/concierge
 *
 * For Pro users WITHOUT Concierge: marketing copy + purchase CTAs.
 * For Pro users WITH Concierge: redirects to /provider/billing/concierge
 * (the existing geo manager).
 * For Free users: redirects back to the marketing hub (which gates them).
 */
export default function MarketingConcierge() {
  const { selectedFacility } = useSelectedFacility();
  const facilityId = selectedFacility?.id;
  const { data: subscription, isLoading } = useFacilitySubscription(facilityId);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <Skeleton className="h-12 w-2/3 mb-6" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  const isPro = subscription?.tier === "pro" && subscription?.status === "active";
  if (!isPro) return <Navigate to="/provider/marketing" replace />;

  if (subscription?.has_concierge_partner) {
    return <Navigate to="/provider/billing/concierge" replace />;
  }

  if (!facilityId) return <Navigate to="/provider/marketing" replace />;

  return (
    <>
      <Helmet>
        <title>Concierge Partner | RehabLookup Provider</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="container mx-auto px-4 py-8 max-w-3xl space-y-6">
        <div>
          <Button variant="ghost" size="sm" className="gap-1.5" asChild>
            <Link to="/provider/marketing">
              <ArrowLeft className="h-4 w-4" />
              Back to Marketing
            </Link>
          </Button>
        </div>

        <ConciergeMarketingDetail facilityId={facilityId} />
      </div>
    </>
  );
}
