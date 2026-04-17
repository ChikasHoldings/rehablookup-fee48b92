import { useMemo } from "react";
import { Navigate, useParams } from "react-router-dom";
import { SEOLandingTemplate } from "@/components/seo/SEOLandingTemplate";
import { useStaticFacilities } from "@/hooks/useStaticFacilities";
import { treatmentCenters } from "@/data/treatmentCenters";
import { statesData } from "@/data/locationSeoData";
import { SmartInternalLinks } from "@/components/seo/SmartInternalLinks";
import { shouldEmitFAQSchema, validatePage } from "@/utils/seoPageValidator";

interface PaymentStateConfig {
  slug: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  heroSubtitle: string;
  filterKeys: string[];
  introTemplate: (state: string, expanded: boolean) => string;
  sections: (state: string) => { heading: string; content: string }[];
  faqs: (state: string) => { question: string; answer: string }[];
}

const paymentConfigs: PaymentStateConfig[] = [
  {
    slug: "medicaid-rehab",
    title: "Medicaid Rehab Centers",
    metaTitle: "Medicaid Rehab Centers in {state} — Find Covered Treatment | RehabLookup",
    metaDescription: "Find rehab centers accepting Medicaid in {state}. Compare verified programs with Medicaid coverage. Free insurance verification available.",
    heroSubtitle: "Find addiction treatment facilities that accept Medicaid coverage in your state.",
    filterKeys: ["medicaid", "state-funded", "sliding-scale", "free"],
    introTemplate: (state, expanded) =>
      `Looking for rehab centers that accept Medicaid in ${state}? ${expanded ? `${state} has expanded Medicaid under the ACA, providing broader coverage for substance abuse treatment including medical detox, residential rehabilitation, outpatient programs, and medication-assisted treatment.` : `While ${state} has not expanded Medicaid, traditional Medicaid and other state-funded programs provide coverage for substance abuse treatment for qualifying residents.`} RehabLookup helps you find verified facilities in ${state} that accept Medicaid, compare programs, and start treatment with confidence.`,
    sections: (state) => [
      {
        heading: `Medicaid Coverage for Rehab in ${state}`,
        content: `Medicaid covers substance abuse treatment as an essential health benefit. In ${state}, this includes medical detoxification, inpatient/residential rehabilitation, intensive outpatient programs (IOP), partial hospitalization (PHP), medication-assisted treatment (MAT), individual and group therapy, and aftercare services. Coverage details vary by plan type — contact facilities to verify your specific Medicaid plan's benefits.`,
      },
      {
        heading: `How to Use Medicaid for Treatment in ${state}`,
        content: `To use Medicaid for rehab in ${state}: 1) Verify your Medicaid is active and current, 2) Contact facilities to confirm they accept your specific Medicaid plan, 3) Ask about any pre-authorization requirements, 4) Inquire about covered treatment levels and duration limits, 5) Understand any copay obligations. Many facilities listed on RehabLookup offer free Medicaid benefits verification.`,
      },
    ],
    faqs: (state) => [
      { question: `Does Medicaid cover rehab in ${state}?`, answer: `Yes, Medicaid covers substance abuse treatment in ${state} as an essential health benefit. Coverage includes medical detox, residential treatment, outpatient programs, medication-assisted treatment, and therapy. Specific coverage details, duration limits, and pre-authorization requirements vary by Medicaid plan type.` },
      { question: `How do I find Medicaid rehab in ${state}?`, answer: `Use RehabLookup to find verified treatment facilities in ${state} that accept Medicaid. You can also call your Medicaid managed care plan's member services for a list of in-network providers, or contact SAMHSA's helpline (1-800-662-4357) for immediate assistance finding Medicaid-accepting programs.` },
      { question: `What does Medicaid rehab include in ${state}?`, answer: `Medicaid-covered treatment in ${state} typically includes medical detox, residential/inpatient treatment (usually 28-30 days, extendable with authorization), intensive outpatient programs (IOP), medication-assisted treatment (buprenorphine, methadone, naltrexone), individual and group therapy, and case management services.` },
      { question: `Are there wait lists for Medicaid rehab in ${state}?`, answer: `Wait times vary by facility and location. Some Medicaid-accepting programs in ${state} have immediate availability while others may have waiting lists of days to weeks. Contact multiple facilities simultaneously and ask about wait times. Some programs prioritize urgent cases (pregnant women, IV drug users, those at medical risk).` },
    ],
  },
  {
    slug: "medicare-rehab",
    title: "Medicare Rehab Centers",
    metaTitle: "Medicare Rehab Centers in {state} — Find Covered Treatment | RehabLookup",
    metaDescription: "Find rehab centers accepting Medicare in {state}. Compare verified programs with Medicare coverage for addiction treatment.",
    heroSubtitle: "Find addiction treatment facilities that accept Medicare Part A and Part B coverage.",
    filterKeys: ["medicare", "inpatient", "outpatient"],
    introTemplate: (state) =>
      `Looking for rehab centers that accept Medicare in ${state}? Medicare provides comprehensive coverage for substance abuse treatment for beneficiaries aged 65+ and younger individuals with qualifying disabilities. Medicare Part A covers inpatient/residential treatment, while Part B covers outpatient therapy, counseling, and medication-assisted treatment. RehabLookup helps you find verified Medicare-accepting facilities in ${state}.`,
    sections: (state) => [
      {
        heading: `Medicare Coverage for Rehab in ${state}`,
        content: `Medicare covers addiction treatment through multiple parts: Part A covers inpatient hospital stays and residential treatment facilities (subject to deductible and coinsurance). Part B covers outpatient substance abuse treatment including individual therapy, group counseling, psychiatric services, and medication-assisted treatment. Medicare Advantage plans (Part C) may offer additional behavioral health benefits. Part D covers prescription medications including MAT drugs.`,
      },
      {
        heading: `Using Medicare Benefits in ${state}`,
        content: `To access Medicare-covered rehab in ${state}: 1) Confirm the facility accepts Medicare assignment, 2) Verify whether the facility is Medicare-certified, 3) Understand your Part A deductible and coinsurance obligations, 4) Ask about prior authorization for residential treatment, 5) Check if the facility accepts Medicare Advantage if applicable. Many ${state} facilities offer free Medicare benefits verification.`,
      },
    ],
    faqs: (state) => [
      { question: `Does Medicare cover rehab in ${state}?`, answer: `Yes, Medicare covers substance abuse treatment in ${state}. Part A covers inpatient treatment (hospital-based and residential), Part B covers outpatient therapy and counseling, and Part D covers prescription medications including MAT drugs. Medicare Advantage plans may provide additional behavioral health coverage.` },
      { question: `What is the Medicare deductible for rehab?`, answer: `For 2024, the Medicare Part A deductible is $1,632 per benefit period for inpatient stays. Part B covers outpatient services after the $240 annual deductible at 80% (you pay 20% coinsurance). Medicare Supplement (Medigap) plans can help cover these out-of-pocket costs.` },
      { question: `How long will Medicare pay for rehab?`, answer: `Medicare Part A covers up to 60 days of inpatient treatment per benefit period at the standard deductible rate, then daily coinsurance applies for days 61-90. For outpatient treatment under Part B, there is no set limit on the number of covered sessions as long as they are medically necessary. Treatment plans are reviewed regularly.` },
      { question: `Can I use Medicare for MAT?`, answer: `Yes, Medicare covers medication-assisted treatment including buprenorphine (Suboxone), methadone maintenance (through certified opioid treatment programs), and naltrexone (Vivitrol). Part B covers the office visits and Part D covers most MAT medications. Medicare has significantly expanded MAT coverage in recent years.` },
    ],
  },
];

interface PaymentStatePageProps {
  paymentType: "medicaid" | "medicare";
}

export default function PaymentStatePage({ paymentType }: PaymentStatePageProps) {
  const { stateSlug } = useParams<{ stateSlug: string }>();
  const { data: approvedFacilities = [], isLoading } = useStaticFacilities();

  const config = paymentConfigs.find((c) => c.slug === `${paymentType}-rehab`)!;
  const stateData = statesData.find((s) => s.slug === stateSlug) || null;

  // Check Medicaid expansion status from insurance config
  const isMedicaidExpanded = useMemo(() => {
    // States that have NOT expanded Medicaid as of 2024
    const nonExpanded = ["texas", "georgia", "florida", "wisconsin", "tennessee", "mississippi", "alabama", "south-carolina", "kansas", "wyoming"];
    return !nonExpanded.includes(stateSlug || "");
  }, [stateSlug]);

  const { facilities, directMatchCount, stateFallbackCount } = useMemo(() => {
    if (!stateData) return { facilities: [], directMatchCount: 0, stateFallbackCount: 0 };
    const all = [...treatmentCenters, ...approvedFacilities];
    const keywords = config.filterKeys.map((k) => k.toLowerCase());
    const stateLower = stateData.name.toLowerCase();

    const matched = all.filter((f) => {
      const stateMatch = f.state.toLowerCase() === stateLower;
      const keyMatch = f.insuranceAccepted?.some((i) => keywords.some((k) => i.toLowerCase().includes(k))) ||
        f.treatmentTypes?.some((t) => keywords.some((k) => t.toLowerCase().includes(k)));
      return stateMatch && keyMatch;
    });

    const stateAll = all.filter((f) => f.state.toLowerCase() === stateLower);
    const display = matched.length >= 3 ? matched : stateAll;

    return {
      facilities: display.slice(0, 12),
      directMatchCount: matched.length,
      stateFallbackCount: stateAll.length,
    };
  }, [approvedFacilities, stateData, config.filterKeys]);

  const validation = validatePage("payment-state", directMatchCount, { stateFallbackCount });

  if (!stateData) return <Navigate to="/treatment-types" replace />;

  const { name: stateName, abbreviation } = stateData;
  const pageTitle = `${config.title} in ${stateName}`;
  const canonicalPath = `/${config.slug}/${stateSlug}`;
  const faqs = config.faqs(stateName);
  const sections = config.sections(stateName);

  const structuredData: any[] = [{
    "@context": "https://schema.org",
    "@type": "MedicalWebPage",
    name: pageTitle,
    description: config.metaDescription.replace("{state}", stateName),
    url: `https://rehablookup.com${canonicalPath}`,
    specialty: "Addiction Medicine",
    lastReviewed: new Date().toISOString().split("T")[0],
  }];

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

  const otherStates = statesData
    .filter((s) => s.slug !== stateSlug)
    .slice(0, 10)
    .map((s) => ({
      title: `${config.title} in ${s.name}`,
      href: `/${config.slug}/${s.slug}`,
    }));

  return (
    <SEOLandingTemplate
      title={pageTitle}
      metaTitle={config.metaTitle.replace("{state}", `${stateName} (${abbreviation})`)}
      metaDescription={config.metaDescription.replace("{state}", stateName)}
      canonical={`https://rehablookup.com${canonicalPath}`}
      structuredData={structuredData}
      breadcrumbs={[
        { name: "Home", url: "/" },
        { name: config.title, url: paymentType === "medicaid" ? "/medicaid-rehab-centers" : "/does-insurance-cover-rehab" },
        { name: stateName, url: canonicalPath },
      ]}
      heroTitle={pageTitle}
      heroSubtitle={`Find verified ${paymentType === "medicaid" ? "Medicaid" : "Medicare"}-accepting rehab facilities across ${stateName}.`}
      heroLocation={stateName}
      heroBadge={`${paymentType === "medicaid" ? "Medicaid" : "Medicare"} Accepted`}
      introContent={config.introTemplate(stateName, isMedicaidExpanded)}
      sections={sections}
      facilities={facilities}
      isLoading={isLoading}
      facilityCount={facilities.length}
      showMoreLink={`/rehab-centers/${stateSlug}`}
      faqs={faqs}
      faqTreatmentType={`${paymentType === "medicaid" ? "Medicaid" : "Medicare"} Coverage`}
      faqLocation={{ city: "", state: stateName }}
      relatedCityLinks={otherStates.slice(0, 6)}
      relatedStateLinks={[
        { title: `All Rehab in ${stateName}`, href: `/rehab-centers/${stateSlug}` },
        { title: `Free Rehab in ${stateName}`, href: `/free-rehab/${stateSlug}` },
        { title: `Insurance Coverage`, href: "/does-insurance-cover-rehab" },
      ]}
      showTreatmentLinks
      showInsuranceLinks
      ctaTitle={`Verify ${paymentType === "medicaid" ? "Medicaid" : "Medicare"} Benefits in ${stateName}`}
      ctaSubtitle={`Our team checks your ${paymentType === "medicaid" ? "Medicaid" : "Medicare"} coverage and matches you with the best programs in ${stateName}. Free and confidential.`}
      ctaButtonText="Verify My Coverage"
    >
      <SmartInternalLinks pageType="insurance-state" stateSlug={stateSlug!} stateName={stateName} />
    </SEOLandingTemplate>
  );
}
