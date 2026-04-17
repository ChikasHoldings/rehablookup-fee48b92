import { useMemo } from "react";
import { Navigate, useParams, useLocation } from "react-router-dom";
import { SEOLandingTemplate } from "@/components/seo/SEOLandingTemplate";
import { useStaticFacilities } from "@/hooks/useStaticFacilities";
import { treatmentCenters } from "@/data/treatmentCenters";
import { demographicPages } from "@/data/seoDemographicConfig";
import { statesData } from "@/data/locationSeoData";
import { SmartInternalLinks } from "@/components/seo/SmartInternalLinks";
import { shouldEmitFAQSchema, validatePage } from "@/utils/seoPageValidator";

export default function DemographicStatePage() {
  const { stateSlug } = useParams<{ stateSlug: string }>();
  const location = useLocation();
  const { data: approvedFacilities = [], isLoading } = useStaticFacilities();

  const demographicSlug = useMemo(() => {
    const parts = location.pathname.replace(/^\//, "").split("/");
    return parts[0] || "";
  }, [location.pathname]);

  const demographic = useMemo(() => demographicPages.find((d) => d.slug === demographicSlug) || null, [demographicSlug]);
  const stateData = useMemo(() => statesData.find((s) => s.slug === stateSlug) || null, [stateSlug]);

  const { facilities, directMatchCount, stateFallbackCount } = useMemo(() => {
    if (!demographic || !stateData) {
      return { facilities: [], directMatchCount: 0, stateFallbackCount: 0 };
    }
    const all = [...treatmentCenters, ...approvedFacilities];
    const keywords = demographic.filterKeys.map((k) => k.toLowerCase());
    const stateLower = stateData.name.toLowerCase();

    const matched = all.filter((f) => {
      const stateMatch = f.state.toLowerCase() === stateLower;
      const keyMatch = f.treatmentTypes?.some((t) => keywords.some((k) => t.toLowerCase().includes(k))) ||
        keywords.some((k) => f.description?.toLowerCase().includes(k));
      return stateMatch && keyMatch;
    });
    const stateAll = all.filter((f) => f.state.toLowerCase() === stateLower);
    const display = matched.length >= 3 ? matched : stateAll;

    return {
      facilities: display.slice(0, 12),
      directMatchCount: matched.length,
      stateFallbackCount: stateAll.length,
    };
  }, [approvedFacilities, demographic, stateData]);

  const validation = validatePage("demographic-state", directMatchCount, { stateFallbackCount });

  if (!demographic || !stateData) {
    return <Navigate to="/treatment-types" replace />;
  }

  const { name: stateName, abbreviation } = stateData;
  const pageTitle = `${demographic.title} in ${stateName}`;
  const slug = `${demographicSlug}/${stateSlug}`;

  const faqs = [
    {
      question: `Are there ${demographic.title.toLowerCase()} programs in ${stateName}?`,
      answer: `Yes, ${stateName} offers specialized ${demographic.title.toLowerCase()} programs that address the unique needs of this population. These programs provide tailored treatment approaches, age-appropriate or culturally sensitive care, and specialized therapeutic modalities. ${facilities.length > 0 ? `RehabLookup lists ${facilities.length}+ verified programs in ${stateName}.` : `Contact our concierge team for personalized matching.`}`,
    },
    {
      question: `What makes ${demographic.title.toLowerCase()} different from general rehab?`,
      answer: `${demographic.title} programs are designed specifically for the unique challenges this population faces. They offer specialized staff training, peer groups with shared experiences, and treatment protocols adapted to specific needs. This targeted approach typically leads to higher engagement, better retention, and improved long-term outcomes compared to general treatment programs.`,
    },
    {
      question: `Does insurance cover ${demographic.title.toLowerCase()} in ${stateName}?`,
      answer: `Most insurance plans, including Medicaid and private insurance, cover addiction treatment in ${stateName} under mental health parity laws. Specialized programs for specific populations are typically covered at the same level as general treatment. Contact facilities to verify your specific plan benefits and coverage details.`,
    },
    {
      question: `How do I find the best ${demographic.title.toLowerCase()} program in ${stateName}?`,
      answer: `Look for programs with staff experienced in treating this specific population, proper accreditation (JCAHO or CARF), evidence-based treatment approaches, and strong aftercare support. RehabLookup verifies all listed facilities for licensing and clinical quality. Our free concierge service can also match you with the most appropriate program.`,
    },
  ];

  const structuredData: any[] = [
    {
      "@context": "https://schema.org",
      "@type": "MedicalWebPage",
      name: pageTitle,
      description: `Find ${demographic.title.toLowerCase()} in ${stateName}.`,
      url: `https://rehablookup.com/${slug}`,
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

  const otherStates = statesData
    .filter((s) => s.slug !== stateSlug)
    .sort(() => 0.5 - Math.random())
    .slice(0, 8)
    .map((s) => ({
      title: `${demographic.title} in ${s.name}`,
      href: `/${demographicSlug}/${s.slug}`,
    }));

  const otherDemographics = demographicPages
    .filter((d) => d.slug !== demographicSlug)
    .slice(0, 6)
    .map((d) => ({
      title: `${d.title} in ${stateName}`,
      href: `/${d.slug}/${stateSlug}`,
    }));

  return (
    <SEOLandingTemplate
      title={pageTitle}
      metaTitle={`${demographic.title} in ${stateName} (${abbreviation}) — Find Programs | RehabLookup`}
      metaDescription={`Find ${demographic.title.toLowerCase()} programs in ${stateName}. Compare ${facilities.length}+ verified facilities with specialized care. Get matched today.`}
      canonical={`https://rehablookup.com/${slug}`}
      noindex={!validation.shouldIndex}
      structuredData={structuredData}
      breadcrumbs={[
        { name: "Home", url: "/" },
        { name: demographic.title, url: `/${demographicSlug}` },
        { name: stateName, url: `/${slug}` },
      ]}
      heroTitle={pageTitle}
      heroSubtitle={`Specialized treatment programs in ${stateName} designed for the unique needs of this population.`}
      heroLocation={stateName}
      heroBadge="Specialized Programs"
      introContent={`Looking for ${demographic.title.toLowerCase()} in ${stateName}? RehabLookup connects you with verified treatment facilities across ${stateName} that offer specialized, evidence-based programs. ${stateData.cities.length > 5 ? `With programs available in ${stateData.cities.slice(0, 3).map(c => c.name).join(", ")}, and throughout ${stateName},` : `With programs throughout ${stateName},`} you can find care tailored to specific needs, challenges, and circumstances.`}
      sections={[
        {
          heading: `${demographic.title} Programs in ${stateName}`,
          content: `${stateName} offers a range of specialized treatment programs designed for this population. These facilities employ staff trained in the unique factors that affect this group's recovery — including specific triggers, co-occurring conditions, and social challenges. Treatment modalities are adapted to maximize engagement, retention, and long-term success.`,
        },
        {
          heading: `What to Look for in ${stateName}`,
          content: `When choosing a ${demographic.title.toLowerCase()} program in ${stateName}, prioritize facilities with: specialized staff training and certification, peer groups with shared experiences, individualized treatment plans, accreditation from JCAHO or CARF, and comprehensive aftercare planning. All programs on RehabLookup are verified for proper licensing and evidence-based approaches.`,
        },
      ]}
      facilities={facilities}
      isLoading={isLoading}
      facilityCount={facilities.length}
      showMoreLink={`/rehab-centers/${stateSlug}`}
      faqs={faqs}
      faqTreatmentType={demographic.title}
      faqLocation={{ city: "", state: stateName }}
      relatedCityLinks={otherStates.slice(0, 6)}
      relatedStateLinks={otherDemographics}
      showTreatmentLinks
      showInsuranceLinks
      ctaTitle={`Find ${demographic.title} in ${stateName}`}
      ctaSubtitle={`Our team matches you with the best specialized programs in ${stateName}. Free. Confidential. No obligation.`}
    >
      <SmartInternalLinks
        pageType="state"
        stateSlug={stateSlug!}
        stateName={stateName}
      />
    </SEOLandingTemplate>
  );
}
