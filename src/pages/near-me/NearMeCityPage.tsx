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
 * Generate unique FAQs based on treatment type category to avoid duplicate FAQ content.
 */
function generateCityFAQs(
  label: string,
  treatmentType: string,
  cityName: string,
  stateAbbr: string,
  facilityCount: number,
  slug: string
) {
  const base = [
    {
      question: `How many ${label.toLowerCase()} centers are in ${cityName}, ${stateAbbr}?`,
      answer: `There are currently ${facilityCount || "several"} verified ${treatmentType.toLowerCase()} providers in ${cityName}, ${stateAbbr} listed on RehabLookup. New facilities are added regularly as they complete our verification process.`,
    },
  ];

  // Add intent-specific FAQs to differentiate pages
  if (slug.includes("emergency") || slug.includes("same-day") || slug.includes("immediate") || slug.includes("24-7")) {
    base.push(
      { question: `Can I get same-day admission to rehab in ${cityName}?`, answer: `Many treatment centers in ${cityName} offer same-day or next-day admission for urgent cases. Call facilities directly or use our concierge service for immediate placement assistance.` },
      { question: `What should I do in an addiction emergency in ${cityName}?`, answer: `For immediate danger, call 911. For urgent treatment needs, contact our 24/7 concierge service or call SAMHSA's helpline at 1-800-662-4357. Several ${cityName} facilities accept walk-ins for crisis situations.` }
    );
  } else if (slug.includes("free") || slug.includes("affordable") || slug.includes("low-cost") || slug.includes("medicaid")) {
    base.push(
      { question: `How can I afford rehab in ${cityName} without insurance?`, answer: `${cityName} has several options: state-funded programs, non-profit facilities, sliding-scale fee centers, and SAMHSA grant-funded treatment. Our concierge team can help identify no-cost options near you.` },
      { question: `Does Medicaid cover rehab in ${cityName}, ${stateAbbr}?`, answer: `Yes, Medicaid covers substance abuse treatment in ${stateAbbr}. Coverage includes detox, inpatient, outpatient, and medication-assisted treatment. Not all facilities accept Medicaid — verify with each provider.` }
    );
  } else if (slug.includes("womens") || slug.includes("mens") || slug.includes("teen") || slug.includes("veterans") || slug.includes("lgbtq") || slug.includes("senior")) {
    base.push(
      { question: `Why choose a specialized ${label.toLowerCase()} program in ${cityName}?`, answer: `Specialized programs address the unique challenges, trauma patterns, and social dynamics specific to their demographic. This targeted approach often leads to better engagement and long-term recovery outcomes.` },
      { question: `What specialized services do ${label.toLowerCase()} programs offer?`, answer: `Programs typically include gender-specific or demographic-specific group therapy, specialized trauma processing, peer support from people with shared experiences, and tailored aftercare planning.` }
    );
  } else if (slug.includes("insurance") || slug.includes("blue-cross") || slug.includes("aetna") || slug.includes("cigna") || slug.includes("united") || slug.includes("tricare") || slug.includes("humana")) {
    base.push(
      { question: `How do I verify my insurance covers ${label.toLowerCase()} in ${cityName}?`, answer: `Contact the treatment facility directly with your insurance card, or use our free insurance verification tool. Ask about in-network vs out-of-network benefits, pre-authorization requirements, and covered levels of care.` },
      { question: `What does insurance typically cover for ${treatmentType.toLowerCase()}?`, answer: `Most plans cover medical detox, inpatient/residential treatment, outpatient programs, medication-assisted treatment, and counseling. Coverage duration and copays vary by plan and provider.` }
    );
  } else if (slug.includes("detox")) {
    base.push(
      { question: `How long does detox take in ${cityName}?`, answer: `Medical detox typically lasts 3–10 days depending on the substance, severity of use, and individual health. ${cityName} detox centers provide 24/7 medical monitoring and medication management during withdrawal.` },
      { question: `Is medical detox in ${cityName} safe?`, answer: `Yes, medically supervised detox is the safest way to manage withdrawal. Trained medical staff monitor vital signs and administer medications to prevent dangerous complications like seizures.` }
    );
  } else {
    base.push(
      { question: `Does insurance cover ${label.toLowerCase()} in ${cityName}?`, answer: `Most health insurance plans cover ${treatmentType.toLowerCase()} in ${cityName} under the Mental Health Parity Act. This includes Medicaid, Medicare, and most private insurance. Verify coverage with the specific facility.` },
      { question: `How do I choose a ${label.toLowerCase()} center in ${cityName}?`, answer: `Look for accreditation (CARF or Joint Commission), verify licensing, check insurance acceptance, review treatment approaches, and consider location and aftercare planning. Our free concierge can help match you.` }
    );
  }

  return base;
}

export default function NearMeCityPage() {
  const { pathname } = useLocation();
  const parts = pathname.split("/").filter(Boolean);
  const rawNearMeSlug = parts[0] || "";
  const stateSlug = parts[1] || "";
  const citySlug = parts[2] || "";

  const { data: allFacilities = [], isLoading } = useStaticFacilities();

  // Handle legacy slug redirects
  const canonicalSlug = getCanonicalNearMeSlug(rawNearMeSlug);
  const nearMeType = getNearMeTypeBySlug(rawNearMeSlug);
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

  // If using a legacy slug, redirect to canonical URL
  if (canonicalSlug !== rawNearMeSlug) {
    return <Navigate to={`/${canonicalSlug}/${stateSlug}/${citySlug}`} replace />;
  }

  const title = `${nearMeType.label} Near Me in ${cityData.name}, ${stateData.abbreviation}`;
  const description = `Find ${nearMeType.label.toLowerCase()} centers in ${cityData.name}, ${stateData.abbreviation}. Compare verified ${nearMeType.treatmentType.toLowerCase()} programs, check insurance, and get help today.`;

  // Unique FAQs based on treatment category (not template-swapped)
  const faqs = generateCityFAQs(
    nearMeType.label,
    nearMeType.treatmentType,
    cityData.name,
    stateData.abbreviation,
    facilities.length,
    nearMeType.slug
  );

  // Thin page protection: noindex when no direct facilities AND no nearby cities
  // (matches our seoPageValidator policy for substance/demographic-city combos —
  // generic listings without local inventory are the source of "Crawled - not indexed")
  const isThinPage = facilities.length === 0;

  const canonicalUrl = `/${canonicalSlug}/${stateData.slug}/${cityData.slug}`;

  const structuredData = [
    generateNearMeSchema({
      serviceType: nearMeType.treatmentType,
      location: { state: stateData.name, stateAbbr: stateData.abbreviation, city: cityData.name },
      facilityCount: facilities.length,
    }),
    // Only include FAQPage schema if we have unique, substantive FAQs
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
          `${nearMeType.label.toLowerCase()} ${cityData.name}`,
          `${nearMeType.treatmentType.toLowerCase()} ${cityData.name} ${stateData.abbreviation}`,
          `${nearMeType.label.toLowerCase()} near me ${cityData.name}`,
        ]}
        structuredData={structuredData}
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: nearMeType.label, url: `/${nearMeType.slug}` },
          { name: stateData.name, url: `/${nearMeType.slug}/${stateData.slug}` },
          { name: cityData.name, url: canonicalUrl },
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
                We're expanding our directory. Browse {stateData.name} statewide or use our concierge service for personalized matching.
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

      {/* Comparison — only if we have enough facilities */}
      <ComparisonSection facilities={facilities} location={`${cityData.name}, ${stateData.abbreviation}`} />

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
