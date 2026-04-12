import { useMemo } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { SEOLandingTemplate } from "@/components/seo/SEOLandingTemplate";
import { useStaticFacilities } from "@/hooks/useStaticFacilities";
import { treatmentCenters } from "@/data/treatmentCenters";
import { SmartInternalLinks } from "@/components/seo/SmartInternalLinks";
import { shouldEmitFAQSchema } from "@/utils/seoPageValidator";
import { statesData } from "@/data/locationSeoData";

interface ExpandedHubConfig {
  slug: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  heroSubtitle: string;
  filterKeys: string[];
  overview: string;
  whatToExpect: string[];
  benefits: string[];
  faqs: { question: string; answer: string }[];
}

const EXPANDED_HUB_CONFIGS: ExpandedHubConfig[] = [
  {
    slug: "sober-living-homes",
    title: "Sober Living Homes",
    metaTitle: "Sober Living Homes Near You — Transitional Housing for Recovery",
    metaDescription: "Find verified sober living homes offering structured, substance-free housing. Compare programs, read reviews, and find your bridge to independent recovery.",
    heroSubtitle: "Find structured, substance-free transitional housing that bridges the gap between intensive treatment and independent living.",
    filterKeys: ["sober-living", "sober living", "halfway"],
    overview: "Sober living homes provide safe, structured, substance-free environments for individuals transitioning from intensive treatment to independent living. These residences offer accountability through house rules, drug testing, peer support, and often include access to outpatient services. Sober living bridges the critical gap when early recovery is most vulnerable, with research showing residents have significantly better outcomes than those who return directly to unsupported environments.",
    whatToExpect: [
      "Structured, substance-free living environment",
      "Random drug and alcohol testing",
      "House meetings and peer support groups",
      "Curfews and accountability measures",
      "Help with employment and life skills",
      "Gradual transition to independent living",
    ],
    benefits: [
      "Safe environment during vulnerable early recovery",
      "Built-in peer support and accountability",
      "Lower cost than inpatient treatment",
      "Practice real-world recovery skills",
      "Connection to outpatient services and 12-step programs",
      "Reduced relapse risk through structured support",
    ],
    faqs: [
      { question: "How long do people stay in sober living?", answer: "Average stays range from 3-12 months, though many residents stay longer. There is no maximum duration — residents can stay as long as they follow house rules and benefit from the structure. Longer stays correlate with better long-term recovery outcomes." },
      { question: "How much does sober living cost?", answer: "Sober living typically costs $500-$2,500 per month depending on location, amenities, and services included. Some programs accept insurance or offer sliding-scale fees. State-funded options and scholarship programs are available in many areas." },
      { question: "What are the rules in sober living homes?", answer: "Common rules include: no drug or alcohol use, participation in random testing, attending house meetings, maintaining employment or education, performing household chores, respecting curfews, and participating in recovery activities (support groups, therapy)." },
      { question: "Is sober living the same as a halfway house?", answer: "While similar, sober living homes are typically privately operated with more flexibility, while halfway houses are often government-funded and may be mandated as part of a criminal justice program. Both provide structured, substance-free housing during recovery." },
    ],
  },
  {
    slug: "faith-based-rehab",
    title: "Faith-Based Rehab Programs",
    metaTitle: "Faith-Based Rehab Programs — Spiritual Recovery Treatment",
    metaDescription: "Find faith-based rehab programs combining spiritual practices with evidence-based addiction treatment. Christian, non-denominational, and holistic options.",
    heroSubtitle: "Discover addiction treatment programs that integrate spiritual practices with clinical care for whole-person healing.",
    filterKeys: ["faith", "christian", "spiritual"],
    overview: "Faith-based rehabilitation programs integrate spiritual practices and religious principles with evidence-based addiction treatment. These programs recognize that addiction affects the whole person — body, mind, and spirit — and incorporate prayer, scripture study, pastoral counseling, and spiritual community alongside clinical therapies. Faith-based programs are available in various traditions including Christian, non-denominational, and interfaith approaches, each offering a supportive community united by shared values and hope for recovery.",
    whatToExpect: [
      "Integration of spiritual practices with clinical treatment",
      "Prayer, meditation, and scripture study",
      "Pastoral counseling alongside licensed therapy",
      "12-step or faith-based recovery curriculum",
      "Community worship and fellowship opportunities",
      "Evidence-based clinical care (CBT, group therapy)",
    ],
    benefits: [
      "Addresses spiritual dimension of recovery",
      "Strong community and peer support",
      "Often lower cost or donation-based",
      "Emphasis on purpose, meaning, and hope",
      "Long-term support through faith communities",
      "Combines proven clinical methods with spiritual care",
    ],
    faqs: [
      { question: "Do I need to be religious to attend faith-based rehab?", answer: "While faith-based programs center on spiritual practices, many welcome individuals of all backgrounds. Some non-denominational programs focus broadly on spirituality rather than specific doctrines. However, participation in spiritual activities is typically expected and central to the program." },
      { question: "Are faith-based rehab programs effective?", answer: "Research shows faith-based programs can be as effective as secular programs, particularly for individuals who find meaning and motivation through spiritual practices. The combination of clinical evidence-based treatment with spiritual support and strong community connections contributes to positive outcomes." },
      { question: "Does insurance cover faith-based rehab?", answer: "Insurance typically covers the clinical treatment components (therapy, medical care, medication management) of faith-based programs. However, purely religious activities may not be covered. Many faith-based programs are nonprofit and offer reduced costs, scholarships, or donation-based models." },
      { question: "What types of faith-based programs exist?", answer: "Options include Christian rehab programs, non-denominational spiritual recovery, Teen Challenge programs, Salvation Army rehabilitation, faith-integrated clinical treatment centers, and church-affiliated recovery programs. Each varies in the balance between spiritual and clinical components." },
    ],
  },
  {
    slug: "fentanyl-rehab",
    title: "Fentanyl Addiction Treatment",
    metaTitle: "Fentanyl Rehab Programs — Specialized Addiction Treatment",
    metaDescription: "Find specialized fentanyl addiction treatment programs with medical detox and MAT. Compare verified facilities equipped for fentanyl recovery. Get help today.",
    heroSubtitle: "Specialized treatment programs for fentanyl addiction with medical detox, MAT protocols, and comprehensive recovery support.",
    filterKeys: ["fentanyl", "opioid", "MAT"],
    overview: "Fentanyl addiction requires specialized treatment due to its extreme potency — 50-100 times stronger than morphine. Medical detox is critical as fentanyl withdrawal can be severe, and medication-assisted treatment (MAT) with buprenorphine or methadone is considered the gold standard for recovery. The fentanyl crisis has driven innovation in treatment protocols, with many facilities now offering specialized programs addressing the unique challenges of synthetic opioid addiction including higher tolerance thresholds and longer withdrawal timelines.",
    whatToExpect: [
      "Specialized fentanyl detox protocols",
      "Medication-Assisted Treatment (MAT) with Suboxone or methadone",
      "24/7 medical monitoring during withdrawal",
      "Overdose prevention education and naloxone training",
      "Trauma-informed therapy addressing underlying issues",
      "Long-term MAT maintenance and aftercare planning",
    ],
    benefits: [
      "Protocols designed for synthetic opioid potency",
      "FDA-approved MAT reducing cravings 50-80%",
      "Decreased overdose death risk by 50% with MAT",
      "Specialized staff experienced with fentanyl cases",
      "Naloxone training for patients and families",
      "Comprehensive aftercare preventing relapse",
    ],
    faqs: [
      { question: "How long does fentanyl detox take?", answer: "Fentanyl detox typically takes 7-14 days, longer than other opioids due to its potency and how it accumulates in fat tissue. Medical supervision is essential as withdrawal symptoms can be intense. MAT medications significantly reduce discomfort and are often continued long-term." },
      { question: "What is the best treatment for fentanyl addiction?", answer: "Evidence strongly supports Medication-Assisted Treatment (MAT) with buprenorphine (Suboxone) or methadone as the most effective approach for fentanyl addiction. Combined with behavioral therapy, MAT reduces overdose deaths by 50% and significantly improves treatment retention and long-term recovery outcomes." },
      { question: "Is fentanyl withdrawal dangerous?", answer: "While fentanyl withdrawal is rarely life-threatening, it can be extremely uncomfortable with severe muscle pain, insomnia, gastrointestinal distress, and intense cravings. Medical detox provides medications to manage symptoms safely and reduces the risk of relapse during the vulnerable withdrawal period." },
      { question: "How long is fentanyl rehab?", answer: "Comprehensive fentanyl treatment typically involves 7-14 days of detox followed by 60-90+ days of rehabilitation. Many patients continue MAT maintenance long-term (12+ months recommended) with decreasing levels of outpatient support. Longer treatment durations correlate with better outcomes for opioid addiction." },
    ],
  },
  {
    slug: "veterans-rehab",
    title: "Veterans Addiction Treatment Programs",
    metaTitle: "Veterans Rehab Programs — Addiction Treatment for Military",
    metaDescription: "Find specialized addiction treatment for veterans and military personnel. Programs addressing PTSD, trauma, and substance abuse. VA and private options.",
    heroSubtitle: "Specialized addiction treatment programs for veterans addressing military trauma, PTSD, and substance use disorders.",
    filterKeys: ["veteran", "military", "VA"],
    overview: "Veterans face unique addiction challenges — combat-related PTSD, military sexual trauma, traumatic brain injury, and the cultural transition from military to civilian life all contribute to higher rates of substance use disorders. Specialized veteran rehab programs understand military culture, address trauma at the root of addiction, and provide peer support from fellow veterans. Both VA-funded and private programs are available, with many offering TRICARE acceptance and specialized trauma modalities like EMDR and CPT.",
    whatToExpect: [
      "Military-culturally competent treatment teams",
      "Integrated PTSD and substance abuse treatment",
      "EMDR, CPT, and trauma-focused therapies",
      "Peer support from fellow veterans",
      "VA benefits coordination and advocacy",
      "Transition support and career counseling",
    ],
    benefits: [
      "Staff trained in military culture and experience",
      "Dual treatment for PTSD and addiction",
      "Fellow veteran peer support community",
      "VA and TRICARE benefit utilization",
      "Addresses military-specific trauma triggers",
      "Transition support for civilian reintegration",
    ],
    faqs: [
      { question: "Does the VA cover addiction treatment?", answer: "Yes, the VA covers substance use disorder treatment for eligible veterans including medical detox, inpatient and outpatient rehab, MAT, and mental health services. Veterans with service-connected disabilities receive priority. Private facilities accepting TRICARE also provide an alternative for eligible service members and veterans." },
      { question: "Are there rehab programs specifically for veterans?", answer: "Yes, both VA Medical Centers and private facilities offer veteran-specific addiction treatment programs. These programs employ staff trained in military culture, integrate trauma treatment with addiction care, and provide peer support from fellow veterans who understand the unique challenges of military service." },
      { question: "Can active duty military attend rehab?", answer: "Yes, the military provides substance abuse treatment through each branch's Substance Abuse Rehabilitation Program (SARP). Seeking treatment is generally protected and encouraged. Additionally, TRICARE covers civilian treatment facilities when military programs are not available or appropriate." },
      { question: "Does rehab affect VA disability benefits?", answer: "Seeking addiction treatment does not negatively impact VA disability ratings. In fact, documenting substance use disorders related to service-connected conditions may support disability claims. The VA encourages veterans to seek treatment without fear of benefit reduction." },
    ],
  },
  {
    slug: "womens-rehab",
    title: "Women's Rehab Programs",
    metaTitle: "Women's Rehab Programs — Gender-Specific Addiction Treatment",
    metaDescription: "Find women-only rehab programs addressing gender-specific addiction issues. Safe, supportive environments for women seeking recovery. Compare programs.",
    heroSubtitle: "Gender-specific addiction treatment in safe, supportive environments addressing the unique recovery needs of women.",
    filterKeys: ["women", "female", "gender-specific"],
    overview: "Women's rehabilitation programs provide gender-specific treatment addressing the unique biological, psychological, and social factors affecting women's addiction and recovery. Women face distinct challenges including hormonal influences on addiction, higher rates of co-occurring trauma and depression, childcare responsibilities, and relationship dynamics that may contribute to substance use. Gender-specific programs create safe environments where women can address these issues openly, build support networks, and develop recovery skills tailored to their needs.",
    whatToExpect: [
      "Women-only treatment environment",
      "Trauma-informed care addressing gender-specific trauma",
      "Maternal and childcare support when available",
      "Treatment for co-occurring depression, anxiety, PTSD",
      "Body image and self-esteem programming",
      "Parenting skills and family reunification support",
    ],
    benefits: [
      "Safe environment free from gender-related triggers",
      "Addresses female-specific addiction factors",
      "Trauma processing in supportive all-women setting",
      "Childcare and parenting support options",
      "Treatment for co-occurring eating disorders",
      "Strong female peer support networks",
    ],
    faqs: [
      { question: "Why choose a women-only rehab program?", answer: "Women's programs provide safety from gender-related triggers, address female-specific trauma (sexual abuse, domestic violence), treat co-occurring conditions more common in women (depression, eating disorders), and offer childcare support. Research shows women in gender-specific programs have better outcomes and higher treatment completion rates." },
      { question: "Can I bring my children to women's rehab?", answer: "Some women's rehab programs offer family-friendly options where mothers can have their children with them during treatment. These programs provide childcare during therapy sessions and parenting education. Availability varies by facility — ask about family programs when contacting admissions." },
      { question: "Does insurance cover women's rehab?", answer: "Yes, insurance covers the clinical treatment components of women's rehab programs. Gender-specific programming is recognized as clinically appropriate and is typically covered under behavioral health benefits. Contact your insurance provider or the facility for benefits verification." },
      { question: "What issues do women's programs specifically address?", answer: "Women's programs focus on: sexual and domestic violence trauma, postpartum depression and perinatal addiction, body image and eating disorders, codependency patterns, hormonal effects on addiction, parenting and custody concerns, and rebuilding self-worth and independence." },
    ],
  },
  {
    slug: "mens-rehab",
    title: "Men's Rehab Programs",
    metaTitle: "Men's Rehab Programs — Gender-Specific Addiction Treatment",
    metaDescription: "Find men-only rehab programs addressing male-specific addiction challenges. Structured environments promoting accountability and recovery for men.",
    heroSubtitle: "Gender-specific addiction treatment designed for men, addressing unique challenges in a structured, accountable environment.",
    filterKeys: ["men", "male", "gender-specific"],
    overview: "Men's rehabilitation programs offer gender-specific treatment addressing the unique factors influencing male addiction — societal expectations around masculinity, reluctance to seek help, anger management challenges, work-related stress, and relationship patterns that contribute to substance use. Men-only environments encourage vulnerability and honest communication that many men find difficult in mixed-gender settings. These programs help men develop healthy emotional expression, accountability, and the interpersonal skills essential for sustained recovery.",
    whatToExpect: [
      "Men-only treatment environment",
      "Anger management and emotional regulation",
      "Accountability structures and peer mentorship",
      "Career and vocational counseling",
      "Healthy masculinity and relationship skills",
      "Physical fitness and wellness programming",
    ],
    benefits: [
      "Comfortable environment for male vulnerability",
      "Addresses stigma and help-seeking barriers",
      "Peer accountability and brotherhood",
      "Focus on healthy emotional expression",
      "Career and financial rehabilitation support",
      "Physical activity integrated into recovery",
    ],
    faqs: [
      { question: "Why choose a men-only rehab program?", answer: "Men's programs address male-specific barriers to recovery including stigma around vulnerability, difficulty expressing emotions, anger management issues, and societal pressure to 'tough it out.' The all-male environment encourages honest communication and builds accountability through brotherhood." },
      { question: "What makes men's addiction different?", answer: "Men statistically have higher rates of substance use, are less likely to seek treatment, face stronger stigma around asking for help, and often use substances to cope with unexpressed emotions. Men's programs address these patterns directly with specialized approaches." },
      { question: "Do men's rehab programs include physical activity?", answer: "Many men's programs incorporate fitness, outdoor activities, and sports into their treatment approach. Physical activity is recognized as beneficial for recovery — improving mood, reducing cravings, building discipline, and providing healthy coping mechanisms." },
      { question: "Does insurance cover men's rehab?", answer: "Yes, the clinical components of men's rehab programs are covered by insurance under behavioral health benefits. Gender-specific treatment is clinically supported and recognized by insurers as appropriate care for addiction treatment." },
    ],
  },
  {
    slug: "free-rehab-options",
    title: "Free & Low-Cost Rehab Programs",
    metaTitle: "Free Rehab Programs Near You — No-Cost Addiction Treatment",
    metaDescription: "Find free and low-cost rehab programs including state-funded, Medicaid, and nonprofit options. Financial barriers should never prevent recovery. Get help now.",
    heroSubtitle: "Financial barriers should never prevent addiction treatment. Find free, state-funded, and sliding-scale programs near you.",
    filterKeys: ["free", "medicaid", "sliding-scale", "state-funded"],
    overview: "Free and low-cost rehabilitation programs ensure that financial barriers never prevent someone from accessing addiction treatment. Options include state-funded programs supported by federal block grants, Medicaid-covered facilities, nonprofit and faith-based centers, community health center addiction services, and programs offering sliding-scale fees based on income. The quality of care at many publicly funded programs equals that of private facilities, with licensed professionals using the same evidence-based treatment approaches.",
    whatToExpect: [
      "Evidence-based treatment regardless of ability to pay",
      "Income-based eligibility assessment",
      "Medical detox, therapy, and medication management",
      "Case management and social services support",
      "Medicaid enrollment assistance when eligible",
      "Aftercare planning and community resource connections",
    ],
    benefits: [
      "No cost or minimal cost for eligible individuals",
      "Same evidence-based treatment as private facilities",
      "Licensed, qualified clinical staff",
      "Holistic support addressing housing, employment, legal",
      "Priority access for high-risk populations",
      "Connection to long-term community support",
    ],
    faqs: [
      { question: "How do I qualify for free rehab?", answer: "Eligibility typically depends on income level (usually below 200% of federal poverty level), lack of insurance, state residency, and substance use disorder diagnosis. Priority populations include pregnant women, IV drug users, and those with co-occurring conditions. Contact programs directly — many are more flexible than published criteria." },
      { question: "Is free rehab as good as paid rehab?", answer: "Research shows no significant difference in treatment outcomes based on cost. Free and state-funded programs use the same evidence-based approaches, employ licensed professionals, and achieve excellent outcomes. The key factors are treatment quality, duration, and patient engagement — not price." },
      { question: "Are there wait times for free rehab?", answer: "Wait times vary by location and demand, ranging from immediate admission to several weeks. Ask about interim services while waiting, consider expanding your geographic search, and ask about priority admission for urgent situations (pregnancy, IV drug use, recent overdose)." },
      { question: "How do I find free rehab near me?", answer: "Call SAMHSA's helpline (1-800-662-4357) for free referrals, contact your state substance abuse authority, search RehabLookup filtering by Medicaid-accepted facilities, check with county behavioral health departments, and inquire at local community health centers." },
    ],
  },
];

export default function ExpandedTreatmentHubPage() {
  const location = useLocation();
  const slug = location.pathname.replace(/^\//, "");
  const config = EXPANDED_HUB_CONFIGS.find((c) => c.slug === slug);
  const { data: approvedFacilities = [], isLoading } = useStaticFacilities();

  const facilities = useMemo(() => {
    if (!config) return [];
    const allFacilities = [...treatmentCenters, ...approvedFacilities];
    return allFacilities
      .filter((f) =>
        config.filterKeys.some(
          (key) =>
            f.treatmentTypes?.some((t) => t.toLowerCase().includes(key.toLowerCase())) ||
            f.description?.toLowerCase().includes(key.toLowerCase())
        )
      )
      .sort((a, b) => {
        const aPro = (a as any).isPro ? 1 : 0;
        const bPro = (b as any).isPro ? 1 : 0;
        if (bPro !== aPro) return bPro - aPro;
        if ((a.featured ? 1 : 0) !== (b.featured ? 1 : 0)) return (b.featured ? 1 : 0) - (a.featured ? 1 : 0);
        return a.name.localeCompare(b.name);
      })
      .slice(0, 12);
  }, [approvedFacilities, config]);

  const stateLinks = useMemo(() => {
    if (!config) return [];
    // Map slug to treatment-types state route
    const stateRouteSlug = config.slug === "sober-living-homes" ? "sober-living"
      : config.slug === "free-rehab-options" ? "free-rehab"
      : config.slug;
    return statesData.slice(0, 12).map((s) => ({
      title: `${config.title} in ${s.name}`,
      href: `/treatment-types/${stateRouteSlug}/${s.slug}`,
    }));
  }, [config]);

  if (!config) {
    return <Navigate to="/treatment-types" replace />;
  }

  const structuredData: any[] = [
    {
      "@context": "https://schema.org",
      "@type": "MedicalWebPage",
      name: config.title,
      description: config.metaDescription,
      url: `https://rehablookup.com/${config.slug}`,
      about: { "@type": "MedicalCondition", name: "Substance Use Disorder" },
      specialty: "Addiction Medicine",
      lastReviewed: new Date().toISOString().split("T")[0],
    },
  ];

  if (shouldEmitFAQSchema(config.faqs)) {
    structuredData.push({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: config.faqs.map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: { "@type": "Answer", text: faq.answer },
      })),
    });
  }

  return (
    <SEOLandingTemplate
      title={config.title}
      metaTitle={config.metaTitle}
      metaDescription={config.metaDescription}
      canonical={`https://rehablookup.com/${config.slug}`}
      structuredData={structuredData}
      breadcrumbs={[
        { name: "Home", url: "/" },
        { name: "Treatment Types", url: "/treatment-types" },
        { name: config.title, url: `/${config.slug}` },
      ]}
      heroTitle={config.title}
      heroSubtitle={config.heroSubtitle}
      heroBadge="Treatment Guide"
      introContent={config.overview}
      whatToExpect={config.whatToExpect}
      benefits={config.benefits}
      facilities={facilities}
      isLoading={isLoading}
      facilityCount={facilities.length}
      showMoreLink="/rehab-centers"
      faqs={config.faqs}
      faqTreatmentType={config.title}
      relatedCityLinks={stateLinks}
      showTreatmentLinks
      showInsuranceLinks
      ctaTitle={`Find ${config.title} Near You`}
      ctaSubtitle={`Our concierge team will match you with the best ${config.title.toLowerCase()} programs. Free and confidential.`}
    />
  );
}
