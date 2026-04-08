// ============================================================
// Substance-Specific Landing Page Configurations
// ============================================================

export interface SubstanceConfig {
  slug: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  heroSubtitle: string;
  conditionName: string;
  filterKeys: string[];
  relatedTreatmentSlug: string;
  introContent: string;
  sections: { heading: string; content: string }[];
  whatToExpect: string[];
  benefits: string[];
  faqs: { question: string; answer: string }[];
}

import { expandedSubstancePages } from "./seoSubstanceConfigExpanded";

const coreSubstancePages: SubstanceConfig[] = [
  {
    slug: "cocaine-addiction-treatment",
    title: "Cocaine Addiction Treatment",
    metaTitle: "Cocaine Addiction Treatment Programs — Find Help Today",
    metaDescription: "Find accredited cocaine addiction treatment programs. Evidence-based therapies, behavioral counseling, and comprehensive recovery support. Get help now.",
    heroSubtitle: "Evidence-based cocaine addiction treatment programs combining behavioral therapy, counseling, and long-term recovery support.",
    conditionName: "Cocaine Addiction",
    filterKeys: ["cocaine", "stimulant", "drug"],
    relatedTreatmentSlug: "drug-rehab",
    introContent: "Cocaine addiction is a serious substance use disorder affecting approximately 1.4 million Americans. Cocaine — whether in powder or crack form — produces intense, short-lived euphoria that drives compulsive use patterns. Professional treatment for cocaine addiction combines cognitive-behavioral therapy (CBT), contingency management, motivational interviewing, and community reinforcement approaches to help individuals break the cycle of addiction. Unlike opioid addiction, there are currently no FDA-approved medications specifically for cocaine use disorder, making behavioral therapies the cornerstone of effective treatment. RehabLookup connects you with accredited facilities specializing in stimulant addiction, offering both inpatient and outpatient programs tailored to individual recovery needs.",
    sections: [
      { heading: "Signs & Symptoms of Cocaine Addiction", content: "Cocaine addiction manifests through behavioral, physical, and psychological symptoms. Behavioral signs include increased energy followed by crashes, financial difficulties, neglecting responsibilities, secretive behavior, and social withdrawal. Physical symptoms include dilated pupils, nosebleeds (from snorting), weight loss, insomnia, increased heart rate, and tremors. Psychological indicators include euphoria followed by depression, paranoia, irritability, anxiety, and intense cravings. Chronic use can lead to cardiovascular problems, nasal septum damage, cognitive impairment, and psychosis. Recognizing these signs early is critical for timely intervention." },
      { heading: "Evidence-Based Treatment Approaches", content: "The most effective cocaine addiction treatments are behavioral therapies. Cognitive-Behavioral Therapy (CBT) helps patients recognize and avoid triggers while developing healthy coping strategies. Contingency Management uses tangible rewards for maintaining sobriety, showing strong evidence for cocaine addiction specifically. The Matrix Model combines CBT, family education, individual counseling, 12-step support, and drug testing in a structured 16-week outpatient format. Community Reinforcement Approach (CRA) restructures patients' environments to make sober living more rewarding than substance use. Many programs also incorporate trauma-informed care, as trauma frequently underlies stimulant addiction." },
      { heading: "Recovery Timeline & Aftercare", content: "Cocaine withdrawal typically begins within hours of the last use, peaking at 3-5 days with symptoms including fatigue, depression, increased appetite, vivid dreams, and intense cravings. While not life-threatening, the psychological withdrawal can be severe. Initial stabilization takes 1-2 weeks, followed by active treatment (typically 30-90 days for inpatient). The brain's dopamine system requires 6-12 months to normalize, making sustained aftercare essential. Long-term recovery support includes ongoing therapy, support groups (CA, NA, SMART Recovery), sober living environments, and relapse prevention planning." },
      { heading: "Insurance & Cost Considerations", content: "Most major insurance plans cover cocaine addiction treatment under the Mental Health Parity Act. Coverage typically includes assessment, detoxification monitoring, inpatient or outpatient treatment, therapy sessions, and aftercare planning. Self-pay options range from $5,000-$30,000+ for 30-day programs depending on setting and amenities. Many facilities offer sliding-scale fees, payment plans, and scholarship programs. State-funded programs provide free or low-cost treatment for qualifying individuals." },
    ],
    whatToExpect: [
      "Comprehensive substance use and psychiatric assessment",
      "Medical monitoring during initial withdrawal phase",
      "Individual cognitive-behavioral therapy sessions",
      "Group counseling and peer support",
      "Family education and therapy programs",
      "Relapse prevention and aftercare planning",
    ],
    benefits: [
      "Specialized treatment for stimulant addiction",
      "Evidence-based behavioral therapies (CBT, CM)",
      "Treatment of co-occurring depression and anxiety",
      "Structured environment supporting early recovery",
      "Development of healthy coping mechanisms",
      "Long-term aftercare and alumni support",
    ],
    faqs: [
      { question: "Is there medication for cocaine addiction?", answer: "Currently, there are no FDA-approved medications specifically for cocaine addiction. However, researchers are studying several promising candidates including disulfiram, topiramate, and vaccines. Treatment primarily relies on behavioral therapies like CBT and contingency management, which have strong evidence of effectiveness. Medications may be prescribed to treat co-occurring conditions like depression or anxiety." },
      { question: "How long does cocaine addiction treatment take?", answer: "Treatment duration varies based on addiction severity. Inpatient programs typically last 30-90 days, with 60-90 day programs showing better outcomes for stimulant addiction. Outpatient programs (IOP/PHP) may continue for 3-6 months. Given that cocaine significantly alters brain chemistry, ongoing aftercare for 12+ months is strongly recommended for sustained recovery." },
      { question: "What is the success rate for cocaine addiction treatment?", answer: "Treatment significantly improves outcomes compared to attempting recovery alone. Studies show that completing a structured treatment program reduces cocaine use by 50-70% at one-year follow-up. Success rates improve substantially with longer treatment duration, strong aftercare engagement, and addressing co-occurring mental health conditions." },
      { question: "Can I detox from cocaine at home?", answer: "While cocaine withdrawal is generally not medically dangerous (unlike alcohol or benzodiazepines), professional supervision is still recommended. The intense psychological symptoms — severe depression, anxiety, and cravings — can lead to relapse or self-harm. Medical settings provide supportive care, monitoring, and immediate transition to therapeutic treatment." },
      { question: "Does insurance cover cocaine addiction treatment?", answer: "Yes, most major insurance plans cover cocaine addiction treatment under the Mental Health Parity and Addiction Equity Act. Coverage includes assessment, therapy, inpatient and outpatient programs, and aftercare planning. Contact your insurance provider or use our insurance verification tool to check your specific benefits." },
    ],
  },
  {
    slug: "opioid-addiction-treatment",
    title: "Opioid Addiction Treatment",
    metaTitle: "Opioid Addiction Treatment Programs — MAT & Recovery",
    metaDescription: "Find specialized opioid addiction treatment with MAT (Suboxone, methadone, Vivitrol). Evidence-based programs for prescription opioids and heroin. Get help today.",
    heroSubtitle: "Specialized opioid addiction treatment featuring medication-assisted treatment (MAT), behavioral therapy, and comprehensive recovery support.",
    conditionName: "Opioid Addiction",
    filterKeys: ["opioid", "opiate", "MAT", "suboxone", "methadone", "drug"],
    relatedTreatmentSlug: "drug-rehab",
    introContent: "The opioid epidemic remains one of America's most devastating public health crises, with over 2 million people diagnosed with opioid use disorder and over 80,000 opioid-related overdose deaths annually. Opioid addiction affects users of prescription painkillers (oxycodone, hydrocodone, morphine), heroin, and synthetic opioids like fentanyl. Modern opioid addiction treatment combines Medication-Assisted Treatment (MAT) — the gold standard approach — with behavioral therapies and psychosocial support. MAT uses FDA-approved medications like buprenorphine (Suboxone), methadone, and naltrexone (Vivitrol) to reduce cravings and withdrawal symptoms, allowing patients to focus on behavioral recovery. RehabLookup connects you with accredited programs offering comprehensive, evidence-based opioid treatment.",
    sections: [
      { heading: "Understanding Opioid Dependence", content: "Opioids bind to receptors in the brain, producing pain relief and euphoria while simultaneously building physical dependence. Over time, the brain adapts to opioid presence, requiring higher doses (tolerance) and producing severe withdrawal symptoms upon cessation. This neurological adaptation makes opioid addiction uniquely challenging — physical dependence develops rapidly, often within weeks of regular use. Prescription opioid misuse frequently progresses to heroin or illicit fentanyl use due to lower cost and higher availability. Understanding this biological mechanism is crucial: opioid addiction is a chronic brain disease requiring medical treatment, not a moral failing." },
      { heading: "Medication-Assisted Treatment (MAT)", content: "MAT is the evidence-based gold standard for opioid addiction, combining FDA-approved medications with counseling. Buprenorphine (Suboxone/Subutex) partially activates opioid receptors, reducing cravings and withdrawal without producing euphoria. Methadone, a full opioid agonist, is administered through certified clinics and is highly effective for severe addiction. Naltrexone (Vivitrol) blocks opioid receptors entirely, preventing any opioid effects. Research consistently shows MAT reduces opioid use by 50-80%, decreases overdose deaths by 50%, reduces criminal activity, and improves treatment retention. MAT is not 'replacing one drug with another' — it's evidence-based medicine." },
      { heading: "Behavioral Therapies & Support", content: "While MAT addresses the physical aspects, behavioral therapies treat the psychological and social dimensions. Cognitive-Behavioral Therapy (CBT) identifies and changes thought patterns driving substance use. Dialectical Behavior Therapy (DBT) develops emotional regulation skills. Motivational Enhancement Therapy builds intrinsic motivation for change. Group therapy and peer support groups (NA, SMART Recovery) provide community connection. Family therapy addresses relationship dynamics that may enable or result from addiction. Comprehensive treatment integrates all these approaches with MAT for optimal outcomes." },
      { heading: "Fentanyl & Synthetic Opioid Considerations", content: "Fentanyl and its analogs present unique treatment challenges due to extreme potency (50-100x stronger than morphine). Patients using fentanyl may require higher initial MAT doses, extended stabilization periods, and specialized medical monitoring during withdrawal. The prevalence of fentanyl in the drug supply has made treatment more urgent than ever — any delay in seeking help increases overdose risk. Many treatment programs now stock naloxone (Narcan) and provide overdose prevention training to patients and families as standard practice." },
    ],
    whatToExpect: [
      "Comprehensive medical and psychiatric evaluation",
      "Medically supervised opioid detoxification",
      "Medication-Assisted Treatment (MAT) initiation",
      "Individual and group behavioral therapy",
      "Overdose prevention and naloxone training",
      "Long-term MAT management and aftercare coordination",
    ],
    benefits: [
      "FDA-approved medications reducing cravings 50-80%",
      "Medically safe withdrawal management",
      "Reduced overdose risk during treatment",
      "Treatment of co-occurring pain and mental health",
      "Improved treatment retention rates",
      "Comprehensive relapse prevention planning",
    ],
    faqs: [
      { question: "What is the best medication for opioid addiction?", answer: "There is no single 'best' medication — the choice depends on individual factors. Buprenorphine (Suboxone) is the most commonly prescribed, offering convenience and low abuse potential. Methadone is most effective for severe, long-standing addiction but requires daily clinic visits. Naltrexone (Vivitrol) is ideal for highly motivated patients who have completed detox. Your treatment team will recommend the best option based on your specific situation." },
      { question: "How long should I stay on MAT?", answer: "Evidence supports long-term MAT for most patients. The minimum recommended duration is 12 months, though many patients benefit from years of maintenance. Tapering off MAT prematurely is associated with high relapse rates. The decision to reduce or discontinue should be made collaboratively with your provider based on stability, support systems, and readiness." },
      { question: "Is opioid detox dangerous?", answer: "While opioid withdrawal is intensely uncomfortable, it is rarely life-threatening in otherwise healthy individuals. However, complications can occur, especially with severe dehydration or in patients with underlying health conditions. Medical detox provides comfort medications, hydration support, and monitoring. The greatest danger is post-detox relapse — tolerance drops rapidly after detox, making previously used doses potentially fatal." },
      { question: "Can I work while in opioid treatment?", answer: "Yes, many opioid treatment programs are designed to accommodate employment. Outpatient MAT programs allow regular work schedules with brief clinic visits. IOP programs offer evening and weekend options. Even during inpatient treatment, the FMLA provides job protection. Stable MAT treatment actually improves employment outcomes significantly." },
      { question: "Does insurance cover opioid addiction treatment and MAT?", answer: "Yes, all major insurance plans are required to cover opioid addiction treatment including MAT medications under federal parity law. Medicaid covers MAT in all states. Medicare Part D covers buprenorphine and naltrexone. Many state programs provide MAT at no cost for uninsured individuals." },
    ],
  },
  {
    slug: "heroin-addiction-treatment",
    title: "Heroin Addiction Treatment",
    metaTitle: "Heroin Addiction Treatment Centers — Detox & Recovery",
    metaDescription: "Find heroin addiction treatment centers offering medical detox, MAT, and comprehensive recovery programs. Accredited facilities. Insurance accepted. Get help now.",
    heroSubtitle: "Accredited heroin addiction treatment programs with medical detox, medication-assisted treatment, and evidence-based behavioral therapy.",
    conditionName: "Heroin Addiction",
    filterKeys: ["heroin", "opioid", "opiate", "drug", "detox"],
    relatedTreatmentSlug: "drug-rehab",
    introContent: "Heroin addiction is one of the most challenging substance use disorders, characterized by rapid physical dependence, severe withdrawal symptoms, and high relapse risk. Approximately 1 million Americans use heroin annually, with the majority having first misused prescription opioids. Modern heroin addiction treatment has evolved significantly, combining medical detoxification with Medication-Assisted Treatment (MAT) and intensive behavioral therapy. This integrated approach reduces mortality risk, improves treatment retention, and supports long-term recovery. RehabLookup helps you find accredited heroin treatment programs that provide compassionate, evidence-based care tailored to your individual needs.",
    sections: [
      { heading: "Heroin Withdrawal & Medical Detox", content: "Heroin withdrawal begins 6-12 hours after the last dose, peaking at 1-3 days and lasting 5-10 days for acute symptoms. Symptoms include severe muscle aches, insomnia, diarrhea, vomiting, cold flashes, intense cravings, and anxiety. While rarely fatal, heroin withdrawal is extremely uncomfortable and is the primary reason for relapse during early recovery. Medical detox provides medication-assisted withdrawal management using buprenorphine or methadone taper protocols, along with comfort medications for specific symptoms. This medically supervised approach significantly reduces suffering and prevents dangerous complications." },
      { heading: "Comprehensive Treatment Approaches", content: "Effective heroin treatment addresses biological, psychological, and social factors. Medication-Assisted Treatment (MAT) with buprenorphine, methadone, or naltrexone forms the foundation, reducing cravings and blocking heroin effects. Cognitive-Behavioral Therapy (CBT) helps identify triggers and develop coping strategies. Trauma therapy (EMDR, CPT) addresses the high rates of trauma in heroin users. Motivational interviewing builds commitment to change. Residential treatment provides 24/7 structured support during the critical early recovery period. Aftercare includes ongoing MAT, counseling, support groups, and sober living arrangements." },
      { heading: "Fentanyl-Contaminated Heroin Risks", content: "The majority of street heroin now contains fentanyl or fentanyl analogs, dramatically increasing overdose risk. This contamination has made heroin use more lethal than ever, with many overdoses occurring in experienced users exposed to unexpected fentanyl potency. Treatment centers now routinely test for fentanyl exposure and may need to adjust detox protocols accordingly. Naloxone (Narcan) training and distribution is a standard component of modern heroin treatment, equipping patients and families with the tools to reverse overdoses." },
      { heading: "Long-Term Recovery & Relapse Prevention", content: "Heroin addiction has a chronic relapsing nature, making long-term aftercare essential. Research shows that patients who remain in treatment for at least 12 months have significantly better outcomes. Long-term MAT maintenance is recommended for most patients, as premature medication discontinuation is the strongest predictor of relapse. Sober living homes, alumni programs, peer recovery support, and ongoing counseling create layers of support that reinforce sobriety. Relapse should be viewed as a treatment adjustment opportunity, not a failure." },
    ],
    whatToExpect: [
      "Rapid medical evaluation and stabilization",
      "Medication-assisted detox (buprenorphine or methadone)",
      "Transition to long-term MAT maintenance",
      "Intensive individual and group therapy",
      "Naloxone training for overdose prevention",
      "Comprehensive discharge and aftercare planning",
    ],
    benefits: [
      "Medically safe withdrawal management",
      "Immediate reduction in overdose risk",
      "FDA-approved medications for cravings",
      "Treatment of co-occurring trauma and mental health",
      "Structured environment during critical early recovery",
      "Long-term recovery support and alumni programs",
    ],
    faqs: [
      { question: "How long is heroin addiction treatment?", answer: "Heroin detox takes 5-10 days. Inpatient rehabilitation typically lasts 30-90 days, with 60-90 days recommended for heroin addiction. Outpatient MAT and counseling continue for 12+ months. Many addiction specialists recommend indefinite MAT maintenance, as the chronic nature of heroin addiction benefits from ongoing medical management." },
      { question: "Is MAT just replacing one addiction with another?", answer: "No. MAT medications like buprenorphine and methadone are prescribed at stable, therapeutic doses that normalize brain chemistry without producing the dangerous highs and lows of heroin use. They allow patients to function normally — working, maintaining relationships, and building a stable life. This is analogous to taking insulin for diabetes or antidepressants for depression." },
      { question: "What if I've relapsed after previous treatment?", answer: "Relapse is common and does not indicate treatment failure. Each treatment episode builds recovery capital and provides learning opportunities. Many people require multiple treatment attempts before achieving sustained sobriety. The key is to re-enter treatment quickly after relapse to minimize harm and build on previous progress." },
      { question: "Can I get same-day admission for heroin treatment?", answer: "Many treatment centers offer same-day or next-day admission for heroin addiction due to the urgency and overdose risks involved. Emergency rooms can provide immediate stabilization and referrals. Contact facilities directly or use our concierge service for rapid placement assistance." },
      { question: "Does Medicaid cover heroin addiction treatment?", answer: "Yes, Medicaid covers heroin addiction treatment in all states, including medical detox, MAT medications, inpatient and outpatient programs, and counseling. Many states have expanded Medicaid specifically to address the opioid/heroin crisis, providing comprehensive coverage with minimal out-of-pocket costs." },
    ],
  },
  {
    slug: "meth-addiction-treatment",
    title: "Meth Addiction Treatment",
    metaTitle: "Meth Addiction Treatment Programs — Crystal Meth Recovery",
    metaDescription: "Find meth addiction treatment centers offering evidence-based recovery programs. Behavioral therapy, medical support, and comprehensive aftercare. Get help today.",
    heroSubtitle: "Specialized methamphetamine addiction treatment programs with behavioral therapy, medical support, and structured recovery environments.",
    conditionName: "Methamphetamine Addiction",
    filterKeys: ["meth", "methamphetamine", "stimulant", "drug"],
    relatedTreatmentSlug: "drug-rehab",
    introContent: "Methamphetamine addiction is a devastating substance use disorder that has surged across the United States, with meth-related overdose deaths quadrupling since 2015. Crystal meth is one of the most addictive substances known, producing intense dopamine floods that are 3-4 times greater than cocaine. This extreme neurological impact makes meth addiction particularly challenging to treat, requiring specialized approaches and extended treatment durations. Effective meth addiction treatment relies primarily on behavioral therapies — including the Matrix Model, contingency management, and cognitive-behavioral therapy — delivered in structured settings. RehabLookup helps you find accredited treatment programs with expertise in stimulant addiction and the unique challenges of meth recovery.",
    sections: [
      { heading: "Signs & Effects of Meth Addiction", content: "Methamphetamine use produces dramatic physical and psychological effects. Physical signs include severe dental decay ('meth mouth'), skin sores from compulsive picking, dramatic weight loss, premature aging, and cardiovascular damage. Behavioral indicators include extended wakefulness (sometimes days), hyperactivity followed by severe crashes, paranoia, aggression, erratic behavior, and social isolation. Chronic meth use causes significant brain damage, particularly to dopamine pathways and areas governing emotion, memory, and decision-making. The good news: research shows the brain can substantially heal with sustained abstinence, though recovery takes 12-18 months." },
      { heading: "Treatment Approaches for Meth Addiction", content: "Unlike opioid addiction, there are currently no FDA-approved medications for meth addiction, making behavioral interventions critical. The Matrix Model — a comprehensive 16-week outpatient program combining CBT, family education, individual counseling, 12-step participation, and drug testing — is specifically designed for stimulant addiction. Contingency Management provides tangible incentives for negative drug tests and treatment compliance. Cognitive-Behavioral Therapy helps identify triggers and develop alternative coping strategies. Motivational Interviewing builds internal motivation for sustained change. Many programs incorporate exercise and nutrition therapy, as physical health recovery supports neurological healing." },
      { heading: "Meth Withdrawal & Early Recovery", content: "Meth withdrawal is primarily psychological rather than physical, but profoundly debilitating. The 'crash' phase (24-72 hours) involves extreme fatigue, increased sleep, and depression. Acute withdrawal (1-2 weeks) brings intense cravings, anxiety, irritability, cognitive impairment, and anhedonia (inability to feel pleasure). Post-acute withdrawal symptoms can persist for months, including persistent cravings, mood instability, and cognitive difficulties. This extended withdrawal pattern — particularly the prolonged anhedonia — makes meth addiction one of the hardest to overcome without professional support and underscores the importance of extended treatment." },
      { heading: "Long-Term Recovery Considerations", content: "Meth addiction recovery requires patience and extended support. The brain's dopamine system takes 12-18 months to substantially heal, meaning patients may experience reduced pleasure and motivation for an extended period. This biological reality necessitates long treatment engagement. Sober living environments provide crucial structure during this vulnerable period. Regular exercise has shown particular benefit for meth recovery by naturally boosting dopamine production. Ongoing therapy, support groups (Crystal Meth Anonymous, SMART Recovery), and strong social support networks are essential components of sustained recovery." },
    ],
    whatToExpect: [
      "Comprehensive physical and psychiatric assessment",
      "Medical monitoring during withdrawal phase",
      "Intensive behavioral therapy (Matrix Model, CBT)",
      "Nutritional rehabilitation and exercise programs",
      "Co-occurring mental health treatment",
      "Extended aftercare and relapse prevention planning",
    ],
    benefits: [
      "Specialized expertise in stimulant addiction",
      "Evidence-based behavioral interventions",
      "Physical health restoration and nutrition support",
      "Treatment of meth-induced psychiatric symptoms",
      "Structured environment during extended recovery",
      "Brain healing support through sustained sobriety",
    ],
    faqs: [
      { question: "Is there medication for meth addiction?", answer: "Currently, no FDA-approved medication exists specifically for meth addiction. However, several medications are being studied, including mirtazapine, naltrexone, and bupropion combinations. Treatment primarily uses behavioral therapies like the Matrix Model and contingency management. Medications may be prescribed for co-occurring conditions such as depression, anxiety, or psychosis that frequently accompany meth use." },
      { question: "How long does meth addiction treatment take?", answer: "Effective meth treatment typically requires longer durations than other substances. Inpatient programs of 60-90 days are recommended as minimum. Extended care programs of 6-12 months show the best outcomes, allowing time for significant brain healing. Outpatient aftercare should continue for at least 12 months following residential treatment." },
      { question: "Can the brain heal from meth damage?", answer: "Yes, research using brain imaging shows substantial recovery of dopamine system function after 12-18 months of sustained abstinence. Cognitive function, emotional regulation, and decision-making abilities all improve significantly with time. While some effects may persist, the brain demonstrates remarkable plasticity and healing capacity in recovery." },
      { question: "What causes meth psychosis and how is it treated?", answer: "Meth-induced psychosis — including paranoia, hallucinations, and delusions — can occur during active use and sometimes persists into early recovery. It results from excessive dopamine stimulation and neurotoxicity. Treatment involves antipsychotic medications, a safe and structured environment, and time for the brain to stabilize. Most meth-induced psychosis resolves within days to weeks of abstinence, though a small percentage of heavy users experience longer-lasting symptoms." },
      { question: "Does insurance cover meth addiction treatment?", answer: "Yes, methamphetamine addiction treatment is covered by most insurance plans under federal parity law. Coverage includes assessment, detox monitoring, inpatient and outpatient treatment, behavioral therapy, and aftercare planning. Medicaid and state-funded programs also provide coverage for meth treatment in all states." },
    ],
  },
  {
    slug: "prescription-drug-rehab",
    title: "Prescription Drug Rehab",
    metaTitle: "Prescription Drug Rehab — Painkiller & Benzo Addiction Treatment",
    metaDescription: "Find prescription drug addiction treatment for painkillers, benzodiazepines, and stimulants. Medical detox, MAT, and evidence-based programs. Get help today.",
    heroSubtitle: "Specialized treatment programs for prescription painkiller, benzodiazepine, and stimulant addiction with medical detox and comprehensive recovery support.",
    conditionName: "Prescription Drug Addiction",
    filterKeys: ["prescription", "opioid", "benzodiazepine", "painkiller", "drug"],
    relatedTreatmentSlug: "drug-rehab",
    introContent: "Prescription drug addiction affects millions of Americans who initially received medications for legitimate medical conditions. The three most commonly misused prescription drug categories — opioid painkillers (oxycodone, hydrocodone), benzodiazepines (Xanax, Valium, Klonopin), and stimulants (Adderall, Ritalin) — each require distinct treatment approaches due to their unique pharmacological effects and withdrawal profiles. Professional prescription drug rehab addresses both the physical dependence and the underlying conditions that led to misuse, offering medically supervised detox, appropriate medication management, behavioral therapy, and alternative pain or symptom management strategies. RehabLookup connects you with facilities experienced in treating prescription drug dependencies with evidence-based, compassionate care.",
    sections: [
      { heading: "Types of Prescription Drug Addiction", content: "Prescription drug addiction falls into three primary categories, each with distinct treatment needs. Opioid painkillers (OxyContin, Vicodin, Percocet) produce physical dependence and require MAT-supported treatment similar to heroin addiction. Benzodiazepines (Xanax, Valium, Ativan) create dangerous physical dependence requiring slow, medically supervised tapering — abrupt cessation can cause seizures and be fatal. Stimulants (Adderall, Ritalin, Concerta) produce psychological dependence and require behavioral therapy-focused treatment. Understanding which category applies is essential for selecting the right treatment program." },
      { heading: "Medical Detox & Tapering Protocols", content: "Prescription drug detox varies significantly by drug class. Opioid painkiller detox follows established MAT protocols using buprenorphine or methadone to manage withdrawal safely. Benzodiazepine detox requires extremely careful medical management with gradual dose reduction over weeks to months — this is one of the few withdrawal syndromes that can be life-threatening. Stimulant detox is primarily supportive, managing the psychological 'crash' with monitoring and comfort care. All prescription drug detox should occur under medical supervision, with the prescribing physician consulted when possible to coordinate tapering strategies." },
      { heading: "Addressing Underlying Conditions", content: "A unique challenge of prescription drug addiction is that the original medical condition often persists. Treatment must address both the addiction and the underlying pain, anxiety, ADHD, or other condition that prompted the prescription. This dual approach may include alternative pain management (physical therapy, non-opioid medications, mindfulness-based pain reduction), non-addictive anxiety treatment (SSRIs, buspirone, CBT for anxiety), and appropriate ADHD management. Ignoring the original condition virtually guarantees relapse, making integrated treatment essential." },
      { heading: "Prevention of Re-Prescription & Aftercare", content: "Long-term recovery from prescription drug addiction requires ongoing vigilance. Patients should inform all healthcare providers about their addiction history, request non-addictive alternatives when possible, and develop a medication safety plan. Aftercare may include ongoing therapy, support groups specifically for prescription drug addiction, regular medical check-ups, and establishment of a pain management or mental health treatment plan that avoids addictive medications. Family education helps loved ones support recovery while understanding the complexities of legitimate medical needs." },
    ],
    whatToExpect: [
      "Comprehensive assessment including medication history review",
      "Individualized medical detox or tapering protocol",
      "MAT for opioid painkiller dependence when appropriate",
      "Alternative treatment planning for underlying conditions",
      "Individual and group behavioral therapy",
      "Medication safety planning and provider communication",
    ],
    benefits: [
      "Drug-class-specific detox and treatment protocols",
      "Safe benzodiazepine tapering under medical supervision",
      "Treatment of underlying pain, anxiety, or ADHD",
      "Non-addictive alternative medication strategies",
      "Education on medication safety and risk awareness",
      "Coordinated aftercare with primary care providers",
    ],
    faqs: [
      { question: "Can I stop prescription drugs cold turkey?", answer: "Never stop prescription medications abruptly without medical guidance, especially benzodiazepines and opioids. Benzodiazepine withdrawal can cause seizures and be fatal. Opioid withdrawal, while not typically life-threatening, is extremely uncomfortable and drives relapse. Medical supervision ensures safe tapering with appropriate symptom management." },
      { question: "How do I tell my doctor I'm addicted to my prescription?", answer: "Being honest with your healthcare provider is a critical first step. Most physicians respond supportively and can help coordinate treatment, adjust medications, or provide referrals. You are protected by medical confidentiality and anti-discrimination laws. If uncomfortable speaking with your prescribing doctor, contact an addiction specialist directly or call our concierge for confidential guidance." },
      { question: "Will I need to manage my original condition differently after treatment?", answer: "Yes, part of prescription drug rehab involves developing a new treatment plan for your underlying condition using non-addictive approaches. This might include physical therapy for pain, SSRIs for anxiety, non-stimulant ADHD medications, or behavioral therapy techniques. Your treatment team will coordinate with your primary care provider to ensure continuity of care." },
      { question: "How long does prescription drug rehab take?", answer: "Duration depends on the drug type and severity. Benzodiazepine tapering alone can take 2-6 months. Opioid treatment follows standard protocols (30-90 days inpatient + ongoing MAT). Stimulant treatment typically involves 30-60 days of intensive therapy. Most patients benefit from 6-12 months of ongoing outpatient support regardless of drug type." },
      { question: "Does insurance cover prescription drug addiction treatment?", answer: "Yes, all major insurance plans cover prescription drug addiction treatment under federal parity law. This includes medical detox, medication tapering, MAT, inpatient and outpatient programs, and therapy. Since the original prescriptions were medically authorized, insurance companies generally provide comprehensive coverage for addiction treatment." },
    ],
  },
  {
    slug: "benzodiazepine-addiction-treatment",
    title: "Benzodiazepine Addiction Treatment",
    metaTitle: "Benzodiazepine Addiction Treatment — Xanax, Valium Recovery",
    metaDescription: "Find specialized benzodiazepine addiction treatment centers. Safe medical detox, tapering protocols, and comprehensive recovery programs. Get help today.",
    heroSubtitle: "Specialized benzodiazepine addiction treatment with medically supervised tapering, safe detox protocols, and comprehensive anxiety management.",
    conditionName: "Benzodiazepine Addiction",
    filterKeys: ["benzodiazepine", "benzo", "xanax", "valium", "drug", "detox"],
    relatedTreatmentSlug: "detox-centers",
    introContent: "Benzodiazepine addiction is one of the most medically serious forms of drug dependence, requiring careful, specialized treatment. Medications like Xanax (alprazolam), Valium (diazepam), Klonopin (clonazepam), and Ativan (lorazepam) are commonly prescribed for anxiety, insomnia, and seizure disorders, but can produce severe physical dependence even at prescribed doses. Benzodiazepine withdrawal is one of the only withdrawal syndromes that can be fatal, making medically supervised treatment absolutely essential. Proper benzo treatment involves gradual dose tapering — often over weeks to months — combined with alternative anxiety management strategies and behavioral therapy. RehabLookup connects you with facilities experienced in the specialized protocols required for safe benzodiazepine recovery.",
    sections: [
      { heading: "Why Benzo Withdrawal Is Dangerous", content: "Benzodiazepines enhance GABA activity in the brain, producing sedation and anxiety relief. With chronic use, the brain adapts by reducing its own GABA production and sensitivity. Abrupt cessation removes the artificial GABA support while the brain's natural system remains suppressed, potentially causing seizures, psychosis, and in rare cases, death. This makes benzodiazepine withdrawal one of only three substance withdrawals (along with alcohol and barbiturates) that can be life-threatening. Even with medical management, withdrawal can produce severe anxiety, insomnia, perceptual disturbances, muscle tension, and cognitive difficulties lasting weeks to months." },
      { heading: "Medical Tapering Protocols", content: "The cornerstone of benzodiazepine treatment is gradual dose reduction (tapering) under medical supervision. Common protocols involve converting the patient to a longer-acting benzodiazepine (typically diazepam/Valium) for more stable blood levels, then reducing the dose by 5-10% every 1-2 weeks. The total taper duration ranges from 4 weeks to 6+ months depending on the dose, duration of use, and individual tolerance. Faster tapers increase withdrawal severity and seizure risk. Some patients benefit from adjunctive medications including anticonvulsants (gabapentin, carbamazepine), certain antidepressants, and clonidine to manage specific withdrawal symptoms." },
      { heading: "Managing Underlying Anxiety", content: "Since benzodiazepines are typically prescribed for anxiety disorders, effective treatment must address the underlying anxiety condition using non-addictive approaches. Evidence-based alternatives include SSRIs/SNRIs for generalized anxiety, CBT for anxiety (proven equally effective to benzodiazepines long-term), mindfulness-based stress reduction, buspirone for generalized anxiety, hydroxyzine for acute anxiety episodes, and lifestyle modifications including exercise, sleep hygiene, and stress management techniques. Developing these alternative coping strategies before and during the taper is essential for preventing relapse." },
      { heading: "Post-Acute Withdrawal Syndrome (PAWS)", content: "Many benzodiazepine patients experience protracted withdrawal symptoms lasting months to over a year after cessation. PAWS can include intermittent anxiety, insomnia, cognitive difficulties, sensory sensitivity, mood fluctuations, and intermittent cravings. These symptoms gradually diminish but can be discouraging. Understanding that PAWS is a normal part of recovery helps patients persist through this challenging period. Ongoing therapy, support groups (BenzoBuddies, SMART Recovery), gentle exercise, and patience are key components of navigating post-acute withdrawal." },
    ],
    whatToExpect: [
      "Comprehensive medical evaluation and tapering plan development",
      "Gradual, medically supervised dose reduction",
      "24/7 medical monitoring during critical taper phases",
      "Alternative anxiety treatment initiation (SSRIs, CBT)",
      "Individual therapy for anxiety management skills",
      "Extended aftercare for post-acute withdrawal support",
    ],
    benefits: [
      "Medically safe tapering preventing seizures",
      "Expertise in benzodiazepine-specific protocols",
      "Non-addictive anxiety treatment alternatives",
      "Management of protracted withdrawal symptoms",
      "Psychiatric evaluation and medication adjustment",
      "Long-term anxiety management skills development",
    ],
    faqs: [
      { question: "How long does benzodiazepine detox take?", answer: "Benzodiazepine tapering is not a rapid detox — it's a gradual medical process. Typical timelines range from 4-8 weeks for short-term users to 3-6+ months for long-term or high-dose users. Rushing the taper increases seizure risk and withdrawal severity. Your medical team will create an individualized tapering schedule based on your specific situation." },
      { question: "Can I die from benzodiazepine withdrawal?", answer: "Yes, in rare cases. Abrupt cessation of benzodiazepines, especially after prolonged high-dose use, can cause grand mal seizures, status epilepticus, and potentially fatal complications. This is why medical supervision is absolutely essential. Gradual tapering under medical care virtually eliminates these life-threatening risks." },
      { question: "Should I stop taking benzos cold turkey?", answer: "Never stop benzodiazepines abruptly. Even if you believe your dose is low, sudden cessation can trigger dangerous withdrawal reactions. Always work with a medical professional to create a gradual tapering plan. If you're in crisis, go to an emergency room where medical staff can stabilize you safely." },
      { question: "What are alternatives to benzos for anxiety?", answer: "Effective non-addictive alternatives include SSRI/SNRI medications (escitalopram, venlafaxine), buspirone, hydroxyzine, CBT for anxiety (proven as effective as benzos long-term), mindfulness-based therapies, regular exercise, and lifestyle modifications. Many patients find that these alternatives provide equal or better long-term anxiety management without dependence risk." },
      { question: "Does insurance cover benzodiazepine addiction treatment?", answer: "Yes, benzodiazepine addiction treatment is covered by all major insurance plans under the Mental Health Parity Act. Given the medical necessity of supervised detoxification, insurance companies generally authorize comprehensive treatment including inpatient medical taper, outpatient follow-up, psychiatric care, and therapy." },
    ],
  },
];

export const substancePages: SubstanceConfig[] = [
  ...coreSubstancePages,
  ...expandedSubstancePages,
];