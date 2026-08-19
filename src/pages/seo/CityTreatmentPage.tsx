import { useMemo } from "react";
import { useLocation } from "react-router-dom";
import { InlineNotFound } from "@/components/InlineNotFound";
import { SEOLandingTemplate } from "@/components/seo/SEOLandingTemplate";
import { getCityImage } from "@/data/locationImages";
import { useStaticFacilities } from "@/hooks/useStaticFacilities";
import { cityScope, filterExact, normalizeState } from "@/lib/location";
import { treatmentCenters } from "@/data/treatmentCenters";
import {
  generateTreatmentCitySections,
  generateTreatmentWhatToExpect,
  generateTreatmentBenefits,
} from "@/utils/cityContentGenerator";
import {
  parseCityTreatmentSlug,
  generateCityTreatmentFAQs,
  topCities,
  seoTreatmentTypes,
  getCityTreatmentSlug,
} from "@/data/seoPageConfig";
import { SmartInternalLinks } from "@/components/seo/SmartInternalLinks";
import { shouldEmitFAQSchema, validatePage } from "@/utils/seoPageValidator";
import { buildCityIndex } from "@/lib/seo/cityProfiles.mjs";
import { buildCityTreatmentContent } from "@/lib/seo/cityTreatmentContent.mjs";
import { mergeFaqs, mergeSections } from "@/lib/seo/composedTemplate";
import { statesData } from "@/data/locationSeoData";
import { stateCountyData } from "@/data/countySeoData";

/** Derived from two static datasets, so it is built once for the module
 *  rather than on every render. */
const CITY_PROFILES = buildCityIndex({ statesData, stateCountyData });

export default function CityTreatmentPage() {
  const location = useLocation();
  const slug = location.pathname.replace(/^\//, "");
  const { data: approvedFacilities = [], isLoading } = useStaticFacilities();

  const parsed = useMemo(() => {
    if (!slug) return { treatment: null, city: null };
    return parseCityTreatmentSlug(slug);
  }, [slug]);

  const { treatment, city } = parsed;

  // Filter facilities by city/state and treatment type
  const { facilities, directMatchCount, stateFallbackCount } = useMemo(() => {
    if (!treatment || !city) {
      return { facilities: [], directMatchCount: 0, stateFallbackCount: 0 };
    }
    const allFacilities = [...treatmentCenters, ...approvedFacilities];
    // ONE canonical membership predicate, shared with search and the
    // Node generators — not a private citiesMatch/normalizeState pair.
    const scope = cityScope(city.city, city.state);
    const scopeState = normalizeState(city.state);
    const filterLower = treatment.filterKey.toLowerCase();

    const sortByRank = (arr: typeof allFacilities) =>
      [...arr].sort((a, b) => {
        const aPro = (a as { isPro?: boolean }).isPro ? 1 : 0;
        const bPro = (b as { isPro?: boolean }).isPro ? 1 : 0;
        if (bPro !== aPro) return bPro - aPro;
        if ((a.featured ? 1 : 0) !== (b.featured ? 1 : 0)) return (b.featured ? 1 : 0) - (a.featured ? 1 : 0);
        const aScore = (a as { calculatedRankingScore?: number }).calculatedRankingScore || 0;
        const bScore = (b as { calculatedRankingScore?: number }).calculatedRankingScore || 0;
        if (bScore !== aScore) return bScore - aScore;
        return a.name.localeCompare(b.name);
      });

    // Second dimension: this page's EXISTING treatment matcher, applied
    // UNCHANGED. Only the geography around it moved.
    const typeMatches = (f: typeof allFacilities[number]) =>
      Boolean(
        f.treatmentTypes?.some((t) => t.toLowerCase().includes(filterLower)) ||
          f.description?.toLowerCase().includes(filterLower),
      );

    // The rendered set: exact city membership AND the treatment filter.
    // There is deliberately no `if (fewer than N) widen` ladder here.
    // This page previously fell back to state+treatment and then to the
    // whole state, so a Detox-in-Fresno page with one exact match
    // rendered twelve facilities from across California under a Fresno
    // heading. An empty city+treatment set now renders as empty.
    const directMatch = filterExact(allFacilities, scope).filter(typeMatches);

    // NOT rendered and NOT counted anywhere in the copy. This is the
    // pre-existing `validatePage` input, kept so correcting the LISTING
    // does not silently re-decide the unrelated indexability policy.
    const stateAll = allFacilities.filter((f) => normalizeState(f.state) === scopeState);

    return {
      facilities: sortByRank(directMatch).slice(0, 12),
      directMatchCount: directMatch.length,
      stateFallbackCount: stateAll.length,
    };
  }, [approvedFacilities, city, treatment]);

  // Indexability is deliberately UNCHANGED by this correction:
  // `validatePage` already received `directMatchCount` before it, and
  // `stateFallbackCount` is still the same statewide tally. Fixing the
  // rendered list must not add or remove a single noindex URL.
  const validation = validatePage("city-treatment", directMatchCount, { stateFallbackCount });

  const faqs = useMemo(() => {
    if (!treatment || !city) return [];
    return generateCityTreatmentFAQs(treatment, city);
  }, [treatment, city]);

  const relatedCityLinks = useMemo(() => {
    if (!treatment || !city) return [];
    return topCities
      .filter((c) => c.slug !== city.slug)
      .filter((c) => c.stateSlug === city.stateSlug || city.nearbyCities.includes(c.slug))
      .slice(0, 8)
      .map((c) => ({
        title: `${treatment.shortLabel} in ${c.city}`,
        href: `/${getCityTreatmentSlug(treatment, c)}`,
      }));
  }, [city, treatment]);

  const relatedStateLinks = useMemo(() => {
    if (!treatment || !city) return [];
    return seoTreatmentTypes
      .filter((t) => t.slug !== treatment.slug)
      .map((t) => ({
        title: `${t.shortLabel} in ${city.city}`,
        href: `/${getCityTreatmentSlug(t, city)}`,
      }));
  }, [city, treatment]);

  const treatmentSections = useMemo(
    () => treatment && city ? generateTreatmentCitySections(treatment.label, treatment.slug, city.city, city.stateAbbr) : [],
    [treatment, city]
  );
  const treatmentWhatToExpect = useMemo(
    () => treatment ? generateTreatmentWhatToExpect(treatment.label) : [],
    [treatment]
  );
  const treatmentBenefits = useMemo(
    () => treatment && city ? generateTreatmentBenefits(treatment.label, city.city) : [],
    [treatment, city]
  );

  // Early returns AFTER all hooks
  if (!treatment || !city) {
    return <InlineNotFound />;
  }

  const pageTitle = `${treatment.pluralLabel} in ${city.city}, ${city.stateAbbr}`;
  const populationText = city.population ? ` With a population of approximately ${Number(city.population).toLocaleString()}, ${city.city}` : ` ${city.city}`;

  const structuredData: object[] = [];

  // Only emit FAQPage schema if we have 3+ meaningful FAQs
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

  structuredData.push({
    "@context": "https://schema.org",
    "@type": "MedicalWebPage",
    name: pageTitle,
    description: `Find accredited ${treatment.label.toLowerCase()} in ${city.city}, ${city.stateAbbr}.`,
    url: `https://rehablookup.com/${slug}`,
    about: {
      "@type": "MedicalCondition",
      name: "Substance Use Disorder",
    },
    audience: {
      "@type": "PeopleAudience",
      geographicArea: {
        "@type": "City",
        name: city.city,
        containedInPlace: { "@type": "State", name: city.state },
      },
    },
    specialty: "Addiction Medicine",
    lastReviewed: new Date().toISOString().split("T")[0],
  });

  // Same city profile layer the prerendered /{treatment}-in-{city} page
  // uses. Built once for the module rather than per render — it is
  // derived from two static datasets and does not change.
  const composed = useMemo(() => {
    const profile = CITY_PROFILES.get(city.slug) ?? CITY_PROFILES.get(`${city.stateSlug}|${city.city.toLowerCase().replace(/[^a-z0-9]+/g, "")}`);
    if (!profile) return null;
    return buildCityTreatmentContent({
      profile,
      treatmentLabel: treatment.label,
      treatmentSlug: treatment.slug,
      facilityCount: directMatchCount,
    });
  }, [city.slug, city.stateSlug, city.city, treatment.label, treatment.slug, directMatchCount]);

  return (
    <SEOLandingTemplate
      title={pageTitle}
      metaTitle={`${treatment.pluralLabel} in ${city.city}, ${city.stateAbbr} — Find Treatment | RehabLookup`}
      metaDescription={`Find accredited ${treatment.label.toLowerCase()} in ${city.city}, ${city.stateAbbr}. Compare ${directMatchCount} facilities, check insurance coverage, read reviews. Get help today.`}
      canonical={`https://rehablookup.com/${slug}`}
      noindex={!validation.shouldIndex}
      structuredData={structuredData}
      breadcrumbs={[
        { name: "Home", url: "/" },
        { name: treatment.pluralLabel, url: `/${treatment.slug}-centers` },
        { name: `${city.city}, ${city.stateAbbr}`, url: `/${slug}` },
      ]}
      heroTitle={pageTitle}
      heroSubtitle={treatment.description}
      heroLocation={`${city.city}, ${city.state}`}
      heroBadge="Verified & Accredited"
      heroImage={getCityImage(city.stateSlug, city.slug)}
      introContent={`Looking for ${treatment.label.toLowerCase()} in ${city.city}, ${city.stateAbbr}? RehabLookup connects you with verified, accredited treatment facilities in the ${city.city} area.${populationText} has a range of addiction treatment resources available for individuals and families seeking help. Every listed center is checked for proper licensing, qualified clinical staff, and evidence-based treatment approaches. Whether you need immediate placement or want to compare programs, our directory makes finding the right ${treatment.label.toLowerCase()} simple and confidential.`}
      sections={mergeSections(treatmentSections, composed)}
      whatToExpect={treatmentWhatToExpect}
      benefits={treatmentBenefits}
      facilities={facilities}
      isLoading={isLoading}
      facilityCount={directMatchCount}
      showMoreLink={`/rehab-centers/${city.stateSlug}`}
      faqs={mergeFaqs(faqs, composed)}
      faqTreatmentType={treatment.label}
      faqLocation={{ city: city.city, state: city.state }}
      relatedCityLinks={relatedCityLinks}
      relatedStateLinks={relatedStateLinks}
      showTreatmentLinks
      showInsuranceLinks
      showNearMeLinks
      ctaTitle={`Start ${treatment.label} in ${city.city} Today`}
      ctaSubtitle={`Compare ${treatment.label.toLowerCase()} programs in ${city.city} side by side, then contact them directly. Free to search, no obligation.`}
      waitlistAreaSlug={slug}
      waitlistAreaLabel={`${treatment.pluralLabel} in ${city.city}, ${city.stateAbbr}`}
      waitlistCity={city.city}
      waitlistState={city.state}
      waitlistTreatmentType={treatment.label}
    >
      <SmartInternalLinks
        pageType="city-treatment"
        stateSlug={city.stateSlug}
        stateName={city.state}
        citySlug={city.slug}
        treatmentSlug={treatment.slug}
      />
    </SEOLandingTemplate>
  );
}
