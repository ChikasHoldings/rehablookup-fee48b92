import { useMemo } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { SEOLandingTemplate } from "@/components/seo/SEOLandingTemplate";
import { seekerGuidePages } from "@/data/seoSeekerGuidesConfig";

export default function SeekerGuidePage() {
  const location = useLocation();
  const slug = location.pathname.replace(/^\//, "");
  const config = seekerGuidePages.find((p) => p.slug === slug);

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
