import { useMemo } from "react";
import { Navigate, useLocation, useParams } from "react-router-dom";
import { SEOLandingTemplate } from "@/components/seo/SEOLandingTemplate";
import { useStaticFacilities } from "@/hooks/useStaticFacilities";
import { treatmentCenters } from "@/data/treatmentCenters";
import { statesData } from "@/data/locationSeoData";
import { SmartInternalLinks } from "@/components/seo/SmartInternalLinks";
import { shouldEmitFAQSchema } from "@/utils/seoPageValidator";

interface DurationConfig {
  slug: string;
  title: string;
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

const durationPages: DurationConfig[] = [
  {
    slug: "30-day-rehab-programs",
    title: "30-Day Rehab Programs",
    metaTitle: "30-Day Rehab Programs — Short-Term Addiction Treatment | RehabLookup",
    metaDescription: "Find 30-day rehab programs near you. Compare short-term inpatient and residential treatment options. Insurance-covered programs available.",
    heroSubtitle: "Structured short-term treatment designed to break the cycle of addiction and build a foundation for lasting recovery.",
    filterKeys: ["inpatient", "residential", "30-day", "short-term"],
    introContent: "30-day rehab programs are the most common treatment duration and serve as the standard starting point for many insurance plans. These programs provide intensive daily therapy, medical support, peer connection, and structured living — enough time to complete medical detox, begin therapeutic work, and develop an initial recovery plan. While 30 days may not be sufficient for everyone, research shows even short-term treatment significantly improves outcomes compared to no treatment.",
    sections: [
      { heading: "What Happens in 30 Days", content: "A typical 30-day program progresses through phases: Days 1-7 focus on medical detox and stabilization, Days 8-14 introduce individual and group therapy, Days 15-21 deepen therapeutic work and address co-occurring conditions, and Days 22-30 focus on aftercare planning and relapse prevention. Most programs include 20-30 hours of structured programming per week including individual therapy, group sessions, educational workshops, and wellness activities." },
      { heading: "Is 30 Days Enough?", content: "Research consistently shows longer treatment produces better outcomes. However, 30-day programs are effective for many people — especially those with shorter addiction histories, strong support systems, and milder substance use disorders. The key is robust aftercare: step-down to intensive outpatient, ongoing therapy, support group participation, and possibly sober living. A 30-day stay followed by comprehensive aftercare can produce excellent results." },
    ],
    whatToExpect: ["Medical detox (first 3-7 days)", "Individual therapy (2-3 sessions/week)", "Group therapy (daily)", "Family therapy sessions", "Psychiatric evaluation", "Aftercare and discharge planning"],
    benefits: ["Intensive structured treatment environment", "Break from triggers and enabling situations", "Insurance commonly covers 28-30 days", "Foundation for long-term recovery", "Access to medical and psychiatric care", "Peer support and community building"],
    faqs: [
      { question: "How much does 30-day rehab cost?", answer: "Costs range from $5,000-$80,000+ depending on the facility type. Standard programs average $10,000-$30,000. Luxury programs can exceed $50,000. Most insurance plans, including Medicaid, cover 28-30 days of residential treatment. Many facilities offer sliding-scale fees or financial assistance." },
      { question: "Does insurance cover 30-day rehab?", answer: "Yes, most insurance plans cover 28-30 days of residential treatment under the Mental Health Parity Act. Coverage depends on your plan type, network status, and pre-authorization. Many facilities offer free insurance verification. Medicaid and Medicare also cover substance abuse treatment." },
      { question: "What happens after 30 days?", answer: "After 30 days, most people transition to a lower level of care: intensive outpatient (IOP), partial hospitalization (PHP), standard outpatient therapy, or sober living. A comprehensive aftercare plan is developed before discharge, including therapy continuation, support groups, medication management, and relapse prevention strategies." },
    ],
  },
  {
    slug: "60-day-rehab-programs",
    title: "60-Day Rehab Programs",
    metaTitle: "60-Day Rehab Programs — Extended Addiction Treatment | RehabLookup",
    metaDescription: "Find 60-day rehab programs offering extended treatment for deeper recovery. Better outcomes than 30-day programs. Compare verified facilities.",
    heroSubtitle: "Extended treatment providing more time for deeper therapeutic work and sustainable behavior change.",
    filterKeys: ["inpatient", "residential", "60-day", "extended"],
    introContent: "60-day rehab programs provide nearly double the therapeutic contact of standard 30-day programs, allowing deeper exploration of underlying issues, more time to practice new coping skills, and better preparation for independent living. Research from NIDA shows treatment lasting 60+ days is significantly more effective than shorter stays, particularly for individuals with chronic addiction, co-occurring mental health conditions, or limited support systems.",
    sections: [
      { heading: "Why 60 Days Makes a Difference", content: "The additional 30 days beyond standard treatment allows for: completion of initial brain chemistry stabilization (which can take 6-8 weeks), deeper therapeutic work on trauma and co-occurring conditions, more practice applying new skills in real-world scenarios, stronger peer relationships and recovery community connections, and more thorough aftercare planning including employment and housing transitions." },
      { heading: "Who Benefits Most from 60 Days", content: "Extended 60-day treatment is particularly beneficial for individuals with: chronic or long-term addiction (5+ years), co-occurring mental health conditions requiring medication stabilization, previous treatment episodes that didn't sustain recovery, limited or unstable housing/support systems, polysubstance use disorders, and those transitioning from detox who need more time to build coping skills." },
    ],
    whatToExpect: ["Comprehensive detox and stabilization", "In-depth trauma and mental health work", "Life skills and vocational training", "Extended family involvement opportunities", "Gradual privilege and independence increases", "Robust transition and aftercare planning"],
    benefits: ["Significantly higher success rates than 30-day", "Time for brain chemistry to stabilize", "Deeper therapeutic breakthroughs", "Stronger peer recovery community", "Better preparation for independent living", "More time to address co-occurring conditions"],
    faqs: [
      { question: "Is 60-day rehab more effective than 30-day?", answer: "Yes, research consistently shows better outcomes with longer treatment. NIDA data indicates that 60+ day programs have significantly lower relapse rates than 30-day programs. The additional time allows for deeper therapeutic work, brain chemistry stabilization, and stronger skill development." },
      { question: "How much does 60-day rehab cost?", answer: "60-day programs typically cost $15,000-$60,000+ depending on the facility. Insurance often covers 60 days when medical necessity is documented. Many programs work with insurance to obtain continued stay authorization. Sliding-scale fees and payment plans are commonly available." },
      { question: "Will insurance cover 60 days?", answer: "Many insurance plans cover extended treatment when medical necessity is demonstrated through ongoing assessment. Programs submit continued stay reviews showing clinical need. PPO plans generally offer more flexibility for extended stays. Your treatment team and insurance coordinator work together to maximize covered days." },
    ],
  },
  {
    slug: "90-day-rehab-programs",
    title: "90-Day Rehab Programs",
    metaTitle: "90-Day Rehab Programs — Long-Term Addiction Treatment | RehabLookup",
    metaDescription: "Find 90-day rehab programs for comprehensive addiction recovery. Research-backed optimal treatment duration. Compare verified long-term programs.",
    heroSubtitle: "The research-recommended treatment duration for achieving lasting, sustainable recovery from addiction.",
    filterKeys: ["inpatient", "residential", "90-day", "long-term"],
    introContent: "90-day rehab programs are considered the gold standard for addiction treatment duration. NIDA (National Institute on Drug Abuse) identifies 90 days as the minimum effective treatment duration for significant, lasting recovery. These programs provide complete brain chemistry stabilization, comprehensive therapeutic intervention, real-world skill practice, and thorough transition planning — producing the highest success rates of standard treatment durations.",
    sections: [
      { heading: "The Science Behind 90 Days", content: "Brain imaging studies show that addiction-related neurological changes begin to reverse meaningfully at 60-90 days of abstinence. Dopamine receptor density, prefrontal cortex function, and stress response systems all show significant improvement by 90 days. This neurological healing, combined with intensive therapeutic work, creates the strongest foundation for sustained recovery. NIDA research shows treatment of at least 90 days produces the best long-term outcomes." },
      { heading: "Program Structure", content: "90-day programs typically progress through three phases: Stabilization (Days 1-30) — detox, assessment, initial therapy, and medication management. Intensive Treatment (Days 31-60) — deep therapeutic work, trauma processing, family therapy, and skill building. Integration (Days 61-90) — real-world practice, employment preparation, gradual independence increases, sober living transition, and comprehensive aftercare planning." },
    ],
    whatToExpect: ["Three-phase progressive treatment model", "Complete brain chemistry stabilization", "Multiple therapeutic modalities", "Vocational and educational support", "Gradual re-integration into daily life", "Comprehensive aftercare with sober living option"],
    benefits: ["NIDA-recommended optimal treatment duration", "Highest success rates among standard programs", "Full neurological healing time", "Deep, transformative therapeutic work", "Strong recovery identity development", "Excellent preparation for independent living"],
    faqs: [
      { question: "Why does NIDA recommend 90 days?", answer: "NIDA's recommendation is based on decades of research showing 90 days as the minimum effective treatment duration for lasting recovery. Studies demonstrate that completing 90+ days of treatment reduces relapse rates by 40-60% compared to shorter stays, allows for meaningful brain chemistry restoration, and provides sufficient time for behavior change to become habitual." },
      { question: "How much does 90-day rehab cost?", answer: "90-day programs range from $20,000-$100,000+ depending on facility type. Insurance typically covers a significant portion when medical necessity is documented through ongoing reviews. Many programs step down to less intensive (and less costly) levels of care during the later weeks. Financial assistance and payment plans are widely available." },
      { question: "Can I work during a 90-day program?", answer: "Most 90-day residential programs do not allow outside work during the first 30-60 days. During the integration phase (days 60-90), many programs encourage or facilitate part-time work, job searching, or vocational training as part of re-integration. Some programs offer work-release arrangements in the final phase. The FMLA may protect your job for up to 12 weeks." },
    ],
  },
  {
    slug: "long-term-rehab-programs",
    title: "Long-Term Rehab Programs (6-12 Months)",
    metaTitle: "Long-Term Rehab Programs — 6-12 Month Treatment | RehabLookup",
    metaDescription: "Find long-term rehab programs lasting 6-12 months. For chronic addiction, multiple relapses, or complex needs. Verified residential programs.",
    heroSubtitle: "Extended residential treatment for chronic addiction, multiple relapses, or complex co-occurring conditions requiring sustained care.",
    filterKeys: ["long-term", "residential", "therapeutic community", "extended care"],
    introContent: "Long-term rehab programs lasting 6-12 months are designed for individuals whose addiction requires more intensive, sustained intervention. These programs — often called therapeutic communities (TCs) — serve people with chronic addiction, multiple failed treatment attempts, criminal justice involvement, homelessness, or severe co-occurring disorders. Research shows long-term programs produce the most dramatic improvements for these high-need populations, including significant reductions in substance use, criminal behavior, and unemployment.",
    sections: [
      { heading: "Who Needs Long-Term Treatment", content: "Long-term programs are most appropriate for: individuals with 10+ years of active addiction, those with 3+ previous treatment episodes, people leaving incarceration with substance use disorders, individuals without stable housing or employment, those with severe co-occurring mental health conditions, and people whose social networks are entirely substance-centered. For these populations, shorter programs often fail to address the depth of life disruption." },
      { heading: "Therapeutic Community Model", content: "Most long-term programs use the therapeutic community (TC) model where the community itself is the treatment. Residents progress through hierarchical phases with increasing responsibility and privileges. Daily life — chores, group meetings, conflict resolution, work assignments — serves as the therapeutic medium. Senior residents mentor newer ones, building leadership skills and recovery identity. Research on TCs shows significant improvements in all life areas." },
    ],
    whatToExpect: ["Hierarchical phase system with progression", "Community-as-treatment model", "Work therapy and vocational training", "Educational programs (GED, life skills)", "Gradual increases in responsibility", "Re-entry planning including housing and employment"],
    benefits: ["Highest success rates for chronic addiction", "Complete lifestyle and identity transformation", "Vocational and educational development", "Housing stability upon completion", "Strong recovery community integration", "Addresses all life domains, not just substance use"],
    faqs: [
      { question: "How long is long-term rehab?", answer: "Long-term programs typically last 6-12 months, with some extending to 18-24 months. Length depends on individual progress, program structure, and specific needs. Most programs use a phase system where advancement is based on behavioral milestones rather than fixed time periods. Research shows outcomes improve with each additional month of participation." },
      { question: "Are long-term programs free?", answer: "Many long-term programs are free or very low-cost because they are funded by government grants, nonprofit organizations, or religious institutions. Therapeutic communities in particular often operate at minimal cost because residents contribute labor as part of the treatment model. State-funded programs, Salvation Army, and faith-based organizations offer extended programs at no charge." },
      { question: "Can long-term rehab help after multiple relapses?", answer: "Yes, long-term programs are specifically designed for individuals who have not succeeded in shorter treatment. The extended duration allows time to address deeply ingrained patterns, rebuild a completely new social network, develop stable employment and housing, and form a recovery identity. Research shows TC graduates with multiple previous treatment failures achieve sustained recovery at much higher rates." },
    ],
  },
];

interface SettingConfig {
  slug: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  heroSubtitle: string;
  filterKeys: string[];
  introContent: string;
  sections: { heading: string; content: string }[];
  benefits: string[];
  faqs: { question: string; answer: string }[];
}

const settingPages: SettingConfig[] = [
  {
    slug: "beach-rehab-programs",
    title: "Beach & Coastal Rehab Programs",
    metaTitle: "Beach Rehab Programs — Coastal Addiction Treatment | RehabLookup",
    metaDescription: "Find beach and coastal rehab centers offering ocean-view treatment settings. California, Florida, Hawaii, and more. Compare verified programs.",
    heroSubtitle: "Healing by the ocean — treatment programs in beautiful coastal settings that enhance recovery through nature.",
    filterKeys: ["luxury", "holistic", "residential"],
    introContent: "Beach and coastal rehab programs combine clinical addiction treatment with the natural therapeutic benefits of ocean settings. Research shows that proximity to water reduces cortisol, lowers heart rate, and promotes a sense of calm — creating an ideal environment for recovery. Coastal programs are concentrated in California, Florida, Hawaii, and the Southeast, offering both luxury and standard treatment options in settings where the natural environment actively supports healing.",
    sections: [
      { heading: "The Therapeutic Power of Ocean Settings", content: "Blue mind science research demonstrates that proximity to water triggers measurable neurological benefits: reduced stress hormones, increased alpha brain wave activity, enhanced creativity, and improved emotional regulation. For people in addiction recovery — who are learning to manage stress and regulate emotions without substances — these natural benefits complement clinical treatment effectively." },
      { heading: "Finding Quality in Beautiful Settings", content: "Don't let a beautiful location distract from clinical quality. The best coastal programs maintain the same standards as any top-tier facility: accreditation (JCAHO/CARF), licensed clinical staff, evidence-based therapy, and comprehensive aftercare. Ask about clinical credentials first, then evaluate the setting as a bonus that enhances — rather than replaces — rigorous treatment." },
    ],
    benefits: ["Natural stress reduction through ocean proximity", "Outdoor activities integrated into treatment", "Vitamin D and fresh air benefits", "Beautiful setting increases treatment completion", "Surf therapy and ocean-based experiential work", "Calming environment for trauma processing"],
    faqs: [
      { question: "Where are beach rehab programs located?", answer: "Major coastal treatment hubs include: Southern California (Malibu, San Diego, Orange County), Florida (South Florida, Gulf Coast, Jacksonville), Hawaii (Maui, Big Island), South Carolina (Charleston), and Texas Gulf Coast. Each region offers different climate, culture, and program options. Some programs are directly on the beach while others are near-coastal." },
      { question: "Are beach rehab programs more expensive?", answer: "Not necessarily. While luxury coastal programs can be premium-priced ($30,000-$100,000/month), there are also standard and insurance-accepting programs in coastal areas. Florida in particular has a large concentration of affordable coastal treatment options. Insurance coverage applies the same way regardless of setting." },
      { question: "Is a beach setting just a distraction from treatment?", answer: "When integrated properly, the coastal setting enhances rather than distracts from treatment. Programs use the environment therapeutically: beach walks for mindfulness practice, ocean-based activities for experiential therapy, and nature exposure for stress management. The key is choosing a program that uses the setting as a clinical tool, not just a marketing feature." },
    ],
  },
  {
    slug: "mountain-rehab-programs",
    title: "Mountain & Rural Rehab Programs",
    metaTitle: "Mountain Rehab Programs — Wilderness Recovery Centers | RehabLookup",
    metaDescription: "Find mountain and rural rehab programs offering secluded, nature-based treatment. Colorado, Montana, Utah, and more. Verified programs.",
    heroSubtitle: "Secluded mountain and wilderness settings that provide distance from triggers and connection to nature for deeper healing.",
    filterKeys: ["residential", "wilderness", "adventure", "holistic"],
    introContent: "Mountain and rural rehab programs offer secluded treatment environments far removed from the people, places, and pressures associated with active addiction. The physical distance from triggers — combined with the proven mental health benefits of nature immersion — creates powerful conditions for transformation. Programs in Colorado, Montana, Utah, Arizona, and Appalachian regions leverage wilderness settings for adventure therapy, equine therapy, and mindfulness-based outdoor activities.",
    sections: [
      { heading: "Benefits of Seclusion", content: "Geographic removal from triggers is one of the most powerful tools in early recovery. Mountain programs place physical and psychological distance between clients and their addiction-supporting environments. The absence of familiar temptations, enabling relationships, and stress triggers allows the brain and body to begin healing without constant assault from cues that reinforce substance-seeking behavior." },
      { heading: "Nature-Integrated Treatment", content: "Mountain programs frequently incorporate adventure therapy (hiking, rock climbing, ropes courses), equine-assisted therapy, wilderness expeditions, and outdoor mindfulness practices. These modalities build self-efficacy, teach distress tolerance through manageable physical challenges, improve physical health, and create powerful metaphors for the recovery journey that resonate long after treatment ends." },
    ],
    benefits: ["Physical distance from triggers and temptations", "Nature immersion reduces stress and anxiety", "Adventure therapy builds confidence and resilience", "Fresh air and exercise improve physical health", "Reduced distractions enhance therapeutic focus", "Strong alumni communities in recovery-oriented regions"],
    faqs: [
      { question: "Where are mountain rehab programs?", answer: "Popular mountain treatment regions include: Colorado (Boulder, Denver, mountain communities), Utah (Park City, rural areas), Montana (Whitefish, Bozeman), Arizona (Sedona, Prescott), Tennessee/North Carolina (Smoky Mountains), and New Hampshire/Vermont. Each offers different climates, activities, and treatment specializations." },
      { question: "Are mountain programs more intensive?", answer: "Many mountain programs incorporate physical activities and outdoor challenges that add an experiential dimension to traditional clinical work. This doesn't replace evidence-based therapy — it enhances it. The structured daily routine of outdoor activities, therapy sessions, and group work often makes these programs feel more intensive and engaging than urban facility-based programs." },
      { question: "What if I'm not outdoorsy?", answer: "Mountain programs accommodate all fitness levels and outdoor experience. Activities are progressive and adapted to individual capabilities. Many clients who initially feel uncomfortable in outdoor settings discover unexpected confidence and enjoyment. The therapeutic value comes from facing personal challenges, not achieving athletic feats." },
    ],
  },
];

// Combine all configs
const allDurationAndSettingPages = [...durationPages, ...settingPages];

export default function DurationSettingPage() {
  const location = useLocation();
  const { stateSlug } = useParams<{ stateSlug: string }>();
  const slug = location.pathname.replace(/^\//, "").split("/")[0];
  const { data: approvedFacilities = [], isLoading } = useStaticFacilities();

  const config = useMemo(() => allDurationAndSettingPages.find((p) => p.slug === slug) || null, [slug]);
  const stateData = useMemo(() => stateSlug ? statesData.find((s) => s.slug === stateSlug) || null : null, [stateSlug]);
  const isStatePage = !!stateSlug && !!stateData;

  const facilities = useMemo(() => {
    if (!config) return [];
    const all = [...treatmentCenters, ...approvedFacilities];
    const keywords = config.filterKeys.map((k) => k.toLowerCase());
    let filtered = all.filter((f) => {
      const keyMatch = f.treatmentTypes?.some((t) => keywords.some((k) => t.toLowerCase().includes(k))) ||
        keywords.some((k) => f.description?.toLowerCase().includes(k));
      if (isStatePage) return keyMatch && f.state.toLowerCase() === stateData!.name.toLowerCase();
      return keyMatch;
    });
    if (isStatePage && filtered.length < 3) {
      filtered = all.filter((f) => f.state.toLowerCase() === stateData!.name.toLowerCase());
    }
    return filtered.slice(0, 12);
  }, [approvedFacilities, config, isStatePage, stateData]);

  if (!config) return <Navigate to="/treatment-types" replace />;

  const pageTitle = isStatePage ? `${config.title} in ${stateData!.name}` : config.title;
  const canonicalPath = isStatePage ? `/${slug}/${stateSlug}` : `/${slug}`;

  const structuredData: any[] = [{
    "@context": "https://schema.org",
    "@type": "MedicalWebPage",
    name: pageTitle,
    description: config.metaDescription,
    url: `https://rehablookup.com${canonicalPath}`,
    specialty: "Addiction Medicine",
    lastReviewed: new Date().toISOString().split("T")[0],
  }];

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

  const relatedPages = allDurationAndSettingPages
    .filter((p) => p.slug !== slug)
    .map((p) => ({ title: p.title, href: `/${p.slug}` }));

  const stateLinks = isStatePage ? [] : statesData.slice(0, 10).map((s) => ({
    title: `${config.title} in ${s.name}`,
    href: `/${slug}/${s.slug}`,
  }));

  return (
    <SEOLandingTemplate
      title={pageTitle}
      metaTitle={isStatePage
        ? `${config.title} in ${stateData!.name} (${stateData!.abbreviation}) | RehabLookup`
        : config.metaTitle}
      metaDescription={isStatePage
        ? `Find ${config.title.toLowerCase()} in ${stateData!.name}. Compare verified programs. Get help today.`
        : config.metaDescription}
      canonical={`https://rehablookup.com${canonicalPath}`}
      structuredData={structuredData}
      breadcrumbs={isStatePage
        ? [{ name: "Home", url: "/" }, { name: config.title, url: `/${slug}` }, { name: stateData!.name, url: canonicalPath }]
        : [{ name: "Home", url: "/" }, { name: "Treatment Types", url: "/treatment-types" }, { name: config.title, url: canonicalPath }]}
      heroTitle={pageTitle}
      heroSubtitle={isStatePage
        ? `Find ${config.title.toLowerCase()} in ${stateData!.name} with verified, accredited programs.`
        : config.heroSubtitle}
      heroBadge="Verified Programs"
      heroLocation={isStatePage ? stateData!.name : undefined}
      introContent={isStatePage
        ? `Looking for ${config.title.toLowerCase()} in ${stateData!.name}? RehabLookup connects you with verified treatment facilities across ${stateData!.name}. ${stateData!.cities.length > 5 ? `Programs are available in ${stateData!.cities.slice(0, 3).map(c => c.name).join(", ")}, and more.` : ""}`
        : config.introContent}
      sections={config.sections.map(s => ({
        heading: isStatePage ? `${s.heading} in ${stateData!.name}` : s.heading,
        content: s.content,
      }))}
      whatToExpect={"whatToExpect" in config ? (config as DurationConfig).whatToExpect : undefined}
      benefits={config.benefits}
      facilities={facilities}
      isLoading={isLoading}
      facilityCount={facilities.length}
      showMoreLink={isStatePage ? `/rehab-centers/${stateSlug}` : undefined}
      faqs={config.faqs}
      faqTreatmentType={config.title}
      faqLocation={isStatePage ? { city: "", state: stateData!.name } : undefined}
      relatedCityLinks={stateLinks}
      relatedStateLinks={relatedPages}
      showTreatmentLinks
      showInsuranceLinks
      showNearMeLinks
      ctaTitle={isStatePage ? `Find ${config.title} in ${stateData!.name}` : `Find ${config.title} Near You`}
      ctaSubtitle={`Our team matches you with the best programs${isStatePage ? ` in ${stateData!.name}` : ""}. Free. Confidential.`}
    >
      <SmartInternalLinks pageType="state" stateSlug={isStatePage ? stateSlug! : ""} stateName={isStatePage ? stateData!.name : ""} />
    </SEOLandingTemplate>
  );
}
