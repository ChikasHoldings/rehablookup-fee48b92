import { Link, Navigate, useLocation } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { SEO, generateNearMeSchema } from "@/components/SEO";
import { NearMeHero } from "@/components/seo/NearMeHero";
import { TrustBar } from "@/components/seo/TrustBar";
import { ConversionSection } from "@/components/seo/ConversionSection";
import { ComparisonSection } from "@/components/seo/ComparisonSection";
import { TreatmentFAQSection } from "@/components/seo/TreatmentFAQSection";
import { ResponsiveListingGrid } from "@/components/listings/ResponsiveListingGrid";
import { SearchResultsLoading } from "@/components/skeletons/SearchResultSkeleton";
import { useStaticFacilities } from "@/hooks/useStaticFacilities";
import { statesData } from "@/data/locationSeoData";
import { getNearMeTypeBySlug } from "@/data/nearMeTypes";
import { Button } from "@/components/ui/button";
import { ArrowRight, MapPin } from "lucide-react";
import {
  InternalLinkingSection,
  treatmentTypeLinks,
  insuranceLinks,
  resourceLinks,
} from "@/components/seo/InternalLinkingSection";
import { useMemo } from "react";

/**
 * Generic city-level near-me page.
 * Pattern: /{nearMeSlug}/{stateSlug}/{citySlug}
 * Rendered from SmartCatchAll — parses path directly.
 */
export default function NearMeCityPage() {
  const { pathname } = useLocation();
  const parts = pathname.split("/").filter(Boolean);
  const nearMeSlug = parts[0] || "";
  const stateSlug = parts[1] || "";
  const citySlug = parts[2] || "";

  const { data: allFacilities = [], isLoading } = useStaticFacilities();

  const nearMeType = getNearMeTypeBySlug(nearMeSlug);
  const stateData = statesData.find((s) => s.slug === stateSlug);
  const cityData = stateData?.cities.find((c) => c.slug === citySlug);

  const facilities = useMemo(() => {
    if (!stateData || !cityData) return [];
    const cityLower = cityData.name.toLowerCase();
    const stateAbbr = stateData.abbreviation.toLowerCase();
    const stateLower = stateData.name.toLowerCase();
    return allFacilities.filter((f) => {
      const fCity = (f.city || "").toLowerCase();
      const fState = (f.state || "").toLowerCase();
      return (
        (fCity === cityLower || fCity.includes(cityLower)) &&
        (fState === stateLower || fState === stateAbbr)
      );
    });
  }, [allFacilities, stateData, cityData]);

  const nearbyCities = useMemo(() => {
    if (!stateData || !cityData) return [];
    return stateData.cities.filter((c) => c.slug !== citySlug).slice(0, 8);
  }, [stateData, cityData, citySlug]);

  if (!nearMeType || !stateData || !cityData) {
    return <Navigate to="/404" replace />;
  }

  const title = `${nearMeType.label} Near Me in ${cityData.name}, ${stateData.abbreviation}`;
  const description = `Find ${nearMeType.label.toLowerCase()} centers in ${cityData.name}, ${stateData.abbreviation}. Compare verified ${nearMeType.treatmentType.toLowerCase()} programs, check insurance, and get help today.`;

  const faqs = [
    {
      question: `How many ${nearMeType.label.toLowerCase()} centers are in ${cityData.name}?`,
      answer: `${cityData.name}, ${stateData.abbreviation} has ${facilities.length || "several"} verified ${nearMeType.treatmentType.toLowerCase()} centers listed on RehabLookup. Availability varies, so we recommend contacting facilities directly or using our concierge service for personalized matching.`,
    },
    {
      question: `Does insurance cover ${nearMeType.label.toLowerCase()} in ${cityData.name}?`,
      answer: `Most health insurance plans, including Medicaid and Medicare, cover ${nearMeType.treatmentType.toLowerCase()} in ${cityData.name}. Coverage varies by plan and provider. Contact the facility directly to verify your specific insurance is accepted.`,
    },
    {
      question: `What should I look for in a ${nearMeType.label.toLowerCase()} center in ${cityData.name}?`,
      answer: `When choosing a ${nearMeType.label.toLowerCase()} center in ${cityData.name}, consider: accreditation and licensing, treatment approaches offered, insurance acceptance, staff qualifications, aftercare planning, and patient reviews.`,
    },
    {
      question: `How do I get started with ${nearMeType.label.toLowerCase()} in ${cityData.name}?`,
      answer: `To start treatment in ${cityData.name}: 1) Browse facilities on this page, 2) Call facilities directly or use our free concierge service, 3) Verify your insurance coverage, 4) Complete an intake assessment, 5) Begin your recovery journey.`,
    },
  ];

  const structuredData = [
    generateNearMeSchema({
      serviceType: nearMeType.treatmentType,
      location: { state: stateData.name, stateAbbr: stateData.abbreviation, city: cityData.name },
      facilityCount: facilities.length,
    }),
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqs.map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: { "@type": "Answer", text: faq.answer },
      })),
    },
  ];

  return (
    <Layout>
      <SEO
        title={`${title} | RehabLookup`}
        description={description}
        canonical={`/${nearMeType.slug}/${stateData.slug}/${cityData.slug}`}
        keywords={[
          `${nearMeType.label.toLowerCase()} ${cityData.name}`,
          `${nearMeType.treatmentType.toLowerCase()} ${cityData.name} ${stateData.abbreviation}`,
          `${nearMeType.label.toLowerCase()} near me ${cityData.name}`,
        ]}
        structuredData={structuredData}
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: nearMeType.label, url: `/${nearMeType.slug}` },
          { name: stateData.name, url: `/${nearMeType.slug}/${stateData.slug}` },
          { name: cityData.name, url: `/${nearMeType.slug}/${stateData.slug}/${cityData.slug}` },
        ]}
      />

      <NearMeHero
        title={title}
        subtitle={description}
        treatmentType={nearMeType.treatmentType}
        location={{ state: stateData.name, stateAbbr: stateData.abbreviation }}
        facilityCount={facilities.length}
      />

      <TrustBar />

      <section className="py-12 bg-background">
        <div className="container">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-foreground">
              {nearMeType.treatmentType} Centers in {cityData.name}, {stateData.abbreviation}
            </h2>
            <p className="mt-2 text-muted-foreground">
              {facilities.length > 0
                ? `Browse ${facilities.length} verified facilities in ${cityData.name}.`
                : `Explore ${nearMeType.treatmentType.toLowerCase()} options near ${cityData.name}. Browse statewide or use our free concierge.`}
            </p>
          </div>

          {isLoading ? (
            <SearchResultsLoading />
          ) : facilities.length > 0 ? (
            <ResponsiveListingGrid facilities={facilities} maxItems={12} />
          ) : (
            <div className="text-center py-12 bg-muted/30 rounded-lg">
              <MapPin className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                No listings in {cityData.name} yet
              </h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                We're expanding our directory. Browse {stateData.name} statewide or use our concierge service.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link to={`/${nearMeType.slug}/${stateData.slug}`}>
                  <Button variant="outline" className="gap-2">
                    View {stateData.name} Centers <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/concierge">
                  <Button className="gap-2">
                    Free Concierge Help <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>

      {nearbyCities.length > 0 && (
        <section className="py-12 bg-muted/30 border-t">
          <div className="container">
            <h2 className="text-2xl font-bold text-foreground mb-6">
              {nearMeType.label} in Nearby Cities
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {nearbyCities.map((city) => (
                <Link
                  key={city.slug}
                  to={`/${nearMeType.slug}/${stateData.slug}/${city.slug}`}
                  className="flex items-center gap-2 p-3 rounded-lg bg-background border hover:border-primary hover:bg-primary/5 transition-all group"
                >
                  <MapPin className="h-4 w-4 text-muted-foreground group-hover:text-primary shrink-0" />
                  <span className="font-medium text-foreground group-hover:text-primary">
                    {nearMeType.label} in {city.name}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Comparison */}
      <ComparisonSection facilities={facilities} location={`${cityData.name}, ${stateData.abbreviation}`} />

      {/* Conversion */}
      <ConversionSection location={`${cityData.name}, ${stateData.abbreviation}`} />

      <InternalLinkingSection
        title="Related Resources"
        description="Explore treatment types, insurance coverage, and recovery guides"
        variant="grid"
        groups={[
          { title: "Treatment Programs", links: treatmentTypeLinks.slice(0, 5) },
          { title: "Insurance Coverage", links: insuranceLinks.slice(0, 5) },
          { title: "Recovery Guides", links: resourceLinks.slice(0, 5) },
        ]}
      />

      <TreatmentFAQSection
        faqs={faqs}
        treatmentType={nearMeType.label}
        location={{ state: stateData.name, city: cityData.name }}
      />
    </Layout>
  );
}
