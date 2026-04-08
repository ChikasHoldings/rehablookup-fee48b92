#!/usr/bin/env node
/**
 * Build-time Static HTML Generator for SEO Pages
 * 
 * Generates minimal but unique static HTML files for all SEO routes.
 * This ensures crawlers receive page-specific content (title, description,
 * headings, FAQs, structured data) instead of a generic SPA shell,
 * preventing soft 404 errors during indexing.
 * 
 * The generated HTML includes a <script> redirect to load the SPA for
 * JS-enabled users, keeping the interactive experience intact.
 */

import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.resolve(__dirname, "../public");

const BASE_URL = "https://rehablookup.com";
let pagesGenerated = 0;

// ============================================================
// DATA (mirrors src/data/* configs - kept minimal for build)
// ============================================================

const topCities = [
  { slug: "new-york", city: "New York", state: "New York", stateAbbr: "NY" },
  { slug: "los-angeles", city: "Los Angeles", state: "California", stateAbbr: "CA" },
  { slug: "chicago", city: "Chicago", state: "Illinois", stateAbbr: "IL" },
  { slug: "houston", city: "Houston", state: "Texas", stateAbbr: "TX" },
  { slug: "phoenix", city: "Phoenix", state: "Arizona", stateAbbr: "AZ" },
  { slug: "dallas", city: "Dallas", state: "Texas", stateAbbr: "TX" },
  { slug: "miami", city: "Miami", state: "Florida", stateAbbr: "FL" },
  { slug: "atlanta", city: "Atlanta", state: "Georgia", stateAbbr: "GA" },
  { slug: "denver", city: "Denver", state: "Colorado", stateAbbr: "CO" },
  { slug: "seattle", city: "Seattle", state: "Washington", stateAbbr: "WA" },
  { slug: "san-diego", city: "San Diego", state: "California", stateAbbr: "CA" },
  { slug: "san-francisco", city: "San Francisco", state: "California", stateAbbr: "CA" },
  { slug: "boston", city: "Boston", state: "Massachusetts", stateAbbr: "MA" },
  { slug: "philadelphia", city: "Philadelphia", state: "Pennsylvania", stateAbbr: "PA" },
  { slug: "san-antonio", city: "San Antonio", state: "Texas", stateAbbr: "TX" },
  { slug: "austin", city: "Austin", state: "Texas", stateAbbr: "TX" },
  { slug: "jacksonville", city: "Jacksonville", state: "Florida", stateAbbr: "FL" },
  { slug: "columbus", city: "Columbus", state: "Ohio", stateAbbr: "OH" },
  { slug: "charlotte", city: "Charlotte", state: "North Carolina", stateAbbr: "NC" },
  { slug: "indianapolis", city: "Indianapolis", state: "Indiana", stateAbbr: "IN" },
  { slug: "portland", city: "Portland", state: "Oregon", stateAbbr: "OR" },
  { slug: "nashville", city: "Nashville", state: "Tennessee", stateAbbr: "TN" },
  { slug: "las-vegas", city: "Las Vegas", state: "Nevada", stateAbbr: "NV" },
  { slug: "memphis", city: "Memphis", state: "Tennessee", stateAbbr: "TN" },
  { slug: "louisville", city: "Louisville", state: "Kentucky", stateAbbr: "KY" },
  { slug: "minneapolis", city: "Minneapolis", state: "Minnesota", stateAbbr: "MN" },
  { slug: "detroit", city: "Detroit", state: "Michigan", stateAbbr: "MI" },
  { slug: "sacramento", city: "Sacramento", state: "California", stateAbbr: "CA" },
  { slug: "tampa", city: "Tampa", state: "Florida", stateAbbr: "FL" },
  { slug: "salt-lake-city", city: "Salt Lake City", state: "Utah", stateAbbr: "UT" },
  { slug: "baltimore", city: "Baltimore", state: "Maryland", stateAbbr: "MD" },
  { slug: "milwaukee", city: "Milwaukee", state: "Wisconsin", stateAbbr: "WI" },
  { slug: "kansas-city", city: "Kansas City", state: "Missouri", stateAbbr: "MO" },
  { slug: "tucson", city: "Tucson", state: "Arizona", stateAbbr: "AZ" },
  { slug: "raleigh", city: "Raleigh", state: "North Carolina", stateAbbr: "NC" },
  { slug: "richmond", city: "Richmond", state: "Virginia", stateAbbr: "VA" },
  { slug: "new-orleans", city: "New Orleans", state: "Louisiana", stateAbbr: "LA" },
  { slug: "pittsburgh", city: "Pittsburgh", state: "Pennsylvania", stateAbbr: "PA" },
  { slug: "oklahoma-city", city: "Oklahoma City", state: "Oklahoma", stateAbbr: "OK" },
  { slug: "honolulu", city: "Honolulu", state: "Hawaii", stateAbbr: "HI" },
  { slug: "albuquerque", city: "Albuquerque", state: "New Mexico", stateAbbr: "NM" },
  { slug: "omaha", city: "Omaha", state: "Nebraska", stateAbbr: "NE" },
  { slug: "virginia-beach", city: "Virginia Beach", state: "Virginia", stateAbbr: "VA" },
  { slug: "boise", city: "Boise", state: "Idaho", stateAbbr: "ID" },
  { slug: "spokane", city: "Spokane", state: "Washington", stateAbbr: "WA" },
  { slug: "orlando", city: "Orlando", state: "Florida", stateAbbr: "FL" },
  { slug: "scottsdale", city: "Scottsdale", state: "Arizona", stateAbbr: "AZ" },
  { slug: "st-louis", city: "St. Louis", state: "Missouri", stateAbbr: "MO" },
  { slug: "cleveland", city: "Cleveland", state: "Ohio", stateAbbr: "OH" },
  { slug: "cincinnati", city: "Cincinnati", state: "Ohio", stateAbbr: "OH" },
];

const treatmentTypes = [
  { slug: "alcohol-rehab", label: "Alcohol Rehab", shortLabel: "Alcohol", filterKey: "alcohol", description: "Find accredited alcohol rehabilitation centers offering medically supervised detox, counseling, and long-term recovery programs." },
  { slug: "drug-rehab", label: "Drug Rehab", shortLabel: "Drug", filterKey: "drug", description: "Connect with drug rehabilitation facilities providing evidence-based treatment for substance use disorders." },
  { slug: "detox-centers", label: "Detox Centers", shortLabel: "Detox", filterKey: "detox", description: "Locate medically supervised detoxification programs offering safe withdrawal management and 24/7 medical support." },
  { slug: "inpatient-rehab", label: "Inpatient Rehab", shortLabel: "Inpatient", filterKey: "inpatient", description: "Explore residential inpatient rehabilitation programs with round-the-clock care and structured treatment environments." },
  { slug: "outpatient-rehab", label: "Outpatient Rehab", shortLabel: "Outpatient", filterKey: "outpatient", description: "Find flexible outpatient treatment programs including IOP and PHP that allow you to continue daily responsibilities." },
  { slug: "dual-diagnosis-treatment", label: "Dual Diagnosis Treatment", shortLabel: "Dual Diagnosis", filterKey: "dual diagnosis", description: "Discover specialized facilities treating co-occurring mental health and substance use disorders simultaneously." },
  { slug: "luxury-rehab", label: "Luxury Rehab", shortLabel: "Luxury", filterKey: "luxury", description: "Find premium luxury rehab centers offering private accommodations, gourmet dining, and world-class addiction treatment." },
  { slug: "sober-living", label: "Sober Living", shortLabel: "Sober Living", filterKey: "sober living", description: "Find structured sober living homes providing safe, substance-free housing and peer support during recovery." },
  { slug: "free-rehab", label: "Free Rehab", shortLabel: "Free", filterKey: "free", description: "Find free and low-cost rehabilitation programs including state-funded, Medicaid, and nonprofit treatment options." },
  { slug: "faith-based-rehab", label: "Faith-Based Rehab", shortLabel: "Faith-Based", filterKey: "faith", description: "Find faith-based rehabilitation programs integrating spiritual growth with evidence-based addiction treatment." },
  { slug: "fentanyl-rehab", label: "Fentanyl Rehab", shortLabel: "Fentanyl", filterKey: "fentanyl", description: "Find specialized fentanyl addiction treatment centers offering medical detox, MAT, and comprehensive recovery." },
  { slug: "veterans-rehab", label: "Veterans Rehab", shortLabel: "Veterans", filterKey: "veterans", description: "Find veteran-specific rehabilitation centers offering VA-covered addiction treatment and PTSD care." },
  { slug: "womens-rehab", label: "Women's Rehab", shortLabel: "Women's", filterKey: "women", description: "Find women-only rehabilitation centers with gender-specific treatment programs for women's recovery." },
  { slug: "mens-rehab", label: "Men's Rehab", shortLabel: "Men's", filterKey: "men", description: "Find men-only rehabilitation centers with gender-specific treatment programs for men's recovery." },
];

const treatmentHubs = [
  { slug: "alcohol-rehab-centers", title: "Alcohol Rehab Centers", metaTitle: "Alcohol Rehab Centers Near You — Find Treatment Today | RehabLookup", metaDescription: "Search accredited alcohol rehab centers with verified reviews. Compare inpatient, outpatient & detox programs. Insurance accepted.", overview: "Alcohol use disorder affects over 14 million adults in the United States. Professional alcohol rehab centers provide structured treatment programs designed to help individuals safely detox, address underlying causes of addiction, and build sustainable recovery skills." },
  { slug: "drug-rehab-centers", title: "Drug Rehab Centers", metaTitle: "Drug Rehab Centers Near You — Evidence-Based Treatment | RehabLookup", metaDescription: "Find verified drug rehab centers offering detox, inpatient & outpatient programs. Compare facilities and start recovery today.", overview: "Drug addiction affects millions of individuals and families across the country. Professional drug rehab centers offer specialized treatment programs addressing addiction to opioids, stimulants, benzodiazepines, and other substances." },
  { slug: "detox-centers", title: "Detox Centers", metaTitle: "Medical Detox Centers Near You — Safe Withdrawal Management | RehabLookup", metaDescription: "Find medically supervised detox centers offering safe withdrawal management. 24/7 medical support, medication-assisted detox.", overview: "Medical detoxification is the critical first step in addiction recovery, providing safe, supervised withdrawal management. Detox centers offer 24/7 medical monitoring, medication-assisted protocols, and compassionate care." },
  { slug: "inpatient-rehab", title: "Inpatient Rehab", metaTitle: "Inpatient Rehab Programs Near You — Residential Treatment | RehabLookup", metaDescription: "Find residential inpatient rehab programs with 24/7 care. Compare accredited facilities and begin your recovery journey today.", overview: "Inpatient (residential) rehabilitation provides the highest level of addiction treatment, offering 24/7 care in a structured therapeutic environment." },
  { slug: "outpatient-rehab", title: "Outpatient Rehab", metaTitle: "Outpatient Rehab Programs — Flexible Treatment Options | RehabLookup", metaDescription: "Find flexible outpatient rehab programs including IOP & PHP. Continue working while getting treatment.", overview: "Outpatient rehabilitation provides effective addiction treatment while allowing patients to maintain their daily responsibilities." },
  { slug: "dual-diagnosis-treatment", title: "Dual Diagnosis Treatment", metaTitle: "Dual Diagnosis Treatment Centers — Co-Occurring Disorder Care | RehabLookup", metaDescription: "Find specialized dual diagnosis treatment centers treating addiction and mental health disorders simultaneously.", overview: "Dual diagnosis treatment addresses the complex relationship between substance use disorders and co-occurring mental health conditions." },
  { slug: "php-programs", title: "Partial Hospitalization Programs (PHP)", metaTitle: "Partial Hospitalization Programs Near You — PHP Treatment | RehabLookup", metaDescription: "Find partial hospitalization programs (PHP) offering intensive day treatment for addiction.", overview: "PHP provides the most intensive level of outpatient addiction treatment, offering 5-7 days of structured programming." },
  { slug: "iop-programs", title: "Intensive Outpatient Programs (IOP)", metaTitle: "Intensive Outpatient Programs Near You — IOP Treatment | RehabLookup", metaDescription: "Find intensive outpatient programs (IOP) for addiction treatment. Flexible evening and weekend options.", overview: "IOP provides structured addiction treatment 3-5 days per week, designed for individuals who can maintain daily responsibilities." },
  { slug: "mat-programs", title: "Medication-Assisted Treatment (MAT) Programs", metaTitle: "MAT Programs Near You — Medication-Assisted Treatment | RehabLookup", metaDescription: "Find medication-assisted treatment (MAT) programs for opioid and alcohol addiction.", overview: "MAT is the gold standard for opioid addiction treatment, combining FDA-approved medications with behavioral therapy." },
];

const substancePages = [
  { slug: "cocaine-addiction-treatment", title: "Cocaine Addiction Treatment", metaTitle: "Cocaine Addiction Treatment Programs — Find Help Today | RehabLookup", metaDescription: "Find accredited cocaine addiction treatment programs.", conditionName: "Cocaine Addiction", intro: "Cocaine addiction is a serious substance use disorder affecting approximately 1.4 million Americans." },
  { slug: "opioid-addiction-treatment", title: "Opioid Addiction Treatment", metaTitle: "Opioid Addiction Treatment Programs — MAT & Recovery | RehabLookup", metaDescription: "Find specialized opioid addiction treatment with MAT.", conditionName: "Opioid Addiction", intro: "The opioid epidemic remains one of America's most devastating public health crises." },
  { slug: "heroin-addiction-treatment", title: "Heroin Addiction Treatment", metaTitle: "Heroin Addiction Treatment Centers — Detox & Recovery | RehabLookup", metaDescription: "Find heroin addiction treatment centers offering medical detox and MAT.", conditionName: "Heroin Addiction", intro: "Heroin addiction is one of the most challenging substance use disorders." },
  { slug: "meth-addiction-treatment", title: "Meth Addiction Treatment", metaTitle: "Meth Addiction Treatment Programs — Crystal Meth Recovery | RehabLookup", metaDescription: "Find meth addiction treatment centers offering evidence-based recovery programs.", conditionName: "Methamphetamine Addiction", intro: "Methamphetamine addiction is a devastating substance use disorder." },
  { slug: "prescription-drug-rehab", title: "Prescription Drug Rehab", metaTitle: "Prescription Drug Rehab — Painkiller & Benzo Treatment | RehabLookup", metaDescription: "Find prescription drug addiction treatment for painkillers, benzodiazepines, and stimulants.", conditionName: "Prescription Drug Addiction", intro: "Prescription drug addiction affects millions of Americans who initially received medications for legitimate conditions." },
  { slug: "benzodiazepine-addiction-treatment", title: "Benzodiazepine Addiction Treatment", metaTitle: "Benzodiazepine Addiction Treatment — Xanax, Valium Recovery | RehabLookup", metaDescription: "Find specialized benzodiazepine addiction treatment centers.", conditionName: "Benzodiazepine Addiction", intro: "Benzodiazepine addiction is one of the most medically serious forms of drug dependence." },
  { slug: "alcohol-addiction-treatment", title: "Alcohol Addiction Treatment", metaTitle: "Alcohol Addiction Treatment Programs — Recovery Help | RehabLookup", metaDescription: "Find accredited alcohol addiction treatment programs offering medical detox and therapy.", conditionName: "Alcohol Use Disorder", intro: "Alcohol use disorder affects over 28 million Americans, making it the most prevalent substance use disorder." },
  { slug: "marijuana-addiction-treatment", title: "Marijuana Addiction Treatment", metaTitle: "Marijuana Addiction Treatment — Cannabis Use Disorder Help | RehabLookup", metaDescription: "Find marijuana addiction treatment programs for cannabis use disorder.", conditionName: "Cannabis Use Disorder", intro: "Cannabis use disorder affects approximately 16 million Americans." },
  { slug: "fentanyl-addiction-treatment", title: "Fentanyl Addiction Treatment", metaTitle: "Fentanyl Addiction Treatment — Emergency Recovery Programs | RehabLookup", metaDescription: "Find urgent fentanyl addiction treatment with medical detox and MAT.", conditionName: "Fentanyl Addiction", intro: "Fentanyl has become the deadliest drug in American history, responsible for over 70,000 overdose deaths annually." },
  { slug: "xanax-addiction-treatment", title: "Xanax Addiction Treatment", metaTitle: "Xanax Addiction Treatment — Safe Detox & Recovery | RehabLookup", metaDescription: "Find Xanax addiction treatment with medically supervised tapering and detox.", conditionName: "Xanax Addiction", intro: "Xanax is the most commonly prescribed and misused benzodiazepine in the United States." },
  { slug: "adderall-addiction-treatment", title: "Adderall Addiction Treatment", metaTitle: "Adderall Addiction Treatment — Stimulant Abuse Recovery | RehabLookup", metaDescription: "Find Adderall addiction treatment programs for prescription stimulant abuse.", conditionName: "Adderall Addiction", intro: "Adderall addiction has risen dramatically, particularly among college students and young professionals." },
  { slug: "kratom-addiction-treatment", title: "Kratom Addiction Treatment", metaTitle: "Kratom Addiction Treatment — Withdrawal Help & Recovery | RehabLookup", metaDescription: "Find kratom addiction treatment programs with medical withdrawal management.", conditionName: "Kratom Addiction", intro: "Kratom addiction is an emerging substance use concern as this plant-based product has gained popularity." },
  { slug: "gabapentin-addiction-treatment", title: "Gabapentin Addiction Treatment", metaTitle: "Gabapentin Addiction Treatment — Abuse & Withdrawal Help | RehabLookup", metaDescription: "Find gabapentin addiction treatment for Neurontin abuse and dependence.", conditionName: "Gabapentin Addiction", intro: "Gabapentin misuse has emerged as a growing substance abuse concern." },
  { slug: "tramadol-addiction-treatment", title: "Tramadol Addiction Treatment", metaTitle: "Tramadol Addiction Treatment — Safe Withdrawal & Recovery | RehabLookup", metaDescription: "Find tramadol addiction treatment programs with medical detox and tapering.", conditionName: "Tramadol Addiction", intro: "Tramadol addiction is an often-underestimated substance use disorder with unique dual-mechanism dependence." },
];

const demographicPages = [
  { slug: "young-adult-rehab", title: "Young Adult Rehab Programs (18-25)", metaTitle: "Young Adult Rehab Programs (18-25) — Treatment & Recovery | RehabLookup", metaDescription: "Find rehab programs designed for young adults ages 18-25.", intro: "Young adults ages 18-25 face unique addiction challenges shaped by developmental factors and social pressures." },
  { slug: "teen-rehab-programs", title: "Teen Rehab Programs", metaTitle: "Teen Rehab Programs — Adolescent Addiction Treatment | RehabLookup", metaDescription: "Find teen rehab programs for adolescent substance abuse.", intro: "Adolescent substance abuse requires specialized treatment addressing unique developmental and family dynamics." },
  { slug: "senior-addiction-treatment", title: "Senior Addiction Treatment", metaTitle: "Senior Addiction Treatment — Elderly Substance Abuse Help | RehabLookup", metaDescription: "Find addiction treatment programs for seniors and elderly adults.", intro: "Substance abuse among seniors is a growing yet underrecognized crisis." },
  { slug: "lgbtq-rehab-programs", title: "LGBTQ+ Rehab Programs", metaTitle: "LGBTQ+ Rehab Programs — Affirming Addiction Treatment | RehabLookup", metaDescription: "Find LGBTQ+ affirming rehab programs with specialized therapy.", intro: "LGBTQ+ individuals experience substance use disorders at significantly higher rates than the general population." },
  { slug: "pregnant-women-addiction-treatment", title: "Pregnant Women Addiction Treatment", metaTitle: "Pregnant Women Addiction Treatment — Safe Prenatal Recovery | RehabLookup", metaDescription: "Find addiction treatment for pregnant women with prenatal care and safe detox.", intro: "Substance use during pregnancy affects approximately 5-10% of pregnancies." },
  { slug: "first-responders-rehab", title: "First Responders Rehab", metaTitle: "First Responders Rehab — Addiction Treatment for EMS, Fire & Police | RehabLookup", metaDescription: "Find addiction treatment for first responders.", intro: "First responders face substance abuse rates significantly higher than the general population." },
  { slug: "healthcare-professionals-rehab", title: "Healthcare Professionals Rehab", metaTitle: "Healthcare Professionals Rehab — Nurses, Doctors Recovery | RehabLookup", metaDescription: "Find addiction treatment for healthcare professionals.", intro: "Healthcare professionals face unique addiction challenges stemming from occupational stress and access to controlled substances." },
  { slug: "executive-rehab-programs", title: "Executive Rehab Programs", metaTitle: "Executive Rehab Programs — Luxury, Private Treatment | RehabLookup", metaDescription: "Find executive rehab programs offering luxury accommodations and privacy.", intro: "Executive rehab programs cater to business leaders requiring addiction treatment that accommodates demanding careers." },
  { slug: "teachers-rehab-programs", title: "Rehab Programs for Teachers & Educators", metaTitle: "Rehab for Teachers & Educators — Confidential Treatment | RehabLookup", metaDescription: "Find addiction treatment for teachers and educators.", intro: "Teachers and educators face substance abuse challenges driven by occupational burnout and high stress." },
  { slug: "college-student-addiction-treatment", title: "College Student Addiction Treatment", metaTitle: "College Student Addiction Treatment — Campus Recovery | RehabLookup", metaDescription: "Find addiction treatment for college students.", intro: "College students face disproportionate substance abuse risks driven by peer pressure and academic stress." },
];

const seekerGuidePages = [
  { slug: "how-to-stage-an-intervention", title: "How to Stage an Intervention", metaTitle: "How to Stage an Intervention — Step-by-Step Guide | RehabLookup", metaDescription: "Learn how to stage an effective intervention for a loved one struggling with addiction.", intro: "An intervention is a carefully planned process to confront someone about their addiction and encourage treatment." },
  { slug: "signs-loved-one-needs-rehab", title: "Signs Your Loved One Needs Rehab", metaTitle: "Signs Your Loved One Needs Rehab — When to Seek Help | RehabLookup", metaDescription: "Recognize the warning signs that your loved one needs professional addiction treatment.", intro: "Recognizing when substance use has crossed into addiction requiring professional treatment can be challenging." },
  { slug: "how-to-help-alcoholic-family-member", title: "How to Help an Alcoholic Family Member", metaTitle: "How to Help an Alcoholic Family Member — Family Guide | RehabLookup", metaDescription: "Learn how to help a family member with alcoholism.", intro: "Living with an alcoholic family member is emotionally devastating for everyone in the family." },
  { slug: "what-to-expect-loved-one-in-rehab", title: "What to Expect When a Loved One Goes to Rehab", metaTitle: "What to Expect When a Loved One Goes to Rehab | RehabLookup", metaDescription: "Learn what happens when your loved one enters rehab.", intro: "When your loved one enters rehab, understanding the process helps you manage expectations and participate effectively." },
  { slug: "how-to-find-rehab-for-family-member", title: "How to Find Rehab for a Family Member", metaTitle: "How to Find Rehab for a Family Member — Step-by-Step | RehabLookup", metaDescription: "Step-by-step guide to finding the right rehab for a family member.", intro: "Finding the right rehab for a family member can feel overwhelming with hundreds of facilities to consider." },
];

const nearMePages = [
  { slug: "drug-rehab-near-me", title: "Drug Rehab Near Me", metaDescription: "Find drug rehabilitation centers near your location. Compare verified facilities, check insurance, and get help today." },
  { slug: "alcohol-rehab-near-me", title: "Alcohol Rehab Near Me", metaDescription: "Find alcohol rehab centers near you. Compare detox, inpatient & outpatient programs. Insurance verification available." },
  { slug: "detox-near-me", title: "Detox Centers Near Me", metaDescription: "Find medically supervised detox centers near your location. Safe withdrawal management with 24/7 medical support." },
  { slug: "dual-diagnosis-near-me", title: "Dual Diagnosis Treatment Near Me", metaDescription: "Find dual diagnosis treatment centers near you treating addiction and mental health disorders simultaneously." },
  { slug: "dual-diagnosis-rehab-near-me", title: "Dual Diagnosis Rehab Near Me", metaDescription: "Find dual diagnosis rehab centers near you treating addiction and mental health conditions simultaneously." },
  { slug: "inpatient-rehab-near-me", title: "Inpatient Rehab Near Me", metaDescription: "Find inpatient rehab facilities near you with 24/7 residential care and comprehensive treatment programs." },
  { slug: "outpatient-near-me", title: "Outpatient Rehab Near Me", metaDescription: "Find flexible outpatient rehab programs near you. IOP, PHP, and standard outpatient options available." },
  { slug: "outpatient-rehab-near-me", title: "Outpatient Rehab Programs Near Me", metaDescription: "Find outpatient rehabilitation programs near you with flexible scheduling and evidence-based treatment." },
  { slug: "free-rehab-near-me", title: "Free Rehab Centers Near Me", metaDescription: "Find free and low-cost rehab centers near you. State-funded, Medicaid, and nonprofit treatment options." },
  { slug: "luxury-rehab-near-me", title: "Luxury Rehab Centers Near Me", metaDescription: "Find luxury rehab centers near you with premium amenities and world-class addiction treatment programs." },
  { slug: "womens-rehab-near-me", title: "Women's Rehab Near Me", metaDescription: "Find women-only rehab centers near you with gender-specific treatment programs and supportive environments." },
  { slug: "mens-rehab-near-me", title: "Men's Rehab Near Me", metaDescription: "Find men-only rehab centers near you with gender-specific treatment programs tailored for men's recovery." },
  { slug: "fentanyl-rehab-near-me", title: "Fentanyl Rehab Near Me", metaDescription: "Find fentanyl addiction treatment centers near you. Medical detox, MAT, and comprehensive recovery programs." },
  { slug: "sober-living-near-me", title: "Sober Living Near Me", metaDescription: "Find sober living homes near you. Structured, substance-free housing for individuals in recovery." },
  { slug: "teen-rehab-near-me", title: "Teen Rehab Near Me", metaDescription: "Find teen rehab centers near you with age-appropriate addiction treatment for adolescents." },
  { slug: "veterans-rehab-near-me", title: "Veterans Rehab Near Me", metaDescription: "Find veteran-specific rehab centers near you with VA-covered addiction treatment and PTSD care." },
  { slug: "medicaid-rehab-near-me", title: "Medicaid Rehab Near Me", metaDescription: "Find rehab centers near you that accept Medicaid. Comprehensive addiction treatment covered by Medicaid." },
  { slug: "court-ordered-rehab-near-me", title: "Court-Ordered Rehab Near Me", metaDescription: "Find court-ordered rehab programs near you. Meet legal requirements while receiving quality addiction treatment." },
  { slug: "suboxone-clinic-near-me", title: "Suboxone Clinics Near Me", metaDescription: "Find Suboxone clinics near you for opioid addiction treatment. MAT providers accepting new patients." },
  { slug: "methadone-clinic-near-me", title: "Methadone Clinics Near Me", metaDescription: "Find methadone clinics near you for opioid addiction treatment. Medication-assisted treatment programs." },
  { slug: "faith-based-rehab-near-me", title: "Faith-Based Rehab Near Me", metaDescription: "Find faith-based rehab centers near you combining spiritual care with evidence-based addiction treatment." },
  { slug: "holistic-rehab-near-me", title: "Holistic Rehab Near Me", metaDescription: "Find holistic rehab centers near you offering yoga, meditation, acupuncture, and integrative addiction treatment." },
  { slug: "christian-rehab-near-me", title: "Christian Rehab Near Me", metaDescription: "Find Christian rehab centers near you combining biblical principles with professional addiction treatment." },
  { slug: "long-term-rehab-near-me", title: "Long-Term Rehab Near Me", metaDescription: "Find long-term rehab programs near you. 60, 90, and 120+ day residential treatment for lasting recovery." },
  { slug: "iop-near-me", title: "IOP Near Me", metaDescription: "Find intensive outpatient programs (IOP) near you. Flexible 9-20 hour weekly treatment while maintaining daily life." },
  { slug: "php-near-me", title: "PHP Near Me", metaDescription: "Find partial hospitalization programs (PHP) near you. Structured day treatment 5-7 days per week." },
  { slug: "couples-rehab-near-me", title: "Couples Rehab Near Me", metaDescription: "Find couples rehab programs near you. Joint addiction treatment with relationship counseling and individual care." },
  { slug: "executive-rehab-near-me", title: "Executive Rehab Near Me", metaDescription: "Find confidential executive rehab programs near you. Premium treatment for professionals and executives." },
  { slug: "rehab-near-me", title: "Rehab Near Me", metaDescription: "Find rehab centers near you. Compare verified addiction treatment facilities offering detox, inpatient, and outpatient programs." },
  { slug: "mat-clinic-near-me", title: "MAT Clinic Near Me", metaDescription: "Find medication-assisted treatment clinics near you. Suboxone, methadone, and Vivitrol programs for opioid recovery." },
  { slug: "affordable-rehab-near-me", title: "Affordable Rehab Near Me", metaDescription: "Find affordable rehab centers near you. Sliding-scale fees, payment plans, and budget-friendly treatment options." },
];

const bestInStates = [
  { slug: "california", state: "California" },
  { slug: "florida", state: "Florida" },
  { slug: "texas", state: "Texas" },
  { slug: "new-york", state: "New York" },
  { slug: "illinois", state: "Illinois" },
  { slug: "pennsylvania", state: "Pennsylvania" },
  { slug: "ohio", state: "Ohio" },
  { slug: "georgia", state: "Georgia" },
  { slug: "north-carolina", state: "North Carolina" },
  { slug: "michigan", state: "Michigan" },
];

const costPages = [
  { slug: "rehab-cost", title: "How Much Does Rehab Cost?", metaTitle: "How Much Does Rehab Cost in 2026? Complete Pricing Guide | RehabLookup", metaDescription: "Comprehensive guide to rehab costs — inpatient, outpatient, detox pricing. Learn about insurance coverage and financial assistance." },
  { slug: "does-insurance-cover-rehab", title: "Does Insurance Cover Rehab?", metaTitle: "Does Insurance Cover Rehab? Complete 2026 Coverage Guide | RehabLookup", metaDescription: "Learn how insurance covers addiction treatment — what's included, how to verify benefits, and maximize your coverage." },
  { slug: "free-rehab-centers", title: "Free Rehab Centers", metaTitle: "Free Rehab Centers Near You — No-Cost Addiction Treatment | RehabLookup", metaDescription: "Find free and low-cost rehab centers near you. State-funded programs, Medicaid facilities, and nonprofit options." },
  { slug: "medicaid-rehab-centers", title: "Medicaid Rehab Centers", metaTitle: "Medicaid Rehab Centers — Addiction Treatment Covered by Medicaid | RehabLookup", metaDescription: "Find rehab centers that accept Medicaid. Learn what Medicaid covers for addiction treatment." },
];

const comparisonPages = [
  { slug: "inpatient-vs-outpatient-rehab", title: "Inpatient vs. Outpatient Rehab", metaTitle: "Inpatient vs Outpatient Rehab: Which Is Right for You? | RehabLookup", metaDescription: "Compare inpatient and outpatient rehab programs — costs, benefits, success rates, and who each is best for." },
  { slug: "rehab-vs-detox", title: "Rehab vs. Detox", metaTitle: "Rehab vs Detox: Understanding the Difference | RehabLookup", metaDescription: "Understand the difference between rehab and detox. Learn when you need each and how they work together." },
];

const insurers = [
  { slug: "aetna-rehab", name: "Aetna" },
  { slug: "bcbs-treatment", name: "Blue Cross Blue Shield" },
  { slug: "cigna-rehab", name: "Cigna" },
  { slug: "united-healthcare-rehab", name: "UnitedHealthcare" },
  { slug: "humana-rehab", name: "Humana" },
  { slug: "kaiser-rehab", name: "Kaiser Permanente" },
  { slug: "medicare-rehab", name: "Medicare" },
  { slug: "medicaid-rehab", name: "Medicaid" },
  { slug: "anthem-rehab", name: "Anthem" },
];

const usStates = [
  "Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut","Delaware","Florida","Georgia",
  "Hawaii","Idaho","Illinois","Indiana","Iowa","Kansas","Kentucky","Louisiana","Maine","Maryland",
  "Massachusetts","Michigan","Minnesota","Mississippi","Missouri","Montana","Nebraska","Nevada","New Hampshire","New Jersey",
  "New Mexico","New York","North Carolina","North Dakota","Ohio","Oklahoma","Oregon","Pennsylvania","Rhode Island","South Carolina",
  "South Dakota","Tennessee","Texas","Utah","Vermont","Virginia","Washington","West Virginia","Wisconsin","Wyoming",
];

function stateToSlug(state) {
  return state.toLowerCase().replace(/\s+/g, "-");
}

// ============================================================
// HTML TEMPLATE
// ============================================================

function escHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function generatePage({ urlPath, title, metaTitle, metaDescription, h1, content, breadcrumbs, structuredData, relatedLinks }) {
  const canonical = `${BASE_URL}${urlPath}`;
  const safeTitle = escHtml(metaTitle || title);
  const safeDesc = escHtml(metaDescription);

  const breadcrumbHtml = breadcrumbs
    ? breadcrumbs.map((b, i) => `<li><a href="${b.url}">${escHtml(b.name)}</a>${i < breadcrumbs.length - 1 ? " &rsaquo; " : ""}</li>`).join("")
    : "";

  const breadcrumbSchema = breadcrumbs
    ? JSON.stringify({
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: breadcrumbs.map((b, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: b.name,
          item: `${BASE_URL}${b.url}`,
        })),
      })
    : "";

  const relatedHtml = relatedLinks?.length
    ? `<nav aria-label="Related pages"><h2>Related Pages</h2><ul>${relatedLinks.map((l) => `<li><a href="${l.href}">${escHtml(l.title)}</a></li>`).join("")}</ul></nav>`
    : "";

  const sdScripts = (structuredData || [])
    .map((sd) => `<script type="application/ld+json">${JSON.stringify(sd)}</script>`)
    .join("\n  ");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeTitle}</title>
  <meta name="description" content="${safeDesc}">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="${canonical}">
  <meta property="og:type" content="website">
  <meta property="og:title" content="${safeTitle}">
  <meta property="og:description" content="${safeDesc}">
  <meta property="og:url" content="${canonical}">
  <meta property="og:site_name" content="RehabLookup">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${safeTitle}">
  <meta name="twitter:description" content="${safeDesc}">
  <link rel="icon" type="image/png" href="/favicon.png">
  ${breadcrumbSchema ? `<script type="application/ld+json">${breadcrumbSchema}</script>` : ""}
  ${sdScripts}
  <style>
    body{font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:900px;margin:0 auto;padding:32px 20px;color:#1a2b4a;line-height:1.7}
    h1{font-size:2rem;color:#1B365D;margin-bottom:12px}
    h2{font-size:1.4rem;color:#1B365D;margin-top:28px}
    p{color:#333;margin-bottom:16px}
    a{color:#2563eb;text-decoration:none}
    a:hover{text-decoration:underline}
    nav ul{list-style:none;padding:0;display:flex;flex-wrap:wrap;gap:8px}
    nav li a{display:inline-block;padding:6px 12px;background:#f1f5f9;border-radius:6px;font-size:.875rem}
    .breadcrumbs{font-size:.85rem;color:#666;margin-bottom:20px}
    .breadcrumbs ul{list-style:none;padding:0;display:flex;flex-wrap:wrap;gap:4px}
    footer{margin-top:40px;padding-top:20px;border-top:1px solid #e5e7eb;font-size:.8rem;color:#888}
  </style>
</head>
<body>
  <header><a href="/" aria-label="RehabLookup Home">RehabLookup</a></header>
  ${breadcrumbHtml ? `<nav class="breadcrumbs" aria-label="Breadcrumb"><ul>${breadcrumbHtml}</ul></nav>` : ""}
  <main>
    <h1>${escHtml(h1 || title)}</h1>
    ${content}
    ${relatedHtml}
    <p style="margin-top:24px"><a href="/rehab-centers">Browse All Treatment Centers</a> &middot; <a href="/concierge">Get Personalized Help</a> &middot; <a href="/">Home</a></p>
  </main>
  <footer><p>&copy; 2026 RehabLookup. All rights reserved. <a href="/privacy-policy">Privacy</a> &middot; <a href="/terms-of-service">Terms</a></p></footer>
</body>
</html>`;
}

// ============================================================
// PAGE GENERATORS
// ============================================================

async function writePage(filePath, html) {
  const dir = path.dirname(filePath);
  await mkdir(dir, { recursive: true });
  await writeFile(filePath, html, "utf8");
  pagesGenerated++;
}

// --- Treatment Hub Pages ---
async function generateTreatmentHubs() {
  for (const hub of treatmentHubs) {
    const html = generatePage({
      urlPath: `/${hub.slug}`,
      title: hub.title,
      metaTitle: hub.metaTitle,
      metaDescription: hub.metaDescription,
      h1: hub.title,
      content: `<p>${escHtml(hub.overview)}</p>
        <h2>Find ${hub.title} Near You</h2>
        <p>Use RehabLookup to search accredited ${hub.title.toLowerCase()} by location, insurance, and specialty. Our verified directory helps you compare programs and find the right fit for your recovery needs.</p>
        <h2>Insurance Coverage</h2>
        <p>Most major insurance plans cover ${hub.title.toLowerCase()} under the Mental Health Parity Act, including Aetna, Blue Cross Blue Shield, Cigna, UnitedHealthcare, Humana, and Kaiser Permanente.</p>`,
      breadcrumbs: [
        { name: "Home", url: "/" },
        { name: "Treatment Types", url: "/treatment-types" },
        { name: hub.title, url: `/${hub.slug}` },
      ],
      structuredData: [{
        "@context": "https://schema.org",
        "@type": "MedicalWebPage",
        name: hub.title,
        description: hub.metaDescription,
        url: `${BASE_URL}/${hub.slug}`,
      }],
      relatedLinks: treatmentHubs.filter((h) => h.slug !== hub.slug).map((h) => ({ title: h.title, href: `/${h.slug}` })),
    });
    await writePage(path.join(publicDir, `${hub.slug}.html`), html);
  }
}

// --- Substance Treatment Pages ---
async function generateSubstancePages() {
  for (const s of substancePages) {
    const html = generatePage({
      urlPath: `/${s.slug}`,
      title: s.title,
      metaTitle: s.metaTitle,
      metaDescription: s.metaDescription,
      h1: s.title,
      content: `<p>${escHtml(s.intro)}</p>
        <h2>Evidence-Based Treatment for ${s.conditionName}</h2>
        <p>Professional treatment for ${s.conditionName.toLowerCase()} combines medical care, behavioral therapy, and aftercare planning. Find accredited programs specializing in ${s.conditionName.toLowerCase()} through RehabLookup's verified directory.</p>
        <h2>Insurance & Cost</h2>
        <p>Most major insurance plans cover ${s.conditionName.toLowerCase()} treatment. Verify your benefits or explore free and low-cost options through our directory.</p>`,
      breadcrumbs: [
        { name: "Home", url: "/" },
        { name: "Treatment Types", url: "/treatment-types" },
        { name: s.title, url: `/${s.slug}` },
      ],
      structuredData: [{
        "@context": "https://schema.org",
        "@type": "MedicalWebPage",
        name: s.title,
        description: s.metaDescription,
        url: `${BASE_URL}/${s.slug}`,
        about: { "@type": "MedicalCondition", name: s.conditionName },
      }],
    });
    await writePage(path.join(publicDir, `${s.slug}.html`), html);
  }
}

// --- Near Me Pages ---
async function generateNearMePages() {
  for (const nm of nearMePages) {
    const html = generatePage({
      urlPath: `/${nm.slug}`,
      title: nm.title,
      metaTitle: `${nm.title} — Find Local Treatment | RehabLookup`,
      metaDescription: nm.metaDescription,
      h1: nm.title,
      content: `<p>Search for ${nm.title.toLowerCase()} in your area. RehabLookup's directory includes verified, accredited facilities across all 50 states.</p>
        <h2>How to Find Treatment Near You</h2>
        <p>Enter your city, zip code, or state to find nearby facilities. Filter by insurance, treatment type, and amenities to find the right program for your needs.</p>
        <h2>Browse by City</h2>
        <ul style="columns:2;list-style:disc;padding-left:20px">${topCities.slice(0, 20).map((c) => `<li><a href="/${nm.slug}/${stateToSlug(c.state)}">${nm.title} in ${c.state}</a></li>`).join("")}</ul>`,
      breadcrumbs: [
        { name: "Home", url: "/" },
        { name: nm.title, url: `/${nm.slug}` },
      ],
      relatedLinks: nearMePages.filter((n) => n.slug !== nm.slug).slice(0, 8).map((n) => ({ title: n.title, href: `/${n.slug}` })),
    });
    await writePage(path.join(publicDir, `${nm.slug}.html`), html);
  }
}

// --- Best in State Pages ---
async function generateBestInStatePages() {
  for (const bis of bestInStates) {
    const slug = `best-rehab-centers-in-${bis.slug}`;
    const title = `Best Rehab Centers in ${bis.state}`;
    const html = generatePage({
      urlPath: `/${slug}`,
      title,
      metaTitle: `Best Rehab Centers in ${bis.state} 2026 — Top-Rated | RehabLookup`,
      metaDescription: `Find the best rehab centers in ${bis.state} for 2026. Compare top-rated addiction treatment facilities. Insurance accepted. Expert-verified listings.`,
      h1: title,
      content: `<p>Compare ${bis.state}'s top-rated addiction treatment programs. RehabLookup verifies accreditation, licensing, and quality for every listed facility.</p>
        <h2>Treatment Options in ${bis.state}</h2>
        <p>${bis.state} offers diverse treatment options including inpatient rehab, outpatient programs, medical detox, dual diagnosis treatment, and specialty programs. Use our directory to compare verified facilities.</p>
        <h2>Insurance Coverage in ${bis.state}</h2>
        <p>Major insurance providers cover addiction treatment in ${bis.state}. Verify your benefits through our free insurance check tool.</p>`,
      breadcrumbs: [
        { name: "Home", url: "/" },
        { name: "Locations", url: "/locations" },
        { name: bis.state, url: `/rehab-centers/${bis.slug}` },
        { name: "Best Centers", url: `/${slug}` },
      ],
      structuredData: [{
        "@context": "https://schema.org",
        "@type": "ItemList",
        name: title,
        description: `Top-rated rehab centers in ${bis.state}`,
        url: `${BASE_URL}/${slug}`,
      }],
      relatedLinks: bestInStates.filter((b) => b.slug !== bis.slug).map((b) => ({ title: `Best in ${b.state}`, href: `/best-rehab-centers-in-${b.slug}` })),
    });
    await writePage(path.join(publicDir, `${slug}.html`), html);
  }
}

// --- City + Treatment Combo Pages ---
async function generateCityTreatmentPages() {
  for (const tt of treatmentTypes) {
    for (const city of topCities) {
      const slug = `${tt.slug}-in-${city.slug}`;
      const title = `${tt.label} in ${city.city}, ${city.stateAbbr}`;
      const html = generatePage({
        urlPath: `/${slug}`,
        title,
        metaTitle: `${tt.label} in ${city.city}, ${city.stateAbbr} — Find Programs | RehabLookup`,
        metaDescription: `Find ${tt.label.toLowerCase()} centers in ${city.city}, ${city.stateAbbr}. Compare accredited facilities, verify insurance, and get help today.`,
        h1: title,
        content: `<p>Search accredited ${tt.label.toLowerCase()} programs in ${city.city}, ${city.state}. ${tt.description}</p>
          <h2>${tt.label} Programs in ${city.city}</h2>
          <p>RehabLookup lists verified ${tt.label.toLowerCase()} facilities in the ${city.city} area. Each program is checked for proper licensing, accreditation, and quality of care.</p>
          <h2>Insurance Coverage</h2>
          <p>Most insurance plans cover ${tt.label.toLowerCase()} in ${city.city}, ${city.stateAbbr} under the Mental Health Parity Act. Use our free insurance verification tool to check your benefits.</p>`,
        breadcrumbs: [
          { name: "Home", url: "/" },
          { name: tt.label, url: `/${tt.slug === "dual-diagnosis-treatment" ? tt.slug : tt.slug.replace("-rehab", "-rehab-centers").replace("detox-centers", "detox-centers")}` },
          { name: city.city, url: `/${slug}` },
        ],
        structuredData: [{
          "@context": "https://schema.org",
          "@type": "MedicalWebPage",
          name: title,
          description: `${tt.label} in ${city.city}, ${city.stateAbbr}`,
          url: `${BASE_URL}/${slug}`,
        }],
      });
      await writePage(path.join(publicDir, `${slug}.html`), html);
    }
  }
}

// --- Cost & Comparison Pages ---
async function generateCostAndComparisonPages() {
  for (const cp of costPages) {
    const html = generatePage({
      urlPath: `/${cp.slug}`,
      title: cp.title,
      metaTitle: cp.metaTitle,
      metaDescription: cp.metaDescription,
      h1: cp.title,
      content: `<p>${escHtml(cp.metaDescription)}</p>
        <h2>Understanding Treatment Costs</h2>
        <p>The cost of addiction treatment varies by program type, location, and insurance coverage. RehabLookup provides transparent cost information and insurance verification tools to help you find affordable options.</p>`,
      breadcrumbs: [
        { name: "Home", url: "/" },
        { name: cp.title, url: `/${cp.slug}` },
      ],
    });
    await writePage(path.join(publicDir, `${cp.slug}.html`), html);
  }

  for (const comp of comparisonPages) {
    const html = generatePage({
      urlPath: `/${comp.slug}`,
      title: comp.title,
      metaTitle: comp.metaTitle,
      metaDescription: comp.metaDescription,
      h1: comp.title,
      content: `<p>${escHtml(comp.metaDescription)}</p>
        <p>Making the right treatment choice is critical for successful recovery. Compare key differences, costs, and outcomes to find the best fit.</p>`,
      breadcrumbs: [
        { name: "Home", url: "/" },
        { name: comp.title, url: `/${comp.slug}` },
      ],
    });
    await writePage(path.join(publicDir, `${comp.slug}.html`), html);
  }
}

// --- State Directory Pages (/rehab-centers/{state}) ---
async function generateStatePages() {
  for (const state of usStates) {
    const slug = stateToSlug(state);
    const title = `Rehab Centers in ${state}`;
    const citiesInState = topCities.filter((c) => c.state === state);
    const cityLinks = citiesInState.length
      ? `<h2>Cities in ${state}</h2><ul style="columns:2;list-style:disc;padding-left:20px">${citiesInState.map((c) => `<li><a href="/rehab-centers/${slug}/${c.slug}">${c.city}</a></li>`).join("")}</ul>`
      : "";
    const html = generatePage({
      urlPath: `/rehab-centers/${slug}`,
      title,
      metaTitle: `Rehab Centers in ${state} — Find Addiction Treatment | RehabLookup`,
      metaDescription: `Find accredited rehab centers in ${state}. Compare inpatient, outpatient, and detox programs. Verify insurance coverage and start recovery today.`,
      h1: title,
      content: `<p>Browse verified addiction treatment facilities in ${state}. RehabLookup lists accredited rehab centers offering detox, inpatient, outpatient, and dual diagnosis programs across the state.</p>
        <h2>Treatment Options in ${state}</h2>
        <p>${state} offers a range of substance abuse treatment programs including medical detox, residential inpatient, intensive outpatient (IOP), partial hospitalization (PHP), and medication-assisted treatment (MAT).</p>
        <h2>Insurance Coverage</h2>
        <p>Most major insurance providers cover addiction treatment in ${state} under the Mental Health Parity and Addiction Equity Act. Use our free verification tool to check your benefits.</p>
        ${cityLinks}`,
      breadcrumbs: [
        { name: "Home", url: "/" },
        { name: "Locations", url: "/locations" },
        { name: state, url: `/rehab-centers/${slug}` },
      ],
      structuredData: [{
        "@context": "https://schema.org",
        "@type": "MedicalWebPage",
        name: title,
        description: `Addiction treatment centers in ${state}`,
        url: `${BASE_URL}/rehab-centers/${slug}`,
      }],
      relatedLinks: treatmentTypes.map((tt) => ({ title: `${tt.label} in ${state}`, href: `/treatment-types/${tt.slug}/${slug}` })),
    });
    await writePage(path.join(publicDir, "rehab-centers", `${slug}.html`), html);
  }
}

// --- City Directory Pages (/rehab-centers/{state}/{city}) ---
async function generateCityPages() {
  for (const city of topCities) {
    const stateSlug = stateToSlug(city.state);
    const title = `Rehab Centers in ${city.city}, ${city.stateAbbr}`;
    const html = generatePage({
      urlPath: `/rehab-centers/${stateSlug}/${city.slug}`,
      title,
      metaTitle: `Rehab Centers in ${city.city}, ${city.stateAbbr} — Find Treatment | RehabLookup`,
      metaDescription: `Find accredited rehab centers in ${city.city}, ${city.stateAbbr}. Compare treatment programs, verify insurance, and start recovery today.`,
      h1: title,
      content: `<p>Search verified addiction treatment facilities in ${city.city}, ${city.state}. Compare inpatient, outpatient, detox, and specialty programs in the ${city.city} metropolitan area.</p>
        <h2>Treatment Programs in ${city.city}</h2>
        <p>${city.city} offers diverse addiction treatment options including medical detox, residential inpatient, intensive outpatient programs (IOP), partial hospitalization (PHP), dual diagnosis treatment, and medication-assisted treatment (MAT).</p>
        <h2>Insurance & Payment</h2>
        <p>Most rehab centers in ${city.city} accept major insurance plans. Verify your coverage with our free insurance check tool to find in-network facilities near you.</p>
        <h2>Getting Help in ${city.city}</h2>
        <p>If you or a loved one needs help with addiction in ${city.city}, our concierge team can match you with accredited programs based on your needs, insurance, and preferences.</p>`,
      breadcrumbs: [
        { name: "Home", url: "/" },
        { name: "Locations", url: "/locations" },
        { name: city.state, url: `/rehab-centers/${stateSlug}` },
        { name: city.city, url: `/rehab-centers/${stateSlug}/${city.slug}` },
      ],
      structuredData: [{
        "@context": "https://schema.org",
        "@type": "MedicalWebPage",
        name: title,
        description: `Addiction treatment centers in ${city.city}, ${city.stateAbbr}`,
        url: `${BASE_URL}/rehab-centers/${stateSlug}/${city.slug}`,
      }],
      relatedLinks: treatmentTypes.map((tt) => ({ title: `${tt.label} in ${city.city}`, href: `/${tt.slug}-in-${city.slug}` })),
    });
    await writePage(path.join(publicDir, "rehab-centers", stateSlug, `${city.slug}.html`), html);
  }
}

// --- State Treatment Pages (/treatment-types/{type}/{state}) ---
async function generateStateTreatmentPages() {
  const treatmentRoutes = [
    { routePrefix: "drug-addiction", label: "Drug Addiction Treatment" },
    { routePrefix: "alcohol-rehabilitation", label: "Alcohol Rehabilitation" },
    { routePrefix: "detox-programs", label: "Detox Programs" },
    { routePrefix: "residential-inpatient", label: "Residential Inpatient Rehab" },
    { routePrefix: "outpatient-programs", label: "Outpatient Programs" },
    { routePrefix: "dual-diagnosis-treatment", label: "Dual Diagnosis Treatment" },
  ];
  for (const tt of treatmentRoutes) {
    for (const state of usStates) {
      const slug = stateToSlug(state);
      const title = `${tt.label} in ${state}`;
      const html = generatePage({
        urlPath: `/treatment-types/${tt.routePrefix}/${slug}`,
        title,
        metaTitle: `${tt.label} in ${state} — Find Programs | RehabLookup`,
        metaDescription: `Find ${tt.label.toLowerCase()} centers in ${state}. Compare accredited facilities, verify insurance, and start recovery today.`,
        h1: title,
        content: `<p>Search accredited ${tt.label.toLowerCase()} programs in ${state}. RehabLookup provides verified facility listings with detailed program information.</p>
          <h2>${tt.label} Options in ${state}</h2>
          <p>${state} offers a range of ${tt.label.toLowerCase()} programs with varying levels of care, program lengths, and specializations to meet individual needs.</p>
          <h2>Insurance Coverage</h2>
          <p>Most insurance plans cover ${tt.label.toLowerCase()} in ${state}. Use our free insurance verification tool to check your benefits and find in-network facilities.</p>`,
        breadcrumbs: [
          { name: "Home", url: "/" },
          { name: "Treatment Types", url: "/treatment-types" },
          { name: tt.label, url: `/treatment-types/${tt.routePrefix}` },
          { name: state, url: `/treatment-types/${tt.routePrefix}/${slug}` },
        ],
        structuredData: [{
          "@context": "https://schema.org",
          "@type": "MedicalWebPage",
          name: title,
          description: `${tt.label} in ${state}`,
          url: `${BASE_URL}/treatment-types/${tt.routePrefix}/${slug}`,
        }],
      });
      await writePage(path.join(publicDir, "treatment-types", tt.routePrefix, `${slug}.html`), html);
    }
  }
}

// --- Insurance State Cross-Pages ---
async function generateInsuranceStatePages() {
  for (const ins of insurers) {
    // Main insurer page (only those without existing static HTML)
    const existingInsurancePages = ["aetna-rehab", "bcbs-treatment", "cigna-rehab", "united-healthcare-rehab", "medicare-rehab"];
    if (!existingInsurancePages.includes(ins.slug)) {
      const html = generatePage({
        urlPath: `/insurance/${ins.slug}`,
        title: `${ins.name} Rehab Coverage`,
        metaTitle: `${ins.name} Rehab Coverage — Addiction Treatment Insurance | RehabLookup`,
        metaDescription: `Learn how ${ins.name} covers addiction treatment. Find rehab centers accepting ${ins.name} insurance near you.`,
        h1: `${ins.name} Rehab Coverage`,
        content: `<p>Find rehab centers that accept ${ins.name} insurance. Learn about coverage for detox, inpatient, outpatient, and medication-assisted treatment.</p>
          <h2>What ${ins.name} Covers</h2>
          <p>${ins.name} covers substance use disorder treatment under the Mental Health Parity Act, including medical detox, inpatient rehabilitation, outpatient programs, and medication-assisted treatment (MAT).</p>`,
        breadcrumbs: [
          { name: "Home", url: "/" },
          { name: "Insurance", url: "/insurance" },
          { name: ins.name, url: `/insurance/${ins.slug}` },
        ],
      });
      await writePage(path.join(publicDir, "insurance", `${ins.slug}.html`), html);
    }

    // State cross-pages (top 10 states only for manageable size)
    const topStates = ["california", "florida", "texas", "new-york", "illinois", "pennsylvania", "ohio", "georgia", "north-carolina", "michigan"];
    for (const stateSlug of topStates) {
      const stateName = usStates.find((s) => stateToSlug(s) === stateSlug) || stateSlug;
      const slug = `${ins.slug}/${stateSlug}`;
      const html = generatePage({
        urlPath: `/insurance/${slug}`,
        title: `${ins.name} Rehab Coverage in ${stateName}`,
        metaTitle: `${ins.name} Rehab Coverage in ${stateName} | RehabLookup`,
        metaDescription: `Find rehab centers in ${stateName} that accept ${ins.name}. Learn about coverage, in-network facilities, and costs.`,
        h1: `${ins.name} Rehab Coverage in ${stateName}`,
        content: `<p>Find addiction treatment centers in ${stateName} that accept ${ins.name} insurance. Compare in-network facilities, verify your benefits, and start treatment.</p>
          <h2>${ins.name} Coverage Details in ${stateName}</h2>
          <p>${ins.name} provides coverage for substance abuse treatment in ${stateName}, including medical detox, residential treatment, outpatient programs, and MAT. Coverage details vary by specific plan.</p>`,
        breadcrumbs: [
          { name: "Home", url: "/" },
          { name: "Insurance", url: "/insurance" },
          { name: ins.name, url: `/insurance/${ins.slug}` },
          { name: stateName, url: `/insurance/${slug}` },
        ],
      });
      await writePage(path.join(publicDir, "insurance", ins.slug, `${stateSlug}.html`), html);
    }
  }
}

async function generateDemographicPages() {
  for (const page of demographicPages) {
    const html = generatePage({
      urlPath: `/${page.slug}`,
      title: page.title,
      metaTitle: page.metaTitle,
      metaDescription: page.metaDescription,
      h1: page.title,
      content: `<p>${page.intro}</p><p>Browse our directory to find accredited ${page.title.toLowerCase()} across the United States.</p>`,
      breadcrumbs: [
        { name: "Home", url: "/" },
        { name: "Treatment Programs", url: "/rehab-centers" },
        { name: page.title, url: `/${page.slug}` },
      ],
      structuredData: {
        "@context": "https://schema.org",
        "@type": "MedicalWebPage",
        name: page.title,
        description: page.metaDescription,
        url: `https://rehablookup.com/${page.slug}`,
        specialty: "Addiction Medicine",
      },
    });
    await writePage(path.join(publicDir, `${page.slug}.html`), html);
  }
}

async function generateSeekerGuidePages() {
  for (const page of seekerGuidePages) {
    const html = generatePage({
      urlPath: `/${page.slug}`,
      title: page.title,
      metaTitle: page.metaTitle,
      metaDescription: page.metaDescription,
      h1: page.title,
      content: `<p>${page.intro}</p><p>Use our resources to get the guidance you need and connect with treatment programs that can help.</p>`,
      breadcrumbs: [
        { name: "Home", url: "/" },
        { name: "Guides", url: "/rehab-centers" },
        { name: page.title, url: `/${page.slug}` },
      ],
      structuredData: {
        "@context": "https://schema.org",
        "@type": "Article",
        name: page.title,
        description: page.metaDescription,
        url: `https://rehablookup.com/${page.slug}`,
      },
    });
    await writePage(path.join(publicDir, `${page.slug}.html`), html);
  }
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  console.log("[seo-html] Starting static HTML generation...");

  await Promise.all([
    generateTreatmentHubs(),
    generateSubstancePages(),
    generateNearMePages(),
    generateBestInStatePages(),
    generateCostAndComparisonPages(),
    generateDemographicPages(),
    generateSeekerGuidePages(),
  ]);

  // These have more files, run sequentially to avoid filesystem pressure
  await generateCityTreatmentPages();
  await generateInsuranceStatePages();
  await generateStatePages();
  await generateCityPages();
  await generateStateTreatmentPages();

  console.log(`[seo-html] Generated ${pagesGenerated} static HTML pages`);
}

main().catch((err) => {
  console.error("[seo-html] Fatal error:", err);
  process.exit(1);
});
