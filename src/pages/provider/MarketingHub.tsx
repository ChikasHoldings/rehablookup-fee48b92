import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { useSelectedFacility } from "@/contexts/SelectedFacilityContext";
import { useFacilitySubscription } from "@/hooks/useFacilitySubscription";
import { MarketingLockwall } from "@/components/provider/marketing/MarketingLockwall";
import { MarketingHubCards } from "@/components/provider/marketing/MarketingHubCards";
import { ProviderPageHeader } from "@/components/provider/ProviderPageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Megaphone,
  Award,
  Code2,
  Star,
  ArrowRight,
  ShieldCheck,
  ImagesIcon,
} from "lucide-react";

/**
 * /provider/marketing — central hub for every marketing surface.
 *
 * Three tabs:
 *   1. Get Found  — Featured Placements + Concierge Partner (paid add-ons)
 *   2. Brand assets — Credential Kit + Embed Widgets (free with Pro)
 *   3. Reviews     — Review-request funnel summary + link to the page
 *
 * The full UI for each feature lives on its own page. This hub gives
 * providers a single visible entry point so the Pro features don't get
 * lost between the sidebar and the billing surface.
 */
export default function MarketingHub() {
  const { selectedFacility } = useSelectedFacility();
  const facilityId = selectedFacility?.id;
  const { data: subscription, isLoading } = useFacilitySubscription(facilityId);

  const isPro = subscription?.tier === "pro" && subscription?.status === "active";

  if (isLoading) {
    return (
      <>
        <ProviderPageHeader
          title="Marketing"
          description="Grow your facility's visibility and brand reach."
          icon={<Megaphone className="h-4 w-4" />}
        />
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
          <Skeleton className="h-10 w-2/3 mb-4" />
          <Skeleton className="h-80 w-full" />
        </div>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>Marketing | RehabLookup Provider</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <ProviderPageHeader
        title="Marketing"
        description={
          isPro
            ? "All your visibility tools, brand assets, and review funnels in one place."
            : "Pro-only tools that amplify your listing. Upgrade to unlock."
        }
        icon={<Megaphone className="h-4 w-4" />}
      />

      <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
        {!isPro || !subscription ? (
          <MarketingLockwall />
        ) : (
          <Tabs defaultValue="visibility" className="w-full">
            <TabsList className="mb-4 grid w-full grid-cols-3 sm:inline-flex sm:w-auto">
              <TabsTrigger value="visibility" className="gap-1.5">
                <Megaphone className="h-3.5 w-3.5" aria-hidden />
                <span className="hidden sm:inline">Get Found</span>
                <span className="sm:hidden">Found</span>
              </TabsTrigger>
              <TabsTrigger value="assets" className="gap-1.5">
                <Award className="h-3.5 w-3.5" aria-hidden />
                <span className="hidden sm:inline">Brand Assets</span>
                <span className="sm:hidden">Assets</span>
              </TabsTrigger>
              <TabsTrigger value="reviews" className="gap-1.5">
                <Star className="h-3.5 w-3.5" aria-hidden />
                Reviews
              </TabsTrigger>
            </TabsList>

            <TabsContent value="visibility" className="space-y-3">
              <p className="text-xs sm:text-sm text-muted-foreground">
                Paid placement add-ons that put your facility in front of
                actively-searching seekers. Each is independent of the Pro
                subscription and can be added or removed anytime.
              </p>
              <MarketingHubCards subscription={subscription} />
            </TabsContent>

            <TabsContent value="assets" className="space-y-3">
              <p className="text-xs sm:text-sm text-muted-foreground">
                Free with your Pro subscription. Use these wherever your
                facility's brand shows up online.
              </p>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <CredentialKitCard />
                <EmbedWidgetsCard />
              </div>
            </TabsContent>

            <TabsContent value="reviews" className="space-y-3">
              <p className="text-xs sm:text-sm text-muted-foreground">
                Build social proof by inviting clients to leave a review.
                We send a moderated invitation link they can complete in
                under a minute.
              </p>
              <ReviewRequestCard />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </>
  );
}

/**
 * Summary card for the Credential Kit — Pro+verified ZIP download
 * (PDF cert + badge SVG + email signature + social images).
 */
function CredentialKitCard() {
  return (
    <Card className="border-emerald-200/60 bg-gradient-to-br from-white to-emerald-50/30">
      <CardContent className="p-5 space-y-3">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-lg bg-emerald-100 flex items-center justify-center">
            <Award className="h-5 w-5 text-emerald-700" aria-hidden />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground">Credential Kit</h3>
            <Badge variant="outline" className="text-[10px] mt-0.5">
              Pro · verified facilities
            </Badge>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          One-click ZIP with your RehabLookup Verified certificate (PDF),
          drop-in badge SVG, email-signature HTML, and four sized social
          images. Regenerates with your latest verified date.
        </p>
        <ul className="text-xs text-muted-foreground space-y-0.5 ml-1">
          <li>• Certificate of verification (PDF)</li>
          <li>• Verified badge (SVG)</li>
          <li>• Email signature block (HTML)</li>
          <li>• Open Graph / Twitter / Instagram / LinkedIn images</li>
        </ul>
        <Button asChild size="sm" className="w-full">
          <Link to="/provider/credential-kit">
            Open Credential Kit
            <ArrowRight className="h-3 w-3 ml-1" aria-hidden />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

/**
 * Summary card for the embeddable widget platform — verified badge +
 * reviews widget for the provider's own website.
 */
function EmbedWidgetsCard() {
  return (
    <Card className="border-violet-200/60 bg-gradient-to-br from-white to-violet-50/30">
      <CardContent className="p-5 space-y-3">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-lg bg-violet-100 flex items-center justify-center">
            <Code2 className="h-5 w-5 text-violet-700" aria-hidden />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground">Embed widgets</h3>
            <Badge variant="outline" className="text-[10px] mt-0.5">
              Pro
            </Badge>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Drop-in HTML snippets for your own site. The verified badge
          links back to your profile; the reviews widget pulls your
          on-platform reviews live. Both render anonymously — no API key
          or user account required by visitors.
        </p>
        <ul className="text-xs text-muted-foreground space-y-0.5 ml-1">
          <li className="flex items-center gap-1.5">
            <ShieldCheck className="h-3 w-3 text-emerald-600" aria-hidden />
            Verified badge
          </li>
          <li className="flex items-center gap-1.5">
            <Star className="h-3 w-3 text-amber-500" aria-hidden />
            Reviews
          </li>
          <li className="flex items-center gap-1.5">
            <ImagesIcon className="h-3 w-3 text-slate-500" aria-hidden />
            Photo gallery
          </li>
        </ul>
        <Button asChild size="sm" variant="outline" className="w-full">
          <Link to="/provider/embed-badge">
            Configure widgets
            <ArrowRight className="h-3 w-3 ml-1" aria-hidden />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

/**
 * Summary card for the review-request funnel.
 */
function ReviewRequestCard() {
  return (
    <Card className="border-amber-200/60 bg-gradient-to-br from-white to-amber-50/30">
      <CardContent className="p-5 space-y-3">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-lg bg-amber-100 flex items-center justify-center">
            <Star className="h-5 w-5 text-amber-700" aria-hidden />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground">Review requests</h3>
            <Badge variant="outline" className="text-[10px] mt-0.5">
              Pro
            </Badge>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Send a personalised invitation to a former client. We host the
          review form, moderate the submission, and publish it to your
          profile. Daily rate-limit + 24h dedupe keeps the outreach clean.
        </p>
        <Button asChild size="sm" className="w-full">
          <Link to="/provider/reviews">
            Manage reviews
            <ArrowRight className="h-3 w-3 ml-1" aria-hidden />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
