import { useMemo } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { SEOLandingTemplate } from "@/components/seo/SEOLandingTemplate";
import { useStaticFacilities } from "@/hooks/useStaticFacilities";
import { treatmentCenters } from "@/data/treatmentCenters";
import { demographicPages } from "@/data/seoDemographicConfig";
import { topCities, seoTreatmentTypes, getCityTreatmentSlug } from "@/data/seoPageConfig";

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
        const aPro = (a as any).isPro ? 1 : 0;
        const bPro = (b as any).isPro ? 1 : 0;
        if (bPro !== aPro) return bPro - aPro;
        if ((a.featured ? 1 : 0) !== (b.featured ? 1 : 0)) return (b.featured ? 1 : 0) - (a.featured ? 1 : 0);
        const aScore = (a as any).calculatedRankingScore || 0;
        const bScore = (b as any).calculatedRankingScore || 0;
        if (bScore !== aScore) return bScore - aScore;
        return a.name.localeCompare(b.name);
      })
      .slice(0, 12);
  }, [approvedFacilities, config]);

  const relatedCityLinks = useMemo(() => {
    const treatmentType = seoTreatmentTypes[0];
    return topCities.slice(0, 8).map((city) => ({
      title: `${treatmentType.shortLabel} in ${city.city}`,
      href: `/${getCityTreatmentSlug(treatmentType, city)}`,
    }));
  }, []);

  if (!config) {
    return <Navigate to="/404" replace />;
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
      structuredData={structuredData}
      breadcrumbs={[
        { name: "Home", url: "/" },
        { name: "Treatment Programs", url: "/rehab-centers" },
        { name: config.title, url: `/${config.slug}` },
      ]}
      heroTitle={config.title}
      heroSubtitle={config.heroSubtitle}
      heroBadge="Specialized Programs"
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
      ctaSubtitle={`Our concierge team will match you with accredited programs specializing in ${config.population.toLowerCase()} care. Confidential. No obligation.`}
    />
  );
}
