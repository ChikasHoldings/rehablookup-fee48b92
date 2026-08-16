import { useMemo } from "react";
import { useLocation } from "react-router-dom";
import { InlineNotFound } from "@/components/InlineNotFound";
import { SEOLandingTemplate } from "@/components/seo/SEOLandingTemplate";
import { useStaticFacilities } from "@/hooks/useStaticFacilities";
import { treatmentCenters } from "@/data/treatmentCenters";
import { demographicPages } from "@/data/seoDemographicConfig";
import { topCities, seoTreatmentTypes, getCityTreatmentSlug } from "@/data/seoPageConfig";
import { validatePage } from "@/utils/seoPageValidator";
import { TOPIC_HERO_IMAGES } from "@/data/locationImages";

export default function DemographicTreatmentPage() {
  const location = useLocation();
  const slug = location.pathname.replace(/^\//, "");
  const config = demographicPages.find((p) => p.slug === slug);
  const { data: approvedFacilities = [], isLoading } = useStaticFacilities();

  const facilities = useMemo(() => {
    if (!config) return [];
    const allFacilities = [...treatmentCenters, ...approvedFacilities];
    return allFacilities
      .filter((f) =>
        config.filterKeys.some((key) =>
          f.treatmentTypes?.some((t) => t.toLowerCase().includes(key.toLowerCase())) ||
          f.description?.toLowerCase().includes(key.toLowerCase())
        )
      )
      .sort((a, b) => {
        const aPro = (a as { isPro?: boolean }).isPro ? 1 : 0;
        const bPro = (b as { isPro?: boolean }).isPro ? 1 : 0;
        if (bPro !== aPro) return bPro - aPro;
        if ((a.featured ? 1 : 0) !== (b.featured ? 1 : 0)) return (b.featured ? 1 : 0) - (a.featured ? 1 : 0);
        const aScore = (a as { calculatedRankingScore?: number }).calculatedRankingScore || 0;
        const bScore = (b as { calculatedRankingScore?: number }).calculatedRankingScore || 0;
        if (bScore !== aScore) return bScore - aScore;
        return a.name.localeCompare(b.name);
      })
      .slice(0, 12);
  }, [approvedFacilities, config]);

  const validation = validatePage("demographic-treatment", facilities.length);

  const relatedCityLinks = useMemo(() => {
    const treatmentType = seoTreatmentTypes[0];
    return topCities.slice(0, 8).map((city) => ({
      title: `${treatmentType.shortLabel} in ${city.city}`,
      href: `/${getCityTreatmentSlug(treatmentType, city)}`,
    }));
  }, []);

  if (!config) {
    return <InlineNotFound />;
  }

  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: config.faqs.map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: { "@type": "Answer", text: faq.answer },
      })),
    },
    {
      "@context": "https://schema.org",
      "@type": "MedicalWebPage",
      name: config.title,
      description: config.metaDescription,
      url: `https://rehablookup.com/${config.slug}`,
      about: { "@type": "MedicalCondition", name: "Substance Use Disorder" },
      specialty: "Addiction Medicine",
      lastReviewed: new Date().toISOString().split("T")[0],
    },
  ];

  return (
    <SEOLandingTemplate
      title={config.title}
      metaTitle={config.metaTitle}
      metaDescription={config.metaDescription}
      canonical={`https://rehablookup.com/${config.slug}`}
      noindex={!validation.shouldIndex}
      structuredData={structuredData}
      breadcrumbs={[
        { name: "Home", url: "/" },
        { name: "Treatment Programs", url: "/rehab-centers" },
        { name: config.title, url: `/${config.slug}` },
      ]}
      heroTitle={config.title}
      heroSubtitle={config.heroSubtitle}
      heroBadge="Specialized Programs"
      heroImage={TOPIC_HERO_IMAGES.community}
      introContent={config.introContent}
      sections={config.sections}
      whatToExpect={config.whatToExpect}
      benefits={config.benefits}
      facilities={facilities}
      isLoading={isLoading}
      facilityCount={facilities.length}
      showMoreLink="/rehab-centers"
      faqs={config.faqs}
      faqTreatmentType={config.population}
      relatedCityLinks={relatedCityLinks}
      showTreatmentLinks
      showInsuranceLinks
      showNearMeLinks
      ctaTitle={`Find ${config.population} Treatment Programs`}
      ctaSubtitle={`Compare accredited programs specializing in ${config.population.toLowerCase()} care, then contact them directly. Free to search, no obligation.`}
    />
  );
}
