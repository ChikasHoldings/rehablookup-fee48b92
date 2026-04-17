import { useMemo } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { SEOLandingTemplate } from "@/components/seo/SEOLandingTemplate";
import { useStaticFacilities } from "@/hooks/useStaticFacilities";
import { treatmentCenters } from "@/data/treatmentCenters";
import { substancePages, type SubstanceConfig } from "@/data/seoSubstanceConfig";
import { topCities, seoTreatmentTypes, getCityTreatmentSlug } from "@/data/seoPageConfig";
import { validatePage } from "@/utils/seoPageValidator";

export default function SubstanceTreatmentPage() {
  const location = useLocation();
  const slug = location.pathname.replace(/^\//, "");
  const { data: approvedFacilities = [], isLoading } = useStaticFacilities();

  const substance = useMemo(() => {
    return substancePages.find((s) => s.slug === slug) || null;
  }, [slug]);

  const facilities = useMemo(() => {
    if (!substance) return [];
    const allFacilities = [...treatmentCenters, ...approvedFacilities];
    const keywords = substance.filterKeys.map((k) => k.toLowerCase());

    let filtered = allFacilities.filter((f) => {
      return (
        f.treatmentTypes?.some((t) =>
          keywords.some((k) => t.toLowerCase().includes(k))
        ) || keywords.some((k) => f.description?.toLowerCase().includes(k))
      );
    });

    return filtered.slice(0, 12);
  }, [approvedFacilities, substance]);

  const validation = validatePage("substance-treatment", facilities.length);

  const relatedCityLinks = useMemo(() => {
    if (!substance) return [];
    const treatmentType = seoTreatmentTypes.find(
      (t) => t.slug === substance.relatedTreatmentSlug
    );
    if (!treatmentType) return [];
    return topCities.slice(0, 8).map((c) => ({
      title: `${treatmentType.shortLabel} in ${c.city}`,
      href: `/${getCityTreatmentSlug(treatmentType, c)}`,
    }));
  }, [substance]);

  if (!substance) {
    return <Navigate to="/404" replace />;
  }

  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "MedicalWebPage",
      name: substance.title,
      description: substance.metaDescription,
      url: `https://rehablookup.com/${slug}`,
      about: { "@type": "MedicalCondition", name: substance.conditionName },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: substance.faqs.map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: { "@type": "Answer", text: faq.answer },
      })),
    },
  ];

  return (
    <SEOLandingTemplate
      title={substance.title}
      metaTitle={substance.metaTitle}
      metaDescription={substance.metaDescription}
      canonical={`https://rehablookup.com/${slug}`}
      noindex={!validation.shouldIndex}
      structuredData={structuredData}
      breadcrumbs={[
        { name: "Home", url: "/" },
        { name: "Treatment Types", url: "/treatment-types" },
        { name: substance.title, url: `/${slug}` },
      ]}
      heroTitle={substance.title}
      heroSubtitle={substance.heroSubtitle}
      heroBadge="Evidence-Based Treatment"
      introContent={substance.introContent}
      sections={substance.sections}
      whatToExpect={substance.whatToExpect}
      benefits={substance.benefits}
      facilities={facilities}
      isLoading={isLoading}
      facilityCount={facilities.length}
      showMoreLink="/rehab-centers"
      faqs={substance.faqs}
      faqTreatmentType={substance.title}
      relatedCityLinks={relatedCityLinks}
      showTreatmentLinks
      showInsuranceLinks
      showNearMeLinks
      ctaTitle={`Get Help for ${substance.conditionName} Today`}
      ctaSubtitle={`Connect with accredited treatment programs specializing in ${substance.conditionName.toLowerCase()}. Confidential. No obligation.`}
    />
  );
}
