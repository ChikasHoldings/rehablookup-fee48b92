import { useMemo } from "react";
import { useLocation } from "react-router-dom";
import { InlineNotFound } from "@/components/InlineNotFound";
import { SEOLandingTemplate } from "@/components/seo/SEOLandingTemplate";
import { useStaticFacilities } from "@/hooks/useStaticFacilities";
import { shouldEmitFAQSchema } from "@/utils/seoPageValidator";
import { whatIsPages, withdrawalSignsPages, type EducationalPageConfig } from "@/data/seoEducationalConfig";
import { TOPIC_HERO_IMAGES } from "@/data/locationImages";

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
    return <InlineNotFound />;
  }

  // Withdrawal / symptom pages are medical-intent content; emit
  // MedicalWebPage so Google treats them as health content rather than a
  // generic Article. "What is X" pages stay as Article. Both gain a stable
  // dateModified from the config (config.lastReviewed) so the timestamp
  // doesn't churn every deploy.
  const isMedicalContent = withdrawalSignsPages.some((p) => p.slug === config.slug);
  const lastReviewed =
    (config as { lastReviewed?: string }).lastReviewed
    ?? "2025-01-01";

  const baseSchema = {
    "@context": "https://schema.org",
    name: config.title,
    headline: config.title,
    description: config.metaDescription,
    url: `https://rehablookup.com/${config.slug}`,
    publisher: {
      "@type": "Organization",
      name: "RehabLookup",
      url: "https://rehablookup.com",
    },
    datePublished: lastReviewed,
    dateModified: lastReviewed,
  };

  const structuredData: object[] = [
    isMedicalContent
      ? {
          ...baseSchema,
          "@type": "MedicalWebPage",
          about: {
            "@type": "MedicalCondition",
            name: config.conditionName,
          },
          audience: {
            "@type": "PeopleAudience",
            audienceType: "Patients and Families",
          },
          lastReviewed,
          reviewedBy: {
            "@type": "Organization",
            name: "RehabLookup Editorial Team",
            url: "https://rehablookup.com/editorial-policy",
          },
        }
      : {
          ...baseSchema,
          "@type": "Article",
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
      heroImage={TOPIC_HERO_IMAGES.editorial}
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
