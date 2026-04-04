import { useMemo } from "react";
import { Navigate, useLocation } from "react-router-dom";
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
  const location = useLocation();
  const slug = location.pathname.replace(/^\//, "");
  const { data: approvedFacilities = [], isLoading } = useStaticFacilities();

  const parsed = useMemo(() => {
    if (!slug) return { treatment: null, city: null };
    return parseCityTreatmentSlug(slug);
  }, [slug]);

  const { treatment, city } = parsed;

  // Filter facilities by city/state and treatment type
  const facilities = useMemo(() => {
    if (!treatment || !city) return [];
    const allFacilities = [...treatmentCenters, ...approvedFacilities];
    const cityLower = city.city.toLowerCase();
    const stateLower = city.state.toLowerCase();
    const filterLower = treatment.filterKey.toLowerCase();

    let filtered = allFacilities.filter((f) => {
      const cityMatch = f.city.toLowerCase() === cityLower && f.state.toLowerCase() === stateLower;
      const typeMatch =
        f.treatmentTypes?.some((t) => t.toLowerCase().includes(filterLower)) ||
        f.description?.toLowerCase().includes(filterLower);
      return cityMatch && typeMatch;
    });

    if (filtered.length < 3) {
      filtered = allFacilities.filter((f) => {
        const stateMatch = f.state.toLowerCase() === stateLower;
        const typeMatch =
          f.treatmentTypes?.some((t) => t.toLowerCase().includes(filterLower)) ||
          f.description?.toLowerCase().includes(filterLower);
        return stateMatch && typeMatch;
      });
    }

    if (filtered.length < 3) {
      filtered = allFacilities.filter(
        (f) => f.state.toLowerCase() === stateLower
      );
    }

    return filtered.slice(0, 12);
  }, [approvedFacilities, city, treatment]);

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

  // Early returns AFTER all hooks
  if (!treatment || !city) {
    return <Navigate to="/404" replace />;
  }

  const pageTitle = `${treatment.pluralLabel} in ${city.city}, ${city.stateAbbr}`;

  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "MedicalWebPage",
      name: pageTitle,
      description: `Find ${treatment.label.toLowerCase()} in ${city.city}, ${city.stateAbbr}. Compare accredited facilities, verify insurance coverage, and start treatment today.`,
      url: `https://rehablookup.com/${slug}`,
      about: { "@type": "MedicalCondition", name: "Substance Use Disorder" },
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
        acceptedAnswer: { "@type": "Answer", text: faq.answer },
      })),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: "https://rehablookup.com" },
        { "@type": "ListItem", position: 2, name: treatment.pluralLabel, item: `https://rehablookup.com/${treatment.slug}-centers` },
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
