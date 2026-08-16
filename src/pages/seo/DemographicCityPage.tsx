import { useMemo } from "react";
import { Navigate, useParams, useLocation } from "react-router-dom";
import { SEOLandingTemplate } from "@/components/seo/SEOLandingTemplate";
import { getCityImage } from "@/data/locationImages";
import { useStaticFacilities } from "@/hooks/useStaticFacilities";
import { citiesMatch } from "@/lib/cityNameMatch";
import { resolveCity } from "@/lib/cityLookup";
import { treatmentCenters } from "@/data/treatmentCenters";
import { demographicPages } from "@/data/seoDemographicConfig";
import { SmartInternalLinks } from "@/components/seo/SmartInternalLinks";
import { shouldEmitFAQSchema, validatePage } from "@/utils/seoPageValidator";

export default function DemographicCityPage() {
  const { stateSlug, citySlug } = useParams<{ stateSlug: string; citySlug: string }>();
  const location = useLocation();
  const { data: approvedFacilities = [], isLoading } = useStaticFacilities();

  const demographicSlug = useMemo(() => {
    const parts = location.pathname.replace(/^\//, "").split("/");
    return parts[0] || "";
  }, [location.pathname]);

  const demographic = useMemo(() => demographicPages.find((d) => d.slug === demographicSlug) || null, [demographicSlug]);
  const resolved = useMemo(() => resolveCity(stateSlug, citySlug), [stateSlug, citySlug]);
  const stateData = resolved?.state ?? null;
  const cityData = resolved?.city ?? null;

  const { facilities, directMatchCount, stateFallbackCount } = useMemo(() => {
    if (!demographic || !stateData || !cityData) {
      return { facilities: [], directMatchCount: 0, stateFallbackCount: 0 };
    }
    const all = [...treatmentCenters, ...approvedFacilities];
    const keywords = demographic.filterKeys.map((k) => k.toLowerCase());
    const stateLower = stateData.name.toLowerCase();

    const cityMatched = all.filter((f) => {
      const cityMatch = citiesMatch(f.city, cityData.name) && f.state.toLowerCase() === stateLower;
      const keyMatch = f.treatmentTypes?.some((t) => keywords.some((k) => t.toLowerCase().includes(k))) ||
        keywords.some((k) => f.description?.toLowerCase().includes(k));
      return cityMatch && keyMatch;
    });
    const cityAll = all.filter((f) => citiesMatch(f.city, cityData.name) && f.state.toLowerCase() === stateLower);
    const stateAll = all.filter((f) => f.state.toLowerCase() === stateLower);

    let display = cityMatched;
    if (display.length < 3) display = cityAll;
    if (display.length < 3) display = stateAll;

    return {
      facilities: display.slice(0, 12),
      directMatchCount: cityMatched.length,
      stateFallbackCount: stateAll.length,
    };
  }, [approvedFacilities, demographic, stateData, cityData]);

  const validation = validatePage("demographic-city", directMatchCount, { stateFallbackCount });

  if (!demographic || !stateData || !cityData) {
    return <Navigate to="/treatment-types" replace />;
  }

  const { name: stateName, abbreviation } = stateData;
  const cityName = cityData.name;
  const pageTitle = `${demographic.title} in ${cityName}, ${abbreviation}`;
  const canonicalPath = `/${demographicSlug}/${stateSlug}/${citySlug}`;

  const faqs = [
    {
      question: `Are there ${demographic.title.toLowerCase()} programs in ${cityName}?`,
      answer: `Yes, ${cityName}, ${stateName} offers specialized ${demographic.title.toLowerCase()} programs with tailored treatment approaches, age-appropriate or culturally sensitive care, and specialized therapeutic modalities.`,
    },
    {
      question: `What makes ${demographic.title.toLowerCase()} different from general rehab?`,
      answer: `${demographic.title} programs are designed specifically for the unique challenges this population faces. They offer specialized staff training, peer groups with shared experiences, and treatment protocols adapted to specific needs — leading to higher engagement and better outcomes.`,
    },
    {
      question: `Does insurance cover ${demographic.title.toLowerCase()} in ${cityName}?`,
      answer: `Most insurance plans, including Medicaid and private insurance, cover addiction treatment in ${cityName} under mental health parity laws. Specialized programs are typically covered at the same level as general treatment. Contact facilities to verify your specific plan.`,
    },
    {
      question: `How do I find the best ${demographic.title.toLowerCase()} program in ${cityName}?`,
      answer: `Look for programs with experienced staff, proper accreditation (JCAHO or CARF), evidence-based treatment, and strong aftercare support. RehabLookup verifies all listed facilities. Use the filters to narrow by level of care, insurance, and specialty before you contact a program in ${cityName}.`,
    },
  ];

  const structuredData: object[] = [
    {
      "@context": "https://schema.org",
      "@type": "MedicalWebPage",
      name: pageTitle,
      description: `Find ${demographic.title.toLowerCase()} in ${cityName}, ${stateName}.`,
      url: `https://rehablookup.com${canonicalPath}`,
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

  const nearbyCities = stateData.cities
    .filter((c) => c.slug !== citySlug)
    .slice(0, 6)
    .map((c) => ({
      title: `${demographic.title} in ${c.name}`,
      href: `/${demographicSlug}/${stateSlug}/${c.slug}`,
    }));

  const otherDemographics = demographicPages
    .filter((d) => d.slug !== demographicSlug)
    .slice(0, 6)
    .map((d) => ({
      title: `${d.title} in ${cityName}`,
      href: `/${d.slug}/${stateSlug}/${citySlug}`,
    }));

  return (
    <SEOLandingTemplate
      title={pageTitle}
      metaTitle={`${demographic.title} in ${cityName}, ${abbreviation} — Find Programs | RehabLookup`}
      metaDescription={`Find ${demographic.title.toLowerCase()} programs in ${cityName}, ${stateName}. Compare verified facilities with specialized care and contact them directly.`}
      canonical={`https://rehablookup.com${canonicalPath}`}
      noindex={!validation.shouldIndex}
      structuredData={structuredData}
      breadcrumbs={[
        { name: "Home", url: "/" },
        { name: demographic.title, url: `/${demographicSlug}` },
        { name: stateName, url: `/${demographicSlug}/${stateSlug}` },
        { name: cityName, url: canonicalPath },
      ]}
      heroTitle={pageTitle}
      heroSubtitle={`Specialized treatment programs in ${cityName} designed for the unique needs of this population.`}
      heroLocation={`${cityName}, ${abbreviation}`}
      heroBadge="Specialized Programs"
      heroImage={getCityImage(stateSlug, citySlug)}
      introContent={`Looking for ${demographic.title.toLowerCase()} in ${cityName}, ${stateName}? RehabLookup connects you with verified treatment facilities offering specialized, evidence-based programs tailored to specific needs, challenges, and circumstances.`}
      sections={[
        {
          heading: `${demographic.title} Programs in ${cityName}`,
          content: `${cityName} offers specialized treatment programs designed for this population. Facilities employ staff trained in the unique factors that affect this group's recovery — including specific triggers, co-occurring conditions, and social challenges.`,
        },
        {
          heading: `What to Look for in ${cityName}`,
          content: `When choosing a program, prioritize facilities with specialized staff training, peer groups with shared experiences, individualized treatment plans, accreditation from JCAHO or CARF, and comprehensive aftercare planning.`,
        },
        {
          heading: `Insurance & Cost in ${cityName}`,
          content: `Most ${cityName} programs accept private insurance, Medicaid, and Medicare. Under federal parity laws, substance-use treatment is covered at the same level as other medical care. Facilities verify benefits before admission and many offer sliding-scale fees or financing for uncovered costs.`,
        },
        {
          heading: `Levels of Care Offered`,
          content: `${cityName} providers offer the full continuum: medical detox, residential inpatient, partial hospitalization (PHP), intensive outpatient (IOP), standard outpatient, and recovery housing. Clinicians match level of care to severity, support system, and clinical need rather than what you can pay.`,
        },
        {
          heading: `Aftercare & Long-Term Recovery in ${cityName}`,
          content: `${cityName} supports recovery beyond discharge with peer-support meetings (12-step, SMART Recovery), alumni programming, sober living homes, and outpatient continuing care. Most treatment centers build the aftercare plan into discharge — recovery is treated as ongoing, not a one-time event.`,
        },
        {
          heading: `How Facilities Are Verified`,
          content: `Every ${cityName} facility in our directory is checked for state licensing, current accreditation (Joint Commission or CARF), and active clinical credentials. We do not sell admission slots; providers can't pay for placement. Pages are editorially curated, not lead-broker auctions.`,
        },
      ]}
      whatToExpect={[
        `Free, confidential phone or web assessment with a licensed clinician`,
        `Insurance benefits verified before any commitment`,
        `Custom treatment plan within 24-48 hours of intake`,
        `Population-specific therapy groups and peer support`,
        `Medication management when clinically indicated`,
        `Aftercare plan + community resource referrals built into discharge`,
      ]}
      benefits={[
        `Licensed, accredited ${cityName} facilities only`,
        `Specialized programs tailored to this population's needs`,
        `Insurance accepted: most private plans, Medicaid, Medicare, TRICARE`,
        `Dual-diagnosis support for co-occurring mental health conditions`,
        `Evidence-based therapies (CBT, DBT, EMDR, MAT where indicated)`,
        `Long-term continuing care and alumni community`,
      ]}
      facilities={facilities}
      isLoading={isLoading}
      facilityCount={facilities.length}
      showMoreLink={`/rehab-centers/${stateSlug}/${citySlug}`}
      faqs={faqs}
      faqTreatmentType={demographic.title}
      faqLocation={{ city: cityName, state: stateName }}
      relatedCityLinks={nearbyCities}
      relatedStateLinks={otherDemographics}
      showTreatmentLinks
      showInsuranceLinks
      ctaTitle={`Find ${demographic.title} in ${cityName}`}
      ctaSubtitle={`Our team matches you with the best specialized programs in ${cityName}. Free. Confidential. No obligation.`}
    >
      <SmartInternalLinks
        pageType="city"
        stateSlug={stateSlug!}
        stateName={stateName}
        citySlug={citySlug}
      />
    </SEOLandingTemplate>
  );
}
