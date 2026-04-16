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
import { TrustBar } from "@/components/seo/TrustBar";
import { ConversionSection } from "@/components/seo/ConversionSection";
import { Button } from "@/components/ui/button";
import { ArrowRight, MapPin } from "lucide-react";
import {
  InternalLinkingSection,
  treatmentTypeLinks,
  insuranceLinks,
  resourceLinks,
} from "@/components/seo/InternalLinkingSection";

export interface GenericNearMeConfig {
  slug: string;
  label: string;
  serviceType: string;
  treatmentType: string;
  searchFilter?: string;
  keywords: string[];
  faqs: { question: string; answer: string }[];
  introContent: string;
}

/**
 * All near-me slugs that previously had no national landing page.
 * Each config provides unique, intent-specific content and FAQs.
 */
export const genericNearMeConfigs: GenericNearMeConfig[] = [
  {
    slug: "emergency-rehab-near-me",
    label: "Emergency Rehab",
    serviceType: "Emergency Addiction Treatment Centers",
    treatmentType: "Emergency Addiction Treatment",
    searchFilter: "Detox",
    keywords: ["emergency rehab near me", "urgent rehab admission", "crisis addiction treatment", "emergency detox"],
    introContent: "When addiction becomes a medical emergency, every minute counts. Emergency rehab centers offer immediate assessment, medical stabilization, and rapid admission for individuals in crisis — including overdose recovery, severe withdrawal, and acute psychiatric emergencies.",
    faqs: [
      { question: "What qualifies as an addiction emergency?", answer: "An addiction emergency includes active overdose, severe withdrawal symptoms (seizures, delirium tremens, psychosis), suicidal ideation related to substance use, or medical complications from substance abuse. If someone is in immediate danger, call 911 first, then seek emergency rehab admission." },
      { question: "How fast can I get into emergency rehab?", answer: "Many emergency rehab programs offer same-day or next-day admission. Crisis stabilization units can typically begin assessment within hours. Call the facility directly — most have 24/7 admissions lines specifically for emergency situations." },
      { question: "Does insurance cover emergency rehab?", answer: "Yes, emergency addiction treatment is covered under most insurance plans, including Medicaid and Medicare. The Mental Health Parity Act requires insurers to cover emergency substance abuse treatment at the same level as other medical emergencies." },
      { question: "What happens during emergency rehab intake?", answer: "Emergency intake includes immediate medical assessment, vital signs monitoring, toxicology screening, psychiatric evaluation, and medical stabilization. Once stable, the treatment team develops a comprehensive care plan including detox protocol and ongoing treatment recommendations." },
    ],
  },
  {
    slug: "same-day-rehab-near-me",
    label: "Same-Day Rehab",
    serviceType: "Same-Day Admission Treatment Centers",
    treatmentType: "Same-Day Admission Treatment",
    keywords: ["same day rehab near me", "same day admission rehab", "walk in rehab", "immediate rehab admission"],
    introContent: "Same-day rehab programs eliminate waiting periods that can derail recovery motivation. These facilities maintain open beds and streamlined intake processes to admit individuals the same day they reach out for help — because readiness to change shouldn't be delayed.",
    faqs: [
      { question: "Can I really get into rehab the same day?", answer: "Yes, many treatment centers maintain dedicated beds for same-day admissions. The process typically involves a phone screening, insurance verification (often completed in under an hour), and arrival at the facility. Some centers even arrange transportation." },
      { question: "What should I bring for same-day admission?", answer: "Bring your insurance card, government-issued ID, a list of current medications, comfortable clothing for 3-5 days, and any prescribed medications in original bottles. Leave valuables, electronics (facility-dependent), and any substances behind." },
      { question: "Is same-day rehab as effective as planned admission?", answer: "Research shows that reducing time between decision and admission significantly improves treatment completion rates. Same-day programs provide the same quality of care — the only difference is the speed of entry. Motivation captured in the moment leads to better outcomes." },
      { question: "Does same-day admission cost more?", answer: "No, same-day admission does not cost more than scheduled admission. The treatment services and insurance billing are identical. Some facilities may charge an expedited processing fee, but this is uncommon and should be clarified upfront." },
    ],
  },
  {
    slug: "24-7-detox-near-me",
    label: "24/7 Detox",
    serviceType: "24/7 Medical Detox Centers",
    treatmentType: "24/7 Detox Programs",
    searchFilter: "Detox",
    keywords: ["24/7 detox near me", "24 hour detox center", "round the clock detox", "overnight detox"],
    introContent: "24/7 detox centers provide continuous medical monitoring during the critical withdrawal phase. With round-the-clock nursing staff and physician oversight, these programs ensure safe, comfortable detoxification from alcohol, opioids, benzodiazepines, and other substances at any hour.",
    faqs: [
      { question: "Why is 24/7 medical monitoring important during detox?", answer: "Withdrawal from certain substances — particularly alcohol, benzodiazepines, and barbiturates — can cause life-threatening complications including seizures, delirium tremens, and cardiac events. 24/7 monitoring ensures immediate medical intervention if complications arise, making detox significantly safer." },
      { question: "How long does medically supervised detox take?", answer: "Detox duration varies by substance: alcohol (3-7 days), opioids (5-10 days), benzodiazepines (2-8 weeks with taper), stimulants (3-5 days acute). The 24/7 monitoring continues throughout this period with medications adjusted as needed." },
      { question: "Can I start detox at night or on weekends?", answer: "Yes, that's the purpose of 24/7 detox centers — they accept admissions at any time, including nights, weekends, and holidays. Addiction crises don't follow business hours, and neither should access to detox services." },
      { question: "What medications are used during 24/7 detox?", answer: "Common detox medications include benzodiazepines for alcohol withdrawal, buprenorphine or methadone for opioid withdrawal, clonidine for autonomic symptoms, anti-nausea medications, and sleep aids. The specific protocol is individualized based on the substance, severity, and patient history." },
    ],
  },
  {
    slug: "immediate-rehab-near-me",
    label: "Immediate Rehab",
    serviceType: "Immediate Admission Rehab Centers",
    treatmentType: "Immediate Admission Treatment",
    keywords: ["immediate rehab near me", "immediate admission rehab", "urgent rehab", "no wait rehab"],
    introContent: "Immediate admission rehab centers understand that the window of willingness to seek treatment can close quickly. These programs prioritize rapid intake — often within hours — with streamlined insurance verification and dedicated admission coordinators standing by.",
    faqs: [
      { question: "How is immediate rehab different from same-day rehab?", answer: "Immediate rehab and same-day rehab are similar in urgency but differ in scope. Immediate rehab emphasizes the fastest possible path from first contact to treatment — sometimes within 2-4 hours. Some programs include transport services and pre-arrival insurance clearance to eliminate all barriers." },
      { question: "What if I don't have insurance for immediate rehab?", answer: "Many immediate admission programs accept self-pay, offer sliding scale fees, or connect you with state-funded treatment options. Some facilities have charity care programs. Don't let insurance concerns prevent you from calling — admissions staff can help navigate options quickly." },
      { question: "Can immediate rehab accommodate co-occurring disorders?", answer: "Yes, most immediate admission programs conduct comprehensive assessments that identify co-occurring mental health conditions. Dual diagnosis treatment begins alongside addiction treatment from day one, with integrated care teams addressing both conditions simultaneously." },
    ],
  },
  {
    slug: "low-cost-rehab-near-me",
    label: "Low-Cost Rehab",
    serviceType: "Low-Cost Treatment Centers",
    treatmentType: "Low-Cost Treatment Programs",
    keywords: ["low cost rehab near me", "cheap rehab", "budget rehab", "affordable addiction treatment"],
    introContent: "Low-cost rehab programs make evidence-based addiction treatment accessible regardless of financial situation. These facilities offer reduced fees, sliding scale payment, state funding, and grant-supported programs — providing quality care without the luxury price tag.",
    faqs: [
      { question: "How much does low-cost rehab typically cost?", answer: "Low-cost rehab programs range from completely free (state-funded) to $2,000-$8,000 for a 30-day program — compared to $20,000-$50,000+ for standard private programs. Costs vary by location, program type, and amenities. Many offer payment plans to further reduce the financial burden." },
      { question: "Is low-cost rehab less effective than expensive rehab?", answer: "No. Research consistently shows that treatment outcomes depend on evidence-based practices, therapeutic alliance, and treatment duration — not facility price. Low-cost programs provide the same core services: medical detox, therapy (CBT, DBT, group), case management, and aftercare planning." },
      { question: "What options exist for rehab with no money?", answer: "Options include: state-funded treatment programs (every state operates them), SAMHSA-funded facilities, Salvation Army Adult Rehabilitation Centers (free), faith-based programs, university-affiliated training clinics, and Medicaid-covered treatment. Call SAMHSA's helpline at 1-800-662-4357 for local options." },
      { question: "Do low-cost rehabs accept insurance?", answer: "Yes, most low-cost rehab centers accept Medicaid, Medicare, and many private insurance plans. Insurance often covers the full cost of treatment at these facilities, effectively making it free to the patient." },
    ],
  },
  {
    slug: "medicare-rehab-near-me",
    label: "Medicare Rehab",
    serviceType: "Medicare-Accepted Treatment Centers",
    treatmentType: "Medicare-Covered Treatment",
    keywords: ["medicare rehab near me", "medicare addiction treatment", "medicare drug rehab", "rehab that accepts medicare"],
    introContent: "Medicare covers substance abuse treatment including inpatient rehab, outpatient programs, MAT medications, and counseling. Find verified treatment centers in your area that accept Medicare Part A (inpatient) and Part B (outpatient) benefits.",
    faqs: [
      { question: "What addiction treatment does Medicare cover?", answer: "Medicare Part A covers inpatient substance abuse treatment at hospitals and some residential facilities. Part B covers outpatient counseling, group therapy, MAT medications (Suboxone, Vivitrol), psychiatric services, and annual alcohol screening. Part D covers prescription medications used in treatment." },
      { question: "Does Medicare cover inpatient rehab?", answer: "Yes, Medicare Part A covers inpatient substance abuse treatment at Medicare-certified facilities. Coverage includes room, meals, nursing care, medications, and therapy during the stay. A benefit period starts when admitted and ends 60 days after discharge." },
      { question: "What does Medicare rehab cost out-of-pocket?", answer: "With Medicare Part A, you pay a deductible ($1,632 in 2024) for the first 60 days. Part B outpatient services require a 20% coinsurance after the annual deductible ($240). Medicare Supplement (Medigap) plans can reduce or eliminate these costs." },
      { question: "Can I get MAT with Medicare?", answer: "Yes, Medicare covers FDA-approved MAT medications including buprenorphine (Suboxone), naltrexone (Vivitrol), and methadone at certified opioid treatment programs. Part B covers prescriber visits and Part D covers the medications themselves." },
    ],
  },
  {
    slug: "blue-cross-rehab-near-me",
    label: "Blue Cross Rehab",
    serviceType: "Blue Cross Blue Shield Treatment Centers",
    treatmentType: "Blue Cross Blue Shield Treatment",
    keywords: ["blue cross rehab near me", "bcbs addiction treatment", "blue cross blue shield rehab", "bcbs drug rehab"],
    introContent: "Blue Cross Blue Shield (BCBS) covers addiction treatment including detox, inpatient rehab, outpatient programs, and medication-assisted treatment. As the largest health insurer in the U.S., BCBS provides extensive network access to rehab centers nationwide.",
    faqs: [
      { question: "What rehab services does Blue Cross Blue Shield cover?", answer: "BCBS typically covers medical detox, inpatient/residential treatment, PHP (partial hospitalization), IOP (intensive outpatient), individual and group therapy, MAT medications, and aftercare planning. Specific coverage depends on your plan tier and whether facilities are in-network." },
      { question: "How do I verify my BCBS rehab benefits?", answer: "Call the number on your BCBS card and ask for substance abuse benefit verification. You'll need your member ID, group number, and the facility's tax ID. Most rehab centers also have admissions staff who will verify your benefits for free as part of the intake process." },
      { question: "Does BCBS cover 30-day inpatient rehab?", answer: "Most BCBS plans cover 28-30 day inpatient rehab when deemed medically necessary. Coverage is subject to prior authorization and medical necessity reviews. In-network facilities typically result in lower out-of-pocket costs than out-of-network providers." },
      { question: "What is my out-of-pocket cost for rehab with BCBS?", answer: "Costs vary by plan but typically include your annual deductible ($500-$3,000), copays per visit ($20-$50 outpatient), and coinsurance (10-30% of costs). Annual out-of-pocket maximums ($3,000-$8,000) cap your total spending. In-network treatment is significantly less expensive." },
    ],
  },
  {
    slug: "aetna-rehab-near-me",
    label: "Aetna Rehab",
    serviceType: "Aetna-Covered Treatment Centers",
    treatmentType: "Aetna-Covered Treatment",
    keywords: ["aetna rehab near me", "aetna addiction treatment", "aetna drug rehab", "rehab that accepts aetna"],
    introContent: "Aetna provides comprehensive coverage for addiction treatment under its behavioral health benefits. Find in-network rehab centers that accept your Aetna plan for detox, inpatient, outpatient, and medication-assisted treatment.",
    faqs: [
      { question: "What does Aetna cover for addiction treatment?", answer: "Aetna covers medically necessary substance abuse treatment including detoxification, inpatient/residential care, partial hospitalization (PHP), intensive outpatient (IOP), outpatient therapy, medication-assisted treatment, and crisis services. Coverage specifics depend on your plan." },
      { question: "Does Aetna require pre-authorization for rehab?", answer: "Yes, most Aetna plans require prior authorization for inpatient and residential treatment. Your treatment facility typically handles this process. Aetna uses clinical criteria to determine medical necessity and approved length of stay, with ongoing reviews during treatment." },
      { question: "How many days of rehab does Aetna cover?", answer: "Aetna doesn't set a fixed day limit — coverage is based on medical necessity. Initial authorizations are typically for 7-14 days, with concurrent reviews to extend as clinically needed. Length of stay decisions are made by Aetna's clinical team based on treatment progress." },
      { question: "Can I go to out-of-network rehab with Aetna?", answer: "Yes, but out-of-network facilities result in higher out-of-pocket costs. Your coinsurance rate will be higher (typically 40-50% vs 10-20% in-network) and you may face balance billing. Some Aetna plans offer single-case agreements for out-of-network treatment." },
    ],
  },
  {
    slug: "cigna-rehab-near-me",
    label: "Cigna Rehab",
    serviceType: "Cigna-Covered Treatment Centers",
    treatmentType: "Cigna-Covered Treatment",
    keywords: ["cigna rehab near me", "cigna addiction treatment", "cigna drug rehab", "rehab that accepts cigna"],
    introContent: "Cigna's behavioral health network includes thousands of addiction treatment providers nationwide. Find Cigna-accepted rehab centers offering detox, residential treatment, outpatient programs, and medication-assisted treatment covered by your plan.",
    faqs: [
      { question: "What substance abuse treatment does Cigna cover?", answer: "Cigna covers a full continuum of addiction treatment: medical detox, residential/inpatient care, partial hospitalization, intensive outpatient, standard outpatient therapy, MAT, and telehealth addiction counseling. Coverage is subject to medical necessity criteria and plan-specific benefits." },
      { question: "How do I find in-network Cigna rehab centers?", answer: "Search Cigna's provider directory at myCigna.com, call the behavioral health number on your card, or ask rehab facilities directly if they're in Cigna's network. Many treatment centers list accepted insurance on their websites and will verify your specific benefits for free." },
      { question: "Does Cigna cover long-term rehab?", answer: "Cigna covers treatment as long as it's deemed medically necessary through concurrent utilization reviews. There's no predetermined maximum, but extensions require ongoing clinical justification. Long-term residential programs (60-90 days) can be approved when clinically indicated." },
      { question: "What is my deductible for rehab with Cigna?", answer: "Deductibles vary by plan — typically $500-$5,000 for individual coverage. Many Cigna plans have separate behavioral health deductibles that may be lower. After meeting your deductible, coinsurance (typically 10-30% in-network) applies until you reach your out-of-pocket maximum." },
    ],
  },
  {
    slug: "united-healthcare-rehab-near-me",
    label: "United Healthcare Rehab",
    serviceType: "United Healthcare Treatment Centers",
    treatmentType: "United Healthcare Treatment",
    keywords: ["united healthcare rehab near me", "uhc addiction treatment", "unitedhealthcare drug rehab", "optum behavioral health rehab"],
    introContent: "UnitedHealthcare and Optum Behavioral Health provide extensive coverage for addiction treatment. As the largest health insurer by enrollment, UHC offers broad network access to rehab facilities across all levels of care.",
    faqs: [
      { question: "What addiction treatment does UnitedHealthcare cover?", answer: "UHC covers all levels of substance abuse treatment: emergency stabilization, medical detox, inpatient/residential, partial hospitalization, intensive outpatient, standard outpatient, medication-assisted treatment, and telehealth counseling. Benefits are managed through Optum Behavioral Health." },
      { question: "Does UHC require pre-authorization for rehab?", answer: "Yes, inpatient and residential treatment require prior authorization through Optum. The treatment center contacts Optum with clinical documentation to obtain approval. Emergency admissions can be authorized retroactively within 48 hours." },
      { question: "How do I verify UHC rehab benefits?", answer: "Call the Optum Behavioral Health number on the back of your UHC card. Have your member ID and the facility's information ready. You can also check benefits online through myuhc.com or ask the rehab facility to verify for you during intake." },
      { question: "Does UHC cover Suboxone and MAT?", answer: "Yes, UHC covers FDA-approved MAT medications including buprenorphine (Suboxone), naltrexone (Vivitrol), and methadone through certified programs. Prescription drug coverage is through the pharmacy benefit, while prescriber visits are under medical/behavioral health benefits." },
    ],
  },
  {
    slug: "tricare-rehab-near-me",
    label: "TRICARE Rehab",
    serviceType: "TRICARE-Covered Treatment Centers",
    treatmentType: "TRICARE-Covered Treatment",
    keywords: ["tricare rehab near me", "tricare addiction treatment", "military rehab", "tricare drug rehab"],
    introContent: "TRICARE provides comprehensive addiction treatment coverage for active duty service members, veterans, and military families. Find TRICARE-authorized rehab centers offering specialized programs that understand military culture and service-related trauma.",
    faqs: [
      { question: "What addiction treatment does TRICARE cover?", answer: "TRICARE covers medically necessary substance abuse treatment including medical detox, inpatient/residential rehabilitation, partial hospitalization, intensive outpatient programs, individual and group therapy, MAT medications, and aftercare planning. Active duty members have no cost-sharing; others may have copays." },
      { question: "Does TRICARE cover inpatient rehab for dependents?", answer: "Yes, TRICARE covers inpatient substance abuse treatment for eligible dependents (spouses and children). Prior authorization is required. TRICARE Select and TRICARE Prime both cover residential treatment, though network requirements and cost-sharing differ between plans." },
      { question: "Can I use TRICARE at any rehab center?", answer: "TRICARE coverage depends on your plan type. TRICARE Prime requires referrals and network facilities. TRICARE Select allows out-of-network care at higher cost. The facility must be TRICARE-authorized and certified by a recognized accrediting body." },
      { question: "Does TRICARE cover rehab for PTSD and addiction?", answer: "Yes, TRICARE provides excellent coverage for co-occurring PTSD and substance abuse treatment — a common need among service members. Integrated dual diagnosis programs that address both conditions simultaneously are fully covered when medically necessary." },
    ],
  },
  {
    slug: "humana-rehab-near-me",
    label: "Humana Rehab",
    serviceType: "Humana-Covered Treatment Centers",
    treatmentType: "Humana-Covered Treatment",
    keywords: ["humana rehab near me", "humana addiction treatment", "humana drug rehab", "rehab that accepts humana"],
    introContent: "Humana covers substance abuse treatment through its behavioral health benefits, including detox, inpatient rehab, outpatient programs, and medication-assisted treatment. Find Humana-accepted treatment centers in your area.",
    faqs: [
      { question: "What does Humana cover for addiction treatment?", answer: "Humana covers medical detox, inpatient/residential treatment, partial hospitalization, intensive outpatient programs, outpatient therapy, MAT medications, and crisis services. Coverage is subject to medical necessity review and plan-specific benefit limits." },
      { question: "Does Humana require pre-authorization for rehab?", answer: "Yes, most Humana plans require prior authorization for inpatient and residential substance abuse treatment. Outpatient services may not require pre-authorization depending on your specific plan. The treatment facility typically handles the authorization process." },
      { question: "How do I find Humana in-network rehab?", answer: "Search Humana's online provider directory, call the behavioral health number on your card, or contact treatment centers directly to ask if they accept Humana. Many facilities list Humana among their accepted insurers." },
      { question: "Does Humana cover MAT for opioid addiction?", answer: "Yes, Humana covers medication-assisted treatment including buprenorphine, naltrexone, and methadone maintenance therapy. Coverage includes prescriber visits, medication costs, and associated counseling services." },
    ],
  },
  {
    slug: "30-day-rehab-near-me",
    label: "30-Day Rehab",
    serviceType: "30-Day Treatment Programs",
    treatmentType: "30-Day Rehab Programs",
    keywords: ["30 day rehab near me", "30 day treatment program", "one month rehab", "28 day rehab"],
    introContent: "30-day rehab programs provide intensive, structured treatment over approximately four weeks — the most common initial treatment duration. This timeframe allows for medical detox, therapeutic engagement, skills development, and initial aftercare planning.",
    faqs: [
      { question: "Is 30 days enough for rehab?", answer: "For many individuals, 30 days provides a strong foundation for recovery — completing detox, building coping skills, and establishing aftercare plans. However, research shows longer treatment (60-90 days) produces better outcomes for moderate to severe addiction. Your treatment team will recommend an appropriate duration." },
      { question: "What happens during a 30-day rehab program?", answer: "Week 1: Medical detox and stabilization. Weeks 2-3: Intensive therapy (CBT, DBT, group, family), addiction education, relapse prevention skills. Week 4: Aftercare planning, step-down recommendations, alumni program enrollment, and community resource connections." },
      { question: "How much does 30-day rehab cost?", answer: "Costs range from $5,000-$10,000 for state-funded programs, $15,000-$30,000 for standard private programs, and $30,000-$80,000+ for luxury facilities. Insurance typically covers a significant portion, often reducing out-of-pocket costs to $1,000-$5,000 with in-network providers." },
      { question: "Does insurance cover 30-day rehab?", answer: "Most insurance plans cover 28-30 day inpatient treatment when deemed medically necessary. Coverage requires prior authorization and may involve concurrent reviews during the stay. In-network facilities generally result in lower patient costs." },
    ],
  },
  {
    slug: "60-day-rehab-near-me",
    label: "60-Day Rehab",
    serviceType: "60-Day Treatment Programs",
    treatmentType: "60-Day Rehab Programs",
    keywords: ["60 day rehab near me", "60 day treatment program", "two month rehab", "extended rehab"],
    introContent: "60-day rehab programs offer extended treatment for individuals who need more time to build a solid recovery foundation. The additional month allows deeper therapeutic work, stronger behavioral change, and better preparation for sustained sobriety.",
    faqs: [
      { question: "Who benefits from 60-day rehab?", answer: "60-day programs benefit individuals with moderate to severe addiction, co-occurring mental health disorders, previous treatment attempts, weak home support systems, or complex medical needs. Research shows the extended timeframe significantly improves long-term recovery outcomes compared to 30-day programs." },
      { question: "What additional treatment happens in days 31-60?", answer: "After the foundational first month, days 31-60 focus on deeper trauma processing, advanced relapse prevention, vocational/educational planning, family therapy intensification, sober living transition planning, and community resource integration. This phase solidifies behavioral changes." },
      { question: "How much does 60-day rehab cost?", answer: "60-day programs typically cost $20,000-$50,000 for standard private facilities and $50,000-$120,000+ for luxury programs. Insurance coverage for the second month requires ongoing medical necessity documentation. Many programs offer financial assistance or payment plans." },
      { question: "Does insurance cover 60 days of rehab?", answer: "Insurance can cover 60 days if ongoing medical necessity is demonstrated through concurrent utilization reviews. Approval is not automatic — your treatment team must document continued need based on clinical progress, co-occurring conditions, and discharge readiness criteria." },
    ],
  },
  {
    slug: "90-day-rehab-near-me",
    label: "90-Day Rehab",
    serviceType: "90-Day Treatment Programs",
    treatmentType: "90-Day Rehab Programs",
    keywords: ["90 day rehab near me", "90 day treatment program", "three month rehab", "long term rehab program"],
    introContent: "90-day rehab programs align with NIDA research recommending a minimum of 90 days for effective treatment of severe addiction. This extended duration allows for complete detox, deep therapeutic work, behavioral repatterning, and robust aftercare preparation.",
    faqs: [
      { question: "Why do experts recommend 90 days of treatment?", answer: "The National Institute on Drug Abuse (NIDA) identifies 90 days as the minimum effective treatment duration for significant addiction. This timeframe allows brain chemistry to begin normalizing, new neural pathways to form, behavioral patterns to change, and relapse prevention skills to become habitual." },
      { question: "What does a 90-day rehab program include?", answer: "Month 1: Detox, stabilization, and foundational therapy. Month 2: Intensive trauma processing, advanced CBT/DBT, family therapy, and life skills. Month 3: Step-down to less restrictive care, vocational planning, sober living transition, alumni program integration, and comprehensive aftercare coordination." },
      { question: "How much does 90-day rehab cost?", answer: "90-day programs range from $30,000-$60,000 at standard facilities to $80,000-$200,000+ at luxury centers. State-funded programs may offer 90-day treatment at significantly reduced cost. Insurance, payment plans, and scholarships can substantially offset expenses." },
      { question: "Is 90-day rehab worth the investment?", answer: "Research strongly supports the value: 90-day treatment produces 2-3x better outcomes than shorter programs for severe addiction, with lower relapse rates, higher employment rates, and reduced criminal justice involvement. The long-term cost savings from sustained recovery far exceed the treatment investment." },
    ],
  },
  {
    slug: "short-term-rehab-near-me",
    label: "Short-Term Rehab",
    serviceType: "Short-Term Treatment Programs",
    treatmentType: "Short-Term Rehab Programs",
    keywords: ["short term rehab near me", "short term addiction treatment", "brief rehab program", "2 week rehab"],
    introContent: "Short-term rehab programs (7-21 days) provide focused, intensive treatment for individuals who cannot commit to longer stays. These programs prioritize rapid stabilization, crisis intervention, and strong aftercare connections to support ongoing recovery.",
    faqs: [
      { question: "How long is short-term rehab?", answer: "Short-term rehab typically lasts 7-21 days, with 14-day programs being most common. This timeframe covers medical detox and initial stabilization, crisis counseling, treatment planning, and aftercare coordination. It's most effective when followed by intensive outpatient care." },
      { question: "Is short-term rehab effective?", answer: "Short-term rehab is most effective for mild addiction, first-time treatment seekers, and individuals with strong external support. For moderate to severe addiction, it should be viewed as a starting point — ideally stepping down to IOP or PHP to extend the therapeutic benefit." },
      { question: "Who is short-term rehab best for?", answer: "Short-term rehab works well for individuals with mild substance use disorders, professionals who can't take extended leave, parents with childcare constraints, people with strong family support, and those using it as crisis stabilization before transitioning to outpatient care." },
      { question: "What happens after short-term rehab?", answer: "Aftercare is critical for short-term rehab success. Most programs connect patients with intensive outpatient programs (IOP), individual therapists, 12-step or SMART Recovery meetings, sober living homes, and alumni support groups. The transition plan should be in place before discharge." },
    ],
  },
  {
    slug: "lgbtq-rehab-near-me",
    label: "LGBTQ+ Rehab",
    serviceType: "LGBTQ+ Affirming Treatment Centers",
    treatmentType: "LGBTQ+ Affirming Treatment",
    keywords: ["lgbtq rehab near me", "lgbtq addiction treatment", "lgbtq friendly rehab", "queer affirming rehab"],
    introContent: "LGBTQ+ affirming rehab centers provide addiction treatment in an environment that understands and respects diverse sexual orientations and gender identities. These programs address unique stressors including minority stress, discrimination trauma, and internalized stigma that can drive substance use.",
    faqs: [
      { question: "Why do LGBTQ+ individuals need specialized rehab?", answer: "LGBTQ+ individuals face higher rates of substance use due to minority stress, discrimination, family rejection, and stigma. Specialized programs address these root causes while creating safe spaces where individuals don't have to hide their identity. Therapists are trained in LGBTQ+ cultural competency." },
      { question: "What makes rehab LGBTQ+ affirming?", answer: "Affirming programs use correct pronouns and names, have trained staff in LGBTQ+ issues, address identity-related trauma, provide gender-inclusive facilities, connect patients with LGBTQ+ recovery communities, and integrate identity affirmation into the treatment process." },
      { question: "Are there rehab programs specifically for transgender individuals?", answer: "Yes, some programs offer transgender-specific programming including hormone management during treatment, gender-affirming care coordination, support groups for trans individuals, and staff trained in transgender health needs. Gender-inclusive housing arrangements are standard." },
      { question: "Does insurance cover LGBTQ+ rehab?", answer: "Yes, insurance covers substance abuse treatment at LGBTQ+ affirming centers the same as any other rehab facility. The ACA prohibits discrimination based on sexual orientation or gender identity in healthcare coverage. Coverage depends on your specific plan benefits." },
    ],
  },
  {
    slug: "young-adult-rehab-near-me",
    label: "Young Adult Rehab",
    serviceType: "Young Adult Treatment Centers",
    treatmentType: "Young Adult Treatment (18-25)",
    keywords: ["young adult rehab near me", "young adult addiction treatment", "rehab for 18-25", "college age rehab"],
    introContent: "Young adult rehab programs (ages 18-25) address the unique developmental and social challenges of addiction in early adulthood. These programs integrate treatment with life skills development, educational support, and peer connection with others in the same age group.",
    faqs: [
      { question: "Why do young adults need age-specific rehab?", answer: "Young adults face unique challenges: still-developing brains (prefrontal cortex matures around 25), peer pressure dynamics, identity formation, educational/career disruption, and often less severe but rapidly escalating addiction patterns. Age-appropriate programs address these developmental factors." },
      { question: "What does young adult rehab include?", answer: "Programs include evidence-based addiction therapy, life skills training (budgeting, cooking, time management), educational support or GED assistance, career counseling, peer group therapy with age-matched peers, family therapy, adventure/experiential therapy, and young-adult-specific recovery community connection." },
      { question: "Can I continue school during rehab?", answer: "Many young adult programs offer educational support including online coursework, GED preparation, college application assistance, and academic planning. Some facilities have partnerships with local colleges. Your educational goals are integrated into the treatment and aftercare plan." },
      { question: "Does insurance cover young adult rehab?", answer: "Yes, individuals under 26 can remain on their parents' insurance under the ACA, which covers substance abuse treatment. Young adult-specific programs bill the same as standard rehab. Medicaid also covers treatment for eligible young adults." },
    ],
  },
  {
    slug: "seniors-rehab-near-me",
    label: "Senior Rehab",
    serviceType: "Senior Treatment Centers",
    treatmentType: "Senior Addiction Treatment (55+)",
    keywords: ["senior rehab near me", "elderly addiction treatment", "rehab for seniors", "older adult substance abuse treatment"],
    introContent: "Senior rehab programs specialize in treating addiction in adults 55 and older — a growing demographic. These programs account for age-related medical considerations, medication interactions, mobility needs, and the unique psychosocial factors that drive late-life substance use.",
    faqs: [
      { question: "Why is addiction in seniors different?", answer: "Seniors face unique addiction factors: increased medication sensitivity, higher rates of polypharmacy, prescription drug dependence from pain management, grief/loss-related drinking, retirement isolation, and often delayed diagnosis due to symptom overlap with aging. Treatment must account for these differences." },
      { question: "What substances are most commonly abused by seniors?", answer: "Alcohol is the most common substance of abuse in seniors, followed by prescription opioids, benzodiazepines (for anxiety/sleep), and prescription stimulants. Many seniors develop dependence inadvertently through prescribed medications, making treatment approaches different from younger populations." },
      { question: "Does Medicare cover senior rehab?", answer: "Yes, Medicare covers substance abuse treatment for seniors. Part A covers inpatient rehab, Part B covers outpatient services and therapy, and Part D covers prescribed medications. Many senior-focused rehab programs specialize in Medicare billing and acceptance." },
      { question: "Are senior rehab programs physically accommodating?", answer: "Yes, senior-specific programs provide ADA-accessible facilities, mobility assistance, modified activity schedules, medical monitoring for chronic conditions, medication management, and slower-paced therapeutic programming that accounts for cognitive and physical limitations." },
    ],
  },
  {
    slug: "first-responder-rehab-near-me",
    label: "First Responder Rehab",
    serviceType: "First Responder Treatment Centers",
    treatmentType: "First Responder Addiction Treatment",
    keywords: ["first responder rehab near me", "firefighter rehab", "paramedic addiction treatment", "law enforcement rehab"],
    introContent: "First responder rehab programs serve police officers, firefighters, EMTs, and paramedics with addiction treatment that understands occupational trauma, high-stress environments, and the culture of self-reliance that can prevent help-seeking. Confidential programs protect careers while saving lives.",
    faqs: [
      { question: "Why do first responders need specialized rehab?", answer: "First responders experience chronic trauma exposure, irregular schedules, physical demands, and a culture that stigmatizes vulnerability. Specialized programs address PTSD-addiction comorbidity, understand occupational stressors, provide peer support from fellow first responders, and maintain strict confidentiality to protect careers." },
      { question: "Will my department find out if I go to rehab?", answer: "Confidentiality protections are strong: HIPAA prevents disclosure, many programs operate independently of departments, and EAP referrals are confidential. Some states have enhanced protections for first responders seeking addiction treatment. Many programs specialize in discreet admission processes." },
      { question: "Does workers' comp or my union cover rehab?", answer: "Many first responder unions negotiate behavioral health benefits that include substance abuse treatment. Workers' compensation may cover treatment if addiction is related to occupational injury or PTSD. Department EAP programs often provide referrals and may cover or supplement costs." },
      { question: "What types of therapy work best for first responders?", answer: "Evidence-based approaches include EMDR for trauma processing, CPT (Cognitive Processing Therapy), peer support groups with fellow first responders, experiential therapies (equine, adventure), and integrated PTSD-addiction treatment. Group therapy with other first responders is particularly effective." },
    ],
  },
  {
    slug: "marijuana-rehab-near-me",
    label: "Marijuana Rehab",
    serviceType: "Marijuana Addiction Treatment Centers",
    treatmentType: "Marijuana Addiction Treatment",
    keywords: ["marijuana rehab near me", "cannabis addiction treatment", "weed rehab", "marijuana dependence treatment"],
    introContent: "Marijuana rehab programs treat cannabis use disorder — a recognized condition affecting approximately 10% of regular users. As marijuana potency has increased dramatically, so have dependency rates and the need for professional treatment.",
    faqs: [
      { question: "Is marijuana addiction real?", answer: "Yes, cannabis use disorder is a recognized diagnosis in the DSM-5. Approximately 9-10% of people who use marijuana become dependent, rising to 17% for those who start in adolescence. Modern high-potency cannabis and concentrates have increased dependency rates significantly." },
      { question: "What are marijuana withdrawal symptoms?", answer: "Cannabis withdrawal symptoms include irritability, anxiety, insomnia, decreased appetite, restlessness, physical discomfort, and strong cravings. Symptoms typically peak within the first week and resolve within 2-3 weeks. While not medically dangerous, withdrawal can be uncomfortable enough to drive relapse." },
      { question: "How is marijuana addiction treated?", answer: "Treatment primarily involves behavioral therapies: CBT for identifying and changing use patterns, motivational enhancement therapy (MET) to strengthen motivation, and contingency management. There are no FDA-approved medications specifically for cannabis dependence, though some medications may help manage withdrawal symptoms." },
      { question: "Does insurance cover marijuana rehab?", answer: "Yes, most insurance plans cover treatment for cannabis use disorder under substance abuse benefits. This includes outpatient therapy, intensive outpatient programs, and in some cases inpatient treatment when clinically indicated, particularly for co-occurring conditions." },
    ],
  },
];

interface GenericNearMePageProps {
  configSlug: string;
}

export default function GenericNearMePage({ configSlug }: GenericNearMePageProps) {
  const { stateSlug } = useParams<{ stateSlug?: string }>();
  const config = genericNearMeConfigs.find((c) => c.slug === configSlug);

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
        subtitle={config.introContent}
        treatmentType={config.treatmentType}
        location={stateData ? { state: stateData.state, stateAbbr: stateData.stateAbbr } : undefined}
        facilityCount={facilities.length}
      />

      <TrustBar />

      <section className="py-12 bg-background">
        <div className="container">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-foreground">
              {config.treatmentType} Centers {stateData ? `in ${stateData.state}` : "Near You"}
            </h2>
            <p className="mt-2 text-muted-foreground">
              Browse {facilities.length}+ verified facilities specializing in {config.treatmentType.toLowerCase()}.
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

      <ConversionSection location={stateData?.state} />

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
