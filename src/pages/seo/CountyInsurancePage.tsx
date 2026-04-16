import { useMemo } from "react";
import { Navigate, useParams } from "react-router-dom";
import { SEOLandingTemplate } from "@/components/seo/SEOLandingTemplate";
import { useStaticFacilities } from "@/hooks/useStaticFacilities";
import { treatmentCenters } from "@/data/treatmentCenters";
import { getStateBySlug } from "@/data/locationSeoData";
import { getCountyBySlug } from "@/data/countySeoData";
import { insurerConfigs } from "@/data/seoInsuranceStateConfig";
import { SmartInternalLinks } from "@/components/seo/SmartInternalLinks";
import { shouldEmitFAQSchema, validatePage, getFacilityDensity } from "@/utils/seoPageValidator";

export default function CountyInsurancePage() {
  const { slug, stateSlug, countySlug } = useParams<{
    slug: string;
    stateSlug: string;
    countySlug: string;
  }>();

  const { data: approvedFacilities = [], isLoading } = useStaticFacilities();

  const insurer = useMemo(() => insurerConfigs.find((i) => i.slug === slug) || null, [slug]);
  const stateData = useMemo(() => (stateSlug ? getStateBySlug(stateSlug) : undefined), [stateSlug]);
  const countyData = useMemo(() => (stateSlug && countySlug ? getCountyBySlug(stateSlug, countySlug) : undefined), [stateSlug, countySlug]);

  const facilities = useMemo(() => {
    if (!stateData || !countyData || !insurer) return [];
    const allFacilities = [...treatmentCenters, ...approvedFacilities];
    const stateNameLower = stateData.name.toLowerCase();
    const stateAbbrLower = stateData.abbreviation.toLowerCase();
    const countyCities = countyData.majorCities.map((c) => c.toLowerCase());
    const insurerLower = insurer.name.toLowerCase();

    let filtered = allFacilities.filter((f) => {
      const stateMatch = f.state.toLowerCase() === stateNameLower || f.state.toLowerCase() === stateAbbrLower;
      const cityMatch = countyCities.some((city) => f.city.toLowerCase() === city);
      const insuranceMatch = f.insurance?.some((ins) => ins.toLowerCase().includes(insurerLower)) || f.description?.toLowerCase().includes(insurerLower);
      return stateMatch && cityMatch && insuranceMatch;
    });

    if (filtered.length < 3) {
      filtered = allFacilities.filter((f) => {
        const stateMatch = f.state.toLowerCase() === stateNameLower || f.state.toLowerCase() === stateAbbrLower;
        const cityMatch = countyCities.some((city) => f.city.toLowerCase() === city);
        return stateMatch && cityMatch;
      });
    }

    return [...filtered]
      .sort((a, b) => {
        const aPro = (a as any).isPro ? 1 : 0;
        const bPro = (b as any).isPro ? 1 : 0;
        if (bPro !== aPro) return bPro - aPro;
        if ((a.featured ? 1 : 0) !== (b.featured ? 1 : 0)) return (b.featured ? 1 : 0) - (a.featured ? 1 : 0);
        return a.name.localeCompare(b.name);
      })
      .slice(0, 12);
  }, [approvedFacilities, stateData, countyData, insurer]);

  if (!insurer || !stateData || !countyData) {
    return <Navigate to="/insurance" replace />;
  }

  const pageTitle = `${insurer.name} Rehab Coverage in ${countyData.name} County, ${stateData.abbreviation}`;
  const density = getFacilityDensity(facilities.length);
  const validation = validatePage("county-treatment", facilities.length);
  const cityList = countyData.majorCities.slice(0, 4).join(", ");

  const faqs = [
    {
      question: `Does ${insurer.name} cover rehab in ${countyData.name} County, ${stateData.abbreviation}?`,
      answer: `Yes, ${insurer.name} generally covers substance abuse treatment in ${countyData.name} County, ${stateData.name} under federal mental health parity laws. Coverage includes medical detox, inpatient rehab, outpatient programs, and medication-assisted treatment. Contact facilities in the ${cityList} area to verify your specific ${insurer.name} plan benefits.`,
    },
    {
      question: `How do I find ${insurer.name}-accepting rehab centers in ${countyData.name} County?`,
      answer: `Use RehabLookup to search verified treatment centers in ${countyData.name} County that accept ${insurer.name}. You can filter by treatment type, compare facilities in ${cityList}, and verify insurance coverage directly with admissions teams. Our concierge service can also match you with in-network ${insurer.name} providers.`,
    },
    {
      question: `What types of treatment does ${insurer.name} cover in ${stateData.name}?`,
      answer: `${insurer.name} typically covers medical detoxification, residential inpatient treatment, partial hospitalization (PHP), intensive outpatient programs (IOP), outpatient counseling, and medication-assisted treatment (MAT) in ${stateData.name}. Coverage levels vary by plan — ${countyData.name} County residents should verify benefits before admission.`,
    },
  ];

  const structuredData: any[] = [
    {
      "@context": "https://schema.org",
      "@type": "MedicalWebPage",
      name: pageTitle,
      description: `Find ${insurer.name}-accepting rehab centers in ${countyData.name} County, ${stateData.name}.`,
      url: `https://rehablookup.com/insurance/${slug}/${stateSlug}/county/${countySlug}`,
      specialty: "Addiction Medicine",
      lastReviewed: new Date().toISOString().split("T")[0],
    },
  ];

  if (shouldEmitFAQSchema(faqs)) {
    structuredData.push({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqs.map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: { "@type": "Answer", text: faq.answer },
      })),
    });
  }

  return (
    <SEOLandingTemplate
      title={pageTitle}
      metaTitle={`${insurer.name} Rehab Centers in ${countyData.name} County, ${stateData.abbreviation} | RehabLookup`}
      metaDescription={`Find ${insurer.name}-accepting rehab centers in ${countyData.name} County, ${stateData.name}. Compare ${facilities.length}+ verified facilities, check coverage, get help today.`}
      canonical={`https://rehablookup.com/insurance/${slug}/${stateSlug}/county/${countySlug}`}
      noindex={!validation.shouldIndex}
      structuredData={structuredData}
      breadcrumbs={[
        { name: "Home", url: "/" },
        { name: "Insurance", url: "/insurance" },
        { name: insurer.name, url: `/insurance/${slug}` },
        { name: stateData.name, url: `/insurance/${slug}/${stateSlug}` },
        { name: `${countyData.name} County`, url: `/insurance/${slug}/${stateSlug}/county/${countySlug}` },
      ]}
      heroTitle={pageTitle}
      heroSubtitle={`Find verified treatment centers in ${countyData.name} County that accept ${insurer.name} insurance.`}
      heroLocation={`${countyData.name} County, ${stateData.name}`}
      heroBadge={`${insurer.name} Coverage`}
      introContent={`Looking for rehab centers in ${countyData.name} County, ${stateData.name} that accept ${insurer.name}? RehabLookup connects you with verified treatment facilities serving ${cityList} and surrounding areas. ${density === "high" ? `${countyData.name} County has strong access to ${insurer.name}-accepting programs.` : density === "moderate" ? `${countyData.name} County offers several ${insurer.name}-accepting options.` : `While local options may be limited, nearby ${stateData.name} facilities provide accessible ${insurer.name}-covered treatment.`}`}
      sections={[
        {
          heading: `${insurer.name} Coverage in ${countyData.name} County`,
          content: `${insurer.name} insurance plans generally cover substance abuse treatment in ${countyData.name} County under the Mental Health Parity and Addiction Equity Act. Coverage typically includes medical detox, residential treatment, PHP, IOP, and outpatient counseling. ${countyData.population && countyData.population > 100000 ? `With over ${Math.round(countyData.population / 1000)}K residents, ${countyData.name} County has multiple ${insurer.name}-accepting facilities.` : `${countyData.name} County residents can access ${insurer.name}-covered treatment both locally and across ${stateData.name}.`}`,
        },
        {
          heading: `Verifying ${insurer.name} Benefits`,
          content: `Before starting treatment in ${countyData.name} County, verify your ${insurer.name} benefits by calling the number on the back of your insurance card, using ${insurer.name}'s online member portal, or contacting facility admissions teams directly. Key questions: Is the facility in-network? What is my deductible? Are there prior authorization requirements? What copay or coinsurance applies?`,
        },
      ]}
      facilities={facilities}
      isLoading={isLoading}
      facilityCount={facilities.length}
      showMoreLink={`/rehab-centers/${stateSlug}/county/${countySlug}`}
      faqs={faqs}
      faqTreatmentType={insurer.name}
      faqLocation={{ state: stateData.name }}
      relatedCityLinks={countyData.majorCities.slice(0, 6).map((city) => ({
        title: `${insurer.name} Rehab in ${city}`,
        href: `/insurance/${slug}/${stateSlug}/${city.toLowerCase().replace(/\s+/g, "-")}`,
      }))}
      relatedStateLinks={insurerConfigs
        .filter((i) => i.slug !== slug)
        .slice(0, 5)
        .map((i) => ({
          title: `${i.name} in ${countyData.name} County`,
          href: `/insurance/${i.slug}/${stateSlug}/county/${countySlug}`,
        }))}
      showInsuranceLinks
      ctaTitle={`Find ${insurer.name} Rehab in ${countyData.name} County`}
      ctaSubtitle={`Our team will match you with ${insurer.name}-accepting programs in ${countyData.name} County, ${stateData.abbreviation}. Free and confidential.`}
    >
      <SmartInternalLinks
        pageType="county"
        stateSlug={stateSlug}
        stateName={stateData.name}
        countySlug={countySlug}
      />
    </SEOLandingTemplate>
  );
}
