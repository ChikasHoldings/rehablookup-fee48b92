import { useMemo } from "react";
import { Navigate, useParams } from "react-router-dom";
import { SEOLandingTemplate } from "@/components/seo/SEOLandingTemplate";
import { useStaticFacilities } from "@/hooks/useStaticFacilities";
import { treatmentCenters } from "@/data/treatmentCenters";
import { getStateBySlug } from "@/data/locationSeoData";
import { getCountyBySlug } from "@/data/countySeoData";
import { SmartInternalLinks } from "@/components/seo/SmartInternalLinks";
import { shouldEmitFAQSchema, validatePage, getFacilityDensity } from "@/utils/seoPageValidator";

const COUNTY_TREATMENT_TYPES: Record<string, { label: string; pluralLabel: string; filterKey: string; description: string }> = {
  "alcohol-rehab": {
    label: "Alcohol Rehab",
    pluralLabel: "Alcohol Rehab Centers",
    filterKey: "alcohol",
    description: "Alcohol rehabilitation programs providing medically supervised detox, counseling, and long-term recovery support.",
  },
  "drug-rehab": {
    label: "Drug Rehab",
    pluralLabel: "Drug Rehab Centers",
    filterKey: "drug",
    description: "Drug addiction treatment programs offering comprehensive care for substance use disorders.",
  },
  "detox-centers": {
    label: "Detox Centers",
    pluralLabel: "Detox Programs",
    filterKey: "detox",
    description: "Medical detoxification centers providing safe, supervised withdrawal management.",
  },
  "inpatient-rehab": {
    label: "Inpatient Rehab",
    pluralLabel: "Inpatient Rehab Centers",
    filterKey: "inpatient",
    description: "Residential inpatient treatment programs providing 24/7 care in a structured environment.",
  },
  "outpatient-rehab": {
    label: "Outpatient Rehab",
    pluralLabel: "Outpatient Programs",
    filterKey: "outpatient",
    description: "Outpatient treatment programs allowing patients to receive care while maintaining daily responsibilities.",
  },
  "dual-diagnosis-treatment": {
    label: "Dual Diagnosis Treatment",
    pluralLabel: "Dual Diagnosis Centers",
    filterKey: "dual",
    description: "Integrated treatment for co-occurring mental health and substance use disorders.",
  },
};

export default function CountyTreatmentPage() {
  const { stateSlug, countySlug, treatmentSlug } = useParams<{
    stateSlug: string;
    countySlug: string;
    treatmentSlug: string;
  }>();

  const { data: approvedFacilities = [], isLoading } = useStaticFacilities();

  const stateData = stateSlug ? getStateBySlug(stateSlug) : undefined;
  const countyData = stateSlug && countySlug ? getCountyBySlug(stateSlug, countySlug) : undefined;
  const treatment = treatmentSlug ? COUNTY_TREATMENT_TYPES[treatmentSlug] : undefined;

  const facilities = useMemo(() => {
    if (!stateData || !countyData || !treatment) return [];
    const allFacilities = [...treatmentCenters, ...approvedFacilities];
    const stateNameLower = stateData.name.toLowerCase();
    const stateAbbrLower = stateData.abbreviation.toLowerCase();
    const countyCities = countyData.majorCities.map((c) => c.toLowerCase());
    const filterLower = treatment.filterKey.toLowerCase();

    // County + treatment match
    let filtered = allFacilities.filter((f) => {
      const stateMatch = f.state.toLowerCase() === stateNameLower || f.state.toLowerCase() === stateAbbrLower;
      const cityMatch = countyCities.some((city) => f.city.toLowerCase() === city);
      const typeMatch = f.treatmentTypes?.some((t) => t.toLowerCase().includes(filterLower)) || f.description?.toLowerCase().includes(filterLower);
      return stateMatch && cityMatch && typeMatch;
    });

    // Fallback: state + treatment
    if (filtered.length < 3) {
      filtered = allFacilities.filter((f) => {
        const stateMatch = f.state.toLowerCase() === stateNameLower || f.state.toLowerCase() === stateAbbrLower;
        const typeMatch = f.treatmentTypes?.some((t) => t.toLowerCase().includes(filterLower)) || f.description?.toLowerCase().includes(filterLower);
        return stateMatch && typeMatch;
      });
    }

    return [...filtered]
      .sort((a, b) => {
        const aPro = (a as any).isPro ? 1 : 0;
        const bPro = (b as any).isPro ? 1 : 0;
        if (bPro !== aPro) return bPro - aPro;
        if ((a.featured ? 1 : 0) !== (b.featured ? 1 : 0)) return (b.featured ? 1 : 0) - (a.featured ? 1 : 0);
        return a.name.localeCompare(b.name);
      })
      .slice(0, 12);
  }, [approvedFacilities, stateData, countyData, treatment]);

  if (!stateData || !countyData || !treatment) {
    return <Navigate to="/rehab-centers" replace />;
  }

  const pageTitle = `${treatment.pluralLabel} in ${countyData.name} County, ${stateData.abbreviation}`;
  const density = getFacilityDensity(facilities.length);
  const validation = validatePage("county-treatment", facilities.length);

  const faqs = [
    {
      question: `What ${treatment.label.toLowerCase()} options are available in ${countyData.name} County?`,
      answer: `${countyData.name} County, ${stateData.name} has ${density === "none" ? "limited" : density} access to ${treatment.label.toLowerCase()} facilities. ${facilities.length > 0 ? `There are currently ${facilities.length}+ verified programs serving the ${countyData.majorCities.slice(0, 3).join(", ")} area.` : `Residents can access programs in nearby areas of ${stateData.name}.`} Treatment options typically include medical detox, individual counseling, group therapy, and aftercare planning.`,
    },
    {
      question: `Does insurance cover ${treatment.label.toLowerCase()} in ${countyData.name} County?`,
      answer: `Most major insurance plans cover ${treatment.label.toLowerCase()} in ${stateData.name} under the Mental Health Parity and Addiction Equity Act. ${stateData.name} ${countyData.population && countyData.population > 200000 ? "is a high-population area with multiple in-network providers" : "residents may need to explore both local and regional options for in-network care"}. Contact facilities directly or use our free benefits verification to check your coverage.`,
    },
    {
      question: `How do I find the best ${treatment.label.toLowerCase()} near ${countyData.name} County?`,
      answer: `Start by comparing verified facilities in the ${countyData.name} County area on RehabLookup. Look for programs with proper state licensing, accreditation from bodies like JCAHO or CARF, evidence-based treatment approaches, and positive patient outcomes. Our concierge service can also provide personalized recommendations based on your specific needs.`,
    },
  ];

  const structuredData: any[] = [
    {
      "@context": "https://schema.org",
      "@type": "MedicalWebPage",
      name: pageTitle,
      description: treatment.description,
      url: `https://rehablookup.com/rehab-centers/${stateSlug}/county/${countySlug}/${treatmentSlug}`,
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

  return (
    <SEOLandingTemplate
      title={pageTitle}
      metaTitle={`${treatment.pluralLabel} in ${countyData.name} County, ${stateData.abbreviation} | RehabLookup`}
      metaDescription={`Find ${treatment.label.toLowerCase()} in ${countyData.name} County, ${stateData.name}. Compare ${facilities.length}+ verified facilities, check insurance, get help today.`}
      canonical={`https://rehablookup.com/rehab-centers/${stateSlug}/county/${countySlug}/${treatmentSlug}`}
      structuredData={structuredData}
      breadcrumbs={[
        { name: "Home", url: "/" },
        { name: stateData.name, url: `/rehab-centers/${stateSlug}` },
        { name: `${countyData.name} County`, url: `/rehab-centers/${stateSlug}/county/${countySlug}` },
        { name: treatment.pluralLabel, url: `/rehab-centers/${stateSlug}/county/${countySlug}/${treatmentSlug}` },
      ]}
      heroTitle={pageTitle}
      heroSubtitle={treatment.description}
      heroLocation={`${countyData.name} County, ${stateData.name}`}
      heroBadge="County Treatment Guide"
      introContent={`Looking for ${treatment.label.toLowerCase()} in ${countyData.name} County, ${stateData.name}? RehabLookup connects you with verified treatment facilities serving the ${countyData.majorCities.slice(0, 4).join(", ")} area. ${density === "high" ? `${countyData.name} County has strong access to ${treatment.label.toLowerCase()} with multiple accredited programs.` : density === "moderate" ? `${countyData.name} County offers several ${treatment.label.toLowerCase()} options for residents.` : `While ${countyData.name} County has limited local options, nearby facilities across ${stateData.name} provide accessible ${treatment.label.toLowerCase()}.`}`}
      sections={[
        {
          heading: `${treatment.label} Services in ${countyData.name} County`,
          content: `${countyData.name} County residents seeking ${treatment.label.toLowerCase()} can access programs that include medical assessment, individualized treatment planning, evidence-based therapies (CBT, DBT, motivational interviewing), and comprehensive aftercare support. ${countyData.population && countyData.population > 100000 ? `As a populous county with over ${Math.round(countyData.population / 1000)}K residents, ${countyData.name} County has developed a network of treatment resources.` : `${countyData.name} County residents benefit from both local and regional treatment options across ${stateData.name}.`}`,
        },
        {
          heading: `Choosing ${treatment.label} in ${stateData.name}`,
          content: `When selecting a ${treatment.label.toLowerCase()} program in ${countyData.name} County, consider: facility accreditation and state licensing, staff credentials and clinical expertise, treatment approaches offered, insurance acceptance and financial options, aftercare and continuing care programs, and patient reviews and outcomes data. All facilities listed on RehabLookup are verified for proper licensing and accreditation.`,
        },
      ]}
      facilities={facilities}
      isLoading={isLoading}
      facilityCount={facilities.length}
      showMoreLink={`/rehab-centers/${stateSlug}/county/${countySlug}`}
      faqs={faqs}
      faqTreatmentType={treatment.label}
      faqLocation={{ state: stateData.name }}
      relatedCityLinks={countyData.majorCities.slice(0, 6).map((city) => ({
        title: `${treatment.label} in ${city}`,
        href: `/${treatmentSlug}-in-${city.toLowerCase().replace(/\s+/g, "-")}`,
      }))}
      relatedStateLinks={Object.entries(COUNTY_TREATMENT_TYPES)
        .filter(([key]) => key !== treatmentSlug)
        .slice(0, 5)
        .map(([key, t]) => ({
          title: `${t.label} in ${countyData.name} County`,
          href: `/rehab-centers/${stateSlug}/county/${countySlug}/${key}`,
        }))}
      showTreatmentLinks
      showInsuranceLinks
      ctaTitle={`Find ${treatment.label} in ${countyData.name} County`}
      ctaSubtitle={`Our team will match you with the best ${treatment.label.toLowerCase()} programs in ${countyData.name} County, ${stateData.abbreviation}. Free and confidential.`}
    >
      <SmartInternalLinks
        pageType="county"
        stateSlug={stateSlug}
        stateName={stateData.name}
        countySlug={countySlug}
      />
    </SEOLandingTemplate>
  );
}
