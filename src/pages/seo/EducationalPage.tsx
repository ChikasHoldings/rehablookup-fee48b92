import { useMemo } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { SEOLandingTemplate } from "@/components/seo/SEOLandingTemplate";
import { useStaticFacilities } from "@/hooks/useStaticFacilities";
import { shouldEmitFAQSchema } from "@/utils/seoPageValidator";
import { whatIsPages, withdrawalSignsPages, type EducationalPageConfig } from "@/data/seoEducationalConfig";

const allPages: EducationalPageConfig[] = [...whatIsPages, ...withdrawalSignsPages];

export default function EducationalPage() {
  const { pathname } = useLocation();
  const slug = pathname.replace(/^\//, "");

  const { data: allFacilities = [], isLoading } = useStaticFacilities();

  const config = allPages.find((p) => p.slug === slug);

  const facilities = useMemo(() => {
    if (!config) return [];
    const keys = config.filterKeys.map((k) => k.toLowerCase());
    return allFacilities
      .filter((f) => {
        const desc = (f.description || "").toLowerCase();
        const name = (f.name || "").toLowerCase();
        return keys.some((k) => desc.includes(k) || name.includes(k));
      })
      .slice(0, 12);
  }, [config, allFacilities]);

  if (!config) {
    return <Navigate to="/404" replace />;
  }

  const structuredData: object[] = [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      name: config.title,
      headline: config.title,
      description: config.metaDescription,
      url: `https://rehablookup.com/${config.slug}`,
      publisher: {
        "@type": "Organization",
        name: "RehabLookup",
        url: "https://rehablookup.com",
      },
      dateModified: new Date().toISOString().split("T")[0],
    },
  ];
  if (shouldEmitFAQSchema(config.faqs)) {
    structuredData.push({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: config.faqs.map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: { "@type": "Answer", text: faq.answer },
      })),
    });
  }

  return (
    <SEOLandingTemplate
      title={config.title}
      metaTitle={config.metaTitle}
      metaDescription={config.metaDescription}
      canonical={`https://rehablookup.com/${config.slug}`}
      structuredData={structuredData}
      breadcrumbs={[
        { name: "Home", url: "/" },
        { name: "Treatment Options", url: "/treatment-types" },
        { name: config.title, url: `/${config.slug}` },
      ]}
      heroTitle={config.title}
      heroSubtitle={config.heroSubtitle}
      heroBadge="Evidence-Based Guide"
      introContent={config.introContent}
      sections={config.sections}
      whatToExpect={config.whatToExpect}
      benefits={config.benefits}
      facilities={facilities}
      isLoading={isLoading}
      facilityCount={facilities.length}
      faqs={config.faqs}
      faqTreatmentType={config.conditionName}
      showTreatmentLinks
      showInsuranceLinks
      showNearMeLinks
      ctaTitle={`Need Help with ${config.conditionName}?`}
      ctaSubtitle="Our team provides free, confidential guidance to help you find the right treatment program. Call or submit a request today."
    />
  );
}
