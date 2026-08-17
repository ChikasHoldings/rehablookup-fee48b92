import { useMemo } from "react";
import { Navigate, useParams } from "react-router-dom";
import { SEOLandingTemplate } from "@/components/seo/SEOLandingTemplate";
import { getCityImage } from "@/data/locationImages";
import { useStaticFacilities } from "@/hooks/useStaticFacilities";
import { citiesMatch } from "@/lib/cityNameMatch";
import { treatmentCenters } from "@/data/treatmentCenters";
import { SmartInternalLinks } from "@/components/seo/SmartInternalLinks";
import { shouldEmitFAQSchema, validatePage } from "@/utils/seoPageValidator";
import {
  insurerConfigs,
  stateInsuranceConfigs,
} from "@/data/seoInsuranceStateConfig";
import { statesData } from "@/data/locationSeoData";
import { matchesInsuranceFilter, asSearchableFacility } from "@/lib/searchFilters";

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
    const stateLower = stateConfig.state.toLowerCase();

    // Use the shared insurance matcher (normalized + alias-aware). The
    // matcher resolves the insurer name to its canonical filter key so
    // "Self-Pay / Private Pay" lands on facilities tagged "Self-Pay/Private
    // Pay" (no spaces) — the inline `.includes()` here previously dropped
    // those silently. See docs/search-audit-2026-05-21.md §F1.
    const insMatch = (f: typeof allFacilities[number]) =>
      matchesInsuranceFilter(asSearchableFacility(f), insurer.name);

    // City + insurer match
    const exact = allFacilities.filter((f) => {
      const cityMatch = citiesMatch(f.city, cityName);
      const stateMatch = f.state.toLowerCase() === stateLower;
      return cityMatch && stateMatch && insMatch(f);
    });

    if (exact.length >= 3) return exact.slice(0, 12);

    // Fallback: city + state (no insurer filter)
    const cityFallback = allFacilities.filter((f) => {
      const cityMatch = citiesMatch(f.city, cityName);
      const stateMatch = f.state.toLowerCase() === stateLower;
      return cityMatch && stateMatch;
    });

    if (cityFallback.length >= 3) return cityFallback.slice(0, 12);

    // Fallback: state + insurer
    return allFacilities
      .filter((f) => f.state.toLowerCase() === stateLower && insMatch(f))
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
      answer: `${cityName}, ${stateConfig.state} has ${facilities.length > 0 ? `${facilities.length}+ treatment facilities` : "treatment options available through nearby providers"}. Use RehabLookup to compare programs, check reviews, and verify insurance acceptance before choosing a facility.`,
    },
  ];

  const structuredData: object[] = [
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
      heroImage={getCityImage(stateSlug, citySlug)}
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
        {
          heading: `Parity, Pre-Auth, and What's Required`,
          content: `Under the Mental Health Parity & Addiction Equity Act, ${insurer.name} must cover substance-use treatment at the same level as other medical care — same visit limits, same deductibles, same out-of-pocket caps. Most levels of care require pre-authorization; facilities handle the paperwork as part of intake and will tell you exactly what days and services are approved before admission.`,
        },
        {
          heading: `Out-of-Pocket Cost in ${cityName}`,
          content: `What you pay depends on plan tier, deductible status, in-network vs out-of-network, and the level of care. After ${insurer.name} pays its share, ${cityName} facilities help estimate your share — typically a copay per outpatient visit or a percentage coinsurance for inpatient. Many facilities offer payment plans, sliding-scale fees, or scholarship beds for residual costs not covered by insurance.`,
        },
        {
          heading: `Levels of Care ${insurer.name} Typically Covers`,
          content: `${insurer.name} plans generally cover the full continuum: medical detox, residential inpatient, partial hospitalization (PHP), intensive outpatient (IOP), standard outpatient counseling, medication-assisted treatment (MAT), and aftercare/continuing care. The specific number of days and visit limits depend on medical necessity reviews; facilities document clinical justification to support continued authorization.`,
        },
        {
          heading: `When Coverage Is Denied — Your Options`,
          content: `If ${insurer.name} denies authorization or coverage for treatment, you have a right to appeal. Most denials come down to medical-necessity documentation; ${cityName} facilities have utilization-review teams that handle appeals as part of their service. State insurance commissioners and federal parity-compliance offices provide additional escalation paths if internal appeals fail.`,
        },
      ]}
      whatToExpect={[
        `Free, confidential benefits verification before any commitment`,
        `${insurer.name} pre-authorization handled by the facility's admissions team`,
        `Custom treatment plan and cost estimate within 24-48 hours`,
        `Medical detox first if clinically indicated, fully coordinated with ${insurer.name}`,
        `Daily therapy, group, and family programming through the stay`,
        `Continued-care authorization tracked through discharge planning`,
      ]}
      benefits={[
        `Verified ${insurer.name}-accepting facilities in ${cityName}`,
        `Parity-protected coverage equal to other medical care`,
        `Pre-authorization and utilization review handled by intake teams`,
        `Dual-diagnosis programs covered for co-occurring mental health conditions`,
        `MAT, detox, residential, PHP, IOP, and outpatient all in-network options`,
        `Appeal support if coverage is initially denied`,
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
