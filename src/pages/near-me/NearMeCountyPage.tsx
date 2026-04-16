import { useParams, Link, Navigate } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { SEO, generateNearMeSchema } from "@/components/SEO";
import { NearMeHero } from "@/components/seo/NearMeHero";
import { TreatmentFAQSection } from "@/components/seo/TreatmentFAQSection";
import { ResponsiveListingGrid } from "@/components/listings/ResponsiveListingGrid";
import { SearchResultsLoading } from "@/components/skeletons/SearchResultSkeleton";
import { useStaticFacilities } from "@/hooks/useStaticFacilities";
import { getCountyBySlug, getStateCounties } from "@/data/countySeoData";
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
 * Generic county-level near-me page.
 * Route: /:nearMeSlug/:stateSlug/county/:countySlug
 * e.g. /drug-rehab-near-me/florida/county/miami-dade
 */
export default function NearMeCountyPage() {
  const { nearMeSlug, stateSlug, countySlug } = useParams<{
    nearMeSlug: string;
    stateSlug: string;
    countySlug: string;
  }>();

  const { data: allFacilities = [], isLoading } = useStaticFacilities();

  const nearMeType = nearMeSlug ? getNearMeTypeBySlug(nearMeSlug) : undefined;
  const stateInfo = statesData.find((s) => s.slug === stateSlug);
  const countyData = stateSlug && countySlug ? getCountyBySlug(stateSlug, countySlug) : undefined;
  const stateCounties = stateSlug ? getStateCounties(stateSlug) : [];

  const facilities = useMemo(() => {
    if (!stateInfo || !countyData) return [];
    const countyLower = countyData.name.toLowerCase();
    const stateLower = stateInfo.name.toLowerCase();
    const stateAbbr = stateInfo.abbreviation.toLowerCase();
    // Match facilities in the county's cities
    const countyCities = countyData.majorCities.map((c) => c.toLowerCase());
    return allFacilities.filter((f) => {
      const fCity = (f.city || "").toLowerCase();
      const fState = (f.state || "").toLowerCase();
      const inState = fState === stateLower || fState === stateAbbr;
      return inState && countyCities.some((cc) => fCity.includes(cc) || cc.includes(fCity));
    });
  }, [allFacilities, stateInfo, countyData]);

  const nearbyCounties = useMemo(() => {
    if (!countySlug) return [];
    return stateCounties.filter((c) => c.slug !== countySlug).slice(0, 6);
  }, [stateCounties, countySlug]);

  if (!nearMeType || !stateInfo || !countyData) {
    return <Navigate to="/404" replace />;
  }

  const countyName = `${countyData.name} County`;
  const title = `${nearMeType.label} Near Me in ${countyName}, ${stateInfo.abbreviation}`;
  const description = `Find ${nearMeType.label.toLowerCase()} centers in ${countyName}, ${stateInfo.abbreviation}. Compare verified ${nearMeType.treatmentType.toLowerCase()} programs serving ${countyData.majorCities.join(", ")}.`;

  const faqs = [
    {
      question: `How many ${nearMeType.label.toLowerCase()} centers serve ${countyName}?`,
      answer: `${countyName}, ${stateInfo.abbreviation} has ${facilities.length || "several"} verified ${nearMeType.treatmentType.toLowerCase()} centers serving residents across ${countyData.majorCities.slice(0, 5).join(", ")} and surrounding communities.`,
    },
    {
      question: `Does insurance cover ${nearMeType.label.toLowerCase()} in ${countyName}?`,
      answer: `Yes, most health insurance plans cover ${nearMeType.treatmentType.toLowerCase()} in ${countyName}, ${stateInfo.abbreviation}. This includes Medicaid, Medicare, and most private insurance. Verify your specific coverage with the facility.`,
    },
    {
      question: `What cities in ${countyName} have ${nearMeType.label.toLowerCase()} centers?`,
      answer: `${nearMeType.treatmentType} centers in ${countyName} serve communities including ${countyData.majorCities.join(", ")}. The county seat is ${countyData.seat}.`,
    },
  ];

  const structuredData = [
    generateNearMeSchema({
      serviceType: nearMeType.treatmentType,
      location: { state: stateInfo.name, stateAbbr: stateInfo.abbreviation },
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
        canonical={`/${nearMeType.slug}/${stateInfo.slug}/county/${countyData.slug}`}
        keywords={[
          `${nearMeType.label.toLowerCase()} ${countyName}`,
          `${nearMeType.treatmentType.toLowerCase()} ${countyName} ${stateInfo.abbreviation}`,
          `rehab ${countyName}`,
        ]}
        structuredData={structuredData}
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: nearMeType.label, url: `/${nearMeType.slug}` },
          { name: stateInfo.name, url: `/${nearMeType.slug}/${stateInfo.slug}` },
          { name: countyName, url: `/${nearMeType.slug}/${stateInfo.slug}/county/${countyData.slug}` },
        ]}
      />

      <NearMeHero
        title={title}
        subtitle={description}
        treatmentType={nearMeType.treatmentType}
        location={{ state: stateInfo.name, stateAbbr: stateInfo.abbreviation }}
        facilityCount={facilities.length}
      />

      <section className="py-12 bg-background">
        <div className="container">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-foreground">
              {nearMeType.treatmentType} in {countyName}, {stateInfo.abbreviation}
            </h2>
            <p className="mt-2 text-muted-foreground">
              {facilities.length > 0
                ? `Browse ${facilities.length} verified facilities serving ${countyName}.`
                : `Explore ${nearMeType.treatmentType.toLowerCase()} options in ${countyName}. Browse statewide facilities or use our free concierge service.`}
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
                No listings in {countyName} yet
              </h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                We're expanding our directory. Browse {stateInfo.name} statewide or use our concierge.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link to={`/${nearMeType.slug}/${stateInfo.slug}`}>
                  <Button variant="outline" className="gap-2">
                    View {stateInfo.name} <ArrowRight className="h-4 w-4" />
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

      {nearbyCounties.length > 0 && (
        <section className="py-12 bg-muted/30 border-t">
          <div className="container">
            <h2 className="text-2xl font-bold text-foreground mb-6">
              {nearMeType.label} in Nearby Counties
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
              {nearbyCounties.map((county) => (
                <Link
                  key={county.slug}
                  to={`/${nearMeType.slug}/${stateInfo.slug}/county/${county.slug}`}
                  className="flex items-center gap-2 p-3 rounded-lg bg-background border hover:border-primary hover:bg-primary/5 transition-all group"
                >
                  <MapPin className="h-4 w-4 text-muted-foreground group-hover:text-primary shrink-0" />
                  <span className="font-medium text-foreground group-hover:text-primary">
                    {county.name} County
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

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
        location={{ state: stateInfo.name }}
      />
    </Layout>
  );
}
