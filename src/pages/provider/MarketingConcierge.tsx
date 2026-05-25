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
import { ConciergeMarketingDetail } from "@/components/provider/marketing/ConciergeMarketingDetail";
import { ConciergeManagementPanel } from "@/components/provider/marketing/ConciergeManagementPanel";
import { ConciergeAnalyticsWidget } from "@/components/provider/marketing/ConciergeAnalyticsWidget";
import { ConciergeIntroductionResponder } from "@/components/provider/concierge/ConciergeIntroductionResponder";
import { LockedFeaturePreview } from "@/components/provider/LockedFeaturePreview";
import { ConciergeManagementSample } from "@/components/provider/concierge/ConciergeManagementSample";

/**
 * /provider/marketing/concierge — Concierge Partner add-on surface.
 *
 *   • Free / non-Pro callers       → render the page WITH a locked
 *     preview of the management UI (sample geos + placement history)
 *     so they see what they'd unlock. Inert + clearly labeled
 *     "Preview"; server-side gating (RLS + create-checkout-session
 *     intent='add_addon' Pro check) is the source of truth.
 *   • Pro WITHOUT Concierge        → marketing pitch + EKRA explainer
 *     + purchase CTAs.
 *   • Pro WITH Concierge Partner   → analytics + geo management +
 *     placement history.
 */
export default function MarketingConcierge() {
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
        "Payment received — your Concierge Partner geography is activating. It'll appear here within a minute.",
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
                We weren't able to check your Pro / Concierge status. Try refreshing.
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
                Pick a facility from the header dropdown to manage Concierge Partner.
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

        {/* Introductions awaiting a response — surfaced to every tier (advisors
            can match non-partner facilities too), and renders nothing when the
            queue is empty. */}
        <ConciergeIntroductionResponder facilityId={facilityId} />

        {!isPro ? (
          <LockedFeaturePreview
            title="Concierge Partner"
            subtitle="Prominent surfacing when our human advisors match clients"
            tier="concierge"
            valueStatement={
              <>
                When clients call our concierge, advisors match them by clinical
                criteria first — <strong>never by who paid us</strong>. Concierge
                Partners get a visual badge in our advisor tool so the advisor
                naturally mentions you. Flat subscription; never per-call or
                per-admission.
              </>
            }
            bullets={[
              "EKRA-compliant by design — at least 2 non-partner alternatives always presented alongside partners",
              "Capped at 3–5 facilities per major city (waitlist when full)",
              "Calls go directly to your admissions line — we never intermediate",
            ]}
            ctaLabel="Upgrade to Pro to unlock"
            ctaTo="/provider/billing?upgrade=pro"
            secondaryAction={{ label: "See full pricing", to: "/for-providers" }}
          >
            <ConciergeManagementSample />
          </LockedFeaturePreview>
        ) : hasConcierge ? (
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
