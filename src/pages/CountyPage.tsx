import { useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import NotFound from "@/pages/NotFound";
import { buildCountyOverview } from "@/lib/locationDescriptions";
import { Layout } from "@/components/layout/Layout";
import { SEO } from "@/components/SEO";
import { ResponsiveListingGrid } from "@/components/listings/ResponsiveListingGrid";
import { useStaticFacilities } from "@/hooks/useStaticFacilities";
import { cityInList } from "@/lib/cityNameMatch";
import { getStateBySlug } from "@/data/locationSeoData";
import { getCountiesForState, getStateCountyData } from "@/data/countySeoData";
import { resolveCounty } from "@/lib/countyLookup";
import { getStateArticles } from "@/data/stateArticlesData";
import { SearchResultsLoading } from "@/components/skeletons/SearchResultSkeleton";
import { Button } from "@/components/ui/button";
import { BreadcrumbNav } from "@/components/seo/BreadcrumbNav";
import { SmartInternalLinks } from "@/components/seo/SmartInternalLinks";
import { LandingFeaturedSection } from "@/components/featured/LandingFeaturedSection";
import { LocationStatTile } from "@/components/seo/LocationStatTile";
import {
  MapPin, Building2, ChevronRight, Search, Phone, ArrowRight, ChevronDown, HelpCircle,
  Pill, Brain, Activity, Home, Stethoscope, Sparkles, Users, Map, Landmark
} from "lucide-react";
import { cn } from "@/lib/utils";

const treatmentTypesData = [
  // Canonical /treatment-types/<slug> paths (not the non-canonical ?type= variant).
  { icon: Pill, title: "Drug Addiction", link: "/treatment-types/drug-addiction-treatment", param: "" },
  { icon: Activity, title: "Alcohol Rehab", link: "/treatment-types/alcohol-rehabilitation", param: "" },
  { icon: Brain, title: "Dual Diagnosis", link: "/treatment-types/dual-diagnosis-treatment", param: "" },
  { icon: Home, title: "Residential Inpatient", link: "/treatment-types/residential-inpatient", param: "" },
  { icon: Stethoscope, title: "Outpatient Programs", link: "/treatment-types/outpatient-programs", param: "" },
  { icon: Sparkles, title: "Holistic Therapy", link: "/treatment-types/holistic-therapy", param: "" },
];

export default function CountyPage() {
  const { stateSlug, countySlug } = useParams<{ stateSlug: string; countySlug: string }>();
  const [openFAQ, setOpenFAQ] = useState<number | null>(0);

  const resolved = resolveCounty(stateSlug, countySlug);
  const stateData = resolved?.state ?? (stateSlug ? getStateBySlug(stateSlug) : undefined);
  const stateCounty = stateSlug ? getStateCountyData(stateSlug) : undefined;
  const countyData = resolved?.county;
  const otherCounties = stateSlug ? getCountiesForState(stateSlug).filter(c => c.slug !== countySlug) : [];

  const { data: approvedFacilities = [], isLoading } = useStaticFacilities();

  // Filter facilities for this county — match by city names within the county.
  // cityInList normalizes both sides for Saint/Fort/Mount/Point + punctuation
  // so SAMHSA-imported facilities (e.g. city="St. Louis") match seed data
  // (e.g. majorCities=["Saint Louis"]).
  const { countyFacilities, isStateFallback } = useMemo(() => {
    if (!countyData || !stateData) return { countyFacilities: [], isStateFallback: false };
    const stateNameLower = stateData.name.toLowerCase();
    const stateAbbrLower = stateData.abbreviation.toLowerCase();

    const inState = approvedFacilities.filter(f =>
      f.state.toLowerCase() === stateNameLower || f.state.toLowerCase() === stateAbbrLower
    );
    const countyMatched = inState.filter(f => cityInList(f.city, countyData.majorCities));

    // Fallback: if fewer than 3 match the county directly, show all state
    // facilities — but flag it so the UI labels them as state-wide rather than
    // misrepresenting state centers as serving this specific county.
    const usingFallback = countyMatched.length < 3;
    const base = usingFallback ? inState : countyMatched;

    const sorted = [...base].sort((a, b) => {
      const aPro = (a as { isPro?: boolean }).isPro ? 1 : 0;
      const bPro = (b as { isPro?: boolean }).isPro ? 1 : 0;
      if (bPro !== aPro) return bPro - aPro;
      const aScore = (a as { calculatedRankingScore?: number }).calculatedRankingScore || 0;
      const bScore = (b as { calculatedRankingScore?: number }).calculatedRankingScore || 0;
      if (bScore !== aScore) return bScore - aScore;
      return a.name.localeCompare(b.name);
    }).slice(0, 12);

    return { countyFacilities: sorted, isStateFallback: usingFallback };
  }, [approvedFacilities, countyData, stateData]);

  if (!stateData || !countyData || !stateCounty) {
    // Render NotFound in place — stops soft-404 / wasted-crawl behavior
    // from the prior redirect to /locations on invalid county slugs.
    return <NotFound />;
  }

  const pageTitle = `Rehab Centers in ${countyData.name} County, ${stateData.abbreviation}`;
  const canonical = `https://rehablookup.com/rehab-centers/${stateSlug}/county/${countySlug}`;

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: countyData.faqs.map(faq => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  };

  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: pageTitle,
      description: countyData.metaDescription,
      url: canonical,
      mainEntity: {
        "@type": "ItemList",
        numberOfItems: countyFacilities.length,
        itemListElement: countyFacilities.slice(0, 10).map((center, index) => ({
          "@type": "ListItem",
          position: index + 1,
          item: {
            "@type": "MedicalBusiness",
            name: center.name,
            address: {
              "@type": "PostalAddress",
              addressLocality: center.city,
              addressRegion: center.state,
            },
          },
        })),
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "MedicalWebPage",
      name: pageTitle,
      description: countyData.metaDescription,
      url: canonical,
      about: { "@type": "MedicalCondition", name: "Substance Use Disorder" },
      audience: {
        "@type": "PeopleAudience",
        geographicArea: {
          "@type": "AdministrativeArea",
          name: `${countyData.name} County`,
          containedInPlace: { "@type": "State", name: stateData.name },
        },
      },
      specialty: "Addiction Medicine",
      lastReviewed: new Date().toISOString().split("T")[0],
    },
  ];

  const cityLinks = stateData.cities.slice(0, 8).map(city => ({
    title: `${city.name}, ${stateData.abbreviation}`,
    href: `/rehab-centers/${stateSlug}/${city.slug}`,
  }));

  const countyLinks = otherCounties.slice(0, 6).map(c => ({
    title: `${c.name} County`,
    href: `/rehab-centers/${stateSlug}/county/${c.slug}`,
  }));

  return (
    <Layout>
      <SEO
        title={`${pageTitle} — Find Treatment | RehabLookup`}
        description={countyData.metaDescription}
        canonical={canonical}
        structuredData={[...structuredData, faqSchema]}
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: stateData.name, url: `/rehab-centers/${stateSlug}` },
          { name: `${countyData.name} County`, url: canonical },
        ]}
      />

      {/* Hero — COUNTY JURISDICTION treatment. Distinct from
          state/city heroes in four ways:
            1. NO photo background. Counties aren't tourist
               destinations — solid primary gradient + subtle grid
               pattern reads "civic / administrative" instead of
               travel-aesthetic.
            2. Landmark icon + "JURISDICTION" eyebrow signals the
               page is about an administrative region.
            3. Hero is more compact (py-9 md:py-12) than state/city.
               The verbose buildCountyOverview prose moves to the
               About card below.
            4. Stat strip is a 4-tile horizontal band BELOW the hero
               (separate light section) — county-specific signals
               (Population, Centers, County Seat, Major Cities).
       */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary via-primary/95 to-primary/80 text-primary-foreground border-b border-white/5">
        {/* Subtle grid pattern — civic / map-grid texture */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjA2KSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCBmaWxsPSJ1cmwoI2dyaWQpIiB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIi8+PC9zdmc+')] opacity-100" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(255,255,255,0.08),_transparent_60%)]" />

        <div className="container mx-auto px-4 py-6 md:py-8 relative z-10">
          <BreadcrumbNav
            className="mb-3 [&_*]:!text-white/70 [&_a:hover]:!text-white"
            items={[
              { label: stateData.name, href: `/rehab-centers/${stateSlug}` },
              { label: `${countyData.name} County` },
            ]}
          />

          <div className="max-w-3xl">
            <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-white/90 backdrop-blur-sm ring-1 ring-white/15">
              <Landmark className="h-3 w-3" />
              {stateData.abbreviation} · Jurisdiction Directory
            </div>
            <h1 className="font-display text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight">
              Rehab Centers in {countyData.name} County
            </h1>
            <p className="mt-2 text-sm md:text-base text-white/85 max-w-2xl">
              {countyData.majorCities.length} cities · county seat {countyData.seat}
            </p>
            <div className="mt-4 flex flex-col sm:flex-row gap-2.5">
              <Button asChild size="default" className="bg-white text-primary hover:bg-white/90 shadow-lg gap-2">
                <Link to="/search-results">
                  <Search className="h-4 w-4" />
                  Browse Treatment Centers
                </Link>
              </Button>
              <Button
                asChild
                size="default"
                variant="outline"
                className="border-white/30 bg-white/5 text-white hover:bg-white/15 backdrop-blur-sm gap-2"
              >
                <Link to={`/rehab-centers/${stateSlug}`}>
                  <Search className="h-4 w-4" />
                  Browse {stateData.abbreviation}
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* County stat band — 4 civic signals in a tight light strip
          right below the hero. */}
      <section className="border-b bg-secondary/40">
        <div className="container mx-auto px-4 py-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <LocationStatTile
              label="Population"
              value={countyData.population >= 1_000_000
                ? `${(countyData.population / 1_000_000).toFixed(1)}M`
                : countyData.population >= 1_000
                  ? `${Math.round(countyData.population / 1_000)}K`
                  : countyData.population.toLocaleString()}
              icon={Users}
              compact
            />
            <LocationStatTile
              label={isStateFallback ? "Statewide" : countyFacilities.length === 1 ? "Center" : "Centers"}
              value={isLoading ? "—" : `${countyFacilities.length}+`}
              icon={Building2}
              compact
            />
            <LocationStatTile
              label="County Seat"
              value={countyData.seat}
              icon={Landmark}
              compact
            />
            <LocationStatTile
              label="Major Cities"
              value={countyData.majorCities.length.toLocaleString()}
              icon={Map}
              compact
            />
          </div>
        </div>
      </section>

      {/* Featured rotation — county pages share the parent state's
          Featured pool (placement_type='state', placement_value=
          state slug) since the rotation system has no dedicated
          county bucket. Silent absence when no Featured subscribers
          serve the state. Visual matches the homepage Featured
          section for cross-site consistency. */}
      <LandingFeaturedSection
        placement_type="state"
        placement_value={stateData.slug}
        title={`Featured Treatment Facilities serving ${countyData.name} County`}
        view_all_href={`/search-results?location=${encodeURIComponent(`${countyData.name} County, ${stateData.name}`)}`}
      />

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 md:py-10">
        {/* Directory results — county-level centerpiece */}
        <section className="mb-10">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground">
                  Centers in {countyData.name} County
                </h2>
                {!isLoading && countyFacilities.length > 0 && (
                  <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary ring-1 ring-primary/20">
                    {countyFacilities.length}
                  </span>
                )}
              </div>
              {!isLoading && (
                <p className="mt-1 text-sm text-muted-foreground">
                  {countyFacilities.length === 0
                    ? `Expanding directory in ${countyData.name} County.`
                    : isStateFallback
                      ? `Fewer centers are listed directly in ${countyData.name} County — showing ${countyFacilities.length} verified ${countyFacilities.length === 1 ? "facility" : "facilities"} across ${stateData.name}.`
                      : `${countyFacilities.length} verified ${countyFacilities.length === 1 ? "facility" : "facilities"} serving the county`}
                </p>
              )}
            </div>
            <Link
              to={`/rehab-centers/${stateSlug}`}
              className="hidden sm:inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
            >
              View all in {stateData.name} <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {isLoading ? (
            <SearchResultsLoading />
          ) : countyFacilities.length > 0 ? (
            <ResponsiveListingGrid facilities={countyFacilities} />
          ) : (
            <div className="text-center py-12 bg-card rounded-2xl border">
              <Building2 className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Limited Listings Available</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                We're expanding our directory in {countyData.name} County. Browse facilities across {stateData.name} or get personalized placement help.
              </p>
              <div className="flex flex-wrap gap-3 justify-center">
                <Button asChild>
                  <Link to={`/rehab-centers/${stateSlug}`}>Browse {stateData.name}</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link to="/search-results">Browse Treatment Centers</Link>
                </Button>
              </div>
            </div>
          )}
        </section>

        {/* Cities in the County — chip layout, county-specific. */}
        <section className="mb-10">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-xl font-bold text-foreground md:text-2xl">
                Cities in {countyData.name} County
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {countyData.majorCities.length} cities · seat: {countyData.seat}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {countyData.majorCities.map(city => {
              const citySlug = city.toLowerCase().replace(/\s+/g, "-");
              const cityExists = stateData.cities.some(c => c.slug === citySlug);
              return cityExists ? (
                <Link
                  key={city}
                  to={`/rehab-centers/${stateSlug}/${citySlug}`}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-card border border-border/60 text-sm font-medium transition-all hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
                >
                  <MapPin className="h-3.5 w-3.5 text-primary" />
                  {city}
                </Link>
              ) : (
                <span
                  key={city}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-muted/40 border border-border/30 text-sm text-muted-foreground"
                >
                  <MapPin className="h-3.5 w-3.5" />
                  {city}
                </span>
              );
            })}
          </div>
        </section>

        {/* Browse by Care Level — state-scoped chips. Same set as
            State/City pages but presented in a county context so seekers
            jump to the right state-scoped care page from here too. */}
        <section className="mb-10">
          <div className="mb-5">
            <h2 className="font-display text-xl font-bold text-foreground md:text-2xl">
              Browse by Care Level
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Filter {stateData.abbreviation} treatment programs by the level of care you need
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            {[
              { icon: Sparkles, title: "Detox", desc: "Medical detox, 24/7 supervision", href: `/treatment-types/detox-programs/${stateData.slug}` },
              { icon: Home, title: "Inpatient", desc: "30–90 day residential", href: `/treatment-types/residential-inpatient/${stateData.slug}` },
              { icon: Stethoscope, title: "Outpatient", desc: "PHP, IOP, standard outpatient", href: `/treatment-types/outpatient-programs/${stateData.slug}` },
              { icon: Brain, title: "Dual Diagnosis", desc: "Integrated mental health + addiction", href: `/treatment-types/dual-diagnosis-treatment/${stateData.slug}` },
              { icon: Activity, title: "Alcohol Rehab", desc: "AUD programs across the state", href: `/treatment-types/alcohol-rehabilitation/${stateData.slug}` },
              { icon: Pill, title: "Drug Rehab", desc: "Opioid, stimulant, polysubstance", href: `/treatment-types/drug-addiction/${stateData.slug}` },
            ].map((c) => (
              <Link
                key={c.title}
                to={c.href}
                className="group rounded-xl border bg-card p-5 transition-all hover:border-primary/40 hover:shadow-lg hover:-translate-y-0.5"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 transition-colors group-hover:bg-primary/15">
                    <c.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-foreground leading-tight group-hover:text-primary transition-colors">
                      {c.title}
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{c.desc}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground/40 transition-all group-hover:translate-x-1 group-hover:text-primary" />
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* About + Demographics + Access — consolidated split-pane.
            Replaces the previous prose-heavy "Treatment Overview" +
            "Demographics & Community" + "Access & Transportation"
            stack. Same county-data feeds everything; just framed as
            a polished card. */}
        <section className="mb-10 rounded-2xl border bg-card p-6 md:p-8 shadow-sm">
          <div className="grid gap-8 md:grid-cols-[1.5fr_1fr]">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
                  <Landmark className="h-4 w-4 text-primary" />
                </div>
                <h2 className="font-display text-lg md:text-xl font-bold text-foreground">
                  About {countyData.name} County
                </h2>
              </div>
              <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                {/* De-templated body kept for SEO depth — combines
                    per-state stats + verified-facility count so each
                    of the ~500 indexed county pages renders distinct
                    copy rather than the factory string. */}
                {buildCountyOverview(stateData.slug, stateData.name, countyData.name, countyFacilities.length)}
              </p>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                {countyData.treatmentOverview}
              </p>
            </div>
            <div className="space-y-4 md:border-l md:border-border/60 md:pl-8">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Users className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
                    Demographics
                  </h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {countyData.demographics}
                </p>
              </div>
              <div className="border-t pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <Map className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
                    Access
                  </h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {countyData.accessNotes}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="mb-10 max-w-3xl">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <HelpCircle className="h-6 w-6 text-primary" />
            Frequently Asked Questions — {countyData.name} County, {stateData.abbreviation}
          </h2>
          <div className="space-y-3">
            {countyData.faqs.map((faq, index) => (
              <div key={index} className="border rounded-xl overflow-hidden bg-card">
                <button
                  className="w-full text-left px-5 py-4 flex items-center justify-between gap-3 hover:bg-accent/30 transition-colors"
                  onClick={() => setOpenFAQ(openFAQ === index ? null : index)}
                  aria-expanded={openFAQ === index}
                >
                  <h3 className="font-medium text-sm md:text-base pr-4">{faq.question}</h3>
                  <ChevronDown className={cn(
                    "h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200",
                    openFAQ === index && "rotate-180"
                  )} />
                </button>
                {openFAQ === index && (
                  <div className="px-5 pb-4 text-muted-foreground text-sm leading-relaxed border-t pt-3">
                    {faq.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Internal Links */}
        <section className="mb-10">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Other Counties */}
            {countyLinks.length > 0 && (
              <div>
                <h3 className="text-lg font-bold mb-3">Other Counties in {stateData.name}</h3>
                <div className="grid grid-cols-2 gap-2">
                  {countyLinks.map(link => (
                    <Link
                      key={link.href}
                      to={link.href}
                      className="text-sm text-primary hover:text-primary/80 hover:underline flex items-center gap-1"
                    >
                      <ChevronRight className="h-3 w-3" />
                      {link.title}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Cities in State */}
            <div>
              <h3 className="text-lg font-bold mb-3">Cities in {stateData.name}</h3>
              <div className="grid grid-cols-2 gap-2">
                {cityLinks.map(link => (
                  <Link
                    key={link.href}
                    to={link.href}
                    className="text-sm text-primary hover:text-primary/80 hover:underline flex items-center gap-1"
                  >
                    <ChevronRight className="h-3 w-3" />
                    {link.title}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* State Treatment Guides */}
        {(() => {
          const articles = getStateArticles(stateData.slug);
          if (articles.length === 0) return null;
          return (
            <section className="py-8">
              <h2 className="mb-4 text-lg font-bold text-foreground">{stateData.name} Treatment Guides</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {articles.map(a => (
                  <Link
                    key={a.slug}
                    to={`/rehab-centers/${stateData.slug}/articles/${a.slug}`}
                    className="group rounded-lg border border-border/60 bg-card p-4 hover:border-primary/40 transition-all"
                  >
                    <span className="text-xs font-semibold text-primary uppercase tracking-wider">
                      {a.type === "how-to-find" ? "Guide" : a.type === "cost-of-rehab" ? "Cost" : "Cities"}
                    </span>
                    <p className="mt-1 text-sm font-medium text-foreground group-hover:text-primary transition-colors leading-snug">{a.title}</p>
                  </Link>
                ))}
              </div>
            </section>
          );
        })()}

        {/* Smart Internal Links */}
        <SmartInternalLinks
          pageType="county"
          stateSlug={stateSlug}
          stateName={stateData.name}
          countySlug={countySlug}
        />

        {/* CTA */}
        <section className="rounded-2xl bg-gradient-to-r from-primary to-primary/80 text-primary-foreground p-8 md:p-12 text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-3">
            Find Treatment in {countyData.name} County Today
          </h2>
          <p className="text-lg opacity-90 mb-6 max-w-2xl mx-auto">
            Compare treatment programs in {countyData.name} County, {stateData.abbreviation} side by side, then contact them directly. Free to search, no obligation.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Button asChild size="lg" className="bg-white text-primary hover:bg-white/90 shadow-lg">
              <Link to="/search-results">
                <Search className="mr-2 h-5 w-5" />
                Browse Treatment Centers
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10">
              <a href="tel:1-800-662-4357">
                <Phone className="mr-2 h-5 w-5" />
                Call SAMHSA Helpline
              </a>
            </Button>
          </div>
        </section>
      </div>
    </Layout>
  );
}
