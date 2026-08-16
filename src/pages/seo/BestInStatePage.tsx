import { useMemo } from "react";
import { useLocation } from "react-router-dom";
import { SEOLandingTemplate } from "@/components/seo/SEOLandingTemplate";
import { getStateImage } from "@/data/locationImages";
import { useStaticFacilities } from "@/hooks/useStaticFacilities";
import { treatmentCenters } from "@/data/treatmentCenters";
import { bestInStateConfigs } from "@/data/seoBestInStateConfig";
import { topCities, seoTreatmentTypes, getCityTreatmentSlug } from "@/data/seoPageConfig";
import { insurerConfigs } from "@/data/seoInsuranceStateConfig";
import { validatePage } from "@/utils/seoPageValidator";
import { NotFoundInPlace } from "@/components/seo/NotFoundInPlace";

export default function BestInStatePage() {
  const location = useLocation();
  const stateSlug = location.pathname.replace(/^\/best-rehab-centers-in-/, "").replace(/\/$/, "") || undefined;
  const { data: approvedFacilities = [], isLoading } = useStaticFacilities();

  const stateConfig = useMemo(() => {
    if (!stateSlug) return null;
    return bestInStateConfigs.find((s) => s.slug === stateSlug) || null;
  }, [stateSlug]);

  const facilities = useMemo(() => {
    if (!stateConfig) return [];
    const allFacilities = [...treatmentCenters, ...approvedFacilities];
    const stateLower = stateConfig.state.toLowerCase();

    return allFacilities
      .filter((f) => f.state.toLowerCase() === stateLower)
      .sort((a, b) => {
        const aPro = (a as { isPro?: boolean }).isPro ? 1 : 0;
        const bPro = (b as { isPro?: boolean }).isPro ? 1 : 0;
        if (bPro !== aPro) return bPro - aPro;
        if ((a.featured ? 1 : 0) !== (b.featured ? 1 : 0)) return (b.featured ? 1 : 0) - (a.featured ? 1 : 0);
        const aScore = (a as { calculatedRankingScore?: number }).calculatedRankingScore || 0;
        const bScore = (b as { calculatedRankingScore?: number }).calculatedRankingScore || 0;
        if (bScore !== aScore) return bScore - aScore;
        return a.name.localeCompare(b.name);
      })
      .slice(0, 12);
  }, [approvedFacilities, stateConfig]);

  const relatedCityLinks = useMemo(() => {
    if (!stateConfig) return [];
    const stateCities = topCities.filter(
      (c) => c.stateSlug === stateConfig.slug
    );
    const treatmentType = seoTreatmentTypes[0]; // alcohol-rehab as default
    return stateCities.slice(0, 8).map((c) => ({
      title: `${treatmentType.shortLabel} in ${c.city}`,
      href: `/${getCityTreatmentSlug(treatmentType, c)}`,
    }));
  }, [stateConfig]);

  const relatedStateLinks = useMemo(() => {
    if (!stateConfig) return [];
    return bestInStateConfigs
      .filter((s) => s.slug !== stateConfig.slug)
      .map((s) => ({
        title: `Best Rehab in ${s.state}`,
        href: `/best-rehab-centers-in-${s.slug}`,
      }));
  }, [stateConfig]);

  if (!stateConfig) {
    return (
      <NotFoundInPlace
        title="State not found"
        message={`We don't have a "best in state" page for that location. Browse all states from the locations hub.`}
        backTo="/locations"
        backLabel="Browse locations"
      />
    );
  }

  const pageTitle = `Best Rehab Centers in ${stateConfig.state} (${stateConfig.stateAbbr})`;
  // "Best of" lists need real depth — gate to noindex when state inventory is too thin
  const validation = validatePage("best-in-state", facilities.length, {
    stateFallbackCount: facilities.length,
  });

  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: pageTitle,
      description: stateConfig.metaDescription,
      url: `https://rehablookup.com/best-rehab-centers-in-${stateConfig.slug}`,
      numberOfItems: facilities.length,
      itemListElement: facilities.slice(0, 10).map((f, idx) => ({
        "@type": "ListItem",
        position: idx + 1,
        item: {
          "@type": "MedicalOrganization",
          name: f.name,
          address: {
            "@type": "PostalAddress",
            addressLocality: f.city,
            addressRegion: f.state,
          },
        },
      })),
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: stateConfig.faqs.map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: { "@type": "Answer", text: faq.answer },
      })),
    },
  ];

  const insuranceLinks = insurerConfigs.slice(0, 4).map((ins) => ({
    title: `${ins.name} in ${stateConfig.state}`,
    href: `/insurance/${ins.slug}/${stateConfig.slug}`,
  }));

  return (
    <SEOLandingTemplate
      title={pageTitle}
      metaTitle={stateConfig.metaTitle}
      metaDescription={stateConfig.metaDescription}
      canonical={`https://rehablookup.com/best-rehab-centers-in-${stateConfig.slug}`}
      noindex={!validation.shouldIndex}
      structuredData={structuredData}
      breadcrumbs={[
        { name: "Home", url: "/" },
        { name: "Locations", url: "/locations" },
        { name: stateConfig.state, url: `/rehab-centers/${stateConfig.slug}` },
        { name: `Best Centers`, url: `/best-rehab-centers-in-${stateConfig.slug}` },
      ]}
      heroTitle={pageTitle}
      heroSubtitle={stateConfig.heroSubtitle}
      heroLocation={stateConfig.state}
      heroImage={getStateImage(stateConfig.slug)}
      heroBadge="Top-Rated & Verified"
      introContent={stateConfig.introContent}
      sections={stateConfig.sections}
      whatToExpect={stateConfig.whatToExpect}
      benefits={stateConfig.benefits}
      facilities={facilities}
      isLoading={isLoading}
      facilityCount={facilities.length}
      showMoreLink={`/rehab-centers/${stateConfig.slug}`}
      faqs={stateConfig.faqs}
      faqTreatmentType="Rehab Centers"
      faqLocation={{ state: stateConfig.state }}
      relatedCityLinks={[...relatedCityLinks, ...insuranceLinks]}
      relatedStateLinks={relatedStateLinks}
      showTreatmentLinks
      showInsuranceLinks
      showNearMeLinks
      ctaTitle={`Find the Best Treatment in ${stateConfig.state}`}
      ctaSubtitle={`Compare top-rated programs in ${stateConfig.state} side by side, then contact them directly. Free to search, no obligation.`}
    />
  );
}
