import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { useSelectedFacility } from "@/contexts/SelectedFacilityContext";
import { useFacilitySubscription } from "@/hooks/useFacilitySubscription";
import { isActiveProRow } from "@/lib/proAccess";
import { MarketDemandCard } from "@/components/provider/marketing/MarketDemandCard";
import { FeaturedAnalyticsWidget } from "@/components/provider/FeaturedAnalyticsWidget";
import { PromoCountdownBanner } from "@/components/provider/promo/PromoCountdownBanner";
import { ProviderPageHeader } from "@/components/provider/ProviderPageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Megaphone,
  Award,
  Code2,
  ArrowRight,
  ShieldOff,
  Check,
  Tag,
  AlertCircle,
  ChevronRight,
  CreditCard,
} from "lucide-react";
import { TIER_PRICING, fmtMoneyWhole, fmtMoney } from "@/lib/billingPricing";
import { FEATURED_POSITIONING } from "@/lib/proDirectoryBenefits";

/**
 * /provider/marketing — the FEATURED ADVERTISING HUB.
 *
 * This route used to be a general "Marketing" hub whose primary job was
 * selling Pro: a gradient upgrade banner, a Free-vs-Pro comparison table that
 * claimed "Priority search placement (+50 boost)" and "Verified badge" as Pro
 * features, and three add-on cards stamped "Pro required". All of that was
 * either false or belonged on Plan & Billing.
 *
 * It is now one product: Featured. Featured is ADVERTISING —
 *   • sold separately from Pro, billed per location
 *   • clearly labeled sponsored wherever it renders
 *   • has no effect on organic directory position
 *   • has its own performance reporting while active
 *
 * The nav labels this destination "Featured". The URL stays /provider/marketing
 * so existing bookmarks, the /provider/placement-network redirect, and the
 * Featured detail child route keep working.
 *
 * Pro brand assets (Credential Kit, Embed widgets) keep a compact entry point
 * at the bottom rather than their own tab — they are Pro capabilities, not
 * advertising, and they each have a real page.
 */
export default function MarketingHub() {
  const { selectedFacility } = useSelectedFacility();
  const facilityId = selectedFacility?.id;
  const { data: subscription, isLoading, isError, refetch } = useFacilitySubscription(facilityId);

  // Grace-aware: a past_due provider is still a paying Pro in Stripe's dunning
  // window. Used ONLY to word the Pro brand-assets footer — never to gate
  // Featured, which is independent of Pro.
  const isPro = isActiveProRow(subscription);
  const hasFeatured = subscription?.has_featured === true;
  // Legacy Concierge holders still exist in production. Concierge is retired
  // and must not be marketed; they get a retired-product state instead of the
  // old "upgrade to Concierge" pitch.
  const hasRetiredBundle = subscription?.has_concierge_partner === true;

  const featuredPeriodEnd =
    subscription?.featured_current_period_end ?? subscription?.current_period_end;
  const periodEndStr = featuredPeriodEnd
    ? new Date(featuredPeriodEnd).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : null;

  const header = (
    <ProviderPageHeader
      title="Featured"
      description="Clearly labeled sponsored placement. Separate from your plan."
      icon={<Megaphone className="h-4 w-4" />}
      actions={
        hasFeatured ? (
          <Badge className="bg-emerald-600 hover:bg-emerald-600">Active</Badge>
        ) : undefined
      }
    />
  );

  if (isLoading) {
    return (
      <>
        {header}
        <div className="mx-auto max-w-5xl space-y-4 px-4 py-6 sm:px-6 lg:px-8">
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </>
    );
  }

  // Never fall through to the "not active" view on a fetch error — a facility
  // that HAS Featured would otherwise see its paid placement look gone.
  if (isError) {
    return (
      <>
        {header}
        <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
          <Card className="border-destructive/40 bg-destructive/5">
            <CardContent className="flex flex-col gap-3 p-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-2 text-sm">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" aria-hidden />
                <div>
                  <p className="font-medium text-foreground">Couldn't load your Featured status.</p>
                  <p className="mt-0.5 text-muted-foreground">
                    We weren't able to reach the billing system. Any active Featured
                    placement is unaffected — this is a display issue.
                  </p>
                </div>
              </div>
              <Button variant="outline" onClick={() => refetch()}>
                Retry
              </Button>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>Featured | RehabLookup Provider</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      {header}

      <div className="mx-auto max-w-5xl space-y-5 px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
        <PromoCountdownBanner facilityId={facilityId} />

        {/* ── What Featured is ── */}
        <WhatFeaturedIsCard />

        {/* ── Status for the selected facility ── */}
        {hasRetiredBundle ? (
          <RetiredBundleCard periodEndStr={periodEndStr} />
        ) : hasFeatured ? (
          <>
            <FeaturedActiveCard periodEndStr={periodEndStr} />
            {facilityId && <FeaturedAnalyticsWidget facilityId={facilityId} />}
          </>
        ) : (
          <FeaturedPurchaseCard />
        )}

        {/* ── Live slot availability in this facility's market ── */}
        {selectedFacility?.state && !hasRetiredBundle && (
          <MarketDemandCard
            state={selectedFacility.state}
            city={selectedFacility.city ?? ""}
          />
        )}

        {/* ── Pro brand assets, kept distinct from advertising ── */}
        <ProAssetsFooter isPro={isPro} />
      </div>
    </>
  );
}

/* ────────────────────────────────────────────────────────────────────
   What Featured is — the explanation every surface must agree on.
   ──────────────────────────────────────────────────────────────────── */

/** Where a sponsored placement can render. Mirrors featured_placements types. */
const PLACEMENT_SURFACES = [
  "State pages",
  "City pages",
  "Near-me pages",
  "Treatment-type pages",
  "Insurance pages",
];

function WhatFeaturedIsCard() {
  return (
    <Card>
      <CardHeader className="border-b py-3.5">
        <CardTitle className="text-sm font-semibold">What Featured is</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 p-4 sm:p-5">
        <p className="text-sm leading-relaxed text-slate-700">
          Featured buys your facility a sponsored slot in the visible Featured
          positions on the directory pages for your area. Every paying facility in a
          geography takes equal turns in a fair rotation — no bidding, no per-click
          charges, and calls go straight to your admissions line.
        </p>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Where sponsored placements can appear
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {PLACEMENT_SURFACES.map((surface) => (
              <span
                key={surface}
                className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-700"
              >
                <Tag className="h-3 w-3 text-slate-400" aria-hidden />
                {surface}
              </span>
            ))}
          </div>
          <p className="mt-2 inline-flex items-start gap-1.5 text-xs text-slate-500">
            <Megaphone className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
            <span>
              Every placement renders with a visible sponsored label so families can
              tell advertising from organic results.
            </span>
          </p>
        </div>

        <ul className="grid gap-1.5 border-t border-slate-100 pt-3 sm:grid-cols-2">
          {FEATURED_POSITIONING.map((line) => (
            <li key={line} className="flex items-start gap-2 text-xs text-slate-600">
              <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden />
              <span>{line}</span>
            </li>
          ))}
        </ul>

        <div className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50/70 p-3">
          <ShieldOff className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" aria-hidden />
          <p className="text-xs leading-relaxed text-slate-600">
            Featured does not change your organic directory position, and it does not
            affect verification. Organic position is computed from listing signals
            only; verification is earned through our review process.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

/* ────────────────────────────────────────────────────────────────────
   Status cards
   ──────────────────────────────────────────────────────────────────── */

function FeaturedActiveCard({ periodEndStr }: { periodEndStr: string | null }) {
  return (
    <Card className="border-emerald-200/70">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b py-3.5">
        <CardTitle className="text-sm font-semibold">
          Featured is active on this facility
        </CardTitle>
        <Button asChild variant="ghost" size="sm" className="h-7 gap-1 text-xs text-[#1B365D]">
          <Link to="/provider/marketing/featured">
            Manage placements <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-3 p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
              Billing
            </p>
            <p className="mt-0.5 text-slate-900">
              {fmtMoneyWhole(TIER_PRICING.featured.monthlyCents)}/mo per location
            </p>
          </div>
          {periodEndStr && (
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                Paid through
              </p>
              <p className="mt-0.5 text-slate-900">{periodEndStr}</p>
            </div>
          )}
        </div>
        <p className="text-xs text-slate-500">
          Featured bills separately from your listing plan.{" "}
          <Link
            to="/provider/billing"
            className="font-medium text-[#1B365D] underline underline-offset-2"
          >
            Plan &amp; Billing
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

/**
 * Inactive state. One CTA, no prerequisites.
 *
 * Featured is purchasable on any plan. The transitional note that used to sit
 * here — acknowledging that create-checkout-session returned 409 PRO_REQUIRED
 * without Pro — is gone because the gate is gone: the Pro precondition was
 * removed from the add-on branch and activateFeaturedAddon() now creates a
 * tier='free' subscription row for a Featured-only facility.
 */
function FeaturedPurchaseCard() {
  return (
    <Card>
      <CardHeader className="border-b py-3.5">
        <CardTitle className="text-sm font-semibold">Featured is not active</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 p-4 sm:p-5">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <p className="text-xl font-bold text-[#1B365D]">
            {fmtMoneyWhole(TIER_PRICING.featured.monthlyCents)}
            <span className="text-sm font-normal text-slate-500">/mo per location</span>
          </p>
          <p className="text-xs text-slate-500">
            or {fmtMoney(TIER_PRICING.featured.annualCents)}/yr (save 15%)
          </p>
        </div>
        <ul className="space-y-1 text-xs text-slate-600">
          <li>• Pick the placements you want from live slot availability</li>
          <li>• Slot caps per geography keep each rotation share meaningful</li>
          <li>• Waitlist when a geography fills — never a price hike for existing subscribers</li>
        </ul>
        <Button asChild className="gap-1.5 bg-[#1B365D] hover:bg-[#142a4a]">
          <Link to="/provider/marketing/featured">
            Explore Featured placements <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
        <p className="border-t border-slate-100 pt-3 text-xs leading-relaxed text-slate-500">
          Featured bills separately from your listing plan. You can buy it on Free or
          on Pro, and cancelling one never cancels the other.
        </p>
      </CardContent>
    </Card>
  );
}

/**
 * Retired-product state for the legacy Concierge Partner holders that still
 * exist in production. It names the product only to explain that it is retired
 * and what happens to the exposure they already paid for — the previous version
 * of this page actively sold Concierge as "the upgrade to Featured".
 */
function RetiredBundleCard({ periodEndStr }: { periodEndStr: string | null }) {
  return (
    <Card className="border-slate-300">
      <CardHeader className="border-b py-3.5">
        <CardTitle className="text-sm font-semibold">
          Your legacy add-on is retired
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 p-4 sm:p-5">
        <p className="text-sm leading-relaxed text-slate-700">
          This facility holds a legacy add-on that RehabLookup no longer sells. It is
          not available to new subscribers and it is not being marketed.
        </p>
        <p className="text-xs leading-relaxed text-slate-600">
          Your existing placement exposure continues
          {periodEndStr ? ` through ${periodEndStr}` : ""}. Featured is the current
          advertising product. For questions about your billing or moving to Featured,
          contact support — we won't change your subscription without asking.
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          <Button asChild variant="outline" size="sm" className="gap-1.5 text-xs">
            <Link to="/provider/billing">
              <CreditCard className="h-3.5 w-3.5" aria-hidden />
              Plan &amp; Billing
            </Link>
          </Button>
          <Button asChild variant="ghost" size="sm" className="gap-1.5 text-xs">
            <Link to="/provider/help">Contact support</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ────────────────────────────────────────────────────────────────────
   Pro brand assets — capabilities, not advertising. Compact entry points.
   ──────────────────────────────────────────────────────────────────── */

function ProAssetsFooter({ isPro }: { isPro: boolean }) {
  const assets = [
    {
      icon: Award,
      label: "Credential Kit",
      description: "Certificate, badge SVG, email signature, social images",
      href: "/provider/credential-kit",
    },
    {
      icon: Code2,
      label: "Embed widgets",
      description: "Drop-in badge, reviews, and gallery blocks for your own site",
      href: "/provider/embed-badge",
    },
  ];

  return (
    <Card>
      <CardHeader className="border-b py-3.5">
        <CardTitle className="text-sm font-semibold">Brand assets</CardTitle>
      </CardHeader>
      <CardContent className="p-2">
        {assets.map((asset) => {
          const Icon = asset.icon;
          return (
            <Link
              key={asset.href}
              to={asset.href}
              className="flex items-center gap-3 rounded-lg px-2.5 py-2.5 transition-colors hover:bg-slate-50"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                <Icon className="h-4 w-4 text-slate-600" aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-800">{asset.label}</p>
                <p className="truncate text-xs text-slate-500">{asset.description}</p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" aria-hidden />
            </Link>
          );
        })}
        <p className="px-2.5 pb-1 pt-2 text-xs leading-relaxed text-slate-500">
          {isPro
            ? "Included with your Pro subscription. The Credential Kit reflects your current verification status, which is determined independently of your plan."
            : "These are Pro capabilities. Each page explains its own requirements — the Credential Kit also requires current verification, which is earned through our review process and not purchasable."}
        </p>
      </CardContent>
    </Card>
  );
}
