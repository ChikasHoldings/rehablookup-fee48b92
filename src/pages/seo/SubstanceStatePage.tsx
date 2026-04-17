import { useMemo } from "react";
import { Navigate, useParams, useLocation } from "react-router-dom";
import { SEOLandingTemplate } from "@/components/seo/SEOLandingTemplate";
import { useStaticFacilities } from "@/hooks/useStaticFacilities";
import { treatmentCenters } from "@/data/treatmentCenters";
import { substancePages } from "@/data/seoSubstanceConfig";
import { statesData } from "@/data/locationSeoData";
import { SmartInternalLinks } from "@/components/seo/SmartInternalLinks";
import { shouldEmitFAQSchema, validatePage } from "@/utils/seoPageValidator";

export default function SubstanceStatePage() {
  const { stateSlug } = useParams<{ stateSlug: string }>();
  const location = useLocation();
  const { data: approvedFacilities = [], isLoading } = useStaticFacilities();

  // Extract substance slug from path: /cocaine-addiction-treatment/california → cocaine-addiction-treatment
  const substanceSlug = useMemo(() => {
    const parts = location.pathname.replace(/^\//, "").split("/");
    return parts[0] || "";
  }, [location.pathname]);

  const substance = useMemo(() => substancePages.find((s) => s.slug === substanceSlug) || null, [substanceSlug]);
  const stateData = useMemo(() => statesData.find((s) => s.slug === stateSlug) || null, [stateSlug]);

  const { facilities, directMatchCount, stateFallbackCount } = useMemo(() => {
    if (!substance || !stateData) {
      return { facilities: [], directMatchCount: 0, stateFallbackCount: 0 };
    }
    const all = [...treatmentCenters, ...approvedFacilities];
    const keywords = substance.filterKeys.map((k) => k.toLowerCase());
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
  }, [approvedFacilities, substance, stateData]);

  const validation = validatePage("substance-state", directMatchCount, { stateFallbackCount });

  if (!substance || !stateData) {
    return <Navigate to="/treatment-types" replace />;
  }

  const { name: stateName, abbreviation } = stateData;
  const pageTitle = `${substance.title} in ${stateName}`;
  const slug = `${substanceSlug}/${stateSlug}`;

  const faqs = [
    {
      question: `What does ${substance.conditionName.toLowerCase()} treatment involve in ${stateName}?`,
      answer: `Treatment for ${substance.conditionName.toLowerCase()} in ${stateName} typically includes medically supervised detox, behavioral therapy (CBT, DBT), individual and group counseling, and aftercare planning. ${stateData.cities.length > 5 ? `With major treatment hubs in ${stateData.cities.slice(0, 3).map(c => c.name).join(", ")}, ${stateName} offers diverse program options.` : `${stateName} offers treatment programs across the state with varying levels of care.`}`,
    },
    {
      question: `Does insurance cover ${substance.conditionName.toLowerCase()} rehab in ${stateName}?`,
      answer: `Yes, under the Mental Health Parity and Addiction Equity Act, most insurance plans must cover substance abuse treatment at parity with medical/surgical benefits. Medicaid, Medicare, and private insurance all provide coverage for ${substance.conditionName.toLowerCase()} treatment in ${stateName}. Contact facilities to verify your specific plan.`,
    },
    {
      question: `How many ${substance.conditionName.toLowerCase()} treatment centers are in ${stateName}?`,
      answer: `${stateName} has ${facilities.length > 0 ? `${facilities.length}+ verified treatment facilities` : "treatment options available"} that address ${substance.conditionName.toLowerCase()}. Use RehabLookup to compare programs, read reviews, and verify insurance acceptance.`,
    },
    {
      question: `What is the cost of ${substance.conditionName.toLowerCase()} treatment in ${stateName}?`,
      answer: `Treatment costs in ${stateName} vary widely based on level of care: outpatient programs range from $1,000-$10,000, while residential treatment can cost $10,000-$60,000 for a 30-day program. Many facilities offer sliding-scale fees, and free or low-cost options are available through state-funded programs.`,
    },
  ];

  const structuredData: any[] = [
    {
      "@context": "https://schema.org",
      "@type": "MedicalWebPage",
      name: pageTitle,
      description: `Find ${substance.conditionName.toLowerCase()} treatment in ${stateName}.`,
      url: `https://rehablookup.com/${slug}`,
      about: { "@type": "MedicalCondition", name: substance.conditionName },
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
      title: `${substance.title} in ${s.name}`,
      href: `/${substanceSlug}/${s.slug}`,
    }));

  const otherSubstances = substancePages
    .filter((s) => s.slug !== substanceSlug)
    .slice(0, 6)
    .map((s) => ({
      title: `${s.title} in ${stateName}`,
      href: `/${s.slug}/${stateSlug}`,
    }));

  const cityLinks = stateData.cities.slice(0, 6).map((c) => ({
    title: `Rehab in ${c.name}`,
    href: `/rehab-centers/${stateSlug}/${c.slug}`,
  }));

  return (
    <SEOLandingTemplate
      title={pageTitle}
      metaTitle={`${substance.title} in ${stateName} (${abbreviation}) — Find Help | RehabLookup`}
      metaDescription={`Find ${substance.conditionName.toLowerCase()} treatment centers in ${stateName}. Compare ${facilities.length}+ verified programs, check insurance, get help today.`}
      canonical={`https://rehablookup.com/${slug}`}
      structuredData={structuredData}
      breadcrumbs={[
        { name: "Home", url: "/" },
        { name: substance.title, url: `/${substanceSlug}` },
        { name: stateName, url: `/${slug}` },
      ]}
      heroTitle={pageTitle}
      heroSubtitle={`Find verified ${substance.conditionName.toLowerCase()} treatment programs across ${stateName}. Every facility is checked for licensing, accreditation, and clinical quality.`}
      heroLocation={stateName}
      heroBadge="Verified Programs"
      introContent={`Searching for ${substance.conditionName.toLowerCase()} treatment in ${stateName}? RehabLookup connects you with accredited facilities across the state offering evidence-based care for ${substance.conditionName.toLowerCase()}. ${stateData.cities.length > 5 ? `${stateName} has treatment centers in cities like ${stateData.cities.slice(0, 4).map(c => c.name).join(", ")}, and more.` : `Treatment programs are available throughout ${stateName}.`} Whether you need medical detox, residential treatment, or outpatient support, our verified directory helps you compare programs and find the right fit.`}
      sections={[
        {
          heading: `Understanding ${substance.conditionName} Treatment in ${stateName}`,
          content: `${substance.conditionName} treatment in ${stateName} follows evidence-based protocols that may include medical detoxification, behavioral therapy, medication-assisted treatment, and long-term aftercare planning. Treatment intensity depends on the severity of the addiction, co-occurring mental health conditions, and individual circumstances. ${stateName} facilities offer a full continuum of care from intensive inpatient programs to flexible outpatient options.`,
        },
        {
          heading: `Finding the Right Program in ${stateName}`,
          content: `When choosing a ${substance.conditionName.toLowerCase()} treatment program in ${stateName}, consider: the facility's accreditation and licensing status, available treatment modalities, staff qualifications, insurance acceptance, and aftercare support. Programs listed on RehabLookup are verified for proper credentials and evidence-based approaches. Many offer free benefits verification to help you understand your coverage before admission.`,
        },
      ]}
      facilities={facilities}
      isLoading={isLoading}
      facilityCount={facilities.length}
      showMoreLink={`/rehab-centers/${stateSlug}`}
      faqs={faqs}
      faqTreatmentType={substance.title}
      faqLocation={{ city: "", state: stateName }}
      relatedCityLinks={[...cityLinks, ...otherStates.slice(0, 4)]}
      relatedStateLinks={otherSubstances}
      showTreatmentLinks
      showInsuranceLinks
      ctaTitle={`Get ${substance.title} Help in ${stateName}`}
      ctaSubtitle={`Our team matches you with the best ${substance.conditionName.toLowerCase()} programs in ${stateName}. Free. Confidential. No obligation.`}
    >
      <SmartInternalLinks
        pageType="state"
        stateSlug={stateSlug!}
        stateName={stateName}
      />
    </SEOLandingTemplate>
  );
}
