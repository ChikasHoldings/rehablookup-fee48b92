import { useMemo } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { SEOLandingTemplate } from "@/components/seo/SEOLandingTemplate";
import { useStaticFacilities } from "@/hooks/useStaticFacilities";
import { treatmentCenters } from "@/data/treatmentCenters";
import { treatmentHubPages, topCities, seoTreatmentTypes, getCityTreatmentSlug } from "@/data/seoPageConfig";

export default function TreatmentHubPage() {
  const location = useLocation();
  const slug = location.pathname.replace(/^\//, "");
  const config = treatmentHubPages.find((p) => p.slug === slug);
  const { data: approvedFacilities = [], isLoading } = useStaticFacilities();

  const matchingTreatment = useMemo(() => config ? seoTreatmentTypes.find((t) => t.filterKey === config.filterKey) : null, [config]);

  const facilities = useMemo(() => {
    if (!config) return [];
    const allFacilities = [...treatmentCenters, ...approvedFacilities];
    const filterLower = config.filterKey.toLowerCase();
    return allFacilities
      .filter((f) => f.treatmentTypes?.some((t) => t.toLowerCase().includes(filterLower)) || f.description?.toLowerCase().includes(filterLower))
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
    if (!matchingTreatment) return [];
    return topCities.slice(0, 12).map((city) => ({
      title: `${matchingTreatment.shortLabel} in ${city.city}`,
      href: `/${getCityTreatmentSlug(matchingTreatment, city)}`,
    }));
  }, [matchingTreatment]);

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
        { name: "Treatment Types", url: "/treatment-types" },
        { name: config.title, url: `/${config.slug}` },
      ]}
      heroTitle={config.title}
      heroSubtitle={config.heroSubtitle}
      heroBadge="Accredited Programs"
      introContent={config.overview}
      whatToExpect={config.whatToExpect}
      benefits={config.benefits}
      facilities={facilities}
      isLoading={isLoading}
      facilityCount={facilities.length}
      showMoreLink="/rehab-centers"
      faqs={config.faqs}
      faqTreatmentType={config.title}
      relatedCityLinks={relatedCityLinks}
      showTreatmentLinks
      showInsuranceLinks
      showNearMeLinks
      ctaTitle={`Find ${config.title} Today`}
      ctaSubtitle={`Our concierge team will match you with accredited ${config.title.toLowerCase()} based on your specific needs, insurance, and preferences.`}
    />
  );
}
