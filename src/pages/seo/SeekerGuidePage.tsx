import { useMemo } from "react";
import { useLocation } from "react-router-dom";
import { InlineNotFound } from "@/components/InlineNotFound";
import { SEOLandingTemplate } from "@/components/seo/SEOLandingTemplate";
import { seekerGuidePages } from "@/data/seoSeekerGuidesConfig";
import { TOPIC_HERO_IMAGES } from "@/data/locationImages";

export default function SeekerGuidePage() {
  const location = useLocation();
  const slug = location.pathname.replace(/^\//, "");
  const config = seekerGuidePages.find((p) => p.slug === slug);

  if (!config) {
    return <InlineNotFound />;
  }

  const url = `https://rehablookup.com/${config.slug}`;
  // Seeker guides like "how-to-stage-an-intervention" / "how-to-pay-for-rehab"
  // are procedural content. Emit HowTo (with step list from config.actionSteps)
  // alongside the FAQPage so Google can surface step-by-step rich results.
  // "How-to" intent is detected by slug prefix + presence of action steps.
  const isHowTo =
    config.slug.startsWith("how-to-") && Array.isArray(config.actionSteps) && config.actionSteps.length > 0;

  const structuredData: object[] = [
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

  if (isHowTo) {
    structuredData.push({
      "@context": "https://schema.org",
      "@type": "HowTo",
      name: config.title,
      description: config.metaDescription,
      url,
      totalTime: "PT30M",
      step: config.actionSteps.map((s, i) => ({
        "@type": "HowToStep",
        position: i + 1,
        name: s.split(":")[0]?.slice(0, 80) ?? `Step ${i + 1}`,
        text: s,
      })),
    });
  } else {
    structuredData.push({
      "@context": "https://schema.org",
      "@type": "Article",
      name: config.title,
      headline: config.title,
      description: config.metaDescription,
      url,
      publisher: {
        "@type": "Organization",
        name: "RehabLookup",
        url: "https://rehablookup.com",
      },
      datePublished: "2025-01-01",
      dateModified: "2025-01-01",
    });
  }

  const relatedLinks = config.resources.map((r) => ({
    title: r.label,
    href: r.href,
  }));

  return (
    <SEOLandingTemplate
      title={config.title}
      metaTitle={config.metaTitle}
      metaDescription={config.metaDescription}
      canonical={`https://rehablookup.com/${config.slug}`}
      structuredData={structuredData}
      breadcrumbs={[
        { name: "Home", url: "/" },
        { name: "Family Resources", url: "/resources" },
        { name: config.title, url: `/${config.slug}` },
      ]}
      heroTitle={config.title}
      heroSubtitle={config.heroSubtitle}
      heroBadge="Family Guide"
      heroImage={TOPIC_HERO_IMAGES.community}
      introContent={config.introContent}
      sections={config.sections}
      whatToExpect={config.actionSteps}
      benefits={[]}
      facilities={[]}
      isLoading={false}
      facilityCount={0}
      faqs={config.faqs}
      faqTreatmentType="Family Support"
      relatedCityLinks={relatedLinks}
      showTreatmentLinks
      showInsuranceLinks
      showNearMeLinks
      ctaTitle="Need Help Finding Treatment?"
      ctaSubtitle="Our concierge team provides free, confidential guidance to help your family find the right treatment program. Call or submit a request today."
    />
  );
}
