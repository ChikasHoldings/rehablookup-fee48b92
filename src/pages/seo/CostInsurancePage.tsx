import { useMemo } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { SEOLandingTemplate } from "@/components/seo/SEOLandingTemplate";
import { useStaticFacilities } from "@/hooks/useStaticFacilities";
import { treatmentCenters } from "@/data/treatmentCenters";
import { costInsurancePages } from "@/data/seoPageConfig";

export default function CostInsurancePage() {
  const location = useLocation();
  const slug = location.pathname.replace(/^\//, "");
  const config = costInsurancePages.find((p) => p.slug === slug);
  const { data: approvedFacilities = [], isLoading } = useStaticFacilities();

  if (!config) {
    return <Navigate to="/404" replace />;
  }

  // Filter facilities (show relevant ones, e.g. Medicaid-accepting)
  const facilities = useMemo(() => {
    const allFacilities = [...treatmentCenters, ...approvedFacilities];

    if (config.filterKey) {
      const filterLower = config.filterKey.toLowerCase();
      return allFacilities
        .filter(
          (f) =>
            f.insuranceAccepted?.some((i) => i.toLowerCase().includes(filterLower)) ||
            f.treatmentTypes?.some((t) => t.toLowerCase().includes(filterLower))
        )
        .slice(0, 12);
    }

    // For generic cost pages, show featured facilities
    return allFacilities
      .sort((a, b) => {
        if (a.featured && !b.featured) return -1;
        if (!a.featured && b.featured) return 1;
        return 0;
      })
      .slice(0, 12);
  }, [approvedFacilities, config.filterKey]);

  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: config.title,
      description: config.metaDescription,
      url: `https://rehablookup.com/${config.slug}`,
      publisher: { "@type": "Organization", name: "RehabLookup", url: "https://rehablookup.com" },
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
        { "@type": "ListItem", position: 2, name: config.title, item: `https://rehablookup.com/${config.slug}` },
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
        { name: config.title, url: `/${config.slug}` },
      ]}
      heroTitle={config.title}
      heroSubtitle={config.heroSubtitle}
      heroBadge="Trusted Resource"
      sections={config.sections}
      facilities={facilities}
      isLoading={isLoading}
      facilityCount={facilities.length}
      showMoreLink="/rehab-centers"
      faqs={config.faqs}
      faqTreatmentType={config.title}
      showTreatmentLinks
      showInsuranceLinks
      showNearMeLinks
      ctaTitle="Need Help Finding Affordable Treatment?"
      ctaSubtitle="Our team will help you find treatment options that fit your budget and insurance. Confidential. No obligation."
    />
  );
}
