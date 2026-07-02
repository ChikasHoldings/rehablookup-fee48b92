import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { useSelectedFacility } from "@/contexts/SelectedFacilityContext";
import { useFacilitySubscription } from "@/hooks/useFacilitySubscription";
import { isActiveProRow } from "@/lib/proAccess";
import { MarketingHubCards } from "@/components/provider/marketing/MarketingHubCards";
import { MarketDemandCard } from "@/components/provider/marketing/MarketDemandCard";
import { PromoCountdownBanner } from "@/components/provider/promo/PromoCountdownBanner";
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
  Sparkles,
  Lock,
  Rotate3D,
  UserCheck,
  Check,
  X,
  AlertCircle,
} from "lucide-react";
import {
  TIER_PRICING,
  fmtMoneyWhole,
  fmtMoney,
} from "@/lib/billingPricing";

/**
 * /provider/marketing — central hub for every marketing surface.
 *
 * SAME LAYOUT FOR FREE AND PRO. Free users see every feature with full
 * descriptions + pricing + "Pro required" indicators, instead of a
 * lockwall that hides what they're missing. Conversion path: an
 * upgrade banner sits at the top of the page; every locked feature
 * card swaps its primary CTA to "Upgrade to Pro" pointing at
 * /provider/subscription.
 *
 * Three tabs:
 *   1. Get Found      — Featured Placements + Concierge Partner (paid add-ons)
 *   2. Brand assets   — Credential Kit + Embed Widgets (free with Pro)
 *   3. Reviews        — Review-request funnel
 *
 * The full UI for each feature lives on its own page. This hub is the
 * single visible entry point so Pro features aren't lost between
 * sidebar items, and Free users see the value before they're asked to
 * pay.
 */
export default function MarketingHub() {
  const { selectedFacility } = useSelectedFacility();
  const facilityId = selectedFacility?.id;
  const { data: subscription, isLoading, isError, refetch } = useFacilitySubscription(facilityId);

  // Grace-aware: a past_due provider is still a paying Pro in Stripe's
  // dunning window and must keep access to the Marketing tools they own.
  const isPro = isActiveProRow(subscription);

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

  // Never fall through to the Free-plan view on a fetch error — a Pro
  // facility whose subscription failed to load would otherwise see the
  // upgrade wall and their paid add-ons would look gone. Show a retry.
  if (isError) {
    return (
      <>
        <ProviderPageHeader
          title="Marketing"
          description="Grow your facility's visibility and brand reach."
          icon={<Megaphone className="h-4 w-4" />}
        />
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
          <Card className="border-destructive/40 bg-destructive/5">
            <CardContent className="p-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-2 text-sm">
                <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" aria-hidden />
                <div>
                  <p className="font-medium text-foreground">Couldn't load your plan.</p>
                  <p className="text-muted-foreground mt-0.5">
                    We weren't able to check your subscription, so your marketing
                    tools are hidden for now. Try again.
                  </p>
                </div>
              </div>
              <Button variant="outline" onClick={() => refetch()}>Retry</Button>
            </CardContent>
          </Card>
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
            : "See every tool included with Pro — visibility add-ons, brand assets, and reviews."
        }
        icon={<Megaphone className="h-4 w-4" />}
        actions={
          !isPro ? (
            <Button
              asChild
              size="sm"
              className="gap-1.5 bg-amber-500 hover:bg-amber-600 text-white"
            >
              <Link to="/provider/subscription">
                <Sparkles className="h-3.5 w-3.5" />
                Upgrade to Pro
              </Link>
            </Button>
          ) : null
        }
      />

      <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 sm:py-6 lg:px-8 space-y-5">
        <PromoCountdownBanner facilityId={facilityId} />
        {!isPro && <UpgradeBanner />}

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
              actively-searching clients. Each is independent of the Pro
              subscription and can be added or removed anytime.
            </p>
            {selectedFacility?.state && (
              <MarketDemandCard
                state={selectedFacility.state}
                city={selectedFacility.city ?? ""}
                isPro={isPro}
              />
            )}
            {isPro && subscription ? (
              <MarketingHubCards subscription={subscription} />
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FeaturedCardLocked />
                <ConciergeCardLocked />
              </div>
            )}
          </TabsContent>

          <TabsContent value="assets" className="space-y-3">
            <p className="text-xs sm:text-sm text-muted-foreground">
              {isPro
                ? "Free with your Pro subscription. Use these wherever your facility's brand shows up online."
                : "Included free with every Pro subscription. Personalised to your facility — regenerate any time."}
            </p>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <CredentialKitCard locked={!isPro} />
              <EmbedWidgetsCard locked={!isPro} />
            </div>
          </TabsContent>

          <TabsContent value="reviews" className="space-y-3">
            <p className="text-xs sm:text-sm text-muted-foreground">
              {isPro
                ? "Build social proof by inviting clients to leave a review. We send a moderated invitation link they can complete in under a minute."
                : "Send moderated review invitations to past clients. Each invite is rate-limited and dedupe-protected so outreach stays clean."}
            </p>
            <ReviewRequestCard locked={!isPro} />
          </TabsContent>
        </Tabs>

        {!isPro && <PlanComparisonBlock />}
      </div>
    </>
  );
}

/* ────────────────────────────────────────────────────────────────────
   Top-of-page conversion banner for Free users
   ──────────────────────────────────────────────────────────────────── */

function UpgradeBanner() {
  const proMonthly = fmtMoneyWhole(TIER_PRICING.pro.monthlyCents);
  const proAnnualEquiv = fmtMoneyWhole(TIER_PRICING.pro.monthlyEquivOfAnnualCents);

  return (
    <Card className="border-2 border-amber-300/70 bg-gradient-to-br from-amber-50/80 via-white to-amber-50/40">
      <CardContent className="p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="hidden sm:flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-md">
            <Sparkles className="h-6 w-6" aria-hidden />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                Unlock every marketing tool with Pro
              </h2>
              <Badge className="bg-amber-500 hover:bg-amber-500 text-white">
                {proMonthly}/mo
              </Badge>
            </div>
            <p className="mt-1 text-xs sm:text-sm text-slate-700 leading-relaxed">
              Pro includes the verified badge, embed widgets, credential kit,
              review-request funnel, and priority placement. Billed monthly or
              save 15% on annual ({proAnnualEquiv}/mo equivalent). Add Featured
              + Concierge any time after upgrading.
            </p>
          </div>
          <div className="flex flex-col gap-1.5 shrink-0">
            <Button
              asChild
              className="gap-1.5 bg-amber-500 hover:bg-amber-600 text-white"
            >
              <Link to="/provider/subscription">
                <Sparkles className="h-4 w-4" />
                Upgrade to Pro
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="ghost" size="sm" className="h-7 text-xs">
              <Link to="/provider/subscription#comparison">Compare plans</Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ────────────────────────────────────────────────────────────────────
   Plan comparison block (Free vs Pro feature checklist)
   Shown at the bottom of the page for Free users only.
   ──────────────────────────────────────────────────────────────────── */

function PlanComparisonBlock() {
  const features: Array<{ label: string; free: boolean | string; pro: boolean | string; }> = [
    { label: "Public listing on directory", free: true, pro: true },
    { label: "Receive inquiry leads", free: true, pro: true },
    { label: "Photo gallery", free: "5 photos", pro: "10 photos" },
    { label: "Priority search placement (+50 boost)", free: false, pro: true },
    { label: "Verified badge", free: false, pro: true },
    { label: "Enhanced profile (video, programs, accreditations)", free: false, pro: true },
    { label: "Embed widgets (badge + reviews + gallery)", free: false, pro: true },
    { label: "Credential Kit (PDF cert + badge + social images)", free: false, pro: true },
    { label: "Send review-request emails to clients", free: false, pro: true },
    { label: "Performance analytics dashboard", free: "headline only", pro: "full" },
    { label: "Multiple facility locations", free: "1 location", pro: "up to 5" },
    { label: "Featured placements add-on", free: false, pro: "available" },
    { label: "Concierge Partner add-on", free: false, pro: "available" },
  ];

  return (
    <Card>
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-slate-900">
              What's included with Pro
            </h3>
            <p className="text-xs text-muted-foreground">
              Side-by-side comparison of Free and Pro tiers.
            </p>
          </div>
          <Badge className="bg-amber-500 hover:bg-amber-500 text-white">
            {fmtMoneyWhole(TIER_PRICING.pro.monthlyCents)}/mo
          </Badge>
        </div>

        <div className="border rounded-md overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="text-left px-3 py-2 font-medium">Feature</th>
                <th className="text-center px-3 py-2 font-medium w-24">Free</th>
                <th className="text-center px-3 py-2 font-medium w-24 bg-amber-50/50">
                  Pro
                </th>
              </tr>
            </thead>
            <tbody>
              {features.map((f) => (
                <tr key={f.label} className="border-t">
                  <td className="px-3 py-2 text-slate-700">{f.label}</td>
                  <td className="px-3 py-2 text-center">
                    <FeatureCell value={f.free} />
                  </td>
                  <td className="px-3 py-2 text-center bg-amber-50/30">
                    <FeatureCell value={f.pro} highlight />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            Pro: <strong className="text-foreground">{fmtMoneyWhole(TIER_PRICING.pro.monthlyCents)}/mo</strong>{" "}
            or {fmtMoney(TIER_PRICING.pro.annualCents)}/yr (save 15%).
          </p>
          <Button asChild className="gap-1.5 bg-amber-500 hover:bg-amber-600 text-white">
            <Link to="/provider/subscription">
              <Sparkles className="h-4 w-4" />
              Upgrade to Pro
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function FeatureCell({ value, highlight }: { value: boolean | string; highlight?: boolean }) {
  if (value === true) {
    return (
      <Check
        className={`h-4 w-4 mx-auto ${highlight ? "text-emerald-600" : "text-slate-500"}`}
        aria-label="included"
      />
    );
  }
  if (value === false) {
    return <X className="h-4 w-4 mx-auto text-slate-300" aria-label="not included" />;
  }
  return (
    <span className={`text-xs ${highlight ? "font-medium text-foreground" : "text-muted-foreground"}`}>
      {value}
    </span>
  );
}

/* ────────────────────────────────────────────────────────────────────
   Visibility add-on cards (Featured + Concierge) — locked variants
   These mirror the live Pro cards in MarketingHubCards.tsx but with
   pricing + "Pro required" framing instead of usage counters.
   ──────────────────────────────────────────────────────────────────── */

function FeaturedCardLocked() {
  return (
    <Card className="border-amber-200/60 bg-gradient-to-br from-white to-amber-50/30">
      <CardContent className="p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-amber-100 flex items-center justify-center">
              <Rotate3D className="h-5 w-5 text-amber-700" aria-hidden />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Featured Placements</h3>
              <Badge variant="outline" className="text-[10px] mt-0.5 gap-1">
                <Lock className="h-2.5 w-2.5" aria-hidden />
                Pro required
              </Badge>
            </div>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Phone-rotation slots on the state, city, near-me, treatment-type,
          and insurance pages for your area. Every paying facility takes equal
          turns — fair rotation, no bidding wars.
        </p>
        <ul className="text-xs text-muted-foreground space-y-0.5 ml-1">
          <li>• {fmtMoneyWhole(TIER_PRICING.featured.monthlyCents)}/mo per location</li>
          <li>• Or {fmtMoney(TIER_PRICING.featured.annualCents)}/yr (15% off)</li>
          <li>• Slot caps per geo keep your rotation share meaningful</li>
          <li>• For national + homepage exposure, upgrade to Concierge</li>
        </ul>
        <Button
          asChild
          size="sm"
          className="w-full gap-1.5 bg-amber-500 hover:bg-amber-600 text-white"
        >
          <Link to="/provider/subscription">
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            Upgrade to access
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function ConciergeCardLocked() {
  return (
    <Card className="border-violet-200/60 bg-gradient-to-br from-white to-violet-50/30">
      <CardContent className="p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-violet-100 flex items-center justify-center">
              <UserCheck className="h-5 w-5 text-violet-700" aria-hidden />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Concierge Partner</h3>
              <Badge variant="outline" className="text-[10px] mt-0.5 gap-1">
                <Lock className="h-2.5 w-2.5" aria-hidden />
                Pro required
              </Badge>
            </div>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          The upgrade to Featured: national homepage + international exposure
          and any extra geographies you pick, plus prominent surfacing when our
          human advisors match clients. Capped 3-5 per major city; non-partner
          alternatives always presented; calls go direct to your line.
        </p>
        <ul className="text-xs text-muted-foreground space-y-0.5 ml-1">
          <li>• {fmtMoneyWhole(TIER_PRICING.concierge.monthlyCents)}/mo per location</li>
          <li>• Or {fmtMoney(TIER_PRICING.concierge.annualCents)}/yr (15% off)</li>
          <li>• Includes all Featured exposure — replaces Featured (no double charge)</li>
          <li>• Geography-capped — no bidding wars</li>
        </ul>
        <Button
          asChild
          size="sm"
          className="w-full gap-1.5 bg-amber-500 hover:bg-amber-600 text-white"
        >
          <Link to="/provider/subscription">
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            Upgrade to access
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

/* ────────────────────────────────────────────────────────────────────
   Brand assets cards (Credential Kit + Embed Widgets)
   Free + Pro see the same card; only the CTA differs.
   ──────────────────────────────────────────────────────────────────── */

function CredentialKitCard({ locked }: { locked: boolean }) {
  return (
    <Card className="border-emerald-200/60 bg-gradient-to-br from-white to-emerald-50/30">
      <CardContent className="p-5 space-y-3">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-lg bg-emerald-100 flex items-center justify-center">
            <Award className="h-5 w-5 text-emerald-700" aria-hidden />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground">Credential Kit</h3>
            <Badge
              variant="outline"
              className="text-[10px] mt-0.5 gap-1"
            >
              {locked && <Lock className="h-2.5 w-2.5" aria-hidden />}
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
        {locked ? (
          <Button
            asChild
            size="sm"
            className="w-full gap-1.5 bg-amber-500 hover:bg-amber-600 text-white"
          >
            <Link to="/provider/subscription">
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              Upgrade to access
            </Link>
          </Button>
        ) : (
          <Button asChild size="sm" className="w-full">
            <Link to="/provider/credential-kit">
              Open Credential Kit
              <ArrowRight className="h-3 w-3 ml-1" aria-hidden />
            </Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function EmbedWidgetsCard({ locked }: { locked: boolean }) {
  return (
    <Card className="border-violet-200/60 bg-gradient-to-br from-white to-violet-50/30">
      <CardContent className="p-5 space-y-3">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-lg bg-violet-100 flex items-center justify-center">
            <Code2 className="h-5 w-5 text-violet-700" aria-hidden />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground">Embed widgets</h3>
            <Badge variant="outline" className="text-[10px] mt-0.5 gap-1">
              {locked && <Lock className="h-2.5 w-2.5" aria-hidden />}
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
        {locked ? (
          <Button
            asChild
            size="sm"
            className="w-full gap-1.5 bg-amber-500 hover:bg-amber-600 text-white"
          >
            <Link to="/provider/subscription">
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              Upgrade to access
            </Link>
          </Button>
        ) : (
          <Button asChild size="sm" variant="outline" className="w-full">
            <Link to="/provider/embed-badge">
              Configure widgets
              <ArrowRight className="h-3 w-3 ml-1" aria-hidden />
            </Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

/* ────────────────────────────────────────────────────────────────────
   Reviews funnel card — single card per tab.
   ──────────────────────────────────────────────────────────────────── */

function ReviewRequestCard({ locked }: { locked: boolean }) {
  return (
    <Card className="border-amber-200/60 bg-gradient-to-br from-white to-amber-50/30">
      <CardContent className="p-5 space-y-3">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-lg bg-amber-100 flex items-center justify-center">
            <Star className="h-5 w-5 text-amber-700" aria-hidden />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground">Review requests</h3>
            <Badge variant="outline" className="text-[10px] mt-0.5 gap-1">
              {locked && <Lock className="h-2.5 w-2.5" aria-hidden />}
              Pro
            </Badge>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Send a personalised invitation to a former client. We host the
          review form, moderate the submission, and publish it to your
          profile. Daily rate-limit + 24h dedupe keeps the outreach clean.
        </p>
        <ul className="text-xs text-muted-foreground space-y-0.5 ml-1">
          <li>• Personalised email per recipient</li>
          <li>• 30-day expiring review link</li>
          <li>• Moderation queue before publication</li>
          <li>• Open/click tracking via Resend webhook</li>
        </ul>
        {locked ? (
          <Button
            asChild
            size="sm"
            className="w-full gap-1.5 bg-amber-500 hover:bg-amber-600 text-white"
          >
            <Link to="/provider/subscription">
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              Upgrade to access
            </Link>
          </Button>
        ) : (
          <Button asChild size="sm" className="w-full">
            <Link to="/provider/reviews">
              Manage reviews
              <ArrowRight className="h-3 w-3 ml-1" aria-hidden />
            </Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
