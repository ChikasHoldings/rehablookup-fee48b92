import { useMemo } from "react";
import { Navigate, useParams } from "react-router-dom";
import { SEOLandingTemplate } from "@/components/seo/SEOLandingTemplate";
import { useStaticFacilities } from "@/hooks/useStaticFacilities";
import { treatmentCenters } from "@/data/treatmentCenters";
import {
  insuranceStateConfigs,
  insurerConfigs,
  stateInsuranceConfigs,
  getInsuranceStateFAQs,
  type InsurerConfig,
  type StateInsuranceConfig,
} from "@/data/seoInsuranceStateConfig";
import { SmartInternalLinks } from "@/components/seo/SmartInternalLinks";
import { shouldEmitFAQSchema, validatePage } from "@/utils/seoPageValidator";

export default function InsuranceStatePage() {
  const { slug, stateSlug } = useParams<{ slug: string; stateSlug: string }>();
  const { data: approvedFacilities = [], isLoading } = useStaticFacilities();

  const insurer = useMemo(() => {
    if (!slug) return null;
    return insurerConfigs.find((i) => i.slug === slug) || null;
  }, [slug]);

  const stateConfig = useMemo(() => {
    if (!stateSlug) return null;
    return stateInsuranceConfigs.find((s) => s.slug === stateSlug) || null;
  }, [stateSlug]);

  const { facilities, directMatchCount, stateFallbackCount } = useMemo(() => {
    if (!insurer || !stateConfig) {
      return { facilities: [], directMatchCount: 0, stateFallbackCount: 0 };
    }
    const allFacilities = [...treatmentCenters, ...approvedFacilities];
    const stateLower = stateConfig.state.toLowerCase();
    const insurerLower = insurer.name.toLowerCase();

    const exactMatch = allFacilities.filter((f) => {
      const stateMatch = f.state.toLowerCase() === stateLower;
      const insuranceMatch = f.insuranceAccepted?.some((i) =>
        i.toLowerCase().includes(insurerLower)
      );
      return stateMatch && insuranceMatch;
    });

    const stateAll = allFacilities.filter((f) => f.state.toLowerCase() === stateLower);
    const display = exactMatch.length > 0 ? exactMatch : stateAll;

    return {
      facilities: display.slice(0, 12),
      directMatchCount: exactMatch.length,
      stateFallbackCount: stateAll.length,
    };
  }, [approvedFacilities, insurer, stateConfig]);

  const validation = validatePage("insurance-state", directMatchCount, { stateFallbackCount });

  const faqs = useMemo(() => {
    if (!insurer || !stateConfig) return [];
    return getInsuranceStateFAQs(insurer, stateConfig);
  }, [insurer, stateConfig]);

  if (!insurer || !stateConfig) {
    return <Navigate to="/insurance" replace />;
  }

  const pageTitle = `${insurer.name} Rehab Coverage in ${stateConfig.state}`;

  const structuredData: any[] = [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: pageTitle,
      description: `Find rehab centers accepting ${insurer.name} in ${stateConfig.state}. Verify coverage, compare facilities, and start treatment today.`,
      url: `https://rehablookup.com/insurance/${slug}/${stateSlug}`,
    },
  ];

  // Only emit FAQPage schema if we have 3+ meaningful FAQs
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

  const relatedStateLinks = stateInsuranceConfigs
    .filter((s) => s.slug !== stateSlug)
    .slice(0, 8)
    .map((s) => ({
      title: `${insurer.name} in ${s.state}`,
      href: `/insurance/${slug}/${s.slug}`,
    }));

  const relatedInsuranceLinks = insurerConfigs
    .filter((i) => i.slug !== slug)
    .map((i) => ({
      title: `${i.name} in ${stateConfig.state}`,
      href: `/insurance/${i.slug}/${stateSlug}`,
    }));

  return (
    <SEOLandingTemplate
      title={pageTitle}
      metaTitle={`${insurer.name} Rehab Coverage in ${stateConfig.state} — Find Treatment | RehabLookup`}
      metaDescription={`Find rehab centers accepting ${insurer.name} in ${stateConfig.state}. ${stateConfig.medicaidExpanded ? "Medicaid expanded state." : ""} Verify coverage, compare ${facilities.length}+ facilities. Get help today.`}
      canonical={`https://rehablookup.com/insurance/${slug}/${stateSlug}`}
      structuredData={[structuredData, { "@context": "https://schema.org", "@type": "MedicalWebPage", specialty: "Addiction Medicine", lastReviewed: new Date().toISOString().split("T")[0] }]}
      breadcrumbs={[
        { name: "Home", url: "/" },
        { name: "Insurance", url: "/insurance" },
        { name: insurer.name, url: `/insurance/${insurer.mainPagePath}` },
        { name: stateConfig.state, url: `/insurance/${slug}/${stateSlug}` },
      ]}
      heroTitle={pageTitle}
      heroSubtitle={`Verify your ${insurer.name} benefits and find accredited treatment facilities in ${stateConfig.state} that accept your plan.`}
      heroLocation={stateConfig.state}
      heroBadge="Insurance Verified"
      introContent={`Looking for rehab centers that accept ${insurer.name} in ${stateConfig.state}? Under the Mental Health Parity and Addiction Equity Act, ${insurer.name} is required to cover substance abuse treatment at the same level as other medical conditions. ${stateConfig.medicaidExpanded ? `${stateConfig.state} has expanded Medicaid, providing additional coverage options for qualifying residents.` : ""} RehabLookup helps you find verified facilities in ${stateConfig.state} that accept ${insurer.name}, compare programs, and start treatment with confidence.`}
      sections={[
        {
          heading: `${insurer.name} Coverage in ${stateConfig.state}`,
          content: `${insurer.name} provides comprehensive addiction treatment coverage in ${stateConfig.state}, including medical detoxification, inpatient rehabilitation, outpatient programs (IOP/PHP), medication-assisted treatment, and therapy sessions. Coverage specifics depend on your plan type, network status, and whether pre-authorization is obtained. ${stateConfig.state} ${stateConfig.medicaidExpanded ? "has expanded Medicaid under the ACA, providing additional options for individuals who qualify based on income." : "provides state-funded treatment programs for residents without adequate insurance coverage."}`,
        },
        {
          heading: `How to Verify Your ${insurer.name} Benefits`,
          content: `To check your ${insurer.name} coverage for rehab in ${stateConfig.state}: 1) Call the member services number on your insurance card, 2) Ask about "substance use disorder" or "behavioral health" benefits, 3) Inquire about in-network vs. out-of-network coverage levels, 4) Confirm pre-authorization requirements, 5) Ask about the number of covered treatment days. Many facilities listed on RehabLookup offer complimentary ${insurer.name} benefits verification — contact them directly or use our concierge service for personalized assistance.`,
        },
        {
          heading: `Treatment Options in ${stateConfig.state}`,
          content: `${stateConfig.state} offers a range of treatment settings for ${insurer.name} members, including medical detox facilities, residential inpatient programs, partial hospitalization programs (PHP), intensive outpatient programs (IOP), and outpatient counseling. ${stateConfig.notableInfo} The state has ${facilities.length > 0 ? `multiple accredited facilities accepting ${insurer.name}` : "treatment programs available"} across major metro areas.`,
        },
      ]}
      facilities={facilities}
      isLoading={isLoading}
      facilityCount={facilities.length}
      showMoreLink={`/rehab-centers/${stateSlug}`}
      faqs={faqs}
      faqTreatmentType={`${insurer.name} Coverage`}
      faqLocation={{ state: stateConfig.state }}
      relatedCityLinks={relatedInsuranceLinks}
      relatedStateLinks={relatedStateLinks}
      showTreatmentLinks
      showInsuranceLinks
      ctaTitle={`Verify Your ${insurer.name} Benefits Today`}
      ctaSubtitle={`Our team will check your ${insurer.name} coverage and match you with the best treatment programs in ${stateConfig.state}. Free and confidential.`}
      ctaButtonText="Verify My Coverage"
    >
      <SmartInternalLinks
        pageType="insurance-state"
        stateSlug={stateSlug}
        stateName={stateConfig.state}
        insurerSlug={slug}
      />
    </SEOLandingTemplate>
  );
}
