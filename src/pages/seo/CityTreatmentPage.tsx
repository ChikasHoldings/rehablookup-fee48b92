import { useMemo } from "react";
import { useParams, Navigate } from "react-router-dom";
import { SEOLandingTemplate } from "@/components/seo/SEOLandingTemplate";
import { useStaticFacilities } from "@/hooks/useStaticFacilities";
import { treatmentCenters } from "@/data/treatmentCenters";
import {
  parseCityTreatmentSlug,
  generateCityTreatmentFAQs,
  topCities,
  seoTreatmentTypes,
  getCityTreatmentSlug,
} from "@/data/seoPageConfig";

export default function CityTreatmentPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: approvedFacilities = [], isLoading } = useStaticFacilities();

  const parsed = useMemo(() => {
    if (!slug) return { treatment: null, city: null };
    return parseCityTreatmentSlug(slug);
  }, [slug]);

  const { treatment, city } = parsed;

  // If slug doesn't match any known combination, show 404
  if (!slug || (!treatment && !city)) {
    return <Navigate to="/404" replace />;
  }

  if (!treatment || !city) {
    return <Navigate to="/404" replace />;
  }

  // Filter facilities by city/state and treatment type
  const facilities = useMemo(() => {
    const allFacilities = [...treatmentCenters, ...approvedFacilities];
    const cityLower = city.city.toLowerCase();
    const stateLower = city.state.toLowerCase();
    const filterLower = treatment.filterKey.toLowerCase();

    // First try exact city match
    let filtered = allFacilities.filter((f) => {
      const cityMatch = f.city.toLowerCase() === cityLower && f.state.toLowerCase() === stateLower;
      const typeMatch =
        f.treatmentTypes?.some((t) => t.toLowerCase().includes(filterLower)) ||
        f.description?.toLowerCase().includes(filterLower);
      return cityMatch && typeMatch;
    });

    // Fall back to state match if not enough results
    if (filtered.length < 3) {
      filtered = allFacilities.filter((f) => {
        const stateMatch = f.state.toLowerCase() === stateLower;
        const typeMatch =
          f.treatmentTypes?.some((t) => t.toLowerCase().includes(filterLower)) ||
          f.description?.toLowerCase().includes(filterLower);
        return stateMatch && typeMatch;
      });
    }

    // Fall back to just state if still not enough
    if (filtered.length < 3) {
      filtered = allFacilities.filter(
        (f) => f.state.toLowerCase() === stateLower
      );
    }

    return filtered.slice(0, 12);
  }, [approvedFacilities, city, treatment]);

  const faqs = generateCityTreatmentFAQs(treatment, city);

  // Build related city links (same treatment, different cities in same state + nearby)
  const relatedCityLinks = useMemo(() => {
    const sameTreatment = topCities
      .filter((c) => c.slug !== city.slug)
      .filter((c) => c.stateSlug === city.stateSlug || city.nearbyCities.includes(c.slug))
      .slice(0, 8)
      .map((c) => ({
        title: `${treatment.shortLabel} in ${c.city}`,
        href: `/${getCityTreatmentSlug(treatment, c)}`,
      }));
    return sameTreatment;
  }, [city, treatment]);

  // Build related treatment links (same city, different treatments)
  const relatedStateLinks = useMemo(() => {
    return seoTreatmentTypes
      .filter((t) => t.slug !== treatment.slug)
      .map((t) => ({
        title: `${t.shortLabel} in ${city.city}`,
        href: `/${getCityTreatmentSlug(t, city)}`,
      }));
  }, [city, treatment]);

  const pageTitle = `${treatment.pluralLabel} in ${city.city}, ${city.stateAbbr}`;

  // JSON-LD structured data
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "MedicalWebPage",
      name: pageTitle,
      description: `Find ${treatment.label.toLowerCase()} in ${city.city}, ${city.stateAbbr}. Compare accredited facilities, verify insurance coverage, and start treatment today.`,
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
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqs.map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: faq.answer,
        },
      })),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: "https://rehablookup.com" },
        { "@type": "ListItem", position: 2, name: treatment.pluralLabel, item: `https://rehablookup.com/${treatment.slug === "dual-diagnosis-treatment" ? "dual-diagnosis-treatment" : treatment.slug + "-centers" === treatment.slug ? treatment.slug : treatment.slug.replace("-rehab", "-rehab-centers")}` },
        { "@type": "ListItem", position: 3, name: `${city.city}, ${city.stateAbbr}`, item: `https://rehablookup.com/${slug}` },
      ],
    },
  ];

  return (
    <SEOLandingTemplate
      title={pageTitle}
      metaTitle={`${treatment.pluralLabel} in ${city.city}, ${city.stateAbbr} — Find Treatment | RehabLookup`}
      metaDescription={`Find accredited ${treatment.label.toLowerCase()} in ${city.city}, ${city.stateAbbr}. Compare ${facilities.length}+ verified facilities, check insurance coverage, read reviews. Get help today.`}
      canonical={`https://rehablookup.com/${slug}`}
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
      introContent={`Looking for ${treatment.label.toLowerCase()} in ${city.city}, ${city.stateAbbr}? RehabLookup connects you with verified, accredited treatment facilities in the ${city.city} area. Every listed center is checked for proper licensing, qualified clinical staff, and evidence-based treatment approaches. Whether you need immediate placement or want to compare programs, our directory makes finding the right ${treatment.label.toLowerCase()} simple and confidential.`}
      facilities={facilities}
      isLoading={isLoading}
      facilityCount={facilities.length}
      showMoreLink={`/rehab-centers/${city.stateSlug}`}
      faqs={faqs}
      faqTreatmentType={treatment.label}
      faqLocation={{ city: city.city, state: city.state }}
      relatedCityLinks={relatedCityLinks}
      relatedStateLinks={relatedStateLinks}
      showTreatmentLinks
      showInsuranceLinks
      showNearMeLinks
      ctaTitle={`Start ${treatment.label} in ${city.city} Today`}
      ctaSubtitle={`Our concierge team will match you with the best ${treatment.label.toLowerCase()} programs in ${city.city}. Confidential. No obligation.`}
    />
  );
}
