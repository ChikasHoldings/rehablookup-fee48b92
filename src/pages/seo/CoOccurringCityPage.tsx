import { useMemo } from "react";
import { Navigate, useParams, useLocation } from "react-router-dom";
import { SEOLandingTemplate } from "@/components/seo/SEOLandingTemplate";
import { useStaticFacilities } from "@/hooks/useStaticFacilities";
import { treatmentCenters } from "@/data/treatmentCenters";
import { coOccurringPages } from "@/pages/seo/CoOccurringPage";
import { statesData } from "@/data/locationSeoData";
import { SmartInternalLinks } from "@/components/seo/SmartInternalLinks";
import { shouldEmitFAQSchema } from "@/utils/seoPageValidator";

export default function CoOccurringCityPage() {
  const { stateSlug, citySlug } = useParams<{ stateSlug: string; citySlug: string }>();
  const location = useLocation();
  const { data: approvedFacilities = [], isLoading } = useStaticFacilities();

  const conditionSlug = useMemo(() => {
    const parts = location.pathname.replace(/^\//, "").split("/");
    return parts[0] || "";
  }, [location.pathname]);

  const config = useMemo(() => coOccurringPages.find((p) => p.slug === conditionSlug) || null, [conditionSlug]);
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
  const canonicalPath = `/${conditionSlug}/${stateSlug}/${citySlug}`;

  const faqs = config.faqs.map((f) => ({
    question: f.question.replace(/\?$/, ` in ${cityName}?`),
    answer: `${f.answer} Treatment programs in ${cityName}, ${stateName} provide specialized dual diagnosis care.`,
  }));

  const structuredData: any[] = [
    {
      "@context": "https://schema.org",
      "@type": "MedicalWebPage",
      name: pageTitle,
      description: `Find ${config.title.toLowerCase()} programs in ${cityName}, ${stateName}.`,
      url: `https://rehablookup.com${canonicalPath}`,
      about: { "@type": "MedicalCondition", name: config.conditionName },
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
      href: `/${conditionSlug}/${stateSlug}/${c.slug}`,
    }));

  const otherConditions = coOccurringPages
    .filter((p) => p.slug !== conditionSlug)
    .slice(0, 6)
    .map((p) => ({
      title: `${p.title} in ${cityName}`,
      href: `/${p.slug}/${stateSlug}/${citySlug}`,
    }));

  return (
    <SEOLandingTemplate
      title={pageTitle}
      metaTitle={`${config.title} in ${cityName}, ${abbreviation} | RehabLookup`}
      metaDescription={`Find ${config.title.toLowerCase()} programs in ${cityName}, ${stateName}. Compare verified dual diagnosis facilities. Get help today.`}
      canonical={`https://rehablookup.com${canonicalPath}`}
      structuredData={structuredData}
      breadcrumbs={[
        { name: "Home", url: "/" },
        { name: config.title, url: `/${conditionSlug}` },
        { name: stateName, url: `/${conditionSlug}/${stateSlug}` },
        { name: cityName, url: canonicalPath },
      ]}
      heroTitle={pageTitle}
      heroSubtitle={`Find specialized ${config.conditionName.toLowerCase()} and addiction treatment programs in ${cityName}, ${stateName}.`}
      heroBadge="Dual Diagnosis"
      heroLocation={`${cityName}, ${abbreviation}`}
      introContent={`Looking for integrated ${config.conditionName.toLowerCase()} and addiction treatment in ${cityName}? RehabLookup connects you with verified dual diagnosis programs that address both conditions simultaneously for the best chance at lasting recovery.`}
      sections={config.sections.map((s) => ({
        heading: `${s.heading} in ${cityName}`,
        content: s.content,
      }))}
      whatToExpect={config.whatToExpect}
      benefits={config.benefits}
      facilities={facilities}
      isLoading={isLoading}
      facilityCount={facilities.length}
      showMoreLink={`/rehab-centers/${stateSlug}/${citySlug}`}
      faqs={faqs}
      faqTreatmentType={config.conditionName}
      faqLocation={{ city: cityName, state: stateName }}
      relatedCityLinks={nearbyCities}
      relatedStateLinks={otherConditions}
      showTreatmentLinks
      showInsuranceLinks
      ctaTitle={`Get ${config.title} Help in ${cityName}`}
      ctaSubtitle={`Our team matches you with the best dual diagnosis programs in ${cityName}. Free. Confidential. No obligation.`}
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
