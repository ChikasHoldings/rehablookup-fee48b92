import { useMemo } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { SEOLandingTemplate } from "@/components/seo/SEOLandingTemplate";
import { useStaticFacilities } from "@/hooks/useStaticFacilities";
import { treatmentCenters } from "@/data/treatmentCenters";
import { SmartInternalLinks } from "@/components/seo/SmartInternalLinks";
import { shouldEmitFAQSchema } from "@/utils/seoPageValidator";

interface ModalityConfig {
  slug: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  heroSubtitle: string;
  filterKeys: string[];
  conditionName: string;
  introContent: string;
  sections: { heading: string; content: string }[];
  whatToExpect: string[];
  benefits: string[];
  faqs: { question: string; answer: string }[];
}

const modalityPages: ModalityConfig[] = [
  {
    slug: "cbt-therapy-for-addiction",
    title: "CBT Therapy for Addiction",
    metaTitle: "CBT for Addiction Treatment — Cognitive Behavioral Therapy | RehabLookup",
    metaDescription: "Learn how Cognitive Behavioral Therapy (CBT) treats addiction. Find rehab programs using CBT. Evidence-based, effective, widely available.",
    heroSubtitle: "Evidence-based therapy that helps identify and change destructive thought patterns driving addictive behaviors.",
    filterKeys: ["cbt", "cognitive behavioral", "behavioral therapy"],
    conditionName: "Cognitive Behavioral Therapy",
    introContent: "Cognitive Behavioral Therapy (CBT) is one of the most extensively researched and effective treatments for substance use disorders. CBT works by helping individuals identify negative thought patterns and beliefs that contribute to substance use, then developing healthier coping strategies and behavioral responses. Research consistently shows CBT reduces relapse rates and improves long-term recovery outcomes across all substance types.",
    sections: [
      { heading: "How CBT Works in Addiction Treatment", content: "CBT for addiction focuses on the connection between thoughts, feelings, and behaviors. Therapists help clients recognize 'automatic thoughts' that trigger cravings or justify substance use, then practice replacing them with realistic, recovery-supporting alternatives. Sessions typically include identifying high-risk situations, developing coping strategies, practicing refusal skills, and building a relapse prevention plan." },
      { heading: "CBT Combined with Other Treatments", content: "CBT is frequently combined with medication-assisted treatment (MAT), motivational interviewing, group therapy, and 12-step facilitation for comprehensive care. This integrative approach addresses addiction from multiple angles — the biological through medication, the psychological through CBT, and the social through group support. Research supports this multi-modal approach as most effective." },
    ],
    whatToExpect: [
      "Structured sessions (typically 12-16 weeks)",
      "Identifying triggers and high-risk situations",
      "Learning cognitive restructuring techniques",
      "Developing personalized coping strategies",
      "Homework exercises between sessions",
      "Building a comprehensive relapse prevention plan",
    ],
    benefits: [
      "Strong research evidence supporting effectiveness",
      "Skills that last beyond treatment completion",
      "Applicable to all substance types",
      "Can be delivered individually or in groups",
      "Effective for co-occurring mental health conditions",
      "Available in most treatment settings",
    ],
    faqs: [
      { question: "How effective is CBT for addiction?", answer: "CBT is one of the most evidence-based treatments for addiction. Meta-analyses show it significantly reduces substance use and relapse rates compared to control conditions. Effects are maintained long-term because CBT teaches lasting cognitive and behavioral skills. It is effective across alcohol, opioids, stimulants, cannabis, and other substances." },
      { question: "How long does CBT treatment take?", answer: "Standard CBT for addiction typically involves 12-16 weekly sessions, though this varies by program and individual needs. Some intensive programs offer daily CBT sessions. The skills learned in CBT continue to be practiced and refined throughout recovery, making it a foundation for long-term success." },
      { question: "Can CBT be combined with medication?", answer: "Yes, combining CBT with medication-assisted treatment (MAT) is considered best practice for many substance use disorders. For opioid addiction, CBT plus buprenorphine or methadone shows better outcomes than either alone. For alcohol dependence, CBT plus naltrexone or acamprosate is highly effective." },
    ],
  },
  {
    slug: "emdr-therapy-for-addiction",
    title: "EMDR Therapy for Addiction",
    metaTitle: "EMDR for Addiction & Trauma — Eye Movement Desensitization | RehabLookup",
    metaDescription: "Discover how EMDR therapy treats addiction rooted in trauma. Find EMDR-certified rehab programs. Process traumatic memories to support lasting recovery.",
    heroSubtitle: "Trauma-focused therapy that processes painful memories underlying addictive behaviors.",
    filterKeys: ["emdr", "trauma", "eye movement"],
    conditionName: "EMDR Therapy",
    introContent: "Eye Movement Desensitization and Reprocessing (EMDR) is a powerful trauma-focused therapy increasingly used in addiction treatment. Many people develop substance use disorders as a way to cope with unresolved trauma — EMDR helps process these traumatic memories, reducing their emotional intensity and eliminating the need for substances as a coping mechanism. EMDR is recognized by the WHO and APA as an effective trauma treatment.",
    sections: [
      { heading: "EMDR and the Trauma-Addiction Connection", content: "Research shows 50-75% of people with substance use disorders have experienced significant trauma. EMDR directly addresses this connection by reprocessing traumatic memories that drive substance use. During EMDR sessions, clients recall distressing memories while engaging in bilateral stimulation (eye movements, tapping, or auditory tones), which helps the brain reprocess these memories and reduce their emotional charge." },
      { heading: "EMDR in Comprehensive Treatment", content: "EMDR is most effective when integrated into a comprehensive treatment plan that includes group therapy, relapse prevention skills, and aftercare support. It is particularly valuable for individuals with dual diagnosis — co-occurring PTSD and substance use disorder — where traditional talk therapy alone may not be sufficient. Treatment typically requires 6-12 EMDR sessions alongside other modalities." },
    ],
    whatToExpect: [
      "Assessment of trauma history and treatment readiness",
      "Identification of target memories for processing",
      "Bilateral stimulation during memory recall",
      "Progressive desensitization of traumatic memories",
      "Installation of positive beliefs and coping resources",
      "Integration with broader addiction treatment plan",
    ],
    benefits: [
      "Addresses root causes of addiction (trauma)",
      "Faster results than traditional talk therapy for trauma",
      "No homework or detailed trauma narrative required",
      "WHO and APA recognized for PTSD treatment",
      "Effective for complex and developmental trauma",
      "Reduces cravings linked to traumatic triggers",
    ],
    faqs: [
      { question: "Does EMDR work for addiction?", answer: "Research shows EMDR is effective for addiction, particularly when trauma underlies the substance use. Studies demonstrate reduced cravings, lower relapse rates, and improved PTSD symptoms when EMDR is integrated into addiction treatment. It is most effective as part of a comprehensive program rather than a standalone treatment." },
      { question: "How many EMDR sessions are needed?", answer: "For single-incident trauma, 3-6 sessions may be sufficient. For complex trauma common in addiction populations, 8-12+ sessions are typically recommended. EMDR is usually provided 1-2 times per week alongside other treatment modalities." },
      { question: "Is EMDR safe during early recovery?", answer: "EMDR should be administered by a certified EMDR therapist experienced with addiction populations. Timing is important — most programs begin EMDR after initial stabilization (post-detox) when clients have developed basic coping skills. The therapist will assess readiness and ensure adequate support is in place." },
    ],
  },
  {
    slug: "dbt-therapy-for-addiction",
    title: "DBT Therapy for Addiction",
    metaTitle: "DBT for Addiction — Dialectical Behavior Therapy | RehabLookup",
    metaDescription: "Learn how Dialectical Behavior Therapy (DBT) treats addiction and emotional dysregulation. Find DBT rehab programs. Evidence-based skills for lasting recovery.",
    heroSubtitle: "Skills-based therapy teaching emotional regulation, distress tolerance, and mindfulness for lasting recovery.",
    filterKeys: ["dbt", "dialectical", "emotional regulation"],
    conditionName: "Dialectical Behavior Therapy",
    introContent: "Dialectical Behavior Therapy (DBT) was originally developed for borderline personality disorder but has proven highly effective for addiction treatment, particularly for individuals who struggle with intense emotions, impulsivity, and interpersonal difficulties. DBT teaches four core skill sets — mindfulness, distress tolerance, emotional regulation, and interpersonal effectiveness — providing concrete tools for managing the emotional triggers that drive substance use.",
    sections: [
      { heading: "The Four DBT Skill Modules", content: "DBT for addiction teaches four interconnected skill sets: Mindfulness (present-moment awareness without judgment), Distress Tolerance (surviving crises without turning to substances), Emotional Regulation (understanding and managing intense emotions), and Interpersonal Effectiveness (communicating needs and setting boundaries). These skills directly address the emotional dysregulation that frequently underlies addictive behaviors." },
      { heading: "DBT Treatment Structure", content: "Standard DBT includes weekly individual therapy, weekly skills training groups, between-session phone coaching for crisis situations, and a therapist consultation team. In addiction treatment settings, DBT is often adapted to include substance-specific skills like urge surfing, sobriety sampling, and relapse prevention planning alongside the core skill modules." },
    ],
    whatToExpect: [
      "Weekly individual therapy sessions",
      "Group skills training (2-2.5 hours weekly)",
      "Phone coaching for between-session crises",
      "Skills practice homework and diary cards",
      "Mindfulness meditation practice",
      "Progressive skill building over 6-12 months",
    ],
    benefits: [
      "Especially effective for emotional dysregulation",
      "Reduces self-harm and suicidal behaviors",
      "Concrete, teachable coping skills",
      "Effective for dual diagnosis (BPD + addiction)",
      "Group format provides peer support",
      "Skills applicable to all areas of life",
    ],
    faqs: [
      { question: "What's the difference between CBT and DBT?", answer: "While both are evidence-based, CBT focuses on changing negative thought patterns, while DBT emphasizes accepting difficult emotions while simultaneously working to change behaviors. DBT adds mindfulness, distress tolerance, and interpersonal skills not typically included in CBT. DBT is often better suited for individuals with emotional dysregulation or personality disorders." },
      { question: "How long does DBT treatment take?", answer: "Standard DBT programs run 6-12 months, with skills taught in a structured curriculum. In addiction treatment settings, abbreviated DBT programs of 12-16 weeks are common, focusing on the most addiction-relevant skills. Many clients continue DBT skills practice in aftercare." },
      { question: "Is DBT effective for addiction?", answer: "Yes, research supports DBT for substance use disorders, particularly when co-occurring with emotional dysregulation, borderline personality disorder, or self-harm. Studies show DBT reduces substance use, improves treatment retention, and decreases psychiatric hospitalizations compared to treatment as usual." },
    ],
  },
  {
    slug: "motivational-interviewing-for-addiction",
    title: "Motivational Interviewing for Addiction",
    metaTitle: "Motivational Interviewing in Rehab — Build Recovery Motivation | RehabLookup",
    metaDescription: "Learn how Motivational Interviewing (MI) helps overcome ambivalence about addiction treatment. Find MI-based rehab programs. Evidence-based approach.",
    heroSubtitle: "A collaborative approach that strengthens personal motivation and commitment to change.",
    filterKeys: ["motivational interviewing", "MI", "motivational"],
    conditionName: "Motivational Interviewing",
    introContent: "Motivational Interviewing (MI) is a person-centered counseling approach designed to help individuals resolve ambivalence about change and strengthen their internal motivation for recovery. Rather than telling someone what to do, MI helps them explore their own reasons for change, building commitment from within. MI is one of the most widely used evidence-based approaches in addiction treatment and is effective across all stages of recovery.",
    sections: [
      { heading: "How MI Works", content: "MI operates through four key processes: Engaging (building a trusting therapeutic relationship), Focusing (identifying specific areas for change), Evoking (drawing out the client's own motivations for change), and Planning (developing a concrete action plan). Therapists use open-ended questions, reflective listening, affirmations, and summaries to guide conversations without being directive or confrontational." },
      { heading: "MI in Addiction Treatment Settings", content: "MI is versatile and can be used as a brief intervention (1-2 sessions), a standalone treatment, or integrated into longer-term programs. It is frequently used at intake to enhance treatment engagement, as a precursor to CBT or other therapies, and during transitions between levels of care. MI is particularly effective for individuals who are ambivalent about quitting or entering treatment." },
    ],
    whatToExpect: [
      "Non-judgmental, empathetic counseling sessions",
      "Exploring pros and cons of substance use",
      "Identifying personal values and recovery goals",
      "Building confidence in ability to change",
      "Developing a personalized change plan",
      "Brief format (1-4 sessions) or integrated into ongoing care",
    ],
    benefits: [
      "Respects autonomy and avoids confrontation",
      "Effective for ambivalent or resistant individuals",
      "Can be brief (even 1-2 sessions show benefit)",
      "Enhances engagement with other treatments",
      "Strong evidence across substance types",
      "Builds lasting internal motivation",
    ],
    faqs: [
      { question: "Is motivational interviewing effective for addiction?", answer: "Yes, MI has strong research support for addiction treatment. Meta-analyses consistently show MI reduces substance use, improves treatment engagement, and increases follow-through with treatment recommendations. Even brief MI sessions (1-2) produce significant effects, making it one of the most cost-effective addiction interventions available." },
      { question: "How is MI different from other therapy?", answer: "MI is uniquely non-confrontational and client-directed. Instead of telling clients what to do, MI therapists help clients discover their own reasons for change. This approach is especially effective for individuals who resist traditional counseling or feel ambivalent about recovery." },
      { question: "Can MI be combined with other treatments?", answer: "Absolutely. MI is frequently used as an engagement tool before intensive treatment, or integrated with CBT, DBT, 12-step programs, and medication-assisted treatment. Studies show MI enhances outcomes when combined with other evidence-based approaches." },
    ],
  },
  {
    slug: "art-music-therapy-for-addiction",
    title: "Art & Music Therapy for Addiction",
    metaTitle: "Art & Music Therapy in Rehab — Creative Recovery Programs | RehabLookup",
    metaDescription: "Discover how art and music therapy support addiction recovery. Find rehab programs with creative therapies. Express, process, heal through creativity.",
    heroSubtitle: "Creative therapeutic approaches that help express emotions, process trauma, and build recovery skills.",
    filterKeys: ["art therapy", "music therapy", "creative", "expressive"],
    conditionName: "Creative Arts Therapy",
    introContent: "Art and music therapy are evidence-based creative approaches used in addiction treatment to help individuals express difficult emotions, process trauma, reduce stress, and develop healthy coping mechanisms. These therapies are particularly valuable for people who struggle to verbalize their experiences — the creative process provides an alternative pathway to emotional processing and self-discovery that complements traditional talk therapy.",
    sections: [
      { heading: "Art Therapy in Addiction Recovery", content: "Art therapy uses creative processes like drawing, painting, sculpting, and collage to explore emotions, reduce anxiety, and build self-awareness. Certified art therapists guide clients through structured activities designed to address addiction-specific issues: processing trauma, identifying triggers, exploring identity beyond substance use, and envisioning recovery goals. No artistic skill is required — the therapeutic value is in the process, not the product." },
      { heading: "Music Therapy in Addiction Recovery", content: "Music therapy uses music-based activities — songwriting, improvisation, listening analysis, and performance — to address emotional, cognitive, and social needs in recovery. Board-certified music therapists design interventions that reduce anxiety, improve mood, enhance group cohesion, and provide healthy emotional outlets. Research shows music therapy reduces cravings and improves treatment engagement." },
    ],
    whatToExpect: [
      "Individual and group creative therapy sessions",
      "Guided art-making or music activities",
      "Processing and discussion of creative work",
      "No prior artistic experience required",
      "Integration with individual and group therapy",
      "Portfolio or recordings as recovery milestones",
    ],
    benefits: [
      "Non-verbal emotional expression and processing",
      "Reduces stress, anxiety, and depression",
      "Accessible to those who struggle with talk therapy",
      "Builds self-esteem and sense of accomplishment",
      "Improves group cohesion and social skills",
      "Provides healthy lifelong coping activities",
    ],
    faqs: [
      { question: "Do I need to be artistic for art therapy?", answer: "No artistic skill or experience is needed. Art therapy focuses on the therapeutic process of creating, not the aesthetic quality of the final product. The therapist guides the experience to address emotional and psychological goals. Many clients who initially resist find art therapy among the most impactful parts of their treatment." },
      { question: "Is music therapy evidence-based?", answer: "Yes, music therapy is a recognized evidence-based practice supported by research. Studies show it reduces anxiety, depression, and cravings in addiction treatment settings. Board-certified music therapists (MT-BC) complete rigorous training including clinical internships and national board examinations." },
      { question: "How are creative therapies used in rehab?", answer: "Creative therapies are typically offered 1-3 times per week as part of a comprehensive treatment program. They complement individual therapy, group counseling, and other evidence-based approaches. Sessions may focus on specific treatment goals like trauma processing, relapse prevention, or building a recovery identity." },
    ],
  },
  {
    slug: "adventure-therapy-for-addiction",
    title: "Adventure & Wilderness Therapy for Addiction",
    metaTitle: "Adventure Therapy for Addiction — Wilderness Recovery Programs | RehabLookup",
    metaDescription: "Explore adventure and wilderness therapy for addiction. Find outdoor-based rehab programs that build confidence, resilience, and recovery skills.",
    heroSubtitle: "Outdoor-based therapeutic programs that build resilience, confidence, and recovery skills through challenge and nature.",
    filterKeys: ["adventure", "wilderness", "outdoor", "experiential"],
    conditionName: "Adventure Therapy",
    introContent: "Adventure and wilderness therapy programs use outdoor activities and natural settings as therapeutic tools for addiction recovery. Activities like hiking, rock climbing, ropes courses, kayaking, and wilderness expeditions create opportunities for clients to develop problem-solving skills, build self-confidence, practice teamwork, and experience natural consequences — all within a metaphorical framework that translates directly to recovery challenges.",
    sections: [
      { heading: "How Adventure Therapy Works", content: "Adventure therapy operates on the principle that challenging outdoor experiences create powerful opportunities for personal growth. When clients face a difficult climb or navigate a wilderness trail, they practice the same skills needed in recovery: perseverance through discomfort, asking for help, trusting others, managing fear, and celebrating achievement. Licensed adventure therapists process these experiences to deepen therapeutic insights." },
      { heading: "Wilderness Programs vs. Adventure Components", content: "Full wilderness therapy programs immerse clients in multi-day backcountry expeditions with licensed therapists. More commonly, adventure therapy is offered as a component of residential treatment — weekly rock climbing outings, ropes courses, equine therapy, or hiking programs that supplement traditional clinical work. Both approaches show positive outcomes in building self-efficacy and reducing substance use." },
    ],
    whatToExpect: [
      "Outdoor activities guided by licensed therapists",
      "Progressive challenge levels matching ability",
      "Group activities building trust and communication",
      "Individual reflection and processing sessions",
      "Physical fitness improvements alongside therapy",
      "Nature immersion for stress reduction",
    ],
    benefits: [
      "Builds self-confidence through tangible achievement",
      "Physical activity reduces stress and anxiety",
      "Natural consequences replace artificial rules",
      "Improves group dynamics and social skills",
      "Creates lasting positive memories in recovery",
      "Engages clients who resist traditional therapy",
    ],
    faqs: [
      { question: "Is adventure therapy evidence-based?", answer: "Yes, research supports adventure therapy for substance use disorders. Studies show participants demonstrate increased self-efficacy, improved coping skills, reduced depression and anxiety, and better treatment engagement. Adventure therapy is recognized by the Outdoor Behavioral Healthcare Council and supported by a growing body of peer-reviewed research." },
      { question: "Do I need to be physically fit?", answer: "No. Adventure therapy programs are designed to accommodate varying fitness levels and are progressively challenging. The therapeutic value comes from facing personal challenges, not achieving athletic feats. Licensed adventure therapists assess capabilities and modify activities to ensure safety and appropriate challenge levels." },
      { question: "Is wilderness therapy covered by insurance?", answer: "Some insurance plans cover wilderness and adventure therapy as part of a licensed treatment program. Coverage is more likely when the program is accredited, employs licensed therapists, and integrates adventure activities into a comprehensive treatment plan. Contact your insurer and the program to verify coverage." },
    ],
  },
  {
    slug: "aftercare-and-relapse-prevention",
    title: "Aftercare & Relapse Prevention Programs",
    metaTitle: "Aftercare & Relapse Prevention — Continuing Care Planning | RehabLookup",
    metaDescription: "Learn about aftercare and relapse prevention programs. Find continuing care resources to support long-term recovery after treatment.",
    heroSubtitle: "Continuing care programs that support long-term recovery and reduce relapse risk after initial treatment.",
    filterKeys: ["aftercare", "relapse prevention", "continuing care", "alumni"],
    conditionName: "Aftercare Planning",
    introContent: "Aftercare and relapse prevention programs are critical components of successful long-term recovery. Research consistently shows that ongoing support after initial treatment significantly reduces relapse rates. Comprehensive aftercare may include outpatient therapy, support groups, sober living, alumni programs, recovery coaching, and regular check-ins. The transition from structured treatment to independent living is when recovery is most vulnerable — aftercare bridges this gap.",
    sections: [
      { heading: "Components of Effective Aftercare", content: "Evidence-based aftercare programs include: step-down levels of care (from inpatient to IOP to outpatient), individual therapy continuation (weekly or biweekly), participation in mutual support groups (AA, NA, SMART Recovery), sober living housing, recovery coaching or peer mentoring, medication management, family therapy, and structured alumni programming. The most effective plans are individualized and address each person's specific risk factors and support needs." },
      { heading: "Building a Relapse Prevention Plan", content: "A relapse prevention plan identifies personal triggers (people, places, emotions, situations), early warning signs of potential relapse, coping strategies for high-risk situations, a support network contact list, and specific action steps if a lapse occurs. This plan is developed during treatment and refined throughout aftercare. Programs that actively teach relapse prevention skills show significantly better long-term outcomes." },
    ],
    whatToExpect: [
      "Personalized continuing care plan before discharge",
      "Step-down from intensive to outpatient services",
      "Regular therapy sessions (individual and group)",
      "Support group participation",
      "Alumni network connection and events",
      "Periodic assessment and plan adjustment",
    ],
    benefits: [
      "Significantly reduces relapse rates",
      "Provides accountability during vulnerable early recovery",
      "Connects to ongoing support community",
      "Addresses real-world challenges as they arise",
      "Flexibility to adjust as needs change",
      "Builds confidence in sustained recovery",
    ],
    faqs: [
      { question: "How long should aftercare last?", answer: "Research recommends ongoing aftercare for at least 12 months after initial treatment, with many experts suggesting indefinite participation in some form of recovery support. The first 90 days post-treatment are highest risk. Most intensive aftercare gradually transitions to less frequent contact as stability increases." },
      { question: "What is a relapse prevention plan?", answer: "A relapse prevention plan is a personalized document identifying your triggers, warning signs, coping strategies, and emergency contacts. It includes specific action steps for different risk levels — from managing cravings to what to do if a lapse occurs. It is created during treatment and regularly updated during aftercare." },
      { question: "Does insurance cover aftercare?", answer: "Most insurance plans cover outpatient therapy and some aftercare services under mental health parity laws. Coverage varies by plan — some cover intensive outpatient, individual therapy, and medication management. Alumni programs and sober living are less commonly covered. Check with your insurer for specific aftercare benefits." },
    ],
  },
  {
    slug: "what-to-pack-for-rehab",
    title: "What to Pack for Rehab — Complete Guide",
    metaTitle: "What to Pack for Rehab — Essential Packing List & Guide | RehabLookup",
    metaDescription: "Complete rehab packing list and guide. Learn what to bring, what not to bring, and how to prepare for your stay at a treatment center.",
    heroSubtitle: "A practical, comprehensive guide to packing for residential addiction treatment.",
    filterKeys: ["residential", "inpatient", "treatment center"],
    conditionName: "Rehab Preparation",
    introContent: "Packing for rehab can feel overwhelming, but preparation reduces anxiety and helps you focus on recovery from day one. Most treatment centers provide a packing list upon admission — follow their specific guidelines first. This guide covers the essentials that apply to most residential treatment programs, plus insider tips from addiction treatment professionals on what actually helps during your stay.",
    sections: [
      { heading: "Clothing & Personal Items", content: "Pack comfortable, modest clothing suitable for group settings and outdoor activities: 7-10 days of casual clothing, comfortable shoes for walking, workout clothes, pajamas, a jacket or sweater, and undergarments. Avoid clothing with drug/alcohol references, provocative attire, or expensive items. Most programs allow personal toiletries (alcohol-free), though some provide them. Bring prescribed medications in original containers with your pharmacy's label." },
      { heading: "What NOT to Bring", content: "Most programs prohibit: electronics (phones, laptops, tablets — though policies vary), weapons of any kind, alcohol-containing products (mouthwash, cologne, hand sanitizer), non-prescribed medications or supplements, valuable jewelry, pornographic materials, and outside food. Drug paraphernalia, obviously, is prohibited. Some programs restrict caffeine, nicotine products, or certain clothing. Call ahead to confirm specific policies." },
    ],
    whatToExpect: [
      "Bag search upon admission at most facilities",
      "Secure storage for valuables and restricted items",
      "Communal or shared living quarters",
      "Laundry facilities typically available weekly",
      "Some personal items may need staff approval",
      "Most facilities provide bedding and towels",
    ],
    benefits: [
      "Reduces admission-day anxiety",
      "Ensures you have essentials for comfort",
      "Avoids confiscation of prohibited items",
      "Helps you focus on treatment from day one",
      "Shows readiness and commitment to recovery",
      "Practical preparation supports emotional readiness",
    ],
    faqs: [
      { question: "Can I bring my phone to rehab?", answer: "Phone policies vary by facility. Some programs collect phones at admission and allow limited access during designated times. Others permit phones but restrict use during therapy hours. Some facilities prohibit phones entirely for the first 1-2 weeks, then allow limited use. Contact the facility directly for their specific policy." },
      { question: "What if I forget something?", answer: "Most facilities have a small store or can arrange for family members to bring items. Toiletries and basic necessities are typically available. Don't let packing anxiety delay your admission — treatment centers are experienced at helping new clients settle in." },
      { question: "How much should I pack?", answer: "Pack for 2 weeks of clothing (laundry is usually available weekly). One medium suitcase or duffel bag is typically sufficient. Avoid overpacking — storage space in shared rooms is limited. You can always have items sent or brought by visitors later." },
    ],
  },
  {
    slug: "questions-to-ask-rehab-center",
    title: "Questions to Ask a Rehab Center Before Enrolling",
    metaTitle: "Questions to Ask a Rehab Center — Enrollment Checklist | RehabLookup",
    metaDescription: "Essential questions to ask before choosing a rehab center. Insurance, treatment approach, staff credentials, success rates, and more. Make an informed decision.",
    heroSubtitle: "Make an informed treatment decision with these essential questions for evaluating rehab programs.",
    filterKeys: ["treatment", "rehab", "recovery"],
    conditionName: "Treatment Selection",
    introContent: "Choosing a rehab center is one of the most important decisions you'll make. Asking the right questions helps you evaluate program quality, ensure clinical fit, and avoid costly mistakes. This guide covers the critical questions addiction treatment professionals recommend asking — covering credentials, treatment approach, staff qualifications, insurance and costs, and aftercare planning.",
    sections: [
      { heading: "Accreditation & Licensing Questions", content: "Ask: Is the facility licensed by the state? What accreditation do you hold (JCAHO, CARF, COA)? How long have you been operating? Have you had any regulatory actions or complaints? What is your staff-to-client ratio? These questions verify basic quality standards. Accredited facilities meet higher standards for safety, treatment quality, and outcomes measurement." },
      { heading: "Treatment Approach Questions", content: "Ask: What evidence-based therapies do you use? How are treatment plans individualized? What is a typical daily schedule? Do you offer medication-assisted treatment (MAT)? How do you address co-occurring mental health conditions? What is your approach to relapse? How do you measure treatment outcomes? These questions reveal whether the program follows current best practices in addiction medicine." },
    ],
    whatToExpect: [
      "Admissions staff should answer questions openly",
      "Request to speak with clinical staff if possible",
      "Ask for outcome data or success metrics",
      "Inquire about family involvement opportunities",
      "Understand the discharge and aftercare process",
      "Get insurance verification before committing",
    ],
    benefits: [
      "Make a truly informed treatment decision",
      "Identify quality programs from marketing-driven ones",
      "Ensure clinical fit for your specific needs",
      "Understand costs and insurance coverage upfront",
      "Evaluate aftercare support before enrollment",
      "Build confidence in your treatment choice",
    ],
    faqs: [
      { question: "What's the most important question to ask?", answer: "Ask about evidence-based treatment modalities and clinical staff credentials. A quality program will clearly describe their therapeutic approaches (CBT, DBT, MI, MAT), employ licensed clinicians (LCSW, LPC, addiction medicine physicians), and hold accreditation from recognized bodies (JCAHO, CARF). Be cautious of programs that can't articulate their clinical approach." },
      { question: "Should I visit before enrolling?", answer: "If possible, yes. Many facilities offer tours (in-person or virtual). Seeing the environment, meeting staff, and observing the atmosphere helps assess fit. However, don't delay treatment to arrange a visit — phone conversations with admissions and clinical staff can also provide the information you need." },
      { question: "How do I verify a rehab center's credentials?", answer: "Check state licensing through your state's department of health or substance abuse authority. Verify JCAHO accreditation at qualitycheck.org and CARF accreditation at carf.org. Search for complaints through your state's attorney general office. RehabLookup verifies licensing and accreditation for all listed facilities." },
    ],
  },
];

export { modalityPages };

export default function TherapyModalityPage() {
  const location = useLocation();
  const slug = location.pathname.replace(/^\//, "");
  const { data: approvedFacilities = [], isLoading } = useStaticFacilities();

  const modality = useMemo(() => modalityPages.find((m) => m.slug === slug) || null, [slug]);

  const facilities = useMemo(() => {
    if (!modality) return [];
    const all = [...treatmentCenters, ...approvedFacilities];
    const keywords = modality.filterKeys.map((k) => k.toLowerCase());
    return all
      .filter((f) =>
        f.treatmentTypes?.some((t) => keywords.some((k) => t.toLowerCase().includes(k))) ||
        keywords.some((k) => f.description?.toLowerCase().includes(k))
      )
      .slice(0, 12);
  }, [approvedFacilities, modality]);

  if (!modality) {
    return <Navigate to="/treatment-types" replace />;
  }

  const structuredData: any[] = [
    {
      "@context": "https://schema.org",
      "@type": "MedicalWebPage",
      name: modality.title,
      description: modality.metaDescription,
      url: `https://rehablookup.com/${slug}`,
      specialty: "Addiction Medicine",
      lastReviewed: new Date().toISOString().split("T")[0],
    },
  ];

  if (shouldEmitFAQSchema(modality.faqs)) {
    structuredData.push({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: modality.faqs.map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: { "@type": "Answer", text: faq.answer },
      })),
    });
  }

  return (
    <SEOLandingTemplate
      title={modality.title}
      metaTitle={modality.metaTitle}
      metaDescription={modality.metaDescription}
      canonical={`https://rehablookup.com/${slug}`}
      structuredData={structuredData}
      breadcrumbs={[
        { name: "Home", url: "/" },
        { name: "Treatment Types", url: "/treatment-types" },
        { name: modality.title, url: `/${slug}` },
      ]}
      heroTitle={modality.title}
      heroSubtitle={modality.heroSubtitle}
      heroBadge="Evidence-Based"
      introContent={modality.introContent}
      sections={modality.sections}
      whatToExpect={modality.whatToExpect}
      benefits={modality.benefits}
      facilities={facilities}
      isLoading={isLoading}
      facilityCount={facilities.length}
      faqs={modality.faqs}
      faqTreatmentType={modality.conditionName}
      showTreatmentLinks
      showInsuranceLinks
      showNearMeLinks
      ctaTitle={`Find Programs Using ${modality.conditionName}`}
      ctaSubtitle={`Our concierge team matches you with treatment programs that use ${modality.conditionName.toLowerCase()} and other evidence-based approaches. Free and confidential.`}
    >
      <SmartInternalLinks pageType="state" stateSlug="" stateName="" />
    </SEOLandingTemplate>
  );
}
