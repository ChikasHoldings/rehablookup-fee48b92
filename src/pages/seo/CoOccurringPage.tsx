import { useMemo } from "react";
import { useLocation, useParams } from "react-router-dom";
import { SEOLandingTemplate } from "@/components/seo/SEOLandingTemplate";
import { useStaticFacilities } from "@/hooks/useStaticFacilities";
import { treatmentCenters } from "@/data/treatmentCenters";
import { statesData } from "@/data/locationSeoData";
import { SmartInternalLinks } from "@/components/seo/SmartInternalLinks";
import { shouldEmitFAQSchema } from "@/utils/seoPageValidator";
import { NotFoundInPlace } from "@/components/seo/NotFoundInPlace";
import { TOPIC_HERO_IMAGES } from "@/data/locationImages";
import { coOccurringPages } from "@/pages/seo/coOccurringPagesData";


export default function CoOccurringPage() {
  const location = useLocation();
  const { stateSlug } = useParams<{ stateSlug: string }>();
  const slug = location.pathname.replace(/^\//, "").split("/")[0];
  const { data: approvedFacilities = [], isLoading } = useStaticFacilities();

  const config = useMemo(() => coOccurringPages.find((p) => p.slug === slug) || null, [slug]);
  const stateData = useMemo(() => stateSlug ? statesData.find((s) => s.slug === stateSlug) || null : null, [stateSlug]);

  const isStatePage = !!stateSlug && !!stateData;

  const facilities = useMemo(() => {
    if (!config) return [];
    const all = [...treatmentCenters, ...approvedFacilities];
    const keywords = config.filterKeys.map((k) => k.toLowerCase());

    let filtered = all.filter((f) => {
      const keyMatch = f.treatmentTypes?.some((t) => keywords.some((k) => t.toLowerCase().includes(k))) ||
        keywords.some((k) => f.description?.toLowerCase().includes(k));
      if (isStatePage) {
        return keyMatch && f.state.toLowerCase() === stateData!.name.toLowerCase();
      }
      return keyMatch;
    });

    if (isStatePage && filtered.length < 3) {
      filtered = all.filter((f) => f.state.toLowerCase() === stateData!.name.toLowerCase());
    }

    return filtered.slice(0, 12);
  }, [approvedFacilities, config, isStatePage, stateData]);

  if (!config) {
    return (
      <NotFoundInPlace
        title="Treatment type not found"
        message="We don't have a page for that co-occurring treatment yet. Browse all treatment types."
        backTo="/treatment-types"
        backLabel="Browse treatment types"
      />
    );
  }

  const pageTitle = isStatePage ? `${config.title} in ${stateData!.name}` : config.title;
  const canonicalPath = isStatePage ? `/${slug}/${stateSlug}` : `/${slug}`;

  const faqs = isStatePage
    ? config.faqs.map((f) => ({
        question: f.question.replace(/\?$/, ` in ${stateData!.name}?`).replace(/ in.*in /, " in "),
        answer: `${f.answer} In ${stateData!.name}, treatment programs are available across the state with options in ${stateData!.cities.slice(0, 3).map((c) => c.name).join(", ")}, and other cities.`,
      }))
    : config.faqs;

  const structuredData: object[] = [
    {
      "@context": "https://schema.org",
      "@type": "MedicalWebPage",
      name: pageTitle,
      description: config.metaDescription,
      url: `https://rehablookup.com${canonicalPath}`,
      about: { "@type": "MedicalCondition", name: config.conditionName },
      specialty: "Addiction Medicine",
      lastReviewed: new Date().toISOString().split("T")[0],
    },
  ];

  if (shouldEmitFAQSchema(faqs)) {
    structuredData.push({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqs.map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: { "@type": "Answer", text: faq.answer },
      })),
    });
  }

  const relatedConditions = coOccurringPages
    .filter((p) => p.slug !== slug)
    .map((p) => ({
      title: isStatePage ? `${p.title} in ${stateData!.name}` : p.title,
      href: isStatePage ? `/${p.slug}/${stateSlug}` : `/${p.slug}`,
    }));

  const stateLinks = isStatePage
    ? []
    : statesData.slice(0, 10).map((s) => ({
        title: `${config.title} in ${s.name}`,
        href: `/${slug}/${s.slug}`,
      }));

  const breadcrumbs = isStatePage
    ? [
        { name: "Home", url: "/" },
        { name: config.title, url: `/${slug}` },
        { name: stateData!.name, url: canonicalPath },
      ]
    : [
        { name: "Home", url: "/" },
        { name: "Treatment Types", url: "/treatment-types" },
        { name: config.title, url: canonicalPath },
      ];

  return (
    <SEOLandingTemplate
      title={pageTitle}
      metaTitle={isStatePage
        ? `${config.title} in ${stateData!.name} (${stateData!.abbreviation}) | RehabLookup`
        : config.metaTitle}
      metaDescription={isStatePage
        ? `Find ${config.title.toLowerCase()} programs in ${stateData!.name}. Compare verified dual diagnosis facilities. Get help today.`
        : config.metaDescription}
      canonical={`https://rehablookup.com${canonicalPath}`}
      structuredData={structuredData}
      breadcrumbs={breadcrumbs}
      heroTitle={pageTitle}
      heroSubtitle={isStatePage
        ? `Find specialized ${config.conditionName.toLowerCase()} and addiction treatment programs across ${stateData!.name}.`
        : config.heroSubtitle}
      heroBadge="Dual Diagnosis"
      heroImage={TOPIC_HERO_IMAGES.wellness}
      heroLocation={isStatePage ? stateData!.name : undefined}
      introContent={isStatePage
        ? `Looking for integrated ${config.conditionName.toLowerCase()} and addiction treatment in ${stateData!.name}? RehabLookup connects you with verified dual diagnosis programs that address both conditions simultaneously. ${stateData!.cities.length > 5 ? `Treatment centers are available in ${stateData!.cities.slice(0, 4).map((c) => c.name).join(", ")}, and throughout ${stateData!.name}.` : `Programs are available throughout ${stateData!.name}.`}`
        : config.introContent}
      sections={config.sections.map((s) => ({
        heading: isStatePage ? `${s.heading} in ${stateData!.name}` : s.heading,
        content: s.content,
      }))}
      whatToExpect={config.whatToExpect}
      benefits={config.benefits}
      facilities={facilities}
      isLoading={isLoading}
      facilityCount={facilities.length}
      showMoreLink={isStatePage ? `/rehab-centers/${stateSlug}` : undefined}
      faqs={faqs}
      faqTreatmentType={config.conditionName}
      faqLocation={isStatePage ? { city: "", state: stateData!.name } : undefined}
      relatedCityLinks={stateLinks}
      relatedStateLinks={relatedConditions}
      showTreatmentLinks
      showInsuranceLinks
      showNearMeLinks
      ctaTitle={isStatePage ? `Get ${config.title} Help in ${stateData!.name}` : `Find ${config.title} Programs`}
      ctaSubtitle={`Our team matches you with the best dual diagnosis programs${isStatePage ? ` in ${stateData!.name}` : ""}. Free. Confidential. No obligation.`}
    >
      <SmartInternalLinks
        pageType="state"
        stateSlug={isStatePage ? stateSlug! : ""}
        stateName={isStatePage ? stateData!.name : ""}
      />
    </SEOLandingTemplate>
  );
}
