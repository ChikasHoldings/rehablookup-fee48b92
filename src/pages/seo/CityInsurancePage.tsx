import { useMemo } from "react";
import { Navigate, useParams } from "react-router-dom";
import { SEOLandingTemplate } from "@/components/seo/SEOLandingTemplate";
import { useStaticFacilities } from "@/hooks/useStaticFacilities";
import { treatmentCenters } from "@/data/treatmentCenters";
import { SmartInternalLinks } from "@/components/seo/SmartInternalLinks";
import { shouldEmitFAQSchema, validatePage, getFacilityDensity } from "@/utils/seoPageValidator";
import {
  insurerConfigs,
  stateInsuranceConfigs,
} from "@/data/seoInsuranceStateConfig";
import { statesData } from "@/data/locationSeoData";

export default function CityInsurancePage() {
  const { insurerSlug, stateSlug, citySlug } = useParams<{
    insurerSlug: string;
    stateSlug: string;
    citySlug: string;
  }>();

  const { data: approvedFacilities = [], isLoading } = useStaticFacilities();

  const insurer = useMemo(() => insurerConfigs.find((i) => i.slug === insurerSlug) || null, [insurerSlug]);
  const stateConfig = useMemo(() => stateInsuranceConfigs.find((s) => s.slug === stateSlug) || null, [stateSlug]);
  const stateData = useMemo(() => statesData.find((s) => s.slug === stateSlug) || null, [stateSlug]);

  const cityName = useMemo(() => {
    if (!citySlug) return null;
    return citySlug
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  }, [citySlug]);

  const facilities = useMemo(() => {
    if (!insurer || !stateConfig || !cityName) return [];
    const allFacilities = [...treatmentCenters, ...approvedFacilities];
    const cityLower = cityName.toLowerCase();
    const stateLower = stateConfig.state.toLowerCase();
    const insurerLower = insurer.name.toLowerCase();

    // City + insurer match
    const exact = allFacilities.filter((f) => {
      const cityMatch = f.city.toLowerCase() === cityLower;
      const stateMatch = f.state.toLowerCase() === stateLower;
      const insMatch = f.insuranceAccepted?.some((i) => i.toLowerCase().includes(insurerLower));
      return cityMatch && stateMatch && insMatch;
    });

    if (exact.length >= 3) return exact.slice(0, 12);

    // Fallback: city + state (no insurer filter)
    const cityFallback = allFacilities.filter((f) => {
      const cityMatch = f.city.toLowerCase() === cityLower;
      const stateMatch = f.state.toLowerCase() === stateLower;
      return cityMatch && stateMatch;
    });

    if (cityFallback.length >= 3) return cityFallback.slice(0, 12);

    // Fallback: state + insurer
    return allFacilities
      .filter((f) => {
        const stateMatch = f.state.toLowerCase() === stateLower;
        const insMatch = f.insuranceAccepted?.some((i) => i.toLowerCase().includes(insurerLower));
        return stateMatch && insMatch;
      })
      .slice(0, 12);
  }, [approvedFacilities, insurer, stateConfig, cityName]);

  if (!insurer || !stateConfig || !cityName) {
    return <Navigate to="/insurance" replace />;
  }

  const validation = validatePage("city-insurance", facilities.length);
  const pageTitle = `${insurer.name} Rehab Coverage in ${cityName}, ${stateData?.abbreviation || stateConfig.state}`;

  const faqs = [
    {
      question: `Does ${insurer.name} cover rehab in ${cityName}?`,
      answer: `Yes, ${insurer.name} is required to cover substance abuse treatment under the Mental Health Parity and Addiction Equity Act. In ${cityName}, ${stateConfig.state}, this includes medical detox, inpatient and outpatient rehabilitation, medication-assisted treatment, and therapy sessions. Coverage specifics depend on your plan type and network status. ${stateConfig.medicaidExpanded ? `${stateConfig.state} has expanded Medicaid, providing additional coverage options.` : ""}`,
    },
    {
      question: `How do I verify ${insurer.name} benefits in ${cityName}?`,
      answer: `Call the member services number on your ${insurer.name} card and ask about "substance use disorder" or "behavioral health" benefits. Inquire about in-network facilities in ${cityName}, pre-authorization requirements, and covered treatment days. Many facilities on RehabLookup offer free ${insurer.name} benefits verification.`,
    },
    {
      question: `How many ${insurer.name}-accepting rehab centers are in ${cityName}?`,
      answer: `${cityName}, ${stateConfig.state} has ${facilities.length > 0 ? `${facilities.length}+ verified treatment facilities` : "treatment options available through nearby providers"}. Use RehabLookup to compare programs, check reviews, and verify insurance acceptance before choosing a facility.`,
    },
  ];

  const structuredData: any[] = [
    {
      "@context": "https://schema.org",
      "@type": "MedicalWebPage",
      name: pageTitle,
      description: `Find rehab centers accepting ${insurer.name} in ${cityName}, ${stateConfig.state}.`,
      url: `https://rehablookup.com/insurance/${insurerSlug}/${stateSlug}/${citySlug}`,
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

  const otherInsurers = insurerConfigs.filter((i) => i.slug !== insurerSlug).slice(0, 6);

  return (
    <SEOLandingTemplate
      title={pageTitle}
      metaTitle={`${insurer.name} Rehab in ${cityName}, ${stateData?.abbreviation || ""} — Find Coverage | RehabLookup`}
      metaDescription={`Find rehab centers accepting ${insurer.name} in ${cityName}, ${stateConfig.state}. Compare ${facilities.length}+ facilities, verify coverage, get help today.`}
      canonical={`https://rehablookup.com/insurance/${insurerSlug}/${stateSlug}/${citySlug}`}
      noindex={!validation.shouldIndex}
      structuredData={structuredData}
      breadcrumbs={[
        { name: "Home", url: "/" },
        { name: "Insurance", url: "/insurance" },
        { name: insurer.name, url: `/insurance/${insurer.mainPagePath}` },
        { name: stateConfig.state, url: `/insurance/${insurerSlug}/${stateSlug}` },
        { name: cityName, url: `/insurance/${insurerSlug}/${stateSlug}/${citySlug}` },
      ]}
      heroTitle={pageTitle}
      heroSubtitle={`Verify your ${insurer.name} benefits and find accredited rehab facilities in ${cityName} that accept your plan.`}
      heroLocation={`${cityName}, ${stateConfig.state}`}
      heroBadge="Insurance Verified"
      introContent={`Looking for rehab centers that accept ${insurer.name} in ${cityName}, ${stateConfig.state}? Under federal law, ${insurer.name} must cover substance abuse treatment at the same level as other medical conditions. RehabLookup helps you find verified facilities in ${cityName} that accept ${insurer.name}, compare programs, and start treatment with confidence.${stateConfig.medicaidExpanded ? ` ${stateConfig.state} has expanded Medicaid, providing additional coverage options for qualifying residents.` : ""}`}
      sections={[
        {
          heading: `${insurer.name} Coverage in ${cityName}`,
          content: `${insurer.name} provides addiction treatment coverage in ${cityName} including medical detoxification, inpatient rehabilitation, outpatient programs (IOP/PHP), medication-assisted treatment, and therapy sessions. Coverage specifics depend on your plan type, network status, and whether pre-authorization is obtained. Contact the facilities listed below or use our free benefits verification service.`,
        },
        {
          heading: `Finding In-Network Providers in ${cityName}`,
          content: `To maximize your ${insurer.name} benefits in ${cityName}: 1) Confirm which facilities are in-network for your specific plan, 2) Ask about pre-authorization requirements before admission, 3) Verify the number of covered treatment days, 4) Understand your copay and deductible obligations. Many ${cityName} facilities listed on RehabLookup offer complimentary benefits verification.`,
        },
      ]}
      facilities={facilities}
      isLoading={isLoading}
      facilityCount={facilities.length}
      showMoreLink={`/insurance/${insurerSlug}/${stateSlug}`}
      faqs={faqs}
      faqTreatmentType={`${insurer.name} Coverage`}
      faqLocation={{ city: cityName, state: stateConfig.state }}
      relatedCityLinks={otherInsurers.map((ins) => ({
        title: `${ins.name} in ${cityName}`,
        href: `/insurance/${ins.slug}/${stateSlug}/${citySlug}`,
      }))}
      relatedStateLinks={[
        { title: `All ${insurer.name} in ${stateConfig.state}`, href: `/insurance/${insurerSlug}/${stateSlug}` },
        { title: `Rehab in ${cityName}`, href: `/rehab-centers/${stateSlug}/${citySlug}` },
      ]}
      showTreatmentLinks
      showInsuranceLinks
      ctaTitle={`Verify Your ${insurer.name} Benefits in ${cityName}`}
      ctaSubtitle={`Our team will check your ${insurer.name} coverage and match you with the best programs in ${cityName}. Free and confidential.`}
      ctaButtonText="Verify My Coverage"
    >
      <SmartInternalLinks
        pageType="insurance-state"
        stateSlug={stateSlug}
        stateName={stateConfig.state}
        insurerSlug={insurerSlug}
      />
    </SEOLandingTemplate>
  );
}
