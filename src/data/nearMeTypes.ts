/**
 * All near-me type slugs used across the platform.
 * Single source of truth for routing, sitemap, and components.
 */
export const NEAR_ME_TYPES = [
  // Core treatment types
  { slug: "rehab-near-me", label: "Rehab", treatmentType: "Addiction Treatment" },
  { slug: "drug-rehab-near-me", label: "Drug Rehab", treatmentType: "Drug Addiction Treatment" },
  { slug: "alcohol-rehab-near-me", label: "Alcohol Rehab", treatmentType: "Alcohol Addiction Treatment" },
  { slug: "detox-near-me", label: "Detox", treatmentType: "Detox Programs" },
  { slug: "inpatient-rehab-near-me", label: "Inpatient Rehab", treatmentType: "Residential Treatment" },
  { slug: "outpatient-near-me", label: "Outpatient Treatment", treatmentType: "Outpatient Programs" },
  { slug: "outpatient-rehab-near-me", label: "Outpatient Rehab", treatmentType: "Outpatient Rehabilitation" },
  { slug: "dual-diagnosis-near-me", label: "Dual Diagnosis", treatmentType: "Dual Diagnosis Treatment" },
  { slug: "dual-diagnosis-rehab-near-me", label: "Dual Diagnosis Rehab", treatmentType: "Dual Diagnosis Rehabilitation" },

  // Affordability & cost
  { slug: "free-rehab-near-me", label: "Free Rehab", treatmentType: "Free Treatment Programs" },
  { slug: "affordable-rehab-near-me", label: "Affordable Rehab", treatmentType: "Affordable Treatment" },
  { slug: "low-cost-rehab-near-me", label: "Low-Cost Rehab", treatmentType: "Low-Cost Treatment Programs" },
  { slug: "sliding-scale-rehab-near-me", label: "Sliding Scale Rehab", treatmentType: "Sliding Scale Treatment" },

  // Facility types
  { slug: "luxury-rehab-near-me", label: "Luxury Rehab", treatmentType: "Luxury Rehabilitation" },
  { slug: "sober-living-near-me", label: "Sober Living", treatmentType: "Sober Living Homes" },
  { slug: "faith-based-rehab-near-me", label: "Faith-Based Rehab", treatmentType: "Faith-Based Treatment" },
  { slug: "christian-rehab-near-me", label: "Christian Rehab", treatmentType: "Christian-Based Treatment" },
  { slug: "holistic-rehab-near-me", label: "Holistic Rehab", treatmentType: "Holistic Treatment" },

  // Demographics
  { slug: "womens-rehab-near-me", label: "Women's Rehab", treatmentType: "Women's Treatment Programs" },
  { slug: "mens-rehab-near-me", label: "Men's Rehab", treatmentType: "Men's Treatment Programs" },
  { slug: "teen-rehab-near-me", label: "Teen Rehab", treatmentType: "Adolescent Treatment" },
  { slug: "veterans-rehab-near-me", label: "Veterans Rehab", treatmentType: "Veterans Treatment" },
  { slug: "young-adult-rehab-near-me", label: "Young Adult Rehab", treatmentType: "Young Adult Treatment" },
  { slug: "lgbtq-rehab-near-me", label: "LGBTQ+ Rehab", treatmentType: "LGBTQ+ Affirming Treatment" },
  { slug: "seniors-rehab-near-me", label: "Senior Rehab", treatmentType: "Senior Treatment Programs" },
  { slug: "first-responder-rehab-near-me", label: "First Responder Rehab", treatmentType: "First Responder Treatment" },

  // Substance-specific
  { slug: "fentanyl-rehab-near-me", label: "Fentanyl Rehab", treatmentType: "Fentanyl Addiction Treatment" },
  { slug: "cocaine-rehab-near-me", label: "Cocaine Rehab", treatmentType: "Cocaine Addiction Treatment" },
  { slug: "heroin-rehab-near-me", label: "Heroin Rehab", treatmentType: "Heroin Addiction Treatment" },
  { slug: "opioid-rehab-near-me", label: "Opioid Rehab", treatmentType: "Opioid Addiction Treatment" },
  { slug: "meth-rehab-near-me", label: "Meth Rehab", treatmentType: "Methamphetamine Treatment" },
  { slug: "prescription-drug-rehab-near-me", label: "Prescription Drug Rehab", treatmentType: "Prescription Drug Treatment" },
  { slug: "benzo-rehab-near-me", label: "Benzo Rehab", treatmentType: "Benzodiazepine Treatment" },
  { slug: "xanax-rehab-near-me", label: "Xanax Rehab", treatmentType: "Xanax Addiction Treatment" },
  { slug: "kratom-rehab-near-me", label: "Kratom Rehab", treatmentType: "Kratom Addiction Treatment" },
  { slug: "marijuana-rehab-near-me", label: "Marijuana Rehab", treatmentType: "Marijuana Addiction Treatment" },

  // Insurance-specific
  { slug: "medicaid-rehab-near-me", label: "Medicaid Rehab", treatmentType: "Medicaid-Accepted Treatment" },
  { slug: "medicare-rehab-near-me", label: "Medicare Rehab", treatmentType: "Medicare-Accepted Treatment" },
  { slug: "blue-cross-rehab-near-me", label: "Blue Cross Rehab", treatmentType: "Blue Cross Blue Shield Treatment" },
  { slug: "aetna-rehab-near-me", label: "Aetna Rehab", treatmentType: "Aetna-Covered Treatment" },
  { slug: "cigna-rehab-near-me", label: "Cigna Rehab", treatmentType: "Cigna-Covered Treatment" },
  { slug: "united-healthcare-rehab-near-me", label: "United Healthcare Rehab", treatmentType: "United Healthcare Treatment" },
  { slug: "tricare-rehab-near-me", label: "TRICARE Rehab", treatmentType: "TRICARE-Covered Treatment" },
  { slug: "humana-rehab-near-me", label: "Humana Rehab", treatmentType: "Humana-Covered Treatment" },

  // Program levels & duration
  { slug: "iop-near-me", label: "IOP", treatmentType: "Intensive Outpatient Programs" },
  { slug: "php-near-me", label: "PHP", treatmentType: "Partial Hospitalization Programs" },
  { slug: "long-term-rehab-near-me", label: "Long-Term Rehab", treatmentType: "Long-Term Treatment" },
  { slug: "30-day-rehab-near-me", label: "30-Day Rehab", treatmentType: "30-Day Treatment Programs" },
  { slug: "60-day-rehab-near-me", label: "60-Day Rehab", treatmentType: "60-Day Treatment Programs" },
  { slug: "90-day-rehab-near-me", label: "90-Day Rehab", treatmentType: "90-Day Treatment Programs" },
  { slug: "short-term-rehab-near-me", label: "Short-Term Rehab", treatmentType: "Short-Term Treatment Programs" },

  // Urgency-based (HIGH CONVERSION)
  { slug: "emergency-rehab-near-me", label: "Emergency Rehab", treatmentType: "Emergency Addiction Treatment" },
  { slug: "same-day-rehab-near-me", label: "Same-Day Rehab", treatmentType: "Same-Day Admission Treatment" },
  { slug: "24-7-detox-near-me", label: "24/7 Detox", treatmentType: "24/7 Detox Centers" },
  { slug: "crisis-detox-near-me", label: "Crisis Detox", treatmentType: "Crisis Detox Programs" },
  { slug: "walk-in-rehab-near-me", label: "Walk-In Rehab", treatmentType: "Walk-In Treatment Centers" },
  { slug: "immediate-rehab-near-me", label: "Immediate Rehab", treatmentType: "Immediate Admission Treatment" },

  // Specialty
  { slug: "couples-rehab-near-me", label: "Couples Rehab", treatmentType: "Couples Treatment" },
  { slug: "executive-rehab-near-me", label: "Executive Rehab", treatmentType: "Executive Treatment" },
  { slug: "mat-clinic-near-me", label: "MAT Clinic", treatmentType: "Medication-Assisted Treatment" },
  { slug: "suboxone-clinic-near-me", label: "Suboxone Clinic", treatmentType: "Suboxone Treatment" },
  { slug: "methadone-clinic-near-me", label: "Methadone Clinic", treatmentType: "Methadone Treatment" },
  { slug: "court-ordered-rehab-near-me", label: "Court-Ordered Rehab", treatmentType: "Court-Ordered Treatment" },
] as const;

export type NearMeType = typeof NEAR_ME_TYPES[number];

export function getNearMeTypeBySlug(slug: string): NearMeType | undefined {
  return NEAR_ME_TYPES.find((t) => t.slug === slug);
}

export const NEAR_ME_SLUGS = NEAR_ME_TYPES.map((t) => t.slug);
