import { Link, Navigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useSelectedFacility } from "@/contexts/SelectedFacilityContext";
import { useFacilitySubscription } from "@/hooks/useFacilitySubscription";
import { FeaturedMarketingDetail } from "@/components/provider/marketing/FeaturedMarketingDetail";

/**
 * /provider/marketing/featured
 *
 * For Pro users WITHOUT Featured: marketing copy + purchase CTAs.
 * For Pro users WITH Featured: redirects to /provider/billing/placements
 * (the existing slot manager).
 * For Free users: redirects back to the marketing hub (which gates them).
 */
export default function MarketingFeatured() {
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

  // Already active → existing slot manager (from PR-3 foundation commit).
  if (subscription?.has_featured) {
    return <Navigate to="/provider/billing/placements" replace />;
  }

  if (!facilityId) return <Navigate to="/provider/marketing" replace />;

  return (
    <>
      <Helmet>
        <title>Featured Placements | RehabLookup Provider</title>
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

        <FeaturedMarketingDetail facilityId={facilityId} />
      </div>
    </>
  );
}
