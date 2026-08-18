import { useMemo } from "react";
import { Navigate, useParams, useLocation } from "react-router-dom";
import { SEOLandingTemplate } from "@/components/seo/SEOLandingTemplate";
import { getCityImage } from "@/data/locationImages";
import { useStaticFacilities } from "@/hooks/useStaticFacilities";
import { cityScope, filterExact, normalizeState } from "@/lib/location";
import { resolveCity } from "@/lib/cityLookup";
import { treatmentCenters } from "@/data/treatmentCenters";
import { coOccurringPages } from "@/pages/seo/coOccurringPagesData";
import { SmartInternalLinks } from "@/components/seo/SmartInternalLinks";
import { shouldEmitFAQSchema, validatePage } from "@/utils/seoPageValidator";

export default function CoOccurringCityPage() {
  const { stateSlug, citySlug } = useParams<{ stateSlug: string; citySlug: string }>();
  const location = useLocation();
  const { data: approvedFacilities = [], isLoading } = useStaticFacilities();

  const conditionSlug = useMemo(() => {
    const parts = location.pathname.replace(/^\//, "").split("/");
    return parts[0] || "";
  }, [location.pathname]);

  const config = useMemo(() => coOccurringPages.find((p) => p.slug === conditionSlug) || null, [conditionSlug]);
  const resolved = useMemo(() => resolveCity(stateSlug, citySlug), [stateSlug, citySlug]);
  const stateData = resolved?.state ?? null;
  const cityData = resolved?.city ?? null;

  const { facilities, directMatchCount, stateFallbackCount } = useMemo(() => {
    if (!config || !stateData || !cityData) {
      return { facilities: [], directMatchCount: 0, stateFallbackCount: 0 };
    }
    const all = [...treatmentCenters, ...approvedFacilities];
    const keywords = config.filterKeys.map((k) => k.toLowerCase());
    // ONE canonical membership predicate, shared with search and the
    // Node generators — not a private citiesMatch/normalizeState pair.
    const scope = cityScope(cityData.name, stateData.name);
    const scopeState = normalizeState(stateData.name);

    // Second dimension: this page's EXISTING keyword matcher, applied
    // UNCHANGED. Only the geography around it moved.
    const keyMatches = (f: typeof all[number]) =>
      Boolean(
        f.treatmentTypes?.some((t) => keywords.some((k) => t.toLowerCase().includes(k))) ||
          keywords.some((k) => f.description?.toLowerCase().includes(k)),
      );

    // The rendered set: exact city membership AND the keyword filter.
    // The old ladder dropped the keyword filter (city-all) and then the
    // city itself (state-all) whenever fewer than three matched, so a
    // sparse page listed facilities that were in neither the city nor
    // the facet. A sparse page is now a short page.
    const cityMatched = filterExact(all, scope).filter(keyMatches);

    // NOT rendered and NOT counted anywhere in the copy — the
    // pre-existing `validatePage` input, kept so correcting the LISTING
    // does not silently re-decide the unrelated indexability policy.
    const stateAll = all.filter((f) => normalizeState(f.state) === scopeState);

    return {
      facilities: cityMatched.slice(0, 12),
      directMatchCount: cityMatched.length,
      stateFallbackCount: stateAll.length,
    };
  }, [approvedFacilities, config, stateData, cityData]);

  // Indexability is deliberately UNCHANGED by this correction:
  // `validatePage` already received `directMatchCount` before it, and
  // `stateFallbackCount` is still the same statewide tally. Fixing the
  // rendered list must not add or remove a single noindex URL.
  const validation = validatePage("co-occurring-city", directMatchCount, { stateFallbackCount });

  if (!config || !stateData || !cityData) {
    return <Navigate to="/treatment-types" replace />;
  }

  const { name: stateName, abbreviation } = stateData;
  const cityName = cityData.name;
  const pageTitle = `${config.title} in ${cityName}, ${abbreviation}`;
  const canonicalPath = `/${conditionSlug}/${stateSlug}/${citySlug}`;

  const faqs = config.faqs.map((f) => ({
    question: f.question.replace(/\?$/, ` in ${cityName}?`),
    answer: `${f.answer} Treatment programs in ${cityName}, ${stateName} provide specialized dual diagnosis care.`,
  }));

  const structuredData: object[] = [
    {
      "@context": "https://schema.org",
      "@type": "MedicalWebPage",
      name: pageTitle,
      description: `Find ${config.title.toLowerCase()} programs in ${cityName}, ${stateName}.`,
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

  const nearbyCities = stateData.cities
    .filter((c) => c.slug !== citySlug)
    .slice(0, 6)
    .map((c) => ({
      title: `${config.title} in ${c.name}`,
      href: `/${conditionSlug}/${stateSlug}/${c.slug}`,
    }));

  const otherConditions = coOccurringPages
    .filter((p) => p.slug !== conditionSlug)
    .slice(0, 6)
    .map((p) => ({
      title: `${p.title} in ${cityName}`,
      href: `/${p.slug}/${stateSlug}/${citySlug}`,
    }));

  return (
    <SEOLandingTemplate
      title={pageTitle}
      metaTitle={`${config.title} in ${cityName}, ${abbreviation} | RehabLookup`}
      metaDescription={`Find ${config.title.toLowerCase()} programs in ${cityName}, ${stateName}. Compare verified dual diagnosis facilities. Get help today.`}
      canonical={`https://rehablookup.com${canonicalPath}`}
      noindex={!validation.shouldIndex}
      structuredData={structuredData}
      breadcrumbs={[
        { name: "Home", url: "/" },
        { name: config.title, url: `/${conditionSlug}` },
        { name: stateName, url: `/${conditionSlug}/${stateSlug}` },
        { name: cityName, url: canonicalPath },
      ]}
      heroTitle={pageTitle}
      heroSubtitle={`Find specialized ${config.conditionName.toLowerCase()} and addiction treatment programs in ${cityName}, ${stateName}.`}
      heroBadge="Dual Diagnosis"
      heroLocation={`${cityName}, ${abbreviation}`}
      heroImage={getCityImage(stateSlug, citySlug)}
      introContent={`Looking for integrated ${config.conditionName.toLowerCase()} and addiction treatment in ${cityName}? RehabLookup connects you with verified dual diagnosis programs that address both conditions simultaneously for the best chance at lasting recovery.`}
      sections={config.sections.map((s) => ({
        heading: `${s.heading} in ${cityName}`,
        content: s.content,
      }))}
      whatToExpect={config.whatToExpect}
      benefits={config.benefits}
      facilities={facilities}
      isLoading={isLoading}
      facilityCount={directMatchCount}
      showMoreLink={`/rehab-centers/${stateSlug}/${citySlug}`}
      faqs={faqs}
      faqTreatmentType={config.conditionName}
      faqLocation={{ city: cityName, state: stateName }}
      relatedCityLinks={nearbyCities}
      relatedStateLinks={otherConditions}
      showTreatmentLinks
      showInsuranceLinks
      ctaTitle={`Get ${config.title} Help in ${cityName}`}
      ctaSubtitle={`Our team matches you with the best dual diagnosis programs in ${cityName}. Free. Confidential. No obligation.`}
    >
      <SmartInternalLinks
        pageType="city"
        stateSlug={stateSlug!}
        stateName={stateName}
        citySlug={citySlug}
      />
    </SEOLandingTemplate>
  );
}
