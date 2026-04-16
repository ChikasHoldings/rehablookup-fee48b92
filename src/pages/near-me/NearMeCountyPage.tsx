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
import { getCountyBySlug, getStateCounties } from "@/data/countySeoData";
import { statesData } from "@/data/locationSeoData";
import { getNearMeTypeBySlug, getCanonicalNearMeSlug } from "@/data/nearMeTypes";
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
 * Generate unique county-specific FAQs based on treatment category.
 */
function generateCountyFAQs(
  label: string,
  treatmentType: string,
  countyName: string,
  stateAbbr: string,
  facilityCount: number,
  majorCities: string[],
  seat: string,
  slug: string
) {
  const faqs = [
    {
      question: `How many ${label.toLowerCase()} centers serve ${countyName}?`,
      answer: `${countyName}, ${stateAbbr} has ${facilityCount || "several"} verified ${treatmentType.toLowerCase()} centers serving residents across ${majorCities.slice(0, 4).join(", ")} and surrounding communities.`,
    },
    {
      question: `Which cities in ${countyName} have ${label.toLowerCase()} options?`,
      answer: `${treatmentType} centers in ${countyName} serve ${majorCities.join(", ")}. The county seat is ${seat}, which often has the most treatment options.`,
    },
  ];

  // Category-specific unique FAQ
  if (slug.includes("emergency") || slug.includes("same-day") || slug.includes("immediate")) {
    faqs.push({
      question: `Can I get emergency rehab admission in ${countyName}?`,
      answer: `Several treatment centers in ${countyName} offer urgent or same-day admission. For immediate help, call our concierge or SAMHSA's helpline at 1-800-662-4357.`,
    });
  } else if (slug.includes("free") || slug.includes("affordable") || slug.includes("low-cost") || slug.includes("medicaid")) {
    faqs.push({
      question: `Are there free or low-cost rehab options in ${countyName}?`,
      answer: `Yes, ${countyName} has state-funded and non-profit treatment programs. Many accept Medicaid and offer sliding-scale fees. Our concierge team can help identify affordable options.`,
    });
  } else {
    faqs.push({
      question: `Does insurance cover ${label.toLowerCase()} in ${countyName}?`,
      answer: `Most insurance plans cover ${treatmentType.toLowerCase()} in ${countyName}, ${stateAbbr}. This includes Medicaid, Medicare, and private insurance. Verify with each facility.`,
    });
  }

  return faqs;
}

export default function NearMeCountyPage() {
  const { pathname } = useLocation();
  const parts = pathname.split("/").filter(Boolean);
  const rawNearMeSlug = parts[0] || "";
  const stateSlug = parts[1] || "";
  const countySlug = parts[3] || ""; // parts[2] is "county"

  const { data: allFacilities = [], isLoading } = useStaticFacilities();

  const canonicalSlug = getCanonicalNearMeSlug(rawNearMeSlug);
  const nearMeType = getNearMeTypeBySlug(rawNearMeSlug);
  const stateInfo = statesData.find((s) => s.slug === stateSlug);
  const countyData = getCountyBySlug(stateSlug, countySlug);
  const stateCounties = getStateCounties(stateSlug);

  const facilities = useMemo(() => {
    if (!stateInfo || !countyData) return [];
    const stateLower = stateInfo.name.toLowerCase();
    const stateAbbr = stateInfo.abbreviation.toLowerCase();
    const countyCities = countyData.majorCities.map((c) => c.toLowerCase());
    return allFacilities.filter((f) => {
      const fCity = (f.city || "").toLowerCase();
      const fState = (f.state || "").toLowerCase();
      const inState = fState === stateLower || fState === stateAbbr;
      return inState && countyCities.some((cc) => fCity.includes(cc) || cc.includes(fCity));
    });
  }, [allFacilities, stateInfo, countyData]);

  const nearbyCounties = useMemo(() => {
    return stateCounties.filter((c) => c.slug !== countySlug).slice(0, 6);
  }, [stateCounties, countySlug]);

  if (!nearMeType || !stateInfo || !countyData) {
    return <Navigate to="/404" replace />;
  }

  // Legacy slug redirect
  if (canonicalSlug !== rawNearMeSlug) {
    return <Navigate to={`/${canonicalSlug}/${stateSlug}/county/${countySlug}`} replace />;
  }

  const countyName = `${countyData.name} County`;
  const title = `${nearMeType.label} Near Me in ${countyName}, ${stateInfo.abbreviation}`;
  const description = `Find ${nearMeType.label.toLowerCase()} centers in ${countyName}, ${stateInfo.abbreviation}. Compare verified ${nearMeType.treatmentType.toLowerCase()} programs serving ${countyData.majorCities.slice(0, 3).join(", ")}.`;

  // Unique FAQs per category
  const faqs = generateCountyFAQs(
    nearMeType.label,
    nearMeType.treatmentType,
    countyName,
    stateInfo.abbreviation,
    facilities.length,
    countyData.majorCities,
    countyData.seat,
    nearMeType.slug
  );

  // Thin page: noindex if truly empty
  const isThinPage = facilities.length === 0 && nearbyCounties.length === 0;
  const canonicalUrl = `/${canonicalSlug}/${stateInfo.slug}/county/${countyData.slug}`;

  const structuredData = [
    generateNearMeSchema({
      serviceType: nearMeType.treatmentType,
      location: { state: stateInfo.name, stateAbbr: stateInfo.abbreviation },
      facilityCount: facilities.length,
    }),
    ...(faqs.length >= 2
      ? [{
          "@context": "https://schema.org" as const,
          "@type": "FAQPage" as const,
          mainEntity: faqs.map((faq) => ({
            "@type": "Question" as const,
            name: faq.question,
            acceptedAnswer: { "@type": "Answer" as const, text: faq.answer },
          })),
        }]
      : []),
  ];

  return (
    <Layout>
      <SEO
        title={`${title} | RehabLookup`}
        description={description}
        canonical={canonicalUrl}
        noindex={isThinPage}
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
          { name: countyName, url: canonicalUrl },
        ]}
      />

      <NearMeHero
        title={title}
        subtitle={description}
        treatmentType={nearMeType.treatmentType}
        location={{ state: stateInfo.name, stateAbbr: stateInfo.abbreviation }}
        facilityCount={facilities.length}
      />

      <TrustBar />

      <section className="py-12 bg-background">
        <div className="container">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-foreground">
              {nearMeType.treatmentType} in {countyName}, {stateInfo.abbreviation}
            </h2>
            <p className="mt-2 text-muted-foreground">
              {facilities.length > 0
                ? `Browse ${facilities.length} verified facilities serving ${countyName}.`
                : `Explore ${nearMeType.treatmentType.toLowerCase()} options in ${countyName}. Browse statewide or use our free concierge service.`}
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

      <ComparisonSection facilities={facilities} location={`${countyName}, ${stateInfo.abbreviation}`} />
      <ConversionSection location={`${countyName}, ${stateInfo.abbreviation}`} />

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
