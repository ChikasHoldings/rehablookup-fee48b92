import { useParams, Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { SEO, generateNearMeSchema } from "@/components/SEO";
import { shouldEmitFAQSchema } from "@/utils/seoPageValidator";
import { NearMeHero } from "@/components/seo/NearMeHero";
import { TreatmentFAQSection } from "@/components/seo/TreatmentFAQSection";
import { ResponsiveListingGrid } from "@/components/listings/ResponsiveListingGrid";
import { SearchResultsLoading } from "@/components/skeletons/SearchResultSkeleton";
import { useNearMeFacilities } from "@/hooks/useNearMeFacilities";
import { statesData } from "@/data/locationSeoData";
import { Button } from "@/components/ui/button";
import { ArrowRight, MapPin } from "lucide-react";
import {
  InternalLinkingSection,
  treatmentTypeLinks,
  insuranceLinks,
  resourceLinks,
} from "@/components/seo/InternalLinkingSection";

export interface SubstanceNearMeConfig {
  slug: string;
  label: string;
  serviceType: string;
  treatmentType: string;
  searchFilter?: string;
  keywords: string[];
  faqs: { question: string; answer: string }[];
}

export const substanceNearMeConfigs: SubstanceNearMeConfig[] = [
  {
    slug: "cocaine-rehab-near-me",
    label: "Cocaine Rehab",
    serviceType: "Cocaine Addiction Treatment Centers",
    treatmentType: "Cocaine Addiction Treatment",
    searchFilter: "Detox",
    keywords: ["cocaine rehab near me", "cocaine addiction treatment", "crack cocaine rehab", "cocaine detox", "stimulant addiction treatment"],
    faqs: [
      { question: "How is cocaine addiction treated?", answer: "Cocaine addiction is treated through behavioral therapies including CBT, contingency management, and community-based recovery groups. Unlike opioid addiction, there are no FDA-approved medications specifically for cocaine dependence, though research into vaccines and medications continues. Inpatient programs provide the structured environment needed to break stimulant addiction patterns." },
      { question: "How long does cocaine rehab take?", answer: "Cocaine rehab typically involves 30-90 days of inpatient or residential treatment followed by extended outpatient care. The psychological dependence on cocaine can persist for months, making longer treatment durations and robust aftercare plans essential for sustained recovery." },
      { question: "Does insurance cover cocaine rehab?", answer: "Yes, most health insurance plans cover cocaine addiction treatment under mental health parity laws. This includes inpatient care, outpatient programs, therapy sessions, and any medical treatment needed during recovery." },
      { question: "What are cocaine withdrawal symptoms?", answer: "Cocaine withdrawal is primarily psychological rather than physical: intense cravings, depression, fatigue, increased appetite, vivid dreams, irritability, and difficulty concentrating. While not typically life-threatening, withdrawal can be severe enough to require supervised care to prevent relapse." },
      { question: "Is inpatient or outpatient better for cocaine addiction?", answer: "Inpatient treatment is generally recommended for moderate to severe cocaine addiction due to the intense psychological cravings. The structured environment removes access to the drug and provides 24/7 support during the critical early recovery period. Outpatient may work for mild cases with strong support systems." },
    ],
  },
  {
    slug: "heroin-rehab-near-me",
    label: "Heroin Rehab",
    serviceType: "Heroin Addiction Treatment Centers",
    treatmentType: "Heroin Addiction Treatment",
    searchFilter: "Detox",
    keywords: ["heroin rehab near me", "heroin addiction treatment", "heroin detox", "opioid rehab", "heroin recovery programs"],
    faqs: [
      { question: "What does heroin rehab involve?", answer: "Heroin rehab typically begins with medically supervised detox using medications like buprenorphine (Suboxone) or methadone to manage withdrawal. This is followed by inpatient treatment with behavioral therapies (CBT, DBT), group counseling, and long-term medication-assisted treatment (MAT) to prevent relapse." },
      { question: "How long is heroin detox?", answer: "Heroin detox typically lasts 5-10 days, with acute withdrawal symptoms peaking around 24-72 hours. Medical detox uses medications to manage symptoms and reduce discomfort. After detox, continuing into a full treatment program is critical — detox alone has very high relapse rates." },
      { question: "Is MAT effective for heroin addiction?", answer: "Yes, MAT is the gold standard for heroin and opioid addiction treatment. Buprenorphine and methadone reduce cravings by 50-80%, decrease overdose death risk by 50%, and significantly improve treatment retention. Long-term MAT maintenance is recommended." },
      { question: "Does insurance cover heroin rehab?", answer: "Yes, all health insurance plans are required to cover heroin and opioid addiction treatment under federal parity laws. This includes detox, inpatient care, outpatient programs, MAT medications, and therapy. Medicaid and Medicare also cover treatment." },
    ],
  },
  {
    slug: "opioid-rehab-near-me",
    label: "Opioid Rehab",
    serviceType: "Opioid Addiction Treatment Centers",
    treatmentType: "Opioid Addiction Treatment",
    searchFilter: "Detox",
    keywords: ["opioid rehab near me", "opioid addiction treatment", "opioid detox", "painkiller addiction", "opioid recovery programs", "prescription opioid rehab"],
    faqs: [
      { question: "What opioids do rehab centers treat?", answer: "Rehab centers treat addiction to all opioids including prescription painkillers (oxycodone, hydrocodone, morphine, codeine), heroin, fentanyl, and synthetic opioids. Treatment approaches are similar regardless of the specific opioid, though fentanyl cases may require modified detox protocols due to its potency." },
      { question: "What is the best treatment for opioid addiction?", answer: "Medication-assisted treatment (MAT) combined with behavioral therapy is the evidence-based gold standard. MAT uses buprenorphine (Suboxone), methadone, or naltrexone (Vivitrol) to reduce cravings and withdrawal. Combined with CBT, group therapy, and aftercare planning, this approach offers the best outcomes." },
      { question: "How dangerous is opioid withdrawal?", answer: "While opioid withdrawal is rarely life-threatening, it is intensely uncomfortable with symptoms including severe muscle aches, nausea/vomiting, diarrhea, insomnia, anxiety, and intense cravings. Medical detox provides medications to manage symptoms safely and comfortably." },
      { question: "How long does opioid rehab take?", answer: "Opioid rehab typically involves 5-10 days of detox, 30-90 days of inpatient treatment, and ongoing outpatient care. MAT maintenance may continue for months or years. Longer treatment durations are associated with better long-term recovery outcomes." },
    ],
  },
  {
    slug: "meth-rehab-near-me",
    label: "Meth Rehab",
    serviceType: "Methamphetamine Addiction Treatment Centers",
    treatmentType: "Methamphetamine Addiction Treatment",
    searchFilter: "Detox",
    keywords: ["meth rehab near me", "meth addiction treatment", "crystal meth rehab", "methamphetamine detox", "stimulant rehab"],
    faqs: [
      { question: "How is meth addiction treated?", answer: "Meth addiction treatment relies primarily on behavioral therapies since no FDA-approved medications exist specifically for methamphetamine dependence. The Matrix Model — a 16-week structured outpatient program combining CBT, family education, 12-step support, and contingency management — has shown strong effectiveness. Inpatient programs are often recommended due to intense cravings." },
      { question: "What is meth withdrawal like?", answer: "Meth withdrawal is primarily psychological: extreme fatigue, increased appetite, depression, anxiety, psychomotor slowing, vivid and unpleasant dreams, and intense cravings. The 'crash' period lasts 1-3 days, followed by weeks of lower energy, depression, and cravings. Medical supervision helps manage severe depression and suicidal ideation risks." },
      { question: "How long does meth rehab take?", answer: "Meth rehab is typically longer than other substance treatment — 60-90 days of inpatient care is recommended due to the extended withdrawal timeline and significant cognitive recovery needed. Brain dopamine systems can take 12-18 months to significantly recover, making extended aftercare critical." },
      { question: "Does insurance cover meth rehab?", answer: "Yes, health insurance plans cover methamphetamine addiction treatment under mental health parity laws. This includes inpatient and outpatient programs, behavioral therapy, psychiatric care for co-occurring conditions, and any medications prescribed during treatment." },
    ],
  },
  {
    slug: "prescription-drug-rehab-near-me",
    label: "Prescription Drug Rehab",
    serviceType: "Prescription Drug Addiction Treatment Centers",
    treatmentType: "Prescription Drug Addiction Treatment",
    keywords: ["prescription drug rehab near me", "prescription drug addiction treatment", "painkiller addiction treatment", "prescription drug abuse help", "prescription pill rehab"],
    faqs: [
      { question: "What prescription drugs are most commonly abused?", answer: "The most commonly abused prescription medications include opioid painkillers (oxycodone, hydrocodone, fentanyl), benzodiazepines (Xanax, Valium, Klonopin), stimulants (Adderall, Ritalin), and sleep medications (Ambien, Lunesta). Each class requires different treatment approaches." },
      { question: "How does prescription drug rehab differ from street drug rehab?", answer: "The clinical treatment is similar, but prescription drug addiction often involves co-occurring pain management needs, the challenge of stopping a legitimately prescribed medication, and addressing the relationship with prescribing physicians. Programs often include pain management alternatives and tapering protocols." },
      { question: "Can I still manage my medical condition during rehab?", answer: "Yes, quality rehab programs develop treatment plans that address both addiction and underlying medical conditions. Alternative pain management strategies, non-addictive medications, and integrated care plans ensure your medical needs are met while treating the addiction." },
      { question: "How do I know if I'm addicted to my prescription?", answer: "Signs include: taking more than prescribed, running out early, doctor shopping, using medication for non-medical reasons (mood alteration, sleep), continued use despite negative consequences, withdrawal symptoms when stopping, and preoccupation with obtaining the medication." },
    ],
  },
  {
    slug: "benzo-rehab-near-me",
    label: "Benzo Rehab",
    serviceType: "Benzodiazepine Addiction Treatment Centers",
    treatmentType: "Benzodiazepine Addiction Treatment",
    searchFilter: "Detox",
    keywords: ["benzo rehab near me", "benzodiazepine addiction treatment", "benzo detox", "benzo withdrawal treatment", "benzodiazepine rehab"],
    faqs: [
      { question: "Why is benzo withdrawal so dangerous?", answer: "Benzodiazepine withdrawal can cause life-threatening seizures, delirium, and psychosis. Unlike opioid withdrawal, abruptly stopping benzodiazepines after prolonged use can be fatal. Medical detox with a supervised tapering protocol is essential — never stop benzos cold turkey." },
      { question: "How long does benzo detox take?", answer: "Benzo detox requires a gradual taper that can take weeks to months depending on the medication, dose, and duration of use. Short-acting benzos (Xanax) may have a shorter acute withdrawal but longer post-acute symptoms. Long-acting benzos (Valium) are often used for controlled tapers." },
      { question: "What is a benzo taper?", answer: "A benzodiazepine taper involves slowly reducing the dose over time to minimize withdrawal symptoms and seizure risk. Often, patients are switched from a short-acting benzo to a longer-acting one (like diazepam) for a smoother taper. This process is medically supervised and individualized." },
      { question: "How long do benzo withdrawal symptoms last?", answer: "Acute withdrawal lasts 1-4 weeks, but post-acute withdrawal syndrome (PAWS) can persist for months or even years with symptoms like anxiety, insomnia, cognitive fog, and mood disturbances. Long-term support and therapy are important for managing protracted withdrawal." },
    ],
  },
  {
    slug: "xanax-rehab-near-me",
    label: "Xanax Rehab",
    serviceType: "Xanax Addiction Treatment Centers",
    treatmentType: "Xanax (Alprazolam) Addiction Treatment",
    searchFilter: "Detox",
    keywords: ["xanax rehab near me", "xanax addiction treatment", "xanax detox", "alprazolam rehab", "xanax withdrawal treatment"],
    faqs: [
      { question: "How is Xanax addiction treated?", answer: "Xanax (alprazolam) addiction requires medical detox with a gradual tapering protocol — often switching to a longer-acting benzodiazepine like diazepam for a controlled reduction. Following detox, treatment includes CBT for anxiety management, exposure therapy, medication alternatives for anxiety (SSRIs, buspirone), and comprehensive aftercare." },
      { question: "Why is Xanax particularly addictive?", answer: "Xanax is short-acting and fast-onset, creating rapid relief followed by rebound anxiety — this cycle reinforces compulsive use. Physical dependence can develop within weeks of regular use. The intense withdrawal symptoms make it extremely difficult to stop without medical help." },
      { question: "Can I manage anxiety without Xanax after rehab?", answer: "Yes, effective non-addictive alternatives include SSRIs/SNRIs, buspirone, CBT, mindfulness-based stress reduction, exercise programs, and other evidence-based anxiety treatments. Many people find their anxiety is actually better managed with these approaches than it was with benzodiazepines." },
      { question: "How long does Xanax rehab take?", answer: "Xanax detox typically takes 2-8 weeks due to the gradual taper required. This is followed by 30-90 days of inpatient or intensive outpatient treatment focused on anxiety management skills and relapse prevention. Total treatment including aftercare typically spans 3-6 months." },
    ],
  },
  {
    slug: "kratom-rehab-near-me",
    label: "Kratom Rehab",
    serviceType: "Kratom Addiction Treatment Centers",
    treatmentType: "Kratom Addiction Treatment",
    keywords: ["kratom rehab near me", "kratom addiction treatment", "kratom detox", "kratom withdrawal", "kratom dependence treatment"],
    faqs: [
      { question: "Is kratom addiction real?", answer: "Yes, kratom acts on opioid receptors in the brain and can cause physical dependence and addiction with regular use. Withdrawal symptoms are similar to opioid withdrawal, including nausea, sweating, anxiety, insomnia, and cravings. The severity depends on dose and duration of use." },
      { question: "How is kratom addiction treated?", answer: "Kratom addiction treatment often mirrors opioid addiction treatment. Medical detox manages withdrawal symptoms, which may include using buprenorphine or clonidine for comfort. Behavioral therapy addresses the underlying reasons for use, and aftercare planning supports long-term recovery." },
      { question: "What are kratom withdrawal symptoms?", answer: "Kratom withdrawal symptoms include muscle aches, nausea, sweating, runny nose, diarrhea, insomnia, anxiety, irritability, and cravings. Symptoms typically begin within 12-24 hours of last use and peak around days 2-3. Most acute symptoms resolve within 7-10 days." },
      { question: "Does insurance cover kratom rehab?", answer: "Insurance coverage for kratom addiction treatment varies. Most plans cover substance use disorder treatment generally, which would include kratom dependence. However, since kratom's legal status varies by state, coverage specifics may differ. Contact your insurance provider for details." },
    ],
  },
];

interface SubstanceRehabNearMeProps {
  configSlug: string;
}

export default function SubstanceRehabNearMe({ configSlug }: SubstanceRehabNearMeProps) {
  const { stateSlug } = useParams<{ stateSlug?: string }>();
  const config = substanceNearMeConfigs.find((c) => c.slug === configSlug);

  if (!config) return null;

  const { facilities, stateData, nearbyStates, locationString, isLoading } = useNearMeFacilities({
    stateSlug,
    basePath: `/${config.slug}`,
  });

  const faqs = stateData
    ? config.faqs.map((f) => ({
        question: f.question.replace(/\?$/, ` in ${stateData.state}?`).replace(/ in .* in /, " in "),
        answer: f.answer,
      }))
    : config.faqs;

  const structuredData: object[] = [
    generateNearMeSchema({
      serviceType: config.serviceType,
      location: stateData
        ? { state: stateData.state, stateAbbr: stateData.stateAbbr }
        : { state: "United States", stateAbbr: "US" },
      facilityCount: facilities.length,
    }),
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
    <Layout>
      <SEO
        title={`${config.label} Near Me ${stateData ? `in ${stateData.state}` : ""} | Find Treatment Centers`}
        description={`Find ${config.label.toLowerCase()} centers${stateData ? ` in ${stateData.state}` : " near you"}. Compare verified treatment programs, check insurance coverage, and get help today.`}
        canonical={stateSlug ? `/${config.slug}/${stateSlug}` : `/${config.slug}`}
        keywords={[
          ...config.keywords,
          ...(stateData
            ? [`${config.label.toLowerCase()} ${stateData.state}`, `${config.treatmentType.toLowerCase()} ${stateData.stateAbbr}`]
            : []),
        ]}
        structuredData={structuredData}
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "Treatment Options", url: "/treatment-types" },
          { name: config.label, url: `/${config.slug}` },
          ...(stateData ? [{ name: stateData.state, url: `/${config.slug}/${stateData.slug}` }] : []),
        ]}
      />

      <NearMeHero
        title={`${config.label} Near Me${stateData ? ` in ${stateData.state}` : ""}`}
        subtitle={`Find specialized ${config.treatmentType.toLowerCase()} programs${stateData ? ` in ${stateData.state}` : " near you"}. Verified facilities, evidence-based treatment, insurance accepted.`}
        treatmentType={config.treatmentType}
        location={stateData ? { state: stateData.state, stateAbbr: stateData.stateAbbr } : undefined}
        facilityCount={facilities.length}
      />

      <section className="py-12 bg-background">
        <div className="container">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-foreground">
              {config.treatmentType} Centers {stateData ? `in ${stateData.state}` : "Near You"}
            </h2>
            <p className="mt-2 text-muted-foreground">
              Browse {facilities.length > 0 ? `${facilities.length > 0 ? facilities.length + "+" : "verified"}` : ""} verified facilities specializing in {config.treatmentType.toLowerCase()}.
            </p>
          </div>

          {isLoading ? (
            <SearchResultsLoading />
          ) : (
            <div>
              <ResponsiveListingGrid facilities={facilities} maxItems={12} />
              {facilities.length > 12 && (
                <div className="mt-8 text-center">
                  <Link to={`/search-results${stateData ? `?state=${stateData.state}` : ""}`}>
                    <Button variant="outline" size="lg" className="gap-2">
                      View All {facilities.length} Centers
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {!stateSlug && (
        <section className="py-12 bg-muted/30 border-t">
          <div className="container">
            <h2 className="text-2xl font-bold text-foreground mb-6">
              {config.label} by State
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {statesData.slice(0, 20).map((state) => (
                <Link
                  key={state.slug}
                  to={`/${config.slug}/${state.slug}`}
                  className="flex items-center gap-2 p-3 rounded-lg bg-background border hover:border-primary hover:bg-primary/5 transition-all group"
                >
                  <MapPin className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                  <span className="font-medium text-foreground group-hover:text-primary">
                    {state.name}
                  </span>
                </Link>
              ))}
            </div>
            <div className="mt-6 text-center">
              <Link to="/rehab-centers">
                <Button variant="outline" className="gap-2">
                  View All 50 States <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      )}

      <InternalLinkingSection
        title="Related Resources"
        description="Explore treatment types, insurance coverage, and recovery guides"
        variant="grid"
        groups={[
          { title: "Treatment Programs", links: treatmentTypeLinks.slice(0, 5) },
          { title: "Insurance Coverage", links: insuranceLinks.slice(0, 5) },
          { title: "Recovery Guides", links: resourceLinks.slice(0, 5) },
        ]}
      />

      <TreatmentFAQSection
        faqs={faqs}
        treatmentType={config.label}
        location={stateData ? { state: stateData.state } : undefined}
      />
    </Layout>
  );
}
