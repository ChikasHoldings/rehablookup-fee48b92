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
    return allFacilities.filter((f) => f.treatmentTypes?.some((t) => t.toLowerCase().includes(filterLower)) || f.description?.toLowerCase().includes(filterLower)).sort((a, b) => (a.featured && !b.featured ? -1 : !a.featured && b.featured ? 1 : 0)).slice(0, 12);
  }, [approvedFacilities, config]);

  const relatedCityLinks = useMemo(() => {
    if (!matchingTreatment) return [];
    return topCities.slice(0, 12).map((city) => ({ title: `${matchingTreatment.shortLabel} in ${city.city}`, href: `/${getCityTreatmentSlug(matchingTreatment, city)}` }));
  }, [matchingTreatment]);

  if (!config) {
    return <Navigate to="/404" replace />;
  }

  // Find matching treatment type for city links
  const matchingTreatment = seoTreatmentTypes.find(
    (t) => t.filterKey === config.filterKey
  );

  // Filter facilities by treatment type
  const facilities = useMemo(() => {
    const allFacilities = [...treatmentCenters, ...approvedFacilities];
    const filterLower = config.filterKey.toLowerCase();

    const filtered = allFacilities.filter(
      (f) =>
        f.treatmentTypes?.some((t) => t.toLowerCase().includes(filterLower)) ||
        f.description?.toLowerCase().includes(filterLower)
    );

    // Sort: featured/pro first
    return filtered
      .sort((a, b) => {
        if (a.featured && !b.featured) return -1;
        if (!a.featured && b.featured) return 1;
        return 0;
      })
      .slice(0, 12);
  }, [approvedFacilities, config.filterKey]);

  // City links for this treatment type
  const relatedCityLinks = useMemo(() => {
    if (!matchingTreatment) return [];
    return topCities.slice(0, 12).map((city) => ({
      title: `${matchingTreatment.shortLabel} in ${city.city}`,
      href: `/${getCityTreatmentSlug(matchingTreatment, city)}`,
    }));
  }, [matchingTreatment]);

  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "MedicalWebPage",
      name: config.title,
      description: config.metaDescription,
      url: `https://rehablookup.com/${config.slug}`,
      about: { "@type": "MedicalCondition", name: "Substance Use Disorder" },
    },
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
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: "https://rehablookup.com" },
        { "@type": "ListItem", position: 2, name: "Treatment Types", item: "https://rehablookup.com/treatment-types" },
        { "@type": "ListItem", position: 3, name: config.title, item: `https://rehablookup.com/${config.slug}` },
      ],
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
