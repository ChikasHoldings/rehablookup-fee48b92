import { Helmet } from "react-helmet-async";
import { Skeleton } from "@/components/ui/skeleton";
import { useSelectedFacility } from "@/contexts/SelectedFacilityContext";
import { useFacilitySubscription } from "@/hooks/useFacilitySubscription";
import { MarketingLockwall } from "@/components/provider/marketing/MarketingLockwall";
import { MarketingHubCards } from "@/components/provider/marketing/MarketingHubCards";

/**
 * /provider/marketing — Marketing hub.
 *
 * STRUCTURAL RULE: this page surfaces the marketing add-ons as a
 * SEPARATE product category from the subscription. For Free users it
 * shows a lockwall + grayed-out previews — no purchase enabled. For
 * Pro users it shows the two product cards (Featured + Concierge),
 * which independently route to their own purchase / management pages.
 */
export default function MarketingHub() {
  const { selectedFacility } = useSelectedFacility();
  const facilityId = selectedFacility?.id;
  const { data: subscription, isLoading } = useFacilitySubscription(facilityId);

  const isPro = subscription?.tier === "pro" && subscription?.status === "active";

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Skeleton className="h-12 w-2/3 mb-6" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Marketing | RehabLookup Provider</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="container mx-auto px-4 py-8 max-w-4xl space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            Marketing tools
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isPro
              ? "Grow your facility's visibility with these add-ons. Each is billed separately from your Pro subscription and can be added or removed anytime."
              : "Pro-only add-ons that amplify your listing. Upgrade to Pro to unlock."}
          </p>
        </div>

        {isPro && subscription ? (
          <MarketingHubCards subscription={subscription} />
        ) : (
          <MarketingLockwall />
        )}
      </div>
    </>
  );
}
