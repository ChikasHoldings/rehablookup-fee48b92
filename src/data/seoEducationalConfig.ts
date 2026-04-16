// ============================================================
// Educational Pages: "What Is" + Withdrawal/Signs Configs
// Rendered by TherapyModalityPage component (same ModalityConfig interface)
// ============================================================

export interface EducationalPageConfig {
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

export const whatIsPages: EducationalPageConfig[] = [
  {
    slug: "what-is-detox",
    title: "What Is Detox? A Complete Guide",
    metaTitle: "What Is Detox? Medical Detox Process Explained | RehabLookup",
    metaDescription: "Learn what medical detox is, how it works, what to expect, and why it's the critical first step in addiction treatment. Evidence-based guide.",
    heroSubtitle: "Understanding the medical detoxification process — the essential first step toward addiction recovery.",
    filterKeys: ["detox", "detoxification", "medical detox", "withdrawal management"],
    conditionName: "Medical Detoxification",
    introContent: "Medical detoxification (detox) is the process of safely managing withdrawal symptoms when someone stops using drugs or alcohol. It is the critical first step in addiction treatment — not treatment itself, but the necessary foundation that prepares the body and mind for therapeutic work. Medical detox uses medications and 24/7 clinical monitoring to ensure safety and comfort during withdrawal, which can be dangerous or even fatal for certain substances like alcohol and benzodiazepines.",
    sections: [
      { heading: "How Medical Detox Works", content: "Medical detox follows three phases: evaluation (assessing substance use history, medical conditions, and psychiatric status), stabilization (using medications and medical support to manage withdrawal safely), and transition to treatment (connecting patients with the next level of care). Throughout this process, medical staff monitor vital signs, administer medications as needed, and provide emotional support." },
      { heading: "Medications Used in Detox", content: "Depending on the substance, medications may include: buprenorphine or methadone for opioid withdrawal, benzodiazepines for alcohol withdrawal seizure prevention, clonidine for general withdrawal symptoms, anti-nausea and anti-diarrheal medications, sleep aids, and mood stabilizers. The goal is maximum comfort and medical safety." },
    ],
    whatToExpect: ["Medical evaluation upon admission", "24/7 vital sign monitoring", "Medication to manage withdrawal symptoms", "Comfortable, supervised environment", "Nutritional support and hydration", "Transition planning to continued treatment"],
    benefits: ["Medically safe withdrawal process", "Reduced discomfort and complication risk", "Prevention of life-threatening withdrawal symptoms", "Foundation for continued treatment", "Psychiatric stabilization", "Insurance typically covers medical detox"],
    faqs: [
      { question: "How long does detox take?", answer: "Detox duration varies by substance: alcohol (3-7 days), opioids (5-10 days), benzodiazepines (2-8 weeks with taper), stimulants (1-2 weeks), and cannabis (1-2 weeks). Individual factors like duration of use, dosage, and overall health affect the timeline." },
      { question: "Is detox painful?", answer: "Modern medical detox uses medications to significantly reduce withdrawal discomfort. While some symptoms are unavoidable, medical supervision ensures they're manageable. Patients consistently report that medically managed detox is far more comfortable than previous unsupervised withdrawal attempts." },
      { question: "Is detox enough to treat addiction?", answer: "No. Detox addresses physical dependence but not the psychological, behavioral, and social factors driving addiction. Detox alone has a relapse rate exceeding 90%. It must be followed by comprehensive treatment (inpatient, outpatient, therapy) for lasting recovery." },
      { question: "Does insurance cover detox?", answer: "Yes, medical detox is covered by virtually all health insurance plans as a medically necessary service. Medicaid, Medicare, and private insurance all provide coverage." },
    ],
  },
  {
    slug: "what-is-mat",
    title: "What Is MAT (Medication-Assisted Treatment)?",
    metaTitle: "What Is MAT? Medication-Assisted Treatment Explained | RehabLookup",
    metaDescription: "Learn what medication-assisted treatment (MAT) is, how it works, which medications are used, and why it's the gold standard for opioid addiction treatment.",
    heroSubtitle: "The evidence-based gold standard for opioid and alcohol addiction treatment — combining medication with behavioral therapy.",
    filterKeys: ["MAT", "medication-assisted", "suboxone", "methadone", "vivitrol", "buprenorphine"],
    conditionName: "Medication-Assisted Treatment",
    introContent: "Medication-Assisted Treatment (MAT) combines FDA-approved medications with behavioral therapy and counseling to treat substance use disorders. It is the most effective treatment available for opioid addiction, reducing overdose deaths by 50% and significantly improving treatment retention, employment, and social functioning. Despite strong evidence, misconceptions persist. MAT is not 'replacing one drug with another' — it's evidence-based medicine for a chronic brain disease.",
    sections: [
      { heading: "FDA-Approved MAT Medications", content: "For opioid addiction: Buprenorphine (Suboxone, Subutex, Sublocade) — partial opioid agonist that reduces cravings and withdrawal; Methadone — full opioid agonist dispensed at certified clinics; Naltrexone (Vivitrol) — opioid antagonist that blocks opioid effects. For alcohol addiction: Naltrexone — reduces alcohol cravings and pleasure from drinking; Acamprosate (Campral) — restores brain chemistry balance; Disulfiram (Antabuse) — causes unpleasant reaction when drinking." },
      { heading: "How MAT Works in the Brain", content: "Addiction changes brain chemistry and neural pathways. MAT medications normalize these changes: buprenorphine and methadone stabilize opioid receptors without causing euphoria, reducing cravings and preventing withdrawal. Naltrexone blocks receptors entirely, eliminating the rewarding effects of opioids or alcohol. By addressing the biological component, MAT allows patients to engage fully in behavioral therapy." },
    ],
    whatToExpect: ["Comprehensive addiction and medical assessment", "Medication induction and stabilization", "Regular follow-up appointments", "Behavioral therapy and counseling", "Drug screening and monitoring", "Long-term maintenance and support"],
    benefits: ["Reduces opioid overdose deaths by 50%", "Decreases cravings and withdrawal", "Improves treatment retention significantly", "Allows normal functioning (work, relationships)", "FDA-approved with decades of evidence", "Covered by insurance including Medicaid"],
    faqs: [
      { question: "Is MAT just replacing one addiction with another?", answer: "No. MAT medications are given at stable, therapeutic doses that don't produce euphoria or impairment. They normalize brain chemistry similar to how insulin manages diabetes. Patients on MAT can work, drive, parent, and live normally — they're managing a chronic condition, not feeding an addiction." },
      { question: "How long should I stay on MAT?", answer: "Evidence supports long-term MAT — minimum 12 months, with many patients benefiting from years or indefinite maintenance. Premature discontinuation is the strongest predictor of relapse and overdose. There's no medical reason to rush off MAT. Decisions should be collaborative with your provider." },
      { question: "Can I get MAT without going to inpatient rehab?", answer: "Yes, MAT is commonly provided in outpatient settings. Buprenorphine can be prescribed by qualified physicians in private offices. Naltrexone can be administered in any medical setting. Methadone requires visiting a certified clinic but is still outpatient. Many patients receive MAT while maintaining work and family obligations." },
    ],
  },
  {
    slug: "what-is-php",
    title: "What Is PHP (Partial Hospitalization Program)?",
    metaTitle: "What Is PHP? Partial Hospitalization Programs Explained | RehabLookup",
    metaDescription: "Learn what a Partial Hospitalization Program (PHP) is, how it differs from inpatient and outpatient, who it's best for, and what a typical day looks like.",
    heroSubtitle: "Intensive daytime treatment that bridges inpatient rehab and outpatient care — the structured step-down most people need.",
    filterKeys: ["PHP", "partial hospitalization", "day treatment", "step-down"],
    conditionName: "Partial Hospitalization",
    introContent: "A Partial Hospitalization Program (PHP) provides intensive, structured treatment during the day (typically 5-7 days per week, 6-8 hours daily) while allowing patients to return home or to a sober living environment at night. PHP serves as an ideal step-down from inpatient treatment or as a high-intensity alternative for those who need more support than standard outpatient but don't require 24-hour supervision.",
    sections: [
      { heading: "What a Typical PHP Day Looks Like", content: "A PHP day typically runs from 9am to 3pm or 4pm and includes: morning check-in and goal setting, individual therapy sessions, group therapy (process, psychoeducational, skills-based), medication management, lunch and peer social time, and afternoon skills workshops (stress management, relapse prevention, coping strategies). Evenings are spent at home or in sober living, practicing skills learned during the day." },
      { heading: "PHP vs. IOP vs. Inpatient", content: "PHP (20-30 hours/week) is more intensive than IOP (9-15 hours/week) but less intensive than inpatient (24/7). PHP provides the clinical intensity of inpatient during the day while allowing real-world practice of recovery skills at night. It's ideal for those who need structure but can maintain safety outside treatment hours." },
    ],
    whatToExpect: ["Structured programming 5-7 days per week", "6-8 hours of daily treatment", "Individual and group therapy sessions", "Medication management and psychiatric care", "Skills training and relapse prevention", "Evening time at home or sober living"],
    benefits: ["Clinical intensity comparable to inpatient", "Practice recovery skills in real-world settings", "Maintain some work or family responsibilities", "Lower cost than residential treatment", "Smooth transition from inpatient care", "Insurance typically covers PHP"],
    faqs: [
      { question: "How long does PHP last?", answer: "PHP programs typically last 2-6 weeks, with most patients attending for about 4 weeks before stepping down to IOP. Duration depends on individual progress, clinical needs, and insurance authorization." },
      { question: "Can I work during PHP?", answer: "Most PHP programs run during business hours (9am-3pm), making it difficult to work full-time. Some patients manage part-time evening or weekend work. Evening PHP programs exist but are less common. Discuss scheduling needs with the program during intake." },
      { question: "Does insurance cover PHP?", answer: "Yes, most insurance plans cover PHP as a medically necessary level of care. Coverage is typically authorized in weekly increments based on continued medical necessity. Pre-authorization may be required." },
    ],
  },
  {
    slug: "what-is-iop",
    title: "What Is IOP (Intensive Outpatient Program)?",
    metaTitle: "What Is IOP? Intensive Outpatient Programs Explained | RehabLookup",
    metaDescription: "Learn what an Intensive Outpatient Program (IOP) is, the schedule, what to expect, and who benefits most. Flexible treatment that works with your life.",
    heroSubtitle: "Flexible intensive treatment allowing you to maintain work and family while getting structured addiction care.",
    filterKeys: ["IOP", "intensive outpatient", "outpatient treatment", "evening program"],
    conditionName: "Intensive Outpatient",
    introContent: "An Intensive Outpatient Program (IOP) provides structured addiction treatment 3-5 days per week for 3-4 hours per session, allowing patients to maintain work, school, and family responsibilities. IOP is one of the most commonly used levels of care in addiction treatment — it works as a step-down from inpatient/PHP or as an initial treatment level for mild to moderate substance use disorders with a stable living environment.",
    sections: [
      { heading: "What IOP Treatment Includes", content: "IOP sessions typically include: group therapy (process groups, CBT/DBT skills groups, relapse prevention), individual therapy (usually 1 session per week), psychiatric evaluation and medication management, drug testing, case management, and family education sessions. Many IOPs offer evening and weekend scheduling options to accommodate work and school." },
      { heading: "Who Benefits Most from IOP", content: "IOP is ideal for individuals with mild to moderate substance use disorders, stable housing and support systems, motivation for recovery, ability to maintain abstinence between sessions, and need for flexibility. It's also the standard step-down from PHP and inpatient care, providing ongoing structure as patients reintegrate into daily life." },
    ],
    whatToExpect: ["3-5 sessions per week, 3-4 hours each", "Morning or evening scheduling options", "Group and individual therapy", "Drug screening and accountability", "Case management and resource connection", "Gradual step-down as progress is made"],
    benefits: ["Continue working or attending school", "Maintain family and social connections", "Lower cost than inpatient or PHP", "Practice recovery in real-world settings", "Flexible scheduling options", "Insurance widely covers IOP"],
    faqs: [
      { question: "How long does IOP last?", answer: "IOP typically lasts 8-12 weeks, though duration varies by individual progress and program design. Patients often start at 5 days/week and step down to 3 days/week, then transition to standard outpatient. Some IOPs extend to 6 months with decreasing intensity." },
      { question: "Can I work full-time during IOP?", answer: "Yes, many IOPs are designed for working individuals. Evening programs (typically 6-9pm) and weekend options are widely available. Morning IOPs (9am-12pm) can work with afternoon/evening shift schedules. Flexibility is a key advantage of IOP." },
      { question: "Is IOP effective?", answer: "Yes, research shows IOP produces outcomes comparable to inpatient treatment for appropriate candidates. Key success factors include stable housing, willingness to attend consistently, and a supportive environment. IOP combined with community support (AA/NA, sober living) shows the strongest outcomes." },
    ],
  },
  {
    slug: "what-is-dual-diagnosis",
    title: "What Is Dual Diagnosis Treatment?",
    metaTitle: "What Is Dual Diagnosis? Co-Occurring Disorder Treatment | RehabLookup",
    metaDescription: "Learn what dual diagnosis means, why mental health and addiction must be treated together, and how to find integrated treatment programs.",
    heroSubtitle: "Understanding integrated treatment for co-occurring mental health disorders and addiction — the key to lasting recovery.",
    filterKeys: ["dual-diagnosis", "co-occurring", "mental health", "integrated treatment"],
    conditionName: "Dual Diagnosis Treatment",
    introContent: "Dual diagnosis (also called co-occurring disorders) refers to the simultaneous presence of a mental health disorder and a substance use disorder. Approximately 50% of people with severe mental illness also have a substance use disorder, and roughly 37% of those with alcohol use disorder also have a mental health condition. Effective treatment must address both conditions simultaneously — treating one without the other leads to relapse in both.",
    sections: [
      { heading: "Common Dual Diagnosis Combinations", content: "The most frequent co-occurring combinations include: depression + alcohol use disorder, anxiety disorders + benzodiazepine or alcohol addiction, PTSD + opioid or alcohol use disorder, bipolar disorder + stimulant or alcohol addiction, ADHD + stimulant addiction, and borderline personality disorder + substance use. Understanding the specific interaction between conditions is essential for effective treatment." },
      { heading: "Integrated vs. Sequential Treatment", content: "The treatment approach matters enormously. Sequential treatment (treating one condition first, then the other) has been largely abandoned due to poor outcomes. Parallel treatment (addressing both simultaneously but separately) is better. Integrated treatment (a single team addressing both conditions as interconnected) produces the best outcomes. Look for programs with both psychiatric and addiction expertise." },
    ],
    whatToExpect: ["Comprehensive psychiatric and addiction evaluation", "Integrated treatment plan for both conditions", "Psychiatric medication management", "Evidence-based therapies (CBT, DBT, EMDR)", "Group therapy with dual diagnosis peers", "Coordinated aftercare for ongoing management"],
    benefits: ["Addresses root causes of substance use", "Prevents relapse cycle between conditions", "Psychiatric medication manages mental health", "Therapies target both conditions simultaneously", "Better long-term outcomes than separate treatment", "Comprehensive aftercare addresses ongoing needs"],
    faqs: [
      { question: "How do I know if I have a dual diagnosis?", answer: "Signs include: using substances to cope with emotional distress, depression, or anxiety; mental health symptoms worsening when you stop using; psychiatric symptoms that persist even during periods of abstinence; difficulty in treatment for one condition because the other keeps interfering. A comprehensive assessment by a qualified professional is needed for formal diagnosis." },
      { question: "Which came first — the mental health issue or the addiction?", answer: "This is often difficult to determine and, clinically, less important than treating both simultaneously. Mental health disorders can lead to self-medication with substances, substance use can trigger or worsen mental health conditions, and both may stem from shared biological vulnerabilities. Integrated treatment addresses both regardless of origin." },
      { question: "Are dual diagnosis programs more expensive?", answer: "Dual diagnosis programs may cost more than basic addiction treatment due to the need for psychiatric evaluation, medication management, and specialized staff. However, insurance covers dual diagnosis treatment, and the long-term cost savings from treating both conditions (fewer relapses, hospitalizations, and crises) far outweigh the investment." },
    ],
  },
  {
    slug: "what-is-sober-living",
    title: "What Is Sober Living? A Complete Guide",
    metaTitle: "What Is Sober Living? Housing for Recovery Explained | RehabLookup",
    metaDescription: "Learn what sober living homes are, how they work, rules and expectations, costs, and how they support long-term addiction recovery.",
    heroSubtitle: "Structured, substance-free housing that bridges treatment and independent living — a critical support for sustained recovery.",
    filterKeys: ["sober living", "halfway house", "recovery housing", "transitional living"],
    conditionName: "Sober Living",
    introContent: "Sober living homes (also called sober houses or recovery residences) are substance-free residential environments for people in addiction recovery. They provide a structured, supportive transition between intensive treatment and fully independent living. Research shows sober living significantly improves recovery outcomes — residents have lower relapse rates, higher employment, and better social functioning compared to those who return directly to unsupported environments.",
    sections: [
      { heading: "How Sober Living Works", content: "Sober living homes are shared residences (typically 6-12 residents) with house rules that support recovery: no substance use, mandatory drug testing, house meeting attendance, chore responsibilities, and often a curfew. Most require residents to work or attend school and participate in recovery activities (meetings, outpatient therapy). Staff supervision varies from live-in house managers to periodic check-ins." },
      { heading: "Who Benefits from Sober Living", content: "Sober living is especially valuable for people completing inpatient treatment who need structured transition, those without a stable or sober home environment, individuals with limited social support in recovery, people with chronic relapse histories, and anyone who wants additional accountability during early recovery. Length of stay varies from 30 days to over a year." },
    ],
    whatToExpect: ["Shared housing with peers in recovery", "House rules and accountability structure", "Regular drug testing", "House meetings and community activities", "Requirement to work or attend school", "Gradual increase in independence"],
    benefits: ["Lower relapse rates than returning home directly", "Built-in sober social network", "Structured accountability and routine", "Affordable transitional housing", "Practice independent living skills", "Peer support and mentorship"],
    faqs: [
      { question: "How much does sober living cost?", answer: "Sober living typically costs $500-$2,500 per month, depending on location, amenities, and level of structure. Some homes accept Medicaid or provide sliding-scale fees. Many residents pay out-of-pocket since insurance typically doesn't cover sober living (it's classified as housing, not treatment)." },
      { question: "How long should I stay in sober living?", answer: "Most experts recommend 6-12 months. Research shows longer stays are associated with better outcomes. The first 90 days are particularly critical. Many residents choose to stay as long as they benefit from the structure and community, gradually transitioning when they feel ready." },
      { question: "What happens if I relapse in sober living?", answer: "Policies vary. Some homes discharge immediately upon relapse (zero tolerance), while others offer a grace period with additional requirements (increased meetings, testing, counseling). Many homes use a progressive response system. Understanding the relapse policy before moving in is important." },
    ],
  },
  {
    slug: "what-is-residential-treatment",
    title: "What Is Residential Treatment for Addiction?",
    metaTitle: "What Is Residential Treatment? Inpatient Rehab Explained | RehabLookup",
    metaDescription: "Learn what residential addiction treatment involves, how it works, typical daily schedules, and how to choose the right inpatient rehab program.",
    heroSubtitle: "Immersive 24/7 treatment in a structured residential environment — the gold standard for moderate to severe addiction.",
    filterKeys: ["residential", "inpatient", "residential treatment", "live-in rehab"],
    conditionName: "Residential Treatment",
    introContent: "Residential treatment (inpatient rehab) provides 24-hour structured care in a dedicated facility where patients live full-time during treatment. It offers the highest level of non-hospital addiction care, combining medical oversight, intensive therapy, peer community, and complete removal from triggers and substance access. Residential treatment is recommended by NIDA for moderate to severe substance use disorders and produces the best outcomes when lasting 90+ days.",
    sections: [
      { heading: "A Typical Day in Residential Treatment", content: "A structured daily schedule typically includes: early morning mindfulness or exercise, breakfast and community meeting, morning therapy groups (CBT, process, psychoeducational), individual therapy session, lunch and supervised recreation, afternoon skills workshops and specialty groups, dinner and evening programming (12-step, family visits, meditation), and a nightly reflection or journaling period." },
      { heading: "Types of Residential Programs", content: "Residential programs vary in approach and amenities: Standard Residential — evidence-based clinical programs in a comfortable but basic setting. Luxury Residential — premium amenities (private rooms, gourmet meals, spa) with clinical treatment. Executive Residential — designed for professionals with work accommodation. Therapeutic Communities — longer-term (6-12 months) peer-led programs. Each serves different needs and budgets." },
    ],
    whatToExpect: ["Full-time residence at the treatment facility", "Structured daily schedule with multiple therapy sessions", "24/7 medical and clinical support", "Peer community living", "Recreation and wellness activities", "Comprehensive discharge and aftercare planning"],
    benefits: ["Complete removal from triggers and substances", "24/7 support during critical early recovery", "Intensive therapy schedule accelerates healing", "Peer community provides support and accountability", "Medical oversight for safety", "Best outcomes for moderate-severe addiction"],
    faqs: [
      { question: "How long is residential treatment?", answer: "Programs range from 28-30 days (short-term) to 60-90 days (standard) to 6-12 months (long-term therapeutic communities). NIDA research indicates 90+ days produces significantly better outcomes. Insurance typically covers 28-30 days initially, with extensions available based on medical necessity." },
      { question: "Can I bring my phone to residential treatment?", answer: "Policies vary. Many programs restrict phone use during the first 1-2 weeks to help patients disengage from triggers and focus on treatment. After the initial period, limited phone time may be permitted. Some luxury programs are more flexible. Ask about the specific phone and electronics policy." },
      { question: "What should I pack for residential treatment?", answer: "Essentials include comfortable clothing for 1-2 weeks (laundry is available), personal hygiene items, any prescribed medications in original containers, health insurance information, a journal or notebook, and comfortable shoes for walking/exercise. Facilities typically provide bedding and towels." },
    ],
  },
  // NOTE: "what-is-intensive-outpatient" removed — duplicate of "what-is-iop" above.
  // Route /what-is-intensive-outpatient redirects to /what-is-iop via App.tsx.
];

export const withdrawalSignsPages: EducationalPageConfig[] = [
  {
    slug: "alcohol-withdrawal-symptoms",
    title: "Alcohol Withdrawal Symptoms & Timeline",
    metaTitle: "Alcohol Withdrawal Symptoms: Timeline, Dangers & Treatment",
    metaDescription: "Understand alcohol withdrawal symptoms, the timeline, dangerous complications like DTs, and why medical detox is critical. Evidence-based guide.",
    heroSubtitle: "A medical guide to alcohol withdrawal — what to expect, when it's dangerous, and why supervision saves lives.",
    filterKeys: ["alcohol withdrawal", "detox", "delirium tremens", "alcohol detox"],
    conditionName: "Alcohol Withdrawal",
    introContent: "Alcohol withdrawal occurs when someone who has been drinking heavily for weeks, months, or years suddenly reduces or stops consumption. Unlike many other substances, alcohol withdrawal can be life-threatening — causing seizures, delirium tremens (DTs), and cardiac complications. Understanding the timeline, symptoms, and when to seek emergency help is critical. Medical detox is strongly recommended for anyone with a history of heavy or prolonged alcohol use.",
    sections: [
      { heading: "Withdrawal Timeline", content: "Stage 1 (6-12 hours): Anxiety, tremors, headache, nausea, insomnia, sweating, heart palpitations. Stage 2 (12-48 hours): Increased blood pressure, confusion, hallucinations (visual, auditory, or tactile), fever. Stage 3 (48-72 hours): Seizure risk peaks. Delirium tremens may begin — characterized by severe confusion, agitation, hallucinations, fever, and autonomic instability. Stage 4 (72+ hours): Symptoms gradually improve, though some patients experience protracted withdrawal lasting weeks to months." },
      { heading: "When Alcohol Withdrawal Is Dangerous", content: "Seek immediate medical attention for: seizures or seizure history, temperature above 101°F, severe confusion or disorientation, visual/auditory hallucinations, rapid or irregular heartbeat, uncontrollable tremors, history of delirium tremens, or heavy daily drinking for more than 2 weeks. Delirium tremens has a mortality rate of up to 37% without treatment, dropping to 1-5% with proper medical care." },
    ],
    whatToExpect: ["Medically supervised withdrawal management", "Benzodiazepine taper protocol for seizure prevention", "Vital sign monitoring every 2-4 hours", "IV fluids and nutritional supplementation", "Thiamine (B1) to prevent brain damage", "Transition to treatment within 5-7 days"],
    benefits: ["Prevents life-threatening seizures and DTs", "Medications reduce discomfort significantly", "Nutritional support prevents complications", "24/7 monitoring catches problems early", "Smooth transition to ongoing treatment", "Dramatically safer than unsupervised withdrawal"],
    faqs: [
      { question: "Can I die from alcohol withdrawal?", answer: "Yes. Alcohol withdrawal can cause fatal seizures, delirium tremens, and cardiac arrhythmias. The risk is highest for heavy, long-term drinkers. Medical detox reduces mortality from 37% (untreated DTs) to 1-5%. Never attempt to detox from heavy alcohol use without medical supervision." },
      { question: "How long does alcohol withdrawal last?", answer: "Acute withdrawal typically lasts 5-7 days. However, Post-Acute Withdrawal Syndrome (PAWS) can persist for weeks to months with symptoms including anxiety, insomnia, mood swings, and cravings. Medical management addresses both acute and protracted symptoms." },
      { question: "What medications help alcohol withdrawal?", answer: "Benzodiazepines (diazepam, chlordiazepoxide, lorazepam) are the primary treatment for preventing seizures and managing anxiety. Additional medications include thiamine (prevents Wernicke's encephalopathy), folic acid, anticonvulsants, and anti-nausea medications. After detox, naltrexone or acamprosate may help maintain sobriety." },
    ],
  },
  {
    slug: "opioid-withdrawal-timeline",
    title: "Opioid Withdrawal Timeline & Symptoms",
    metaTitle: "Opioid Withdrawal: Symptoms, Timeline & Medical Treatment",
    metaDescription: "Complete guide to opioid withdrawal symptoms and timeline. Learn what to expect during detox from heroin, fentanyl, and prescription painkillers.",
    heroSubtitle: "What to expect during opioid withdrawal — symptoms, timeline, medications, and why medical detox prevents relapse.",
    filterKeys: ["opioid withdrawal", "heroin withdrawal", "fentanyl withdrawal", "opioid detox"],
    conditionName: "Opioid Withdrawal",
    introContent: "Opioid withdrawal is intensely uncomfortable but rarely life-threatening in healthy adults. However, the severity of symptoms — often described as the worst flu imaginable combined with crushing anxiety — drives relapse rates above 90% when attempted without medical support. Medical detox uses medications like buprenorphine and clonidine to dramatically reduce withdrawal discomfort, improve completion rates, and create a foundation for ongoing MAT treatment.",
    sections: [
      { heading: "Withdrawal Timeline", content: "Short-acting opioids (heroin, oxycodone): onset 6-12 hours, peak 36-72 hours, resolution 5-7 days. Long-acting opioids (methadone, extended-release): onset 24-48 hours, peak 72-96 hours, resolution 10-14 days. Fentanyl: onset 2-4 hours (due to potency), peak 24-72 hours, resolution 7-10 days. Post-acute withdrawal syndrome (PAWS) may persist for months with insomnia, anxiety, and cravings." },
      { heading: "Symptom Progression", content: "Early symptoms (6-24 hours): anxiety, muscle aches, restlessness, tearing eyes, runny nose, yawning, sweating. Peak symptoms (36-72 hours): nausea, vomiting, diarrhea, abdominal cramps, dilated pupils, goosebumps, severe insomnia, rapid heartbeat. Late symptoms (5-10 days): fatigue, irritability, lingering insomnia, mild anxiety, and persistent cravings." },
    ],
    whatToExpect: ["Buprenorphine (Suboxone) induction for comfort", "Clonidine for anxiety and autonomic symptoms", "Anti-nausea and anti-diarrheal medications", "Sleep support and comfort care", "Hydration and nutritional support", "Transition to ongoing MAT maintenance"],
    benefits: ["Dramatically reduced withdrawal discomfort", "Higher completion rates than unsupervised detox", "Prevention of dangerous dehydration", "Foundation for long-term MAT treatment", "Supervised environment prevents impulsive relapse", "Medical management of complications"],
    faqs: [
      { question: "Is opioid withdrawal dangerous?", answer: "While rarely directly fatal in healthy adults, opioid withdrawal can be dangerous due to severe dehydration (from vomiting/diarrhea), aspiration risks, and the extremely high relapse rate leading to overdose death (tolerance drops rapidly during withdrawal, making a return to previous doses fatal). Medical supervision is strongly recommended." },
      { question: "How bad is opioid withdrawal?", answer: "Patients commonly describe it as the most physically and emotionally miserable experience of their lives — comparable to severe flu with added psychological torment. Medical detox with buprenorphine reduces this suffering by 70-90%, making the process manageable and significantly increasing the likelihood of completing detox." },
      { question: "Should I start Suboxone during withdrawal?", answer: "Yes, buprenorphine (Suboxone) is typically started once withdrawal symptoms emerge (usually 12-24 hours after last opioid use). It provides rapid relief and can serve as the foundation for long-term MAT maintenance. Starting too early can cause precipitated withdrawal, which is why medical supervision is important." },
    ],
  },
  {
    slug: "benzo-withdrawal-symptoms",
    title: "Benzodiazepine Withdrawal Symptoms & Dangers",
    metaTitle: "Benzo Withdrawal: Symptoms, Dangers & Safe Tapering",
    metaDescription: "Learn about benzodiazepine withdrawal symptoms, why it's dangerous, and how medical tapering ensures safety. Guide for Xanax, Valium, Klonopin withdrawal.",
    heroSubtitle: "Why benzodiazepine withdrawal requires medical supervision — the risks, tapering protocols, and path to safe discontinuation.",
    filterKeys: ["benzo withdrawal", "benzodiazepine withdrawal", "xanax withdrawal", "valium withdrawal"],
    conditionName: "Benzodiazepine Withdrawal",
    introContent: "Benzodiazepine withdrawal is among the most dangerous of all substance withdrawals — abruptly stopping after prolonged use can cause life-threatening seizures, psychosis, and delirium. NEVER stop benzodiazepines cold turkey. Medical tapering under clinical supervision is essential. The withdrawal process is typically longer and more gradual than other substances, requiring weeks to months of carefully monitored dose reduction.",
    sections: [
      { heading: "Why Benzo Withdrawal Is Dangerous", content: "Benzodiazepines enhance GABA activity in the brain. Prolonged use causes the brain to reduce its own GABA production. Sudden cessation creates severe GABA deficiency, resulting in neural hyperexcitability that can cause grand mal seizures, delirium, psychosis, extreme anxiety, and potentially death. Risk increases with higher doses, longer use, shorter-acting benzodiazepines (Xanax), and abrupt discontinuation." },
      { heading: "Medical Tapering Protocols", content: "Safe benzodiazepine discontinuation involves: converting to a long-acting equivalent (often diazepam/Valium) for a smoother taper, reducing dose by 10-25% every 1-4 weeks, monitoring for breakthrough symptoms, adjusting the taper rate based on patient tolerance, and providing supportive medications (anticonvulsants, SSRIs) as needed. Total taper duration ranges from 4 weeks to 6+ months depending on initial dose and duration." },
    ],
    whatToExpect: ["Conversion to long-acting benzodiazepine", "Gradual dose reduction over weeks to months", "Regular medical monitoring and assessment", "Supportive medications for comfort", "CBT for anxiety management", "Long-term follow-up and support"],
    benefits: ["Prevents life-threatening seizures", "Gradual approach minimizes discomfort", "Treats underlying anxiety during taper", "Medical monitoring catches complications early", "Builds non-pharmacological coping skills", "Safer than any unsupervised approach"],
    faqs: [
      { question: "How long does benzo withdrawal take?", answer: "Acute withdrawal from short-acting benzos (Xanax) begins within 6-8 hours and peaks within 1-4 days. From long-acting benzos (Valium), onset is 1-7 days with a later peak. However, a medical taper extends the total process over weeks to months for safety. Post-acute withdrawal (PAWS) can persist for 6-18 months with anxiety, insomnia, and cognitive symptoms." },
      { question: "What is protracted benzo withdrawal?", answer: "Protracted (or post-acute) withdrawal affects 10-15% of long-term benzo users and can last months to years. Symptoms include waves of anxiety, insomnia, cognitive fog, depersonalization, sensory sensitivity, and mood fluctuations. While distressing, symptoms gradually diminish. Support groups, therapy, and time are the primary treatments." },
      { question: "Can I die from benzo withdrawal?", answer: "Yes. Abrupt benzodiazepine withdrawal can cause fatal seizures. This risk is greatest for those taking high doses, using short-acting benzodiazepines (Xanax, Ativan), and using for extended periods. Medical tapering eliminates this risk. Never stop benzodiazepines abruptly." },
    ],
  },
  {
    slug: "meth-withdrawal-symptoms",
    title: "Meth Withdrawal Symptoms & Recovery Timeline",
    metaTitle: "Meth Withdrawal: Symptoms, Timeline & Treatment Options",
    metaDescription: "Understand methamphetamine withdrawal symptoms, the crash and recovery timeline, and effective treatment approaches for meth addiction.",
    heroSubtitle: "Understanding the meth crash, withdrawal timeline, and evidence-based path to recovery from methamphetamine addiction.",
    filterKeys: ["meth withdrawal", "methamphetamine withdrawal", "crystal meth detox", "stimulant withdrawal"],
    conditionName: "Methamphetamine Withdrawal",
    introContent: "Methamphetamine withdrawal is primarily psychological but can be profoundly debilitating. The initial 'crash' involves extreme fatigue, depression, and cognitive impairment as the brain's depleted dopamine system struggles to recover. While not typically life-threatening like alcohol or benzo withdrawal, the severe depression during meth withdrawal carries suicide risk and the intense cravings drive extremely high relapse rates without supervised care.",
    sections: [
      { heading: "The Meth Crash and Withdrawal Timeline", content: "The Crash (Days 1-3): Extreme exhaustion, excessive sleeping (up to 20+ hours), increased appetite, severe depression, irritability, and anxiety. This phase is the body's response to dopamine depletion. Acute Withdrawal (Days 4-14): Persistent fatigue, depression, anhedonia (inability to feel pleasure), difficulty concentrating, vivid and disturbing dreams, paranoia, and intense cravings. Protracted Withdrawal (Weeks 3-6+): Gradual improvement with lingering depression, cravings, cognitive fog, and sleep disturbances. Full dopamine recovery may take 12-18 months." },
      { heading: "Treatment Approaches", content: "No FDA-approved medications exist specifically for meth withdrawal, but supportive treatments include: antidepressants for severe depression, sleep aids for insomnia, nutritional rehabilitation, cognitive behavioral therapy, contingency management (incentive-based treatment), and the Matrix Model — a comprehensive 16-week program specifically designed for stimulant addiction. Medical supervision is important due to suicide risk during the severe depressive phase." },
    ],
    whatToExpect: ["Supervised crash management with rest and nutrition", "Depression monitoring and suicide risk assessment", "Sleep support and circadian rhythm restoration", "Nutritional rehabilitation", "Behavioral therapy (Matrix Model, CBT)", "Long-term cognitive rehabilitation"],
    benefits: ["Safety monitoring during depressive phase", "Nutritional and sleep restoration", "Prevention of relapse during vulnerable period", "Cognitive recovery support", "Evidence-based behavioral interventions", "Extended support for dopamine system healing"],
    faqs: [
      { question: "How long does meth withdrawal last?", answer: "The acute crash lasts 1-3 days. Severe withdrawal symptoms persist for 1-2 weeks. However, anhedonia (inability to feel pleasure), cognitive impairment, and cravings can continue for months as the brain's dopamine system slowly recovers. Full neurological recovery from heavy meth use may take 12-18 months." },
      { question: "Is meth withdrawal dangerous?", answer: "While not typically life-threatening like alcohol withdrawal, meth withdrawal carries significant risk due to severe depression and suicidal ideation. The extreme psychological distress and intense cravings also drive high relapse rates, which can lead to overdose if tolerance has decreased during abstinence." },
      { question: "Are there medications for meth withdrawal?", answer: "No FDA-approved medications exist specifically for meth addiction, though research is ongoing. Supportive medications include: antidepressants (bupropion shows promise), modafinil for fatigue, sleep aids, and naltrexone. Behavioral therapies remain the primary evidence-based treatment." },
    ],
  },
  {
    slug: "signs-of-alcohol-addiction",
    title: "Signs of Alcohol Addiction",
    metaTitle: "Signs of Alcohol Addiction: How to Recognize Alcoholism",
    metaDescription: "Learn the warning signs of alcohol addiction. Physical, behavioral, and psychological indicators that drinking has become a problem. When to seek help.",
    heroSubtitle: "Recognizing the physical, behavioral, and psychological warning signs that alcohol use has become alcohol addiction.",
    filterKeys: ["alcohol addiction", "alcoholism", "signs of addiction", "alcohol abuse"],
    conditionName: "Alcohol Addiction",
    introContent: "Alcohol addiction (alcohol use disorder) develops gradually, making it difficult to recognize until significant consequences emerge. Understanding the warning signs helps individuals and families identify problematic drinking before it causes irreversible damage. The American Psychiatric Association defines alcohol use disorder on a spectrum from mild to severe based on how many of 11 diagnostic criteria are met.",
    sections: [
      { heading: "Physical Warning Signs", content: "Physical indicators include: needing more alcohol to achieve the same effect (tolerance), experiencing withdrawal symptoms when not drinking (tremors, sweating, nausea, anxiety), drinking in the morning to 'steady nerves,' frequent blackouts or memory gaps, unexplained injuries, deteriorating physical appearance, chronic fatigue, liver problems (jaundice, abdominal swelling), frequent illness due to weakened immune system, and significant weight changes." },
      { heading: "Behavioral and Psychological Signs", content: "Behavioral changes include: drinking alone or in secret, hiding alcohol, becoming defensive about drinking, neglecting responsibilities, social isolation or changing friend groups, legal problems (DUI, public intoxication), financial difficulties related to alcohol purchases, failed attempts to cut down or stop, continued drinking despite relationship problems, loss of interest in hobbies or activities, and increased risk-taking behavior while intoxicated." },
    ],
    whatToExpect: ["Professional addiction assessment", "Medically supervised detox if needed", "Individual and group therapy", "Family education and involvement", "Relapse prevention planning", "Connection to ongoing support"],
    benefits: ["Early intervention improves outcomes dramatically", "Medical assessment identifies health complications", "Reduces risk of irreversible organ damage", "Restores relationships and career functioning", "Evidence-based treatment has high success rates", "Support resources are widely available and accessible"],
    faqs: [
      { question: "How much drinking is too much?", answer: "The NIAAA defines heavy drinking as: more than 4 drinks per day or 14 per week for men, and more than 3 drinks per day or 7 per week for women. However, the amount matters less than the impact — if drinking causes problems in any area of your life, it may be problematic regardless of quantity." },
      { question: "Can you be a 'functional' alcoholic?", answer: "Yes, many people maintain jobs and relationships while having an alcohol use disorder — they're called 'high-functioning alcoholics.' However, 'functional' is typically temporary. Health, relationships, and career performance eventually deteriorate. The appearance of functionality often delays treatment until more damage has occurred." },
      { question: "When should I seek help?", answer: "Seek help if you: can't control how much you drink, experience withdrawal symptoms, drink despite negative consequences, need alcohol to function normally, have tried and failed to cut down, or if loved ones express concern. There's no threshold of severity required — earlier intervention means better outcomes." },
    ],
  },
  {
    slug: "signs-of-drug-addiction",
    title: "Signs of Drug Addiction",
    metaTitle: "Signs of Drug Addiction: How to Recognize Substance Abuse",
    metaDescription: "Recognize the warning signs of drug addiction in yourself or a loved one. Physical, behavioral, and psychological indicators. When and how to get help.",
    heroSubtitle: "How to identify the warning signs of drug addiction — what to look for and when to take action.",
    filterKeys: ["drug addiction", "substance abuse", "signs of addiction", "drug abuse signs"],
    conditionName: "Drug Addiction",
    introContent: "Drug addiction (substance use disorder) manifests through recognizable patterns of physical, behavioral, and psychological changes. Whether the substance is prescription medication, illegal drugs, or even over-the-counter products, the signs of addiction follow predictable patterns. Recognizing these signs early can lead to intervention before the most devastating consequences of addiction take hold.",
    sections: [
      { heading: "Universal Warning Signs", content: "Across all substances, addiction typically involves: loss of control (using more than intended, failed quit attempts), continued use despite consequences (health, legal, relationship, financial), tolerance (needing more to achieve the same effect), withdrawal symptoms when stopping, preoccupation with obtaining and using the substance, abandoning previously enjoyed activities, secrecy and deception about use, and changes in social circles (spending time with other users)." },
      { heading: "Substance-Specific Signs", content: "Opioids: constricted pupils, drowsiness, nodding off, constipation, track marks. Stimulants: dilated pupils, rapid speech, decreased appetite, hyperactivity, paranoia. Benzodiazepines: slurred speech, unsteady gait, drowsiness, memory problems. Cannabis: red eyes, increased appetite, lethargy, paranoia. Each substance creates distinctive physical signs that can help identify the type of drug being used." },
    ],
    whatToExpect: ["Comprehensive substance use assessment", "Medical evaluation for health impacts", "Individualized treatment plan", "Detox if physically dependent", "Therapy addressing underlying causes", "Aftercare and relapse prevention planning"],
    benefits: ["Early recognition leads to better outcomes", "Medical assessment identifies health damage", "Treatment addresses root causes", "Family support improves recovery rates", "Evidence-based approaches are effective", "Recovery is possible at any stage of addiction"],
    faqs: [
      { question: "What's the difference between drug abuse and addiction?", answer: "Drug abuse refers to harmful use patterns — using despite negative consequences. Addiction (substance use disorder) involves physical dependence, compulsive use, and inability to stop despite wanting to. Abuse can exist without addiction, but ongoing abuse typically progresses to addiction as brain changes develop." },
      { question: "Can someone hide addiction effectively?", answer: "Initially, yes. Many people successfully conceal early-stage addiction. However, as the disease progresses, concealment becomes increasingly difficult. Signs that someone is hiding addiction include unexplained mood swings, financial discrepancies, social withdrawal, defensive reactions to questions about substance use, and physical changes." },
      { question: "How do I bring up addiction concerns with a loved one?", answer: "Choose a private, sober moment. Use 'I' statements ('I've noticed...', 'I'm worried about...'). Be specific about behaviors you've observed. Avoid labels ('addict,' 'alcoholic'). Express love and concern, not judgment. Have treatment resources ready. Consider consulting a professional interventionist for guidance." },
    ],
  },
  {
    slug: "signs-of-opioid-addiction",
    title: "Signs of Opioid Addiction",
    metaTitle: "Signs of Opioid Addiction: Recognizing Opioid Use Disorder",
    metaDescription: "Learn the warning signs of opioid addiction — from prescription painkillers to heroin and fentanyl. Physical, behavioral indicators and when to seek help.",
    heroSubtitle: "Recognizing opioid addiction in yourself or a loved one — from prescription painkiller misuse to full dependence.",
    filterKeys: ["opioid addiction", "painkiller addiction", "opioid signs", "prescription drug abuse"],
    conditionName: "Opioid Addiction",
    introContent: "Opioid addiction often begins innocently — with a legitimate prescription for pain management after surgery, injury, or chronic pain. The transition from use to misuse to addiction can be subtle. Understanding the specific signs of opioid addiction helps individuals and families recognize the problem early, when intervention is most effective and before overdose risk escalates.",
    sections: [
      { heading: "Physical Signs of Opioid Addiction", content: "Constricted (pinpoint) pupils, drowsiness or 'nodding off,' slurred speech, constipation, itching or scratching, weight loss, track marks or bruising (if injecting), frequent flu-like symptoms (early withdrawal), runny nose, excessive yawning, and neglected personal hygiene. In later stages: abscesses, dental problems ('meth mouth' from smoking), and collapsed veins (IV use)." },
      { heading: "Behavioral Red Flags", content: "Doctor shopping (visiting multiple physicians for prescriptions), running out of prescriptions early, requesting specific medications by name, 'losing' prescriptions frequently, visiting emergency rooms for pain complaints, social withdrawal, financial problems, secretive behavior, changes in sleep patterns, mood swings between euphoria and irritability, decreased motivation, and declining work/school performance. Transition from pills to heroin or fentanyl often occurs when prescriptions become difficult to obtain." },
    ],
    whatToExpect: ["Medical assessment and addiction evaluation", "Medically supervised detox with MAT", "Buprenorphine (Suboxone) or methadone for stabilization", "Behavioral therapy and counseling", "Relapse prevention and aftercare planning", "Long-term MAT maintenance option"],
    benefits: ["Early intervention prevents overdose death", "MAT reduces cravings and withdrawal", "Medical assessment identifies health complications", "Treatment addresses pain management alternatives", "High success rates with proper treatment duration", "Overdose reversal (Narcan) education"],
    faqs: [
      { question: "How quickly can opioid addiction develop?", answer: "Physical dependence can develop within 1-2 weeks of daily opioid use. The transition to addiction (compulsive use despite consequences) varies by individual but can occur within weeks to months. Factors include: genetic predisposition, dose, duration of use, route of administration, and history of mental health conditions." },
      { question: "Is prescription opioid addiction the same as heroin addiction?", answer: "Clinically, yes — both are opioid use disorders affecting the same brain receptors. Many people transition from prescription opioids to heroin or fentanyl due to cost and availability. The treatment approach (MAT + behavioral therapy) is the same regardless of the specific opioid." },
      { question: "What should I do if I suspect opioid addiction?", answer: "Express concern without judgment, educate yourself about addiction as a disease, contact a treatment professional or call SAMHSA's helpline (1-800-662-4357), ensure naloxone (Narcan) is available in case of overdose, and consider consulting an interventionist if the person denies the problem." },
    ],
  },
  {
    slug: "signs-of-meth-addiction",
    title: "Signs of Meth Addiction",
    metaTitle: "Signs of Meth Addiction: Recognizing Methamphetamine Abuse",
    metaDescription: "Learn the warning signs of methamphetamine addiction. Physical deterioration, behavioral changes, and psychological symptoms. How to get help.",
    heroSubtitle: "Recognizing methamphetamine addiction — the physical, behavioral, and psychological signs that signal a crisis.",
    filterKeys: ["meth addiction", "methamphetamine", "crystal meth", "stimulant addiction signs"],
    conditionName: "Methamphetamine Addiction",
    introContent: "Methamphetamine addiction produces some of the most recognizable physical signs of any substance use disorder. The combination of powerful stimulant effects, sleep deprivation, malnutrition, and neurotoxicity creates rapid and dramatic physical deterioration. Recognizing these signs early is critical — meth addiction is one of the hardest substances to recover from due to the extent of brain damage, but recovery is possible with proper treatment.",
    sections: [
      { heading: "Physical Signs", content: "Dramatic weight loss, severe dental problems ('meth mouth' — rotting teeth), skin sores and picking marks, dilated pupils, rapid eye movement, premature aging (wrinkles, gaunt appearance), excessive sweating, body odor, tremors and twitching, burns on fingers or lips (from smoking), and hyperactivity followed by crash periods. Long-term users may develop facial changes that make them appear decades older." },
      { heading: "Behavioral and Psychological Signs", content: "Extended periods without sleep (days), manic or frenzied activity, paranoia and suspicion, repetitive behaviors (disassembling electronics, cleaning obsessively), auditory and visual hallucinations, aggressive or violent behavior, extreme mood swings, social isolation, financial deterioration, risky sexual behavior, hoarding behaviors, and 'tweaking' — a state of extreme agitation and paranoia that occurs after days of use without sleep." },
    ],
    whatToExpect: ["Medical stabilization and crash management", "Nutritional rehabilitation", "Psychiatric evaluation for psychosis and depression", "Behavioral therapy (Matrix Model, CBT)", "Cognitive remediation for brain healing", "Long-term aftercare and support"],
    benefits: ["Medical monitoring during dangerous crash phase", "Addresses severe nutritional deficits", "Psychiatric care for psychosis and depression", "Cognitive function recovery with time and support", "Evidence-based behavioral interventions", "Brain healing is possible with sustained abstinence"],
    faqs: [
      { question: "Can the brain recover from meth addiction?", answer: "Yes, research shows significant brain recovery is possible with sustained abstinence. Dopamine system recovery begins within weeks and continues for 12-18 months. Cognitive function, decision-making, and emotional regulation improve over time. Some brain changes may be permanent in heavy long-term users, but meaningful recovery occurs for most people who maintain sobriety." },
      { question: "How is meth addiction different from other addictions?", answer: "Meth produces one of the largest dopamine surges of any drug (up to 1,250 units vs. 150 for food), creating extremely powerful reinforcement. The combination of severe dopamine depletion, neurotoxicity, and lack of FDA-approved medications makes meth addiction particularly challenging. However, behavioral therapies — especially the Matrix Model — show strong effectiveness." },
      { question: "What is 'tweaking' and is it dangerous?", answer: "'Tweaking' refers to the end of a meth binge when the user can no longer achieve a high but hasn't slept for days. It produces extreme irritability, paranoia, hallucinations, and unpredictable behavior. Tweaking is the most dangerous period for both the user and those around them due to psychosis, violence risk, and medical instability. If someone is tweaking, maintain distance and call for professional help." },
    ],
  },
];
