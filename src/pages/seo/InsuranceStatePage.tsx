import { useMemo } from "react";
import { normalizeState } from "@/lib/location";
import { Navigate, useParams } from "react-router-dom";
import { SEOLandingTemplate } from "@/components/seo/SEOLandingTemplate";
import { getStateImage } from "@/data/locationImages";
import { useStaticFacilities } from "@/hooks/useStaticFacilities";
import { treatmentCenters } from "@/data/treatmentCenters";
import {
  insurerConfigs,
  stateInsuranceConfigs,
  getInsuranceStateFAQs,
} from "@/data/seoInsuranceStateConfig";
import { SmartInternalLinks } from "@/components/seo/SmartInternalLinks";
import { shouldEmitFAQSchema, validatePage } from "@/utils/seoPageValidator";
import { matchesInsuranceFilter, asSearchableFacility } from "@/lib/searchFilters";
import { buildInsuranceCityContent } from "@/lib/seo/insuranceContent.mjs";
import { mergeFaqs, mergeSections } from "@/lib/seo/composedTemplate";
import { stateAddictionStats } from "@/data/stateAddictionStats";

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
    // Canonical state normalization (handles CA/California and DC).
    const scopeState = normalizeState(stateConfig.state);

    const exactMatch = allFacilities.filter((f) => {
      const stateMatch = normalizeState(f.state) === scopeState;
      const insuranceMatch = matchesInsuranceFilter(
        asSearchableFacility(f),
        insurer.name,
      );
      return stateMatch && insuranceMatch;
    });

    const stateAll = allFacilities.filter((f) => normalizeState(f.state) === scopeState);
    const display = exactMatch.length > 0 ? exactMatch : stateAll;

    return {
      facilities: display.slice(0, 12),
      directMatchCount: exactMatch.length,
      stateFallbackCount: stateAll.length,
    };
  }, [approvedFacilities, insurer, stateConfig]);

  // `directMatchCount` is the truthful count for this page's scope.
  // It is what the hero tile renders — never `facilities.length`,
  // which may include the wider fallback list shown below when too
  // few exact matches exist.
  const validation = validatePage("insurance-state", directMatchCount, { stateFallbackCount });

  const faqs = useMemo(() => {
    if (!insurer || !stateConfig) return [];
    return getInsuranceStateFAQs(insurer, stateConfig);
  }, [insurer, stateConfig]);

  if (!insurer || !stateConfig) {
    return <Navigate to="/insurance" replace />;
  }

  const pageTitle = `${insurer.name} Rehab Coverage in ${stateConfig.state}`;

  const structuredData: object[] = [
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

  // Same composer the prerendered /insurance/{carrier}/{state} page
  // uses. It is the city composer called with no city — statewide scope
  // names no place below the state, which is what the generator does.
  const composed = useMemo(() => {
    const stats = stateAddictionStats.find((st) => st.slug === stateSlug);
    return buildInsuranceCityContent({
      insurerSlug: slug,
      insurerName: insurer.name,
      cityName: stateConfig.state,
      stateName: stateConfig.state,
      stateAbbr: stats?.abbreviation,
      medicaidExpanded: stateConfig.medicaidExpanded,
      notableInfo: stats?.signatureNote,
      primaryMetro: stats?.primaryMetro,
      secondaryMetros: stats?.secondaryMetros,
    });
  }, [slug, insurer.name, stateConfig, stateSlug]);

  return (
    <SEOLandingTemplate
      title={pageTitle}
      metaTitle={`${insurer.name} Rehab Coverage in ${stateConfig.state} — Find Treatment | RehabLookup`}
      metaDescription={`Find rehab centers accepting ${insurer.name} in ${stateConfig.state}. ${stateConfig.medicaidExpanded ? "Medicaid expanded state." : ""} Verify coverage, compare ${facilities.length}+ facilities. Get help today.`}
      canonical={`https://rehablookup.com/insurance/${slug}/${stateSlug}`}
      noindex={!validation.shouldIndex}
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
      heroImage={getStateImage(stateSlug)}
      heroBadge="Insurance Verified"
      introContent={`Looking for rehab centers that accept ${insurer.name} in ${stateConfig.state}? Under the Mental Health Parity and Addiction Equity Act, ${insurer.name} is required to cover substance abuse treatment at the same level as other medical conditions. ${stateConfig.medicaidExpanded ? `${stateConfig.state} has expanded Medicaid, providing additional coverage options for qualifying residents.` : ""} RehabLookup helps you find verified facilities in ${stateConfig.state} that accept ${insurer.name}, compare programs, and start treatment with confidence.`}
      sections={mergeSections([
        {
          heading: `${insurer.name} Coverage in ${stateConfig.state}`,
          content: `${insurer.name} provides comprehensive addiction treatment coverage in ${stateConfig.state}, including medical detoxification, inpatient rehabilitation, outpatient programs (IOP/PHP), medication-assisted treatment, and therapy sessions. Coverage specifics depend on your plan type, network status, and whether pre-authorization is obtained. ${stateConfig.state} ${stateConfig.medicaidExpanded ? "has expanded Medicaid under the ACA, providing additional options for individuals who qualify based on income." : "provides state-funded treatment programs for residents without adequate insurance coverage."}`,
        },
        {
          heading: `How to Verify Your ${insurer.name} Benefits`,
          content: `To check your ${insurer.name} coverage for rehab in ${stateConfig.state}: 1) Call the member services number on your insurance card, 2) Ask about "substance use disorder" or "behavioral health" benefits, 3) Inquire about in-network vs. out-of-network coverage levels, 4) Confirm pre-authorization requirements, 5) Ask about the number of covered treatment days. Many facilities listed on RehabLookup offer complimentary ${insurer.name} benefits verification — contact their admissions teams directly to request it.`,
        },
        {
          heading: `Treatment Options in ${stateConfig.state}`,
          content: `${stateConfig.state} offers a range of treatment settings for ${insurer.name} members, including medical detox facilities, residential inpatient programs, partial hospitalization programs (PHP), intensive outpatient programs (IOP), and outpatient counseling. ${stateConfig.notableInfo} The state has ${facilities.length > 0 ? `multiple accredited facilities accepting ${insurer.name}` : "treatment programs available"} across major metro areas.`,
        },
        {
          heading: `Federal Parity Protections`,
          content: `Under the Mental Health Parity & Addiction Equity Act, ${insurer.name} must cover substance-use treatment at the same level as other medical care — equal visit limits, equal deductibles, equal out-of-pocket maximums. ${stateConfig.state} regulators add state-level enforcement: parity-violation complaints can be filed with the ${stateConfig.state} insurance commissioner when plans deny treatment that comparable medical care would cover.`,
        },
        {
          heading: `Out-of-Pocket Cost in ${stateConfig.state}`,
          content: `Your share after ${insurer.name} pays depends on plan tier, deductible status, in-network vs out-of-network, and level of care. ${stateConfig.state} facilities provide a written cost estimate before admission so there are no surprise bills. Many offer payment plans, sliding-scale fees, or scholarship beds for portions insurance doesn't cover.`,
        },
        {
          heading: `If Coverage Is Denied`,
          content: `If ${insurer.name} denies authorization or coverage for treatment, you have a right to appeal. Most denials come down to medical-necessity documentation; ${stateConfig.state} facilities have utilization-review teams that handle appeals as part of their service. The state insurance commissioner and federal parity-compliance offices provide additional escalation paths if internal appeals are unsuccessful.`,
        },
      ], composed)}
      whatToExpect={[
        `Free, confidential ${insurer.name} benefits verification`,
        `Pre-authorization handled by the facility's admissions team`,
        `Written cost estimate within 24-48 hours of intake`,
        `Medical detox first if clinically indicated, fully coordinated with ${insurer.name}`,
        `Daily therapy, group, and family programming through the stay`,
        `Continued-care authorization tracked through discharge planning`,
      ]}
      benefits={[
        `Verified ${insurer.name}-accepting facilities across ${stateConfig.state}`,
        `Parity-protected coverage equal to other medical care`,
        `Pre-authorization and utilization review handled by intake teams`,
        `Dual-diagnosis programs covered for co-occurring conditions`,
        `Full continuum: detox, residential, PHP, IOP, outpatient, MAT`,
        `Appeal support if coverage is initially denied`,
      ]}
      facilities={facilities}
      isLoading={isLoading}
      facilityCount={directMatchCount}
      showMoreLink={`/rehab-centers/${stateSlug}`}
      faqs={mergeFaqs(faqs, composed)}
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
