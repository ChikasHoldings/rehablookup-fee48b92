import { lazy, Suspense, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { SEO } from "@/components/SEO";
import NotFound from "@/pages/NotFound";
import { buildStateOverview } from "@/lib/locationDescriptions";
import { TreatmentCenterCard } from "@/components/cards/TreatmentCenterCard";
import { ResponsiveListingGrid } from "@/components/listings/ResponsiveListingGrid";
import { useStaticFacilities } from "@/hooks/useStaticFacilities";
import { Loader2 } from "lucide-react";

// Detect when a slug is actually a facility UUID that landed here via a stale
// `/rehab-centers/{id}` link (legacy fallback). Matches v4 UUID format.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Lazy-load the legacy resolver only when a UUID is detected in the path.
// It handles DB lookup (by id or slug) and redirects to /center/{slug}, keeping
// behavior consistent with the dedicated /treatment-centers/{slug} entry point.
const TreatmentCenterProfile = lazy(() => import("./TreatmentCenterProfile"));

import { getStateBySlug, getNearbyStates } from "@/data/locationSeoData";
import { getCountiesForState } from "@/data/countySeoData";
import { getStateArticles } from "@/data/stateArticlesData";
import { getStateStats } from "@/data/stateAddictionStats";
import { SearchResultsLoading } from "@/components/skeletons/SearchResultSkeleton";
import { Button } from "@/components/ui/button";
import { FeaturedRail } from "@/components/featured/FeaturedRail";
import { LandingFeaturedSection } from "@/components/featured/LandingFeaturedSection";
import { NearbyStatesLinks } from "@/components/seo/CityLinkGrid";
import { RelatedLinksSection, defaultInsuranceLinks } from "@/components/seo/RelatedLinksSection";
import { SmartInternalLinks } from "@/components/seo/SmartInternalLinks";
import { InlineIntakeForm } from "@/components/conversion/InlineIntakeForm";
import { LocationStatTile } from "@/components/seo/LocationStatTile";
import { 
  MapPin, 
  Building2, 
  ChevronRight, 
  Search, 
  Phone, 
  ArrowRight,
  CheckCircle,
  Shield,
  Clock,
  Star,
  Heart,
  ChevronDown,
  HelpCircle,
  Pill,
  Brain,
  Activity,
  Home,
  Stethoscope,
  Sparkles
} from "lucide-react";

// Treatment types for internal linking
const treatmentTypesData = [
  // Link directly to the canonical /treatment-types/<slug> SEO pages rather
  // than /treatment-types?type=…. The query-string variant is non-canonical;
  // every state/city/county page leaked PageRank into a non-target URL.
  { icon: Pill, title: "Drug Addiction", link: "/treatment-types/drug-addiction-treatment", param: "" },
  { icon: Activity, title: "Alcohol Rehab", link: "/treatment-types/alcohol-rehabilitation", param: "" },
  { icon: Brain, title: "Dual Diagnosis", link: "/treatment-types/dual-diagnosis-treatment", param: "" },
  { icon: Home, title: "Residential Inpatient", link: "/treatment-types/residential-inpatient", param: "" },
  { icon: Stethoscope, title: "Outpatient Programs", link: "/treatment-types/outpatient-programs", param: "" },
  { icon: Sparkles, title: "Holistic Therapy", link: "/treatment-types/holistic-therapy", param: "" },
];
import { cn } from "@/lib/utils";
import { BreadcrumbNav } from "@/components/seo/BreadcrumbNav";

// State capital images mapping
const stateCapitalImages: Record<string, string> = {
  'alabama': 'https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?w=1920&q=80',
  'alaska': 'https://images.unsplash.com/photo-1531176175280-33e68e01b7d7?w=1920&q=80',
  'arizona': 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1920&q=80',
  'arkansas': 'https://images.unsplash.com/photo-1590937276195-a0280fab0de6?w=1920&q=80',
  'california': 'https://images.unsplash.com/photo-1506146332389-18140dc7b2fb?w=1920&q=80',
  'colorado': 'https://images.unsplash.com/photo-1546156929-a4c0ac411f47?w=1920&q=80',
  'connecticut': 'https://images.unsplash.com/photo-1569012871812-f38ee64cd54c?w=1920&q=80',
  'delaware': 'https://images.unsplash.com/photo-1582407947304-fd86f028f716?w=1920&q=80',
  'florida': 'https://images.unsplash.com/photo-1605723517503-3cadb5818a0c?w=1920&q=80',
  'georgia': 'https://images.unsplash.com/photo-1575917649705-5b59aaa12e6b?w=1920&q=80',
  'hawaii': 'https://images.unsplash.com/photo-1507876466758-bc54f384809c?w=1920&q=80',
  'idaho': 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=80',
  'illinois': 'https://images.unsplash.com/photo-1494522855154-9297ac14b55f?w=1920&q=80',
  'indiana': 'https://images.unsplash.com/photo-1569336415962-a4bd9f69c07b?w=1920&q=80',
  'iowa': 'https://images.unsplash.com/photo-1516738901171-8eb4fc13bd20?w=1920&q=80',
  'kansas': 'https://images.unsplash.com/photo-1590937276234-e45c0e6c9e76?w=1920&q=80',
  'kentucky': 'https://images.unsplash.com/photo-1578301978018-3005759f48f7?w=1920&q=80',
  'louisiana': 'https://images.unsplash.com/photo-1568402102990-bc541580b59f?w=1920&q=80',
  'maine': 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1920&q=80',
  'maryland': 'https://images.unsplash.com/photo-1569336415962-a4bd9f69cd0c?w=1920&q=80',
  'massachusetts': 'https://images.unsplash.com/photo-1501979376754-1d09b529c917?w=1920&q=80',
  'michigan': 'https://images.unsplash.com/photo-1534351450181-ea9f78427fe8?w=1920&q=80',
  'minnesota': 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1920&q=80',
  'mississippi': 'https://images.unsplash.com/photo-1590937276195-a0280fab0de6?w=1920&q=80',
  'missouri': 'https://images.unsplash.com/photo-1569336415962-a4bd9f69cd0c?w=1920&q=80',
  'montana': 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=80',
  'nebraska': 'https://images.unsplash.com/photo-1516738901171-8eb4fc13bd20?w=1920&q=80',
  'nevada': 'https://images.unsplash.com/photo-1581351721010-8cf859cb14a4?w=1920&q=80',
  'new-hampshire': 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1920&q=80',
  'new-jersey': 'https://images.unsplash.com/photo-1569336415962-a4bd9f69cd0c?w=1920&q=80',
  'new-mexico': 'https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?w=1920&q=80',
  'new-york': 'https://images.unsplash.com/photo-1538970272646-f61fabb3a8a2?w=1920&q=80',
  'north-carolina': 'https://images.unsplash.com/photo-1569336415962-a4bd9f69cd0c?w=1920&q=80',
  'north-dakota': 'https://images.unsplash.com/photo-1516738901171-8eb4fc13bd20?w=1920&q=80',
  'ohio': 'https://images.unsplash.com/photo-1569336415962-a4bd9f69c07b?w=1920&q=80',
  'oklahoma': 'https://images.unsplash.com/photo-1590937276234-e45c0e6c9e76?w=1920&q=80',
  'oregon': 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1920&q=80',
  'pennsylvania': 'https://images.unsplash.com/photo-1569336415962-a4bd9f69cd0c?w=1920&q=80',
  'rhode-island': 'https://images.unsplash.com/photo-1501979376754-1d09b529c917?w=1920&q=80',
  'south-carolina': 'https://images.unsplash.com/photo-1575917649705-5b59aaa12e6b?w=1920&q=80',
  'south-dakota': 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=80',
  'tennessee': 'https://images.unsplash.com/photo-1569336415962-a4bd9f69c07b?w=1920&q=80',
  'texas': 'https://images.unsplash.com/photo-1531218150217-54595bc2b934?w=1920&q=80',
  'utah': 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1920&q=80',
  'vermont': 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1920&q=80',
  'virginia': 'https://images.unsplash.com/photo-1569336415962-a4bd9f69cd0c?w=1920&q=80',
  'washington': 'https://images.unsplash.com/photo-1502175353174-a7a70e73b362?w=1920&q=80',
  'west-virginia': 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=80',
  'wisconsin': 'https://images.unsplash.com/photo-1534351450181-ea9f78427fe8?w=1920&q=80',
  'wyoming': 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=80',
};

// FAQ data generator for each state
const getStateFAQs = (stateName: string, abbreviation: string, cityCount: number, facilityCount: number) => [
  {
    question: `What types of rehab programs are available in ${stateName}?`,
    answer: `${stateName} offers a comprehensive range of addiction treatment programs including medical detoxification, residential inpatient treatment (30-90 days), partial hospitalization programs (PHP), intensive outpatient programs (IOP), and standard outpatient services. Many facilities also provide specialized tracks for dual diagnosis, trauma, and specific substances like opioids or alcohol.`
  },
  {
    question: `How much does drug rehab cost in ${stateName}?`,
    answer: `The cost of rehab in ${stateName} varies significantly based on the type of program. Outpatient programs typically range from $1,000-$10,000 for a 3-month program, while residential inpatient treatment can cost $5,000-$80,000+ for 30 days. Many facilities accept insurance, which can cover 50-100% of treatment costs. Medicaid and Medicare also cover addiction treatment in ${abbreviation}.`
  },
  {
    question: `Does insurance cover addiction treatment in ${stateName}?`,
    answer: `Yes, under the Affordable Care Act and the Mental Health Parity and Addiction Equity Act, most health insurance plans in ${stateName} are required to cover substance abuse treatment. This includes private insurance, employer-sponsored plans, Medicaid, and Medicare. Coverage varies by plan, so we recommend verifying benefits with your insurance provider.`
  },
  {
    question: `How do I find the best rehab center in ${stateName}?`,
    answer: `When choosing a rehab center in ${stateName}, consider: accreditation (look for Joint Commission or CARF), treatment approaches offered, staff credentials, success rates, aftercare planning, and whether they treat your specific addiction. We list ${facilityCount || 'multiple'} verified treatment centers across ${cityCount} cities in ${abbreviation} to help you compare options.`
  },
  {
    question: `What is the success rate of rehab in ${stateName}?`,
    answer: `Success rates vary by program and individual circumstances. Research shows that completing at least 90 days of treatment significantly improves outcomes, with 40-60% of people maintaining sobriety after quality treatment. ${stateName} treatment centers that offer comprehensive aftercare programs, including ongoing therapy and support groups, tend to have better long-term success rates.`
  },
  {
    question: `Are there free rehab options in ${stateName}?`,
    answer: `Yes, ${stateName} has free and low-cost treatment options including state-funded programs, non-profit treatment centers, and facilities that accept Medicaid. SAMHSA's treatment locator and ${abbreviation}'s state substance abuse agency can help identify free options. Many private facilities also offer sliding-scale fees based on income.`
  }
];

/**
 * StatTile — directory-style metric card used in the hero stat grid
 * and in the mobile stat band. Kept as a thin alias of the shared
 * `LocationStatTile` so other directory pages (City, County, …) share
 * the exact same visual treatment.
 */
const StatTile = LocationStatTile;

const StatePage = () => {
  const { stateSlug } = useParams<{ stateSlug: string }>();
  const stateData = stateSlug ? getStateBySlug(stateSlug) : undefined;
  const [showAllCities, setShowAllCities] = useState(false);
  const [openFAQ, setOpenFAQ] = useState<number | null>(0);

  const { data: approvedFacilities = [], isLoading } = useStaticFacilities();

  // Recover gracefully from stale `/rehab-centers/{uuid}` links: if the slug
  // looks like a UUID, hand off to the legacy resolver, which performs an
  // authoritative DB lookup (by id) and redirects to /center/{slug}. This
  // matches the behavior of the dedicated /treatment-centers/{slug} route
  // and avoids race conditions with the static facility cache.
  const isUuidParam = !!stateSlug && UUID_RE.test(stateSlug);

  const stateCenters = useMemo(() => {
    if (!stateData) return [];
    const stateNameLower = stateData.name.toLowerCase();
    const stateAbbrevLower = stateData.abbreviation.toLowerCase();

    return approvedFacilities.filter(center =>
      center.state.toLowerCase() === stateNameLower ||
      center.state.toLowerCase() === stateAbbrevLower
    ).sort((a, b) => {
      // Pro subscriptions first
      const aPro = (a as any).isPro ? 1 : 0;
      const bPro = (b as any).isPro ? 1 : 0;
      if (bPro !== aPro) return bPro - aPro;

      // Then by calculated ranking score
      const aScore = (a as any).calculatedRankingScore || 0;
      const bScore = (b as any).calculatedRankingScore || 0;
      if (bScore !== aScore) return bScore - aScore;

      // Fallback to name
      return a.name.localeCompare(b.name);
    });
  }, [approvedFacilities, stateData]);

  const nearbyStates = stateData ? getNearbyStates(stateData.slug, 4) : [];
  const counties = stateData ? getCountiesForState(stateData.slug) : [];
  const capitalImage = stateSlug ? stateCapitalImages[stateSlug] : undefined;
  const stateFAQs = stateData ? getStateFAQs(stateData.name, stateData.abbreviation, stateData.cities.length, stateCenters.length) : [];
  const displayedCities = showAllCities ? stateData?.cities : stateData?.cities.slice(0, 12);

  // UUID in the slot → delegate to the legacy resolver (DB-backed redirect).
  if (isUuidParam) {
    return (
      <Suspense
        fallback={
          <Layout>
            <div className="min-h-[60vh] flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          </Layout>
        }
      >
        <TreatmentCenterProfile paramOverride={stateSlug} />
      </Suspense>
    );
  }

  if (!stateData) {
    // Render the NotFound page in place (200 in SPA, noindex/HTTP 404
    // semantics in the prerendered HTML). Previously we Navigate-redirected
    // to /rehab-centers — a 200 redirect — which made Google see invalid
    // state slugs as soft-404s and waste crawl budget on the redirect chain.
    return <NotFound />;
  }

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": stateFAQs.map(faq => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer
      }
    }))
  };

  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      "name": `Drug & Alcohol Rehab Centers in ${stateData.name}`,
      "description": stateData.metaDescription,
      "url": `https://rehablookup.com/rehab-centers/${stateData.slug}`,
      "mainEntity": {
        "@type": "ItemList",
        "numberOfItems": stateCenters.length,
        "itemListElement": stateCenters.slice(0, 10).map((center, index) => ({
          "@type": "ListItem",
          "position": index + 1,
          "item": {
            "@type": "MedicalBusiness",
            "name": center.name,
            "address": {
              "@type": "PostalAddress",
              "addressLocality": center.city,
              "addressRegion": stateData.abbreviation
            }
          }
        }))
      }
    },
    faqSchema
  ];

  // Per-state social card rendered on-demand by the og-state-image edge
  // function. Falls back to the default site OG image if VITE_SUPABASE_URL
  // is not present at build/runtime (e.g., during certain SSG flows).
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const ogImageUrl = supabaseUrl
    ? `${supabaseUrl}/functions/v1/og-state-image?slug=${encodeURIComponent(stateData.slug)}`
    : undefined;

  return (
    <Layout>
      <SEO
        title={`Drug & Alcohol Rehab Centers in ${stateData.name} | Find Treatment`}
        description={stateData.metaDescription}
        canonical={`/rehab-centers/${stateData.slug}`}
        image={ogImageUrl}
        structuredData={structuredData}
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "Find Rehab", url: "/rehab-centers" },
          { name: stateData.name, url: `/rehab-centers/${stateData.slug}` },
        ]}
      />

      {/* Hero — directory-style, image-driven, low text.
          Tighter design than the previous prose-heavy hero: bold H1,
          one-line subtitle, breadcrumb, and a single primary CTA.
          State data (SAMHSA facility counts, overdose stats, signature
          context) moves into the polished "About" tile below so the
          hero doesn't read like a blog opener. */}
      <section className="relative overflow-hidden border-b border-white/5">
        {capitalImage && (
          <img
            src={capitalImage}
            alt=""
            aria-hidden="true"
            width={1600}
            height={520}
            fetchPriority="high"
            loading="eager"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}
        {/* Darker, more focused overlay than the previous washed
            primary-blue. Directories want the image visible. */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950/85 via-slate-900/80 to-primary/70" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(255,255,255,0.06),_transparent_60%)]" />

        <div className="container relative z-10 py-8 md:py-12">
          <BreadcrumbNav
            className="mb-5 [&_*]:!text-white/70 [&_a:hover]:!text-white"
            items={[
              { label: "Find Rehab", href: "/rehab-centers" },
              { label: stateData.name },
            ]}
          />
          <div className="grid items-end gap-6 md:grid-cols-[1.4fr_1fr]">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white/90 backdrop-blur-sm ring-1 ring-white/15">
                <MapPin className="h-3.5 w-3.5" />
                {stateData.abbreviation} · Treatment Directory
              </div>
              <h1 className="font-display text-3xl font-bold tracking-tight text-white md:text-4xl lg:text-5xl">
                Rehab Centers in {stateData.name}
              </h1>
              <p className="mt-3 text-base text-white/80 md:text-lg max-w-xl">
                Compare verified addiction treatment programs across {stateData.cities.length} {stateData.name} cities. Filter by care level, insurance, and city.
              </p>
              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <Link to="/concierge">
                  <Button size="lg" className="gap-2 w-full sm:w-auto shadow-lg shadow-black/20">
                    <Heart className="h-4 w-4" />
                    Get Personalized Help
                  </Button>
                </Link>
                <Link to={`/search-results?location=${encodeURIComponent(stateData.name)}`}>
                  <Button
                    size="lg"
                    variant="outline"
                    className="gap-2 w-full sm:w-auto border-white/30 bg-white/5 text-white hover:bg-white/15 backdrop-blur-sm"
                  >
                    <Search className="h-4 w-4" />
                    Browse {stateData.abbreviation} Centers
                  </Button>
                </Link>
              </div>
            </div>

            {/* Stat tiles — right-aligned, premium directory feel.
                Hidden on mobile to keep the hero compact; the same
                metrics resurface in the stat band below the hero. */}
            <div className="hidden md:grid grid-cols-2 gap-3">
              <StatTile
                label={stateCenters.length === 1 ? "Verified Facility" : "Verified Facilities"}
                value={isLoading ? "—" : stateCenters.length.toLocaleString()}
                icon={Building2}
              />
              <StatTile
                label="Cities Covered"
                value={stateData.cities.length.toLocaleString()}
                icon={MapPin}
              />
              {(() => {
                const s = getStateStats(stateData.slug);
                if (!s) return null;
                return (
                  <>
                    <StatTile
                      label="SAMHSA Licensed"
                      value={s.samhsaFacilities.toLocaleString() + "+"}
                      icon={Shield}
                    />
                    <StatTile
                      label="Counties"
                      value={counties.length.toLocaleString()}
                      icon={Stethoscope}
                    />
                  </>
                );
              })()}
            </div>
          </div>
        </div>

        {/* Care-level filter chips: directory hallmark — jump straight
            into the level of care the seeker is looking for. */}
        <div className="relative z-10 border-t border-white/10 bg-black/30 backdrop-blur-sm">
          <div className="container py-3">
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
              <span className="shrink-0 text-xs font-medium uppercase tracking-wider text-white/60 mr-1">
                Care:
              </span>
              {[
                { label: "Detox", href: `/treatment-types/detox-programs/${stateData.slug}` },
                { label: "Inpatient", href: `/treatment-types/residential-inpatient/${stateData.slug}` },
                { label: "Outpatient", href: `/treatment-types/outpatient-programs/${stateData.slug}` },
                { label: "Dual Diagnosis", href: `/treatment-types/dual-diagnosis-treatment/${stateData.slug}` },
                { label: "Alcohol Rehab", href: `/treatment-types/alcohol-rehabilitation/${stateData.slug}` },
                { label: "Drug Rehab", href: `/treatment-types/drug-addiction/${stateData.slug}` },
              ].map((chip) => (
                <Link
                  key={chip.label}
                  to={chip.href}
                  className="shrink-0 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/90 ring-1 ring-white/15 transition hover:bg-white/20 hover:text-white"
                >
                  {chip.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Mobile-only stat band — surfaces the same metrics the desktop
          hero shows in the right column. */}
      <section className="md:hidden border-b bg-secondary/40">
        <div className="container py-4">
          <div className="grid grid-cols-2 gap-2">
            <StatTile
              label={stateCenters.length === 1 ? "Verified" : "Verified"}
              value={isLoading ? "—" : stateCenters.length.toLocaleString()}
              icon={Building2}
              compact
            />
            <StatTile
              label="Cities"
              value={stateData.cities.length.toLocaleString()}
              icon={MapPin}
              compact
            />
          </div>
        </div>
      </section>

      {/* Featured rotation — paid Featured pool for this state.
          Mounted directly under the hero so seekers see paid
          placements before the organic list. Silent absence when no
          Featured subscribers match this bucket. Visual matches the
          homepage Featured section (bordered container + scroll
          arrows + TreatmentCenterCard) for cross-site consistency. */}
      <LandingFeaturedSection
        placement_type="state"
        placement_value={stateData.slug}
        title={`Featured Treatment Facilities in ${stateData.name}`}
        view_all_href={`/search-results?location=${encodeURIComponent(stateData.name)}`}
      />

      {/* Directory results — the page's centerpiece. Section header
          uses a directory-style two-line layout: H2 + result count
          chip on the left, sort/view affordances on the right (the
          "View all in Search" link). */}
      <section className="bg-background py-10 md:py-14">
        <div className="container">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display text-2xl font-bold text-foreground md:text-3xl">
                  All Centers in {stateData.name}
                </h2>
                {!isLoading && stateCenters.length > 0 && (
                  <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary ring-1 ring-primary/20">
                    {stateCenters.length}
                  </span>
                )}
              </div>
              {!isLoading && (
                <p className="mt-1 text-sm text-muted-foreground">
                  {stateCenters.length > 0
                    ? `Showing top ${Math.min(stateCenters.length, 12)} of ${stateCenters.length} verified ${stateCenters.length === 1 ? "facility" : "facilities"} · sorted by ranking`
                    : `We're actively adding verified centers in ${stateData.name}.`}
                </p>
              )}
            </div>
            {!isLoading && stateCenters.length > 0 && (
              <Link
                to={`/search-results?location=${encodeURIComponent(stateData.name)}`}
                className="hidden sm:inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
              >
                Full search filters <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>

          {isLoading ? (
            <SearchResultsLoading count={6} />
          ) : stateCenters.length > 0 ? (
            <>
              <ResponsiveListingGrid facilities={stateCenters} maxItems={12} />
              <div className="mt-8 text-center">
                <Link to={`/search-results?location=${encodeURIComponent(stateData.name)}`}>
                  <Button variant="outline" size="lg" className="gap-2">
                    View All {stateData.abbreviation} Facilities
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </>
          ) : (
            <div className="rounded-2xl border bg-card p-12 text-center">
              <Building2 className="mx-auto h-12 w-12 text-muted-foreground/40" />
              <h3 className="mt-4 text-lg font-semibold">No Facilities Listed Yet</h3>
              <p className="mt-2 text-muted-foreground">
                We're actively adding verified treatment centers in {stateData.name}.
              </p>
              <Link to="/concierge" className="mt-6 inline-block">
                <Button>Get Personalized Help</Button>
              </Link>
            </div>
          )}

          <InlineIntakeForm
            heading={`Find ${stateData.name} treatment programs`}
            className="mt-10 max-w-xl mx-auto"
          />
        </div>
      </section>

      {/* Trust Signals — compact premium row, dense info per pixel */}
      <section className="border-b bg-secondary/30 py-6">
        <div className="container">
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
            {[
              { icon: Shield, title: "Verified Facilities", sub: "Credentials checked" },
              { icon: Clock, title: "24/7 Support", sub: "Always available" },
              { icon: Star, title: "Quality Care", sub: "Accredited programs" },
              { icon: CheckCircle, title: "Insurance Accepted", sub: "Most major plans" },
            ].map((item) => (
              <div
                key={item.title}
                className="flex items-center gap-3 rounded-lg border bg-card/60 px-3 py-2.5"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10">
                  <item.icon className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground leading-tight">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Cities — directory navigation. Premium card per city
          with a facility-count chip when we have one. */}
      <section className="border-b bg-card py-10 md:py-14">
        <div className="container">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-xl font-bold text-foreground md:text-2xl">
                Treatment by City
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {stateData.cities.length} {stateData.name} cities with verified centers
              </p>
            </div>
          </div>

          <div className="grid gap-2.5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {displayedCities?.map((city) => {
              const cityFacilityCount = stateCenters.filter(
                (c) => c.city?.toLowerCase() === city.name.toLowerCase(),
              ).length;
              return (
                <Link
                  key={city.slug}
                  to={`/rehab-centers/${stateData.slug}/${city.slug}`}
                  className="group flex items-center gap-3 rounded-xl border bg-background p-3.5 transition-all hover:border-primary/40 hover:bg-primary/5 hover:shadow-md"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 transition-colors group-hover:bg-primary/15">
                    <MapPin className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-foreground group-hover:text-primary transition-colors truncate">
                      {city.name}
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {cityFacilityCount > 0
                        ? `${cityFacilityCount} ${cityFacilityCount === 1 ? "center" : "centers"}`
                        : "View centers"}
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground/40 transition-all group-hover:translate-x-0.5 group-hover:text-primary" />
                </Link>
              );
            })}
          </div>

          {stateData.cities.length > 12 && (
            <div className="mt-6 text-center">
              <Button
                variant="outline"
                onClick={() => setShowAllCities(!showAllCities)}
                className="gap-2"
              >
                {showAllCities ? "Show less" : `Show all ${stateData.cities.length} cities`}
                <ChevronDown className={cn("h-4 w-4 transition-transform", showAllCities && "rotate-180")} />
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* Browse by Care Level — directory-style: large visual chips
          for each treatment modality, linking to the state-scoped
          treatment-type page. Replaces the previous prose-heavy
          "Types of Addiction Treatment" + "Inpatient vs Outpatient"
          sections. */}
      <section className="border-t bg-secondary/30 py-10 md:py-14">
        <div className="container">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-xl font-bold text-foreground md:text-2xl">
                Browse by Care Level
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Filter {stateData.abbreviation} facilities by the level of care you need
              </p>
            </div>
            <Link to="/treatment-types" className="hidden md:inline-flex text-sm font-medium text-primary hover:underline gap-1 items-center">
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            {[
              {
                icon: Sparkles,
                title: "Detox",
                desc: "Medical detox under 24/7 supervision",
                href: `/treatment-types/detox-programs/${stateData.slug}`,
              },
              {
                icon: Home,
                title: "Inpatient",
                desc: "30–90 day residential treatment programs",
                href: `/treatment-types/residential-inpatient/${stateData.slug}`,
              },
              {
                icon: Stethoscope,
                title: "Outpatient",
                desc: "PHP, IOP, and standard outpatient care",
                href: `/treatment-types/outpatient-programs/${stateData.slug}`,
              },
              {
                icon: Brain,
                title: "Dual Diagnosis",
                desc: "Integrated mental health + addiction care",
                href: `/treatment-types/dual-diagnosis-treatment/${stateData.slug}`,
              },
              {
                icon: Activity,
                title: "Alcohol Rehab",
                desc: "Alcohol-use-disorder programs across the state",
                href: `/treatment-types/alcohol-rehabilitation/${stateData.slug}`,
              },
              {
                icon: Pill,
                title: "Drug Rehab",
                desc: "Opioid, stimulant, polysubstance care",
                href: `/treatment-types/drug-addiction/${stateData.slug}`,
              },
            ].map((c) => (
              <Link
                key={c.title}
                to={c.href}
                className="group relative overflow-hidden rounded-xl border bg-card p-5 transition-all hover:border-primary/40 hover:shadow-lg hover:-translate-y-0.5"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 transition-colors group-hover:bg-primary/15">
                    <c.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-foreground leading-tight group-hover:text-primary transition-colors">
                      {c.title}
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                      {c.desc}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground/40 transition-all group-hover:translate-x-1 group-hover:text-primary" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section with Schema */}
      <section className="border-t bg-card py-12">
        <div className="container">
          <div className="mx-auto max-w-3xl">
            <div className="mb-8 text-center">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary">
                <HelpCircle className="h-4 w-4" />
                Frequently Asked Questions
              </div>
              <h2 className="text-2xl font-bold text-foreground md:text-3xl">
                Rehab FAQs for {stateData.name}
              </h2>
              <p className="mt-2 text-muted-foreground">
                Common questions about addiction treatment in {stateData.abbreviation}
              </p>
            </div>

            <div className="space-y-3">
              {stateFAQs.map((faq, index) => (
                <div
                  key={index}
                  className="rounded-xl border bg-background overflow-hidden transition-shadow hover:shadow-md"
                >
                  <button
                    onClick={() => setOpenFAQ(openFAQ === index ? null : index)}
                    className="flex w-full items-center justify-between p-5 text-left"
                  >
                    <span className="font-semibold text-foreground pr-4">{faq.question}</span>
                    <ChevronDown 
                      className={cn(
                        "h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200",
                        openFAQ === index && "rotate-180 text-primary"
                      )} 
                    />
                  </button>
                  <div
                    className={cn(
                      "grid transition-all duration-200 ease-in-out",
                      openFAQ === index ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                    )}
                  >
                    <div className="overflow-hidden">
                      <p className="px-5 pb-5 text-muted-foreground leading-relaxed">
                        {faq.answer}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* About + Insurance — consolidated premium section.
          Replaces the previous four prose-heavy "SEO" sections with
          one polished split-pane: state context on the left (with the
          de-templated state stats we already have so SEO depth is
          preserved), insurance options on the right as visual chips.
          "How to Choose" tips collapse into 3 concise pillars. */}
      <section className="border-t bg-secondary/30 py-12 md:py-16">
        <div className="container">
          <div className="grid gap-8 lg:grid-cols-[2fr_1fr]">
            {/* Left: context tile with the state stats narrative
                (kept for SEO depth, but framed as an "About" card
                rather than free-floating paragraph). */}
            <div className="rounded-2xl border bg-card p-6 md:p-8 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
                  <Building2 className="h-4 w-4 text-primary" />
                </div>
                <h2 className="font-display text-lg font-bold text-foreground md:text-xl">
                  Addiction Treatment in {stateData.name}
                </h2>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed md:text-base">
                {buildStateOverview(stateData.slug, stateData.name, stateCenters.length)}
              </p>

              {/* Three premium pillars — replaces the 6-tile "How to
                  Choose" grid. Each pillar pairs an icon with the one
                  thing seekers should verify. */}
              <div className="mt-6 grid gap-3 sm:grid-cols-3 border-t pt-6">
                {[
                  {
                    icon: Shield,
                    title: "Accredited",
                    desc: "Joint Commission or CARF",
                  },
                  {
                    icon: Stethoscope,
                    title: "Evidence-Based",
                    desc: "CBT, DBT, MAT therapies",
                  },
                  {
                    icon: Heart,
                    title: "Aftercare",
                    desc: "Alumni + ongoing support",
                  },
                ].map((p) => (
                  <div key={p.title} className="flex items-start gap-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/8">
                      <p.icon className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground">{p.title}</p>
                      <p className="text-xs text-muted-foreground leading-snug">{p.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: insurance + payment options as compact chip grid */}
            <div className="rounded-2xl border bg-card p-6 md:p-8 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
                  <CheckCircle className="h-4 w-4 text-primary" />
                </div>
                <h2 className="font-display text-lg font-bold text-foreground md:text-xl">
                  Insurance & Payment
                </h2>
              </div>
              <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                Most {stateData.abbreviation} facilities accept major insurance under the ACA and Mental Health Parity.
              </p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  "Medicaid",
                  "Medicare",
                  "Private Insurance",
                  "Self-Pay",
                  "Sliding Scale",
                  "Payment Plans",
                ].map((option) => (
                  <div
                    key={option}
                    className="flex items-center gap-1.5 rounded-md border bg-background px-2.5 py-2"
                  >
                    <CheckCircle className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                    <span className="text-xs font-medium text-foreground truncate">{option}</span>
                  </div>
                ))}
              </div>
              <Link
                to="/insurance"
                className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
              >
                Verify coverage <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Nearby States Internal Linking */}
      <section className="border-t bg-card py-10">
        <div className="container">
          <h2 className="mb-6 text-xl font-semibold text-foreground">
            Explore Treatment in Nearby States
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
            {nearbyStates.map(state => (
              <Link
                key={state.slug}
                to={`/rehab-centers/${state.slug}`}
                className="group flex items-center justify-between rounded-xl border bg-background p-4 transition-all hover:border-primary hover:shadow-md"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                    {state.abbreviation}
                  </div>
                  <span className="font-medium text-foreground">{state.name}</span>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* County Links */}
      {counties.length > 0 && (
        <section className="py-12 md:py-16 border-t border-border/40">
          <div className="container">
            <h2 className="mb-6 font-display text-xl font-bold text-foreground md:text-2xl">
              Counties in {stateData.name}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {counties.map((county) => (
                <Link
                  key={county.slug}
                  to={`/rehab-centers/${stateData.slug}/county/${county.slug}`}
                  className="rounded-lg border border-border/60 bg-card px-3 py-2.5 text-sm font-medium text-foreground hover:border-primary/40 hover:bg-accent/5 transition-colors"
                >
                  {county.name} County
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* State Articles */}
      {(() => {
        const articles = getStateArticles(stateData.slug);
        if (articles.length === 0) return null;
        return (
          <section className="py-12 md:py-16 border-t border-border/40">
            <div className="container">
              <h2 className="mb-2 font-display text-xl font-bold text-foreground md:text-2xl">
                {stateData.name} Treatment Guides
              </h2>
              <p className="mb-6 text-muted-foreground">In-depth articles about finding and affording treatment in {stateData.name}</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {articles.map(a => (
                  <Link
                    key={a.slug}
                    to={`/rehab-centers/${stateData.slug}/articles/${a.slug}`}
                    className="group rounded-xl border border-border/60 bg-card p-5 hover:border-primary/40 hover:shadow-md transition-all"
                  >
                    <span className="text-xs font-semibold text-primary uppercase tracking-wider">
                      {a.type === "how-to-find" ? "Treatment Guide" : a.type === "cost-of-rehab" ? "Financial Guide" : "City Guide"}
                    </span>
                    <h3 className="mt-2 text-base font-bold text-foreground group-hover:text-primary transition-colors leading-snug">{a.title}</h3>
                    <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{a.metaDescription}</p>
                    <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary">
                      Read article <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        );
      })()}

      {/* Related Links for SEO */}
      <RelatedLinksSection
        title={`Related Resources for ${stateData.name}`}
        treatmentLinks={[
          { title: `Detox in ${stateData.name}`, href: `/treatment-types/detox-programs/${stateData.slug}` },
          { title: `Inpatient Rehab in ${stateData.name}`, href: `/treatment-types/residential-inpatient/${stateData.slug}` },
          { title: `Outpatient Programs in ${stateData.name}`, href: `/treatment-types/outpatient-programs/${stateData.slug}` },
          { title: `Dual Diagnosis in ${stateData.name}`, href: `/treatment-types/dual-diagnosis-treatment/${stateData.slug}` },
        ]}
        locationLinks={[
          ...counties.slice(0, 4).map(county => ({
            title: `${county.name} County`,
            href: `/rehab-centers/${stateData.slug}/county/${county.slug}`,
          })),
          ...nearbyStates.map(state => ({
            title: `Rehab in ${state.name}`,
            href: `/rehab-centers/${state.slug}`,
          })),
        ]}
        insuranceLinks={defaultInsuranceLinks.slice(0, 5)}
      />

      {/* Smart Internal Links */}
      <SmartInternalLinks
        pageType="state"
        stateSlug={stateData.slug}
        stateName={stateData.name}
      />

      {/* CTA Section */}
      <section className="py-16 md:py-20">
        <div className="container">
          <div className="mx-auto max-w-3xl rounded-2xl border border-accent/20 bg-gradient-to-br from-accent/5 to-accent/10 p-8 md:p-12 text-center">
            <h2 className="mb-3 font-display text-xl font-bold text-foreground md:text-2xl">
              Ready to Start Your Recovery Journey?
            </h2>
            <p className="mb-6 text-muted-foreground max-w-xl mx-auto">
              Our team can help you find the right treatment center in {stateData.name}. 
              Get personalized recommendations based on your needs.
            </p>
            <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link to="/concierge">
                <Button size="lg" className="gap-2">
                  <Heart className="h-4 w-4" />
                  Find Treatment
                </Button>
              </Link>
              <Link to="/rehab-centers">
                <Button variant="outline" size="lg" className="gap-2">
                  Browse All Centers
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default StatePage;
