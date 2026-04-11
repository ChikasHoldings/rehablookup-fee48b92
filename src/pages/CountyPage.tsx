import { useMemo, useState } from "react";
import { useParams, Link, Navigate } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { SEO } from "@/components/SEO";
import { TreatmentCenterCard } from "@/components/cards/TreatmentCenterCard";
import { ResponsiveListingGrid } from "@/components/listings/ResponsiveListingGrid";
import { useStaticFacilities } from "@/hooks/useStaticFacilities";
import { getStateBySlug } from "@/data/locationSeoData";
import { getCountyBySlug, getCountiesForState, getStateCountyData } from "@/data/countySeoData";
import { getStateArticles } from "@/data/stateArticlesData";
import { SearchResultsLoading } from "@/components/skeletons/SearchResultSkeleton";
import { Button } from "@/components/ui/button";
import { BreadcrumbNav } from "@/components/seo/BreadcrumbNav";
import { RelatedLinksSection, defaultInsuranceLinks } from "@/components/seo/RelatedLinksSection";
import {
  MapPin, Building2, ChevronRight, Search, Phone, ArrowRight,
  CheckCircle, Shield, Clock, Star, Heart, ChevronDown, HelpCircle,
  Pill, Brain, Activity, Home, Stethoscope, Sparkles, Users, Map
} from "lucide-react";
import { cn } from "@/lib/utils";

const treatmentTypesData = [
  { icon: Pill, title: "Drug Addiction", link: "/treatment-types", param: "?type=drug" },
  { icon: Activity, title: "Alcohol Rehab", link: "/treatment-types", param: "?type=alcohol" },
  { icon: Brain, title: "Dual Diagnosis", link: "/treatment-types", param: "?type=dual-diagnosis" },
  { icon: Home, title: "Residential Inpatient", link: "/treatment-types", param: "?type=inpatient" },
  { icon: Stethoscope, title: "Outpatient Programs", link: "/treatment-types", param: "?type=outpatient" },
  { icon: Sparkles, title: "Holistic Therapy", link: "/treatment-types", param: "?type=holistic" },
];

export default function CountyPage() {
  const { stateSlug, countySlug } = useParams<{ stateSlug: string; countySlug: string }>();
  const [openFAQ, setOpenFAQ] = useState<number | null>(0);

  const stateData = stateSlug ? getStateBySlug(stateSlug) : undefined;
  const stateCounty = stateSlug ? getStateCountyData(stateSlug) : undefined;
  const countyData = stateSlug && countySlug ? getCountyBySlug(stateSlug, countySlug) : undefined;
  const otherCounties = stateSlug ? getCountiesForState(stateSlug).filter(c => c.slug !== countySlug) : [];

  const { data: approvedFacilities = [], isLoading } = useStaticFacilities();

  // Filter facilities for this county — match by city names within the county
  const countyFacilities = useMemo(() => {
    if (!countyData || !stateData) return [];
    const stateNameLower = stateData.name.toLowerCase();
    const stateAbbrLower = stateData.abbreviation.toLowerCase();
    const countyCities = countyData.majorCities.map(c => c.toLowerCase());

    let filtered = approvedFacilities.filter(f => {
      const stateMatch = f.state.toLowerCase() === stateNameLower || f.state.toLowerCase() === stateAbbrLower;
      const cityMatch = countyCities.some(city => f.city.toLowerCase() === city);
      return stateMatch && cityMatch;
    });

    // Fallback: if fewer than 3, show all state facilities
    if (filtered.length < 3) {
      filtered = approvedFacilities.filter(f =>
        f.state.toLowerCase() === stateNameLower || f.state.toLowerCase() === stateAbbrLower
      );
    }

    return [...filtered].sort((a, b) => {
      const aPro = (a as any).isPro ? 1 : 0;
      const bPro = (b as any).isPro ? 1 : 0;
      if (bPro !== aPro) return bPro - aPro;
      const aScore = (a as any).calculatedRankingScore || 0;
      const bScore = (b as any).calculatedRankingScore || 0;
      if (bScore !== aScore) return bScore - aScore;
      return a.name.localeCompare(b.name);
    }).slice(0, 12);
  }, [approvedFacilities, countyData, stateData]);

  if (!stateData || !countyData || !stateCounty) {
    return <Navigate to="/locations" replace />;
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

      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-primary via-primary/95 to-primary/85 text-primary-foreground overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjAzKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCBmaWxsPSJ1cmwoI2dyaWQpIiB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIi8+PC9zdmc+')] opacity-30" />
        <div className="container mx-auto px-4 py-12 md:py-16 relative z-10">
          <BreadcrumbNav
            items={[
              { label: stateData.name, href: `/rehab-centers/${stateSlug}` },
              { label: `${countyData.name} County` },
            ]}
          />

          <div className="max-w-3xl mt-6">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="h-5 w-5" />
              <span className="text-sm font-medium opacity-90">Verified & Accredited Programs</span>
            </div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mb-4">
              {pageTitle}
            </h1>
            <p className="text-lg md:text-xl opacity-90 mb-6 leading-relaxed">
              {countyData.description}
            </p>
            <div className="flex flex-wrap gap-4">
              <Button asChild size="lg" className="bg-white text-primary hover:bg-white/90 shadow-lg">
                <Link to="/concierge">
                  <Phone className="mr-2 h-5 w-5" />
                  Get Free Placement Help
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10">
                <Link to={`/rehab-centers/${stateSlug}`}>
                  <Search className="mr-2 h-5 w-5" />
                  Browse {stateData.name} Centers
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* County Stats Bar */}
      <section className="bg-muted/30 border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-wrap gap-6 md:gap-10 justify-center text-center">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <div>
                <p className="text-lg font-bold tabular-nums">{countyData.population.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Population</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              <div>
                <p className="text-lg font-bold tabular-nums">{countyFacilities.length}+</p>
                <p className="text-xs text-muted-foreground">Treatment Centers</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              <div>
                <p className="text-lg font-bold">{countyData.seat}</p>
                <p className="text-xs text-muted-foreground">County Seat</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Map className="h-5 w-5 text-primary" />
              <div>
                <p className="text-lg font-bold">{countyData.majorCities.length}</p>
                <p className="text-xs text-muted-foreground">Major Cities</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-10 md:py-14">
        {/* Treatment Overview */}
        <section className="max-w-4xl mb-12">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            Addiction Treatment in {countyData.name} County, {stateData.abbreviation}
          </h2>
          <p className="text-muted-foreground text-lg leading-relaxed mb-6">
            {countyData.treatmentOverview}
          </p>

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div className="bg-card rounded-xl border p-6">
              <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Demographics & Community
              </h3>
              <p className="text-muted-foreground leading-relaxed">{countyData.demographics}</p>
            </div>
            <div className="bg-card rounded-xl border p-6">
              <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                Access & Transportation
              </h3>
              <p className="text-muted-foreground leading-relaxed">{countyData.accessNotes}</p>
            </div>
          </div>
        </section>

        {/* Major Cities */}
        <section className="mb-12">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Map className="h-5 w-5 text-primary" />
            Cities in {countyData.name} County
          </h2>
          <div className="flex flex-wrap gap-2">
            {countyData.majorCities.map(city => {
              const citySlug = city.toLowerCase().replace(/\s+/g, "-");
              const cityExists = stateData.cities.some(c => c.slug === citySlug);
              return cityExists ? (
                <Link
                  key={city}
                  to={`/rehab-centers/${stateSlug}/${citySlug}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/5 hover:bg-primary/10 border border-primary/10 text-sm font-medium transition-colors"
                >
                  <MapPin className="h-3.5 w-3.5 text-primary" />
                  {city}
                </Link>
              ) : (
                <span
                  key={city}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted text-sm text-muted-foreground"
                >
                  <MapPin className="h-3.5 w-3.5" />
                  {city}
                </span>
              );
            })}
          </div>
        </section>

        {/* Facilities */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl md:text-3xl font-bold">
              Treatment Centers in {countyData.name} County
            </h2>
            <Link
              to={`/rehab-centers/${stateSlug}`}
              className="text-primary hover:text-primary/80 text-sm font-medium flex items-center gap-1"
            >
              View all in {stateData.name} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {isLoading ? (
            <SearchResultsLoading />
          ) : countyFacilities.length > 0 ? (
            <ResponsiveListingGrid facilities={countyFacilities} />
          ) : (
            <div className="text-center py-12 bg-card rounded-xl border">
              <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Limited Listings Available</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                We're expanding our directory in {countyData.name} County. Browse facilities across {stateData.name} or get personalized placement help.
              </p>
              <div className="flex flex-wrap gap-3 justify-center">
                <Button asChild>
                  <Link to={`/rehab-centers/${stateSlug}`}>Browse {stateData.name}</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link to="/concierge">Free Placement Help</Link>
                </Button>
              </div>
            </div>
          )}
        </section>

        {/* Treatment Types */}
        <section className="mb-12">
          <h2 className="text-xl font-bold mb-4">Types of Treatment Available</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {treatmentTypesData.map(type => (
              <Link
                key={type.title}
                to={`${type.link}${type.param}`}
                className="flex flex-col items-center gap-2 p-4 rounded-xl border bg-card hover:bg-accent/50 transition-colors text-center group"
              >
                <type.icon className="h-6 w-6 text-primary group-hover:scale-110 transition-transform" />
                <span className="text-sm font-medium">{type.title}</span>
              </Link>
            ))}
          </div>
        </section>

        {/* FAQ Section */}
        <section className="mb-12 max-w-3xl">
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
        <section className="mb-12">
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

        {/* CTA */}
        <section className="rounded-2xl bg-gradient-to-r from-primary to-primary/80 text-primary-foreground p-8 md:p-12 text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-3">
            Find Treatment in {countyData.name} County Today
          </h2>
          <p className="text-lg opacity-90 mb-6 max-w-2xl mx-auto">
            Our concierge team will match you with the best treatment programs in {countyData.name} County, {stateData.abbreviation}. Confidential. No obligation.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Button asChild size="lg" className="bg-white text-primary hover:bg-white/90 shadow-lg">
              <Link to="/concierge">
                <Phone className="mr-2 h-5 w-5" />
                Get Free Placement Help
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
