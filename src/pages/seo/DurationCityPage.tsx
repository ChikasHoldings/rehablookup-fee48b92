import { useMemo } from "react";
import { Navigate, useParams, useLocation } from "react-router-dom";
import { SEOLandingTemplate } from "@/components/seo/SEOLandingTemplate";
import { useStaticFacilities } from "@/hooks/useStaticFacilities";
import { treatmentCenters } from "@/data/treatmentCenters";
import { statesData } from "@/data/locationSeoData";
import { SmartInternalLinks } from "@/components/seo/SmartInternalLinks";
import { shouldEmitFAQSchema } from "@/utils/seoPageValidator";

// Import duration config from DurationSettingPage
const durationConfigs: { slug: string; title: string; filterKeys: string[] }[] = [
  { slug: "30-day-rehab-programs", title: "30-Day Rehab Programs", filterKeys: ["30-day", "30 day", "short-term"] },
  { slug: "60-day-rehab-programs", title: "60-Day Rehab Programs", filterKeys: ["60-day", "60 day"] },
  { slug: "90-day-rehab-programs", title: "90-Day Rehab Programs", filterKeys: ["90-day", "90 day", "long-term"] },
  { slug: "long-term-rehab-programs", title: "Long-Term Rehab Programs", filterKeys: ["long-term", "long term", "extended"] },
  { slug: "beach-rehab-programs", title: "Beach Rehab Programs", filterKeys: ["beach", "coastal", "oceanfront"] },
  { slug: "mountain-rehab-programs", title: "Mountain Rehab Programs", filterKeys: ["mountain", "wilderness", "nature"] },
];

export default function DurationCityPage() {
  const { stateSlug, citySlug } = useParams<{ stateSlug: string; citySlug: string }>();
  const location = useLocation();
  const { data: approvedFacilities = [], isLoading } = useStaticFacilities();

  const durationSlug = useMemo(() => {
    const parts = location.pathname.replace(/^\//, "").split("/");
    return parts[0] || "";
  }, [location.pathname]);

  const config = useMemo(() => durationConfigs.find((d) => d.slug === durationSlug) || null, [durationSlug]);
  const stateData = useMemo(() => statesData.find((s) => s.slug === stateSlug) || null, [stateSlug]);
  const cityData = useMemo(() => {
    if (!stateData) return null;
    return stateData.cities.find((c) => c.slug === citySlug) || null;
  }, [stateData, citySlug]);

  const facilities = useMemo(() => {
    if (!config || !stateData || !cityData) return [];
    const all = [...treatmentCenters, ...approvedFacilities];
    const keywords = config.filterKeys.map((k) => k.toLowerCase());
    const cityLower = cityData.name.toLowerCase();
    const stateLower = stateData.name.toLowerCase();

    const cityMatched = all.filter((f) => {
      const cityMatch = f.city.toLowerCase() === cityLower && f.state.toLowerCase() === stateLower;
      const keyMatch = f.treatmentTypes?.some((t) => keywords.some((k) => t.toLowerCase().includes(k))) ||
        keywords.some((k) => f.description?.toLowerCase().includes(k));
      return cityMatch && keyMatch;
    });

    if (cityMatched.length >= 3) return cityMatched.slice(0, 12);
    const cityAll = all.filter((f) => f.city.toLowerCase() === cityLower && f.state.toLowerCase() === stateLower);
    if (cityAll.length >= 3) return cityAll.slice(0, 12);
    return all.filter((f) => f.state.toLowerCase() === stateLower).slice(0, 12);
  }, [approvedFacilities, config, stateData, cityData]);

  if (!config || !stateData || !cityData) {
    return <Navigate to="/treatment-types" replace />;
  }

  const { name: stateName, abbreviation } = stateData;
  const cityName = cityData.name;
  const pageTitle = `${config.title} in ${cityName}, ${abbreviation}`;
  const canonicalPath = `/${durationSlug}/${stateSlug}/${citySlug}`;

  const faqs = [
    {
      question: `What are ${config.title.toLowerCase()} like in ${cityName}?`,
      answer: `${config.title} in ${cityName}, ${stateName} typically include structured daily schedules with individual therapy, group counseling, evidence-based treatment modalities, and aftercare planning. Programs are tailored to individual needs and severity of addiction.`,
    },
    {
      question: `How much do ${config.title.toLowerCase()} cost in ${cityName}?`,
      answer: `Costs vary based on the facility, level of care, and amenities. Many programs in ${cityName} accept insurance, and most plans cover addiction treatment under federal parity laws. Free or low-cost options may be available through state-funded programs.`,
    },
    {
      question: `Does insurance cover ${config.title.toLowerCase()} in ${cityName}?`,
      answer: `Yes, most insurance plans cover addiction treatment in ${cityName} under the Mental Health Parity Act. Coverage details vary by plan — contact facilities directly to verify your specific benefits.`,
    },
    {
      question: `How do I choose the right program length in ${cityName}?`,
      answer: `Program length should be based on the severity of addiction, co-occurring conditions, treatment history, and support system. Research consistently shows longer treatment durations improve outcomes. A clinical assessment can help determine the most appropriate duration.`,
    },
  ];

  const structuredData: any[] = [
    {
      "@context": "https://schema.org",
      "@type": "MedicalWebPage",
      name: pageTitle,
      description: `Find ${config.title.toLowerCase()} in ${cityName}, ${stateName}.`,
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
      title: `${config.title} in ${c.name}`,
      href: `/${durationSlug}/${stateSlug}/${c.slug}`,
    }));

  const otherDurations = durationConfigs
    .filter((d) => d.slug !== durationSlug)
    .slice(0, 6)
    .map((d) => ({
      title: `${d.title} in ${cityName}`,
      href: `/${d.slug}/${stateSlug}/${citySlug}`,
    }));

  return (
    <SEOLandingTemplate
      title={pageTitle}
      metaTitle={`${config.title} in ${cityName}, ${abbreviation} | RehabLookup`}
      metaDescription={`Find ${config.title.toLowerCase()} in ${cityName}, ${stateName}. Compare verified treatment facilities and get matched today.`}
      canonical={`https://rehablookup.com${canonicalPath}`}
      structuredData={structuredData}
      breadcrumbs={[
        { name: "Home", url: "/" },
        { name: config.title, url: `/${durationSlug}` },
        { name: stateName, url: `/${durationSlug}/${stateSlug}` },
        { name: cityName, url: canonicalPath },
      ]}
      heroTitle={pageTitle}
      heroSubtitle={`Compare verified ${config.title.toLowerCase()} in ${cityName}, ${stateName}. Find the right duration and level of care for lasting recovery.`}
      heroLocation={`${cityName}, ${abbreviation}`}
      heroBadge="Treatment Programs"
      introContent={`Looking for ${config.title.toLowerCase()} in ${cityName}? RehabLookup connects you with verified treatment facilities offering structured programs designed for effective recovery. Compare options, check insurance coverage, and get matched with the right program.`}
      sections={[
        {
          heading: `${config.title} in ${cityName}`,
          content: `${cityName} offers accredited treatment programs with varying durations to match individual needs. These programs combine medical supervision, behavioral therapy, and comprehensive aftercare planning. The right program length depends on the severity of addiction and individual circumstances.`,
        },
        {
          heading: `Choosing the Right Duration`,
          content: `Research consistently shows that longer treatment durations improve recovery outcomes. When choosing a program in ${cityName}, consider your addiction severity, co-occurring conditions, and support system. All programs on RehabLookup are verified for proper licensing and evidence-based approaches.`,
        },
      ]}
      facilities={facilities}
      isLoading={isLoading}
      facilityCount={facilities.length}
      showMoreLink={`/rehab-centers/${stateSlug}/${citySlug}`}
      faqs={faqs}
      faqTreatmentType={config.title}
      faqLocation={{ city: cityName, state: stateName }}
      relatedCityLinks={nearbyCities}
      relatedStateLinks={otherDurations}
      showTreatmentLinks
      showInsuranceLinks
      ctaTitle={`Find ${config.title} in ${cityName}`}
      ctaSubtitle={`Our team matches you with the best programs in ${cityName}. Free. Confidential. No obligation.`}
    >
      <SmartInternalLinks
        pageType="city"
        stateSlug={stateSlug!}
        stateName={stateName}
        citySlug={citySlug}
        cityName={cityName}
      />
    </SEOLandingTemplate>
  );
}
