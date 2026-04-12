import { useMemo } from "react";
import { Navigate, useLocation, useParams } from "react-router-dom";
import { SEOLandingTemplate } from "@/components/seo/SEOLandingTemplate";
import { useStaticFacilities } from "@/hooks/useStaticFacilities";
import { treatmentCenters } from "@/data/treatmentCenters";
import { statesData } from "@/data/locationSeoData";
import { SmartInternalLinks } from "@/components/seo/SmartInternalLinks";
import { shouldEmitFAQSchema } from "@/utils/seoPageValidator";

export interface CoOccurringConfig {
  slug: string;
  title: string;
  conditionName: string;
  metaTitle: string;
  metaDescription: string;
  heroSubtitle: string;
  filterKeys: string[];
  introContent: string;
  sections: { heading: string; content: string }[];
  whatToExpect: string[];
  benefits: string[];
  faqs: { question: string; answer: string }[];
}

export const coOccurringPages: CoOccurringConfig[] = [
  {
    slug: "anxiety-and-addiction-treatment",
    title: "Anxiety & Addiction Treatment",
    conditionName: "Anxiety Disorders",
    metaTitle: "Anxiety & Addiction Treatment — Dual Diagnosis Programs | RehabLookup",
    metaDescription: "Find treatment programs addressing both anxiety disorders and addiction simultaneously. Integrated dual diagnosis care for lasting recovery.",
    heroSubtitle: "Integrated treatment addressing anxiety disorders and substance use together for lasting recovery.",
    filterKeys: ["dual-diagnosis", "anxiety", "mental health", "co-occurring"],
    introContent: "Anxiety disorders and addiction frequently co-occur — research shows nearly 20% of people with an anxiety disorder also have a substance use disorder. Self-medicating anxiety with alcohol, benzodiazepines, or other substances provides temporary relief but ultimately worsens both conditions. Effective treatment must address both simultaneously through integrated dual diagnosis programs that combine evidence-based anxiety therapies (CBT, exposure therapy, medication management) with comprehensive addiction treatment.",
    sections: [
      { heading: "The Anxiety-Addiction Cycle", content: "Anxiety and substance use create a self-reinforcing cycle: anxiety triggers substance use for relief, substances alter brain chemistry increasing baseline anxiety, withdrawal amplifies anxiety symptoms, driving further use. This cycle cannot be broken by treating either condition alone. Integrated programs that address both simultaneously show significantly better outcomes than sequential treatment approaches." },
      { heading: "Evidence-Based Treatments", content: "Effective dual diagnosis programs for anxiety and addiction use CBT to address both anxious thinking patterns and addiction triggers, exposure therapy to reduce avoidance behaviors, medication management (non-addictive options like SSRIs, buspirone), mindfulness-based stress reduction, and relapse prevention planning that accounts for anxiety triggers. The best programs employ psychiatrists experienced with addiction alongside licensed therapists." },
    ],
    whatToExpect: [
      "Comprehensive psychiatric evaluation",
      "Integrated treatment plan for both conditions",
      "CBT targeting anxiety and addiction patterns",
      "Non-addictive medication options when appropriate",
      "Mindfulness and relaxation training",
      "Anxiety-aware relapse prevention planning",
    ],
    benefits: [
      "Treats root anxiety driving substance use",
      "Non-addictive medication alternatives",
      "Breaks the anxiety-substance cycle",
      "Higher long-term recovery success rates",
      "Skills for managing anxiety without substances",
      "Coordinated care from dual-trained clinicians",
    ],
    faqs: [
      { question: "Can anxiety cause addiction?", answer: "While anxiety doesn't directly cause addiction, it is a significant risk factor. Many people begin using substances to self-medicate anxiety symptoms — alcohol to calm social anxiety, benzodiazepines for panic attacks, or cannabis for generalized anxiety. Over time, tolerance builds and the brain becomes dependent on substances for anxiety regulation, creating a dual diagnosis condition that requires integrated treatment." },
      { question: "What medications are safe for anxiety in recovery?", answer: "Non-addictive options include SSRIs (sertraline, escitalopram), SNRIs (venlafaxine, duloxetine), buspirone, hydroxyzine, and certain anticonvulsants. Benzodiazepines are generally avoided in recovery due to addiction potential and cross-tolerance with alcohol. A psychiatrist experienced in addiction medicine can prescribe the safest, most effective option for your situation." },
      { question: "How long does dual diagnosis treatment take?", answer: "Integrated treatment for anxiety and addiction typically requires 60-90+ days of initial treatment, followed by ongoing outpatient care. Anxiety management is a lifelong skill that continues to develop post-treatment. Programs with strong aftercare components show the best long-term outcomes for dual diagnosis patients." },
    ],
  },
  {
    slug: "depression-and-addiction-treatment",
    title: "Depression & Addiction Treatment",
    conditionName: "Major Depression",
    metaTitle: "Depression & Addiction Treatment — Integrated Dual Diagnosis | RehabLookup",
    metaDescription: "Find rehab programs treating depression and addiction together. Dual diagnosis care with medication management and therapy. Get help today.",
    heroSubtitle: "Comprehensive programs treating depression and substance use disorders together for complete healing.",
    filterKeys: ["dual-diagnosis", "depression", "mental health", "co-occurring"],
    introContent: "Depression and addiction are deeply interconnected — approximately one-third of people with major depression also have a substance use disorder. Depression can drive substance use as self-medication, while chronic substance use alters brain chemistry causing or worsening depression. Treating one without the other leads to high relapse rates. Integrated dual diagnosis programs address both conditions simultaneously with coordinated psychiatric care, evidence-based therapy, and addiction treatment.",
    sections: [
      { heading: "Understanding the Depression-Addiction Link", content: "Depression and addiction share overlapping brain pathways involving serotonin, dopamine, and norepinephrine. Substances temporarily boost these neurotransmitters, providing relief from depressive symptoms — but chronic use depletes them, deepening depression during sobriety. This neurochemical relationship means true recovery requires stabilizing brain chemistry while simultaneously building psychological resilience and coping skills." },
      { heading: "Integrated Treatment Approaches", content: "Effective dual diagnosis programs for depression and addiction include: psychiatric evaluation and medication management (antidepressants, mood stabilizers), cognitive behavioral therapy targeting both depressive thinking and addiction triggers, behavioral activation to rebuild rewarding substance-free activities, interpersonal therapy addressing relationship factors, and exercise programming shown to improve both depression and recovery outcomes." },
    ],
    whatToExpect: [
      "Psychiatric evaluation and medication management",
      "CBT for depression and addiction",
      "Behavioral activation and activity scheduling",
      "Group therapy with dual diagnosis peers",
      "Exercise and wellness programming",
      "Coordinated aftercare for both conditions",
    ],
    benefits: [
      "Addresses depression driving substance use",
      "Medication management by addiction-aware psychiatrists",
      "Significantly lower relapse rates vs. single treatment",
      "Rebuilds ability to experience joy without substances",
      "Peer support from others with dual diagnosis",
      "Comprehensive aftercare planning",
    ],
    faqs: [
      { question: "Does addiction cause depression or does depression cause addiction?", answer: "Both pathways exist. Depression can lead to self-medication with substances, and chronic substance use can cause neurochemical changes that trigger or worsen depression. In many cases, both conditions develop simultaneously through shared risk factors (genetics, trauma, stress). Regardless of which came first, both conditions must be treated together for successful recovery." },
      { question: "Will my depression get worse in early recovery?", answer: "Some individuals experience temporary mood worsening during early recovery as brain chemistry rebalances. This is normal and expected — it typically improves within 2-4 weeks. Antidepressant medications started during treatment can help stabilize mood during this period. Medical staff at dual diagnosis programs are trained to distinguish between substance-withdrawal depression and clinical depression requiring ongoing treatment." },
      { question: "What antidepressants are safe in recovery?", answer: "SSRIs (like sertraline, fluoxetine), SNRIs (like venlafaxine), bupropion, and mirtazapine are commonly used and safe in recovery. They are non-addictive and don't interact dangerously with most substances. An addiction psychiatrist can select the best option based on your substance use history, depression type, and individual response." },
    ],
  },
  {
    slug: "ptsd-and-addiction-treatment",
    title: "PTSD & Addiction Treatment",
    conditionName: "Post-Traumatic Stress Disorder",
    metaTitle: "PTSD & Addiction Treatment — Trauma-Informed Rehab | RehabLookup",
    metaDescription: "Find trauma-informed rehab programs treating PTSD and addiction together. EMDR, CPT, and integrated dual diagnosis care. Get specialized help.",
    heroSubtitle: "Trauma-informed programs addressing PTSD and substance use disorders with specialized, evidence-based care.",
    filterKeys: ["dual-diagnosis", "ptsd", "trauma", "mental health", "co-occurring"],
    introContent: "PTSD and addiction are strongly linked — up to 75% of people who survive traumatic events develop problematic substance use, and nearly half of those seeking addiction treatment meet criteria for PTSD. Substances are often used to numb intrusive memories, manage hypervigilance, and cope with emotional overwhelm. Trauma-informed dual diagnosis programs use specialized approaches like EMDR, Cognitive Processing Therapy, and Seeking Safety to treat both conditions without re-traumatizing patients.",
    sections: [
      { heading: "The Trauma-Substance Connection", content: "PTSD and substance use create a destructive cycle: traumatic memories trigger emotional flooding, substances provide temporary numbing, withdrawal increases anxiety and nightmares, driving further substance use. Avoidance — a core PTSD symptom — extends to avoiding treatment itself. Effective programs break this cycle by creating safe therapeutic environments where trauma can be processed gradually while building substance-free coping strategies." },
      { heading: "Specialized Trauma Therapies", content: "Evidence-based treatments for co-occurring PTSD and addiction include: EMDR (Eye Movement Desensitization and Reprocessing) for trauma memory processing, CPT (Cognitive Processing Therapy) for challenging trauma-related beliefs, Seeking Safety — a proven integrated model designed specifically for co-occurring PTSD and substance use, prolonged exposure therapy, and trauma-sensitive yoga and mindfulness practices." },
    ],
    whatToExpect: [
      "Trauma-informed intake and assessment",
      "Safe, stabilization-first approach",
      "EMDR or CPT for trauma processing",
      "Seeking Safety or integrated model groups",
      "Grounding and coping skill development",
      "Gradual, patient-paced trauma work",
    ],
    benefits: [
      "Specialized trauma-trained clinicians",
      "Addresses root trauma driving substance use",
      "EMDR and CPT are rapid, evidence-based",
      "Seeking Safety designed for dual diagnosis",
      "Reduces nightmares, flashbacks, and hypervigilance",
      "Significantly better outcomes than sequential treatment",
    ],
    faqs: [
      { question: "Should I treat PTSD or addiction first?", answer: "Research strongly supports integrated treatment — addressing both simultaneously. The outdated sequential approach (treat addiction first, then trauma) leads to high relapse rates because unprocessed trauma triggers continued substance use. Modern best practice uses stabilization-first integrated models that begin trauma work once clients have basic coping skills and physical stability." },
      { question: "Is EMDR safe during addiction recovery?", answer: "Yes, when administered by a certified EMDR therapist experienced with addiction populations. EMDR is typically started after initial stabilization (post-detox) when clients have developed basic coping skills. The therapist ensures adequate grounding resources are in place before processing traumatic memories. Many addiction treatment programs now include EMDR as a core component." },
      { question: "What is Seeking Safety?", answer: "Seeking Safety is the most extensively studied integrated treatment model for co-occurring PTSD and substance use. It focuses on building safety — in relationships, thinking, behavior, and emotions — through 25 topics that can be delivered individually or in groups. Unlike exposure-based therapies, it does not require detailed trauma narrative, making it appropriate for early recovery." },
    ],
  },
  {
    slug: "bipolar-and-addiction-treatment",
    title: "Bipolar Disorder & Addiction Treatment",
    conditionName: "Bipolar Disorder",
    metaTitle: "Bipolar & Addiction Treatment — Dual Diagnosis Programs | RehabLookup",
    metaDescription: "Find specialized treatment for co-occurring bipolar disorder and addiction. Mood stabilization, medication management, and integrated care.",
    heroSubtitle: "Specialized dual diagnosis programs for bipolar disorder and substance use with mood stabilization and integrated care.",
    filterKeys: ["dual-diagnosis", "bipolar", "mental health", "mood disorder", "co-occurring"],
    introContent: "Bipolar disorder has one of the highest rates of co-occurring substance use of any mental health condition — up to 60% of people with bipolar disorder will develop a substance use disorder. Manic episodes lower inhibitions and increase impulsive substance use, while depressive episodes drive self-medication. Effective treatment requires expert psychiatric management to stabilize mood alongside comprehensive addiction care, with medication regimens carefully designed to address both conditions.",
    sections: [
      { heading: "Bipolar-Addiction Challenges", content: "Treating co-occurring bipolar and addiction is uniquely complex: manic episodes can mimic stimulant intoxication, depression episodes can be masked by substance withdrawal, some addiction medications interact with mood stabilizers, and non-adherence to bipolar medication is common during substance use. Specialized programs employ dual-board-certified psychiatrists who can manage these overlapping complexities effectively." },
      { heading: "Medication and Therapy Integration", content: "Dual diagnosis programs for bipolar and addiction use mood stabilizers (lithium, valproate, lamotrigine), atypical antipsychotics when needed, and carefully avoid medications with addiction potential. Therapy includes CBT adapted for bipolar (identifying mood episode triggers alongside substance triggers), interpersonal and social rhythm therapy (IPSRT) to stabilize daily routines, and psychoeducation about managing both conditions long-term." },
    ],
    whatToExpect: [
      "Comprehensive psychiatric diagnostic evaluation",
      "Mood stabilization as treatment priority",
      "Non-addictive medication management",
      "CBT adapted for bipolar and addiction",
      "Daily routine and sleep stabilization",
      "Long-term medication adherence planning",
    ],
    benefits: [
      "Expert management of complex medication needs",
      "Stabilizes mood to support addiction recovery",
      "Addresses impulsivity during manic episodes",
      "Manages depressive episodes without addictive medications",
      "Higher retention in programs designed for bipolar",
      "Coordinated long-term psychiatric and addiction care",
    ],
    faqs: [
      { question: "Why is bipolar disorder so linked to addiction?", answer: "Bipolar disorder involves dramatic mood swings that create multiple pathways to substance use: manic episodes produce euphoria and impulsivity leading to reckless substance use, depressive episodes drive self-medication for emotional pain, and the disorder itself involves dysregulated reward circuitry that overlaps with addiction pathways. Genetic factors also contribute to shared vulnerability for both conditions." },
      { question: "What medications treat both bipolar and addiction?", answer: "Mood stabilizers (lithium, valproate, lamotrigine) are the foundation. Some anticonvulsants address both mood instability and addiction cravings. Naltrexone can be safely combined with most bipolar medications for alcohol or opioid use disorders. Benzodiazepines and stimulants are generally avoided. A dual-diagnosis psychiatrist designs the safest, most effective regimen." },
      { question: "How long is treatment for bipolar and addiction?", answer: "Initial stabilization typically requires 60-90+ days of residential or intensive treatment. However, bipolar disorder is a lifelong condition requiring ongoing medication management, therapy, and monitoring. Aftercare plans should include regular psychiatric appointments, therapy continuation, support groups, and a crisis plan for mood episodes. Long-term engagement with care is essential." },
    ],
  },
  {
    slug: "adhd-and-addiction-treatment",
    title: "ADHD & Addiction Treatment",
    conditionName: "ADHD",
    metaTitle: "ADHD & Addiction Treatment — Specialized Dual Diagnosis | RehabLookup",
    metaDescription: "Find treatment programs for co-occurring ADHD and addiction. Non-stimulant medication options, behavioral strategies, and integrated care.",
    heroSubtitle: "Integrated programs addressing ADHD and substance use with non-stimulant options and specialized behavioral strategies.",
    filterKeys: ["dual-diagnosis", "adhd", "mental health", "co-occurring", "attention deficit"],
    introContent: "ADHD significantly increases addiction risk — adults with ADHD are 2-3 times more likely to develop substance use disorders. Untreated ADHD drives impulsive behavior, poor decision-making, and self-medication with stimulants, alcohol, or cannabis. Treatment must address both conditions with careful medication management (non-stimulant options when appropriate), behavioral strategies for executive function deficits, and addiction-specific therapy that accounts for ADHD-related challenges like distractibility and impulsivity.",
    sections: [
      { heading: "The ADHD-Addiction Connection", content: "ADHD and addiction share common neurological pathways involving dopamine regulation. People with ADHD often use substances to self-medicate: stimulants to improve focus, alcohol to quiet racing thoughts, cannabis to manage restlessness. The impulsivity characteristic of ADHD also increases vulnerability to addictive behaviors. Properly treating ADHD can significantly reduce addiction risk and improve treatment outcomes." },
      { heading: "Safe Medication Management", content: "Treating ADHD in people with addiction requires careful medication selection. Non-stimulant options (atomoxetine, guanfacine, bupropion) avoid addiction risk while improving ADHD symptoms. When stimulant medication is clinically necessary, extended-release formulations with lower abuse potential may be used under close monitoring. Programs specializing in this dual diagnosis have protocols for safe, effective medication management." },
    ],
    whatToExpect: [
      "ADHD-specific diagnostic evaluation",
      "Non-stimulant medication assessment",
      "Executive function skills training",
      "Structured daily routines and organization systems",
      "CBT adapted for ADHD and addiction",
      "Impulsivity management techniques",
    ],
    benefits: [
      "Addresses untreated ADHD fueling substance use",
      "Non-addictive medication options available",
      "Improved focus enhances therapy engagement",
      "Executive function skills for daily living",
      "Reduced impulsivity supports recovery decisions",
      "Better treatment retention with ADHD accommodation",
    ],
    faqs: [
      { question: "Can I take ADHD medication in recovery?", answer: "Yes, many people in recovery safely take ADHD medication under proper medical supervision. Non-stimulant options like atomoxetine (Strattera) and guanfacine (Intuniv) carry no addiction risk. When stimulants are medically necessary, long-acting formulations (like Concerta or Vyvanse) have lower abuse potential. An addiction-aware psychiatrist can design the safest effective regimen." },
      { question: "Does treating ADHD help addiction recovery?", answer: "Research strongly supports this. Untreated ADHD is associated with higher treatment dropout rates, more impulsive relapse, and poorer outcomes. Properly treating ADHD improves focus during therapy sessions, reduces impulsive decision-making, and eliminates the need for self-medication — all of which significantly improve recovery outcomes." },
      { question: "How common is ADHD in people with addiction?", answer: "Studies estimate 25-40% of people in addiction treatment have ADHD, compared to 4-5% in the general adult population. ADHD is significantly underdiagnosed in addiction populations because symptoms overlap (impulsivity, restlessness, difficulty with follow-through). Proper screening during addiction treatment can identify and treat previously unrecognized ADHD." },
    ],
  },
  {
    slug: "eating-disorders-and-addiction-treatment",
    title: "Eating Disorders & Addiction Treatment",
    conditionName: "Eating Disorders",
    metaTitle: "Eating Disorders & Addiction Treatment — Integrated Programs | RehabLookup",
    metaDescription: "Find rehab programs treating co-occurring eating disorders and addiction. Specialized nutrition, body image therapy, and integrated care.",
    heroSubtitle: "Integrated programs treating eating disorders and substance use with specialized nutrition and body image therapy.",
    filterKeys: ["dual-diagnosis", "eating disorder", "mental health", "co-occurring", "anorexia", "bulimia"],
    introContent: "Eating disorders and substance use disorders share overlapping risk factors and frequently co-occur — up to 50% of people with eating disorders also abuse alcohol or drugs, and 35% of substance users have eating disorders. Both involve compulsive behaviors, distorted self-perception, and difficulty with emotional regulation. Treatment requires integrated programs with expertise in both conditions, including medical stabilization, nutritional rehabilitation, body image therapy, and addiction-specific interventions.",
    sections: [
      { heading: "Shared Pathways", content: "Eating disorders and addiction involve similar neurological mechanisms: impaired impulse control, obsessive-compulsive patterns, reward system dysregulation, and distorted self-perception. Many individuals use substances to suppress appetite (stimulants), purge calories (laxative abuse), manage weight-related anxiety (alcohol), or cope with shame about their body. Treating one without the other leaves the underlying dysregulation intact." },
      { heading: "Integrated Medical Care", content: "Co-occurring eating disorders and addiction require medical teams experienced with both conditions. Nutritional rehabilitation must account for substance withdrawal effects. Some addiction medications affect appetite and weight. Medical monitoring must address both malnutrition risks and substance-related complications simultaneously. The best programs employ registered dietitians, addiction medicine physicians, and eating disorder therapists working together." },
    ],
    whatToExpect: [
      "Medical stabilization for both conditions",
      "Nutritional assessment and meal planning",
      "Body image and self-perception therapy",
      "CBT-E (Enhanced CBT for eating disorders)",
      "Addiction-specific therapy and group work",
      "Dietitian-supervised nutritional rehabilitation",
    ],
    benefits: [
      "Treats both compulsive behaviors simultaneously",
      "Medical team experienced with both conditions",
      "Nutritional rehabilitation alongside addiction care",
      "Body image therapy reduces relapse triggers",
      "Higher recovery rates than sequential treatment",
      "Addresses shared underlying emotional regulation issues",
    ],
    faqs: [
      { question: "How are eating disorders and addiction connected?", answer: "Both conditions involve impaired impulse control, reward system dysregulation, and maladaptive coping with emotional distress. Substances may be used to manage weight (stimulants, laxatives), cope with body image distress (alcohol), or numb shame. Conversely, substance withdrawal can trigger disordered eating patterns. Shared genetic and neurological vulnerabilities make co-occurrence common." },
      { question: "What type of program treats both?", answer: "Look for programs that explicitly advertise dual treatment for eating disorders and substance use, employ both eating disorder specialists and addiction counselors, include a registered dietitian on staff, and provide medical monitoring for both nutritional and substance-related complications. These programs are less common than general dual diagnosis programs, so ask specifically about this expertise." },
      { question: "How long is treatment?", answer: "Co-occurring eating disorders and addiction typically require extended treatment — 60-90+ days of residential care followed by step-down to intensive outpatient. Both conditions tend to be chronic and require long-term management. Aftercare should include ongoing nutritional counseling, eating disorder therapy, addiction support groups, and regular medical monitoring." },
    ],
  },
];

export default function CoOccurringPage() {
  const location = useLocation();
  const { stateSlug } = useParams<{ stateSlug: string }>();
  const slug = location.pathname.replace(/^\//, "").split("/")[0];
  const { data: approvedFacilities = [], isLoading } = useStaticFacilities();

  const config = useMemo(() => coOccurringPages.find((p) => p.slug === slug) || null, [slug]);
  const stateData = useMemo(() => stateSlug ? statesData.find((s) => s.slug === stateSlug) || null : null, [stateSlug]);

  const isStatePage = !!stateSlug && !!stateData;

  const facilities = useMemo(() => {
    if (!config) return [];
    const all = [...treatmentCenters, ...approvedFacilities];
    const keywords = config.filterKeys.map((k) => k.toLowerCase());

    let filtered = all.filter((f) => {
      const keyMatch = f.treatmentTypes?.some((t) => keywords.some((k) => t.toLowerCase().includes(k))) ||
        keywords.some((k) => f.description?.toLowerCase().includes(k));
      if (isStatePage) {
        return keyMatch && f.state.toLowerCase() === stateData!.name.toLowerCase();
      }
      return keyMatch;
    });

    if (isStatePage && filtered.length < 3) {
      filtered = all.filter((f) => f.state.toLowerCase() === stateData!.name.toLowerCase());
    }

    return filtered.slice(0, 12);
  }, [approvedFacilities, config, isStatePage, stateData]);

  if (!config) {
    return <Navigate to="/treatment-types" replace />;
  }

  const pageTitle = isStatePage ? `${config.title} in ${stateData!.name}` : config.title;
  const canonicalPath = isStatePage ? `/${slug}/${stateSlug}` : `/${slug}`;

  const faqs = isStatePage
    ? config.faqs.map((f) => ({
        question: f.question.replace(/\?$/, ` in ${stateData!.name}?`).replace(/ in.*in /, " in "),
        answer: `${f.answer} In ${stateData!.name}, treatment programs are available across the state with options in ${stateData!.cities.slice(0, 3).map((c) => c.name).join(", ")}, and other cities.`,
      }))
    : config.faqs;

  const structuredData: any[] = [
    {
      "@context": "https://schema.org",
      "@type": "MedicalWebPage",
      name: pageTitle,
      description: config.metaDescription,
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

  const relatedConditions = coOccurringPages
    .filter((p) => p.slug !== slug)
    .map((p) => ({
      title: isStatePage ? `${p.title} in ${stateData!.name}` : p.title,
      href: isStatePage ? `/${p.slug}/${stateSlug}` : `/${p.slug}`,
    }));

  const stateLinks = isStatePage
    ? []
    : statesData.slice(0, 10).map((s) => ({
        title: `${config.title} in ${s.name}`,
        href: `/${slug}/${s.slug}`,
      }));

  const breadcrumbs = isStatePage
    ? [
        { name: "Home", url: "/" },
        { name: config.title, url: `/${slug}` },
        { name: stateData!.name, url: canonicalPath },
      ]
    : [
        { name: "Home", url: "/" },
        { name: "Treatment Types", url: "/treatment-types" },
        { name: config.title, url: canonicalPath },
      ];

  return (
    <SEOLandingTemplate
      title={pageTitle}
      metaTitle={isStatePage
        ? `${config.title} in ${stateData!.name} (${stateData!.abbreviation}) | RehabLookup`
        : config.metaTitle}
      metaDescription={isStatePage
        ? `Find ${config.title.toLowerCase()} programs in ${stateData!.name}. Compare verified dual diagnosis facilities. Get help today.`
        : config.metaDescription}
      canonical={`https://rehablookup.com${canonicalPath}`}
      structuredData={structuredData}
      breadcrumbs={breadcrumbs}
      heroTitle={pageTitle}
      heroSubtitle={isStatePage
        ? `Find specialized ${config.conditionName.toLowerCase()} and addiction treatment programs across ${stateData!.name}.`
        : config.heroSubtitle}
      heroBadge="Dual Diagnosis"
      heroLocation={isStatePage ? stateData!.name : undefined}
      introContent={isStatePage
        ? `Looking for integrated ${config.conditionName.toLowerCase()} and addiction treatment in ${stateData!.name}? RehabLookup connects you with verified dual diagnosis programs that address both conditions simultaneously. ${stateData!.cities.length > 5 ? `Treatment centers are available in ${stateData!.cities.slice(0, 4).map((c) => c.name).join(", ")}, and throughout ${stateData!.name}.` : `Programs are available throughout ${stateData!.name}.`}`
        : config.introContent}
      sections={config.sections.map((s) => ({
        heading: isStatePage ? `${s.heading} in ${stateData!.name}` : s.heading,
        content: s.content,
      }))}
      whatToExpect={config.whatToExpect}
      benefits={config.benefits}
      facilities={facilities}
      isLoading={isLoading}
      facilityCount={facilities.length}
      showMoreLink={isStatePage ? `/rehab-centers/${stateSlug}` : undefined}
      faqs={faqs}
      faqTreatmentType={config.conditionName}
      faqLocation={isStatePage ? { city: "", state: stateData!.name } : undefined}
      relatedCityLinks={stateLinks}
      relatedStateLinks={relatedConditions}
      showTreatmentLinks
      showInsuranceLinks
      showNearMeLinks
      ctaTitle={isStatePage ? `Get ${config.title} Help in ${stateData!.name}` : `Find ${config.title} Programs`}
      ctaSubtitle={`Our team matches you with the best dual diagnosis programs${isStatePage ? ` in ${stateData!.name}` : ""}. Free. Confidential. No obligation.`}
    >
      <SmartInternalLinks
        pageType="state"
        stateSlug={isStatePage ? stateSlug! : ""}
        stateName={isStatePage ? stateData!.name : ""}
      />
    </SEOLandingTemplate>
  );
}
