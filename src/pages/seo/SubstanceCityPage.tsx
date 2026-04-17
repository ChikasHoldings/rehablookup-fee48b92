import { useMemo } from "react";
import { Navigate, useParams, useLocation } from "react-router-dom";
import { SEOLandingTemplate } from "@/components/seo/SEOLandingTemplate";
import { useStaticFacilities } from "@/hooks/useStaticFacilities";
import { treatmentCenters } from "@/data/treatmentCenters";
import { substancePages } from "@/data/seoSubstanceConfig";
import { statesData } from "@/data/locationSeoData";
import { SmartInternalLinks } from "@/components/seo/SmartInternalLinks";
import { shouldEmitFAQSchema, validatePage } from "@/utils/seoPageValidator";

export default function SubstanceCityPage() {
  const { stateSlug, citySlug } = useParams<{ stateSlug: string; citySlug: string }>();
  const location = useLocation();
  const { data: approvedFacilities = [], isLoading } = useStaticFacilities();

  const substanceSlug = useMemo(() => {
    const parts = location.pathname.replace(/^\//, "").split("/");
    return parts[0] || "";
  }, [location.pathname]);

  const substance = useMemo(() => substancePages.find((s) => s.slug === substanceSlug) || null, [substanceSlug]);
  const stateData = useMemo(() => statesData.find((s) => s.slug === stateSlug) || null, [stateSlug]);
  const cityData = useMemo(() => {
    if (!stateData) return null;
    return stateData.cities.find((c) => c.slug === citySlug) || null;
  }, [stateData, citySlug]);

  const { facilities, directMatchCount, stateFallbackCount } = useMemo(() => {
    if (!substance || !stateData || !cityData) {
      return { facilities: [], directMatchCount: 0, stateFallbackCount: 0 };
    }
    const all = [...treatmentCenters, ...approvedFacilities];
    const keywords = substance.filterKeys.map((k) => k.toLowerCase());
    const cityLower = cityData.name.toLowerCase();
    const stateLower = stateData.name.toLowerCase();

    const cityMatched = all.filter((f) => {
      const cityMatch = f.city.toLowerCase() === cityLower && f.state.toLowerCase() === stateLower;
      const keyMatch = f.treatmentTypes?.some((t) => keywords.some((k) => t.toLowerCase().includes(k))) ||
        keywords.some((k) => f.description?.toLowerCase().includes(k));
      return cityMatch && keyMatch;
    });

    const cityAll = all.filter((f) => f.city.toLowerCase() === cityLower && f.state.toLowerCase() === stateLower);
    const stateAll = all.filter((f) => f.state.toLowerCase() === stateLower);

    let display = cityMatched;
    if (display.length < 3) display = cityAll;
    if (display.length < 3) display = stateAll;

    return {
      facilities: display.slice(0, 12),
      directMatchCount: cityMatched.length,
      stateFallbackCount: stateAll.length,
    };
  }, [approvedFacilities, substance, stateData, cityData]);

  const validation = validatePage("substance-city", directMatchCount, { stateFallbackCount });

  if (!substance || !stateData || !cityData) {
    return <Navigate to="/treatment-types" replace />;
  }

  const { name: stateName, abbreviation } = stateData;
  const cityName = cityData.name;
  const pageTitle = `${substance.title} in ${cityName}, ${abbreviation}`;
  const canonicalPath = `/${substanceSlug}/${stateSlug}/${citySlug}`;

  const faqs = [
    {
      question: `What ${substance.conditionName.toLowerCase()} treatment options are available in ${cityName}?`,
      answer: `${cityName}, ${stateName} offers multiple treatment options for ${substance.conditionName.toLowerCase()} including medical detox, residential treatment, intensive outpatient programs (IOP), and outpatient counseling. Programs use evidence-based approaches such as CBT, DBT, and medication-assisted treatment (MAT).`,
    },
    {
      question: `Does insurance cover ${substance.conditionName.toLowerCase()} rehab in ${cityName}?`,
      answer: `Yes, under federal parity laws, most insurance plans must cover substance abuse treatment. Medicaid, Medicare, and private insurance all provide coverage for ${substance.conditionName.toLowerCase()} treatment in ${cityName}, ${stateName}. Contact facilities directly to verify your specific plan.`,
    },
    {
      question: `How long does ${substance.conditionName.toLowerCase()} treatment take in ${cityName}?`,
      answer: `Treatment duration varies based on severity and individual needs. Programs in ${cityName} range from 30-day intensive programs to 90-day residential treatment and ongoing outpatient support. Longer treatment durations are generally associated with better outcomes.`,
    },
    {
      question: `How do I choose the right ${substance.conditionName.toLowerCase()} program in ${cityName}?`,
      answer: `Consider the facility's accreditation (JCAHO or CARF), available treatment modalities, staff qualifications, insurance acceptance, and aftercare support. RehabLookup verifies all listed facilities for proper licensing and evidence-based approaches.`,
    },
  ];

  const structuredData: any[] = [
    {
      "@context": "https://schema.org",
      "@type": "MedicalWebPage",
      name: pageTitle,
      description: `Find ${substance.conditionName.toLowerCase()} treatment in ${cityName}, ${stateName}.`,
      url: `https://rehablookup.com${canonicalPath}`,
      about: { "@type": "MedicalCondition", name: substance.conditionName },
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
      title: `${substance.title} in ${c.name}`,
      href: `/${substanceSlug}/${stateSlug}/${c.slug}`,
    }));

  const otherSubstances = substancePages
    .filter((s) => s.slug !== substanceSlug)
    .slice(0, 6)
    .map((s) => ({
      title: `${s.title} in ${cityName}`,
      href: `/${s.slug}/${stateSlug}/${citySlug}`,
    }));

  return (
    <SEOLandingTemplate
      title={pageTitle}
      metaTitle={`${substance.title} in ${cityName}, ${abbreviation} — Find Help | RehabLookup`}
      metaDescription={`Find ${substance.conditionName.toLowerCase()} treatment centers in ${cityName}, ${stateName}. Compare verified programs, check insurance, get help today.`}
      canonical={`https://rehablookup.com${canonicalPath}`}
      noindex={!validation.shouldIndex}
      structuredData={structuredData}
      breadcrumbs={[
        { name: "Home", url: "/" },
        { name: substance.title, url: `/${substanceSlug}` },
        { name: stateName, url: `/${substanceSlug}/${stateSlug}` },
        { name: cityName, url: canonicalPath },
      ]}
      heroTitle={pageTitle}
      heroSubtitle={`Find verified ${substance.conditionName.toLowerCase()} treatment programs in ${cityName}, ${stateName}. Every facility is checked for licensing, accreditation, and clinical quality.`}
      heroLocation={`${cityName}, ${abbreviation}`}
      heroBadge="Verified Programs"
      introContent={`Searching for ${substance.conditionName.toLowerCase()} treatment in ${cityName}, ${stateName}? RehabLookup connects you with accredited facilities offering evidence-based care. Whether you need medical detox, residential treatment, or outpatient support, our verified directory helps you compare programs and find the right fit in ${cityName}.`}
      sections={[
        {
          heading: `${substance.conditionName} Treatment Options in ${cityName}`,
          content: `${cityName} offers a range of ${substance.conditionName.toLowerCase()} treatment programs including medical detoxification, residential inpatient care, partial hospitalization (PHP), intensive outpatient (IOP), and traditional outpatient services. Evidence-based approaches like cognitive behavioral therapy, motivational interviewing, and medication-assisted treatment are widely available.`,
        },
        {
          heading: `Finding the Right Program in ${cityName}`,
          content: `When choosing a ${substance.conditionName.toLowerCase()} treatment program in ${cityName}, consider accreditation status, treatment modalities, staff qualifications, and aftercare support. Programs listed on RehabLookup are verified for proper credentials. Many offer free insurance verification to help you understand coverage before admission.`,
        },
      ]}
      facilities={facilities}
      isLoading={isLoading}
      facilityCount={facilities.length}
      showMoreLink={`/rehab-centers/${stateSlug}/${citySlug}`}
      faqs={faqs}
      faqTreatmentType={substance.title}
      faqLocation={{ city: cityName, state: stateName }}
      relatedCityLinks={nearbyCities}
      relatedStateLinks={otherSubstances}
      showTreatmentLinks
      showInsuranceLinks
      ctaTitle={`Get ${substance.title} Help in ${cityName}`}
      ctaSubtitle={`Our team matches you with the best ${substance.conditionName.toLowerCase()} programs in ${cityName}. Free. Confidential. No obligation.`}
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
