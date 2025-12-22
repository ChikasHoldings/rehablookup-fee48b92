// Centralized Lead Intake Form Types

export interface LeadIntakeData {
  // Step 1 - Your Situation
  whoSeekingHelp: "self" | "loved-one" | "";
  locationZip: string;
  locationCityState: string;
  urgency: "immediate" | "within-week" | "flexible" | "";
  
  // Step 2 - Treatment Needs
  primarySubstance: string[];
  levelOfCare: string;
  dualDiagnosis: "yes" | "no" | "not-sure" | "";
  specialNeeds: string[];
  
  // Step 3 - Insurance & Payment
  insuranceType: string;
  insuranceProvider: string;
  budgetPreference: string;
  
  // Step 4 - Contact Info
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  preferredContact: "call" | "text" | "email";
  message: string;
  
  // Anti-spam
  website: string;
}

export const initialFormData: LeadIntakeData = {
  whoSeekingHelp: "",
  locationZip: "",
  locationCityState: "",
  urgency: "",
  primarySubstance: [],
  levelOfCare: "",
  dualDiagnosis: "",
  specialNeeds: [],
  insuranceType: "",
  insuranceProvider: "",
  budgetPreference: "",
  firstName: "",
  lastName: "",
  phone: "",
  email: "",
  preferredContact: "call",
  message: "",
  website: "",
};

export const TOTAL_STEPS = 4;

export const STEP_CONFIG = [
  { number: 1, title: "Your Situation", description: "Tell us about yourself" },
  { number: 2, title: "Treatment Needs", description: "What kind of help do you need" },
  { number: 3, title: "Insurance & Payment", description: "Coverage information" },
  { number: 4, title: "Contact Info", description: "How can we reach you" },
];

// Form Options
export const WHO_SEEKING_OPTIONS = [
  { value: "self", label: "Myself", emoji: "👤", description: "I'm looking for treatment for myself" },
  { value: "loved-one", label: "A Loved One", emoji: "💜", description: "I'm helping someone else find treatment" },
] as const;

export const URGENCY_OPTIONS = [
  { value: "immediate", label: "ASAP / Urgent", emoji: "🚨", description: "Need help within 24-48 hours", color: "red" },
  { value: "within-week", label: "This Week", emoji: "📅", description: "Looking to start within 7 days", color: "amber" },
  { value: "flexible", label: "Flexible", emoji: "🔍", description: "Exploring options, no rush", color: "blue" },
] as const;

export const SUBSTANCE_OPTIONS = [
  { value: "alcohol", label: "Alcohol" },
  { value: "opioids", label: "Opioids (Heroin, Fentanyl, Painkillers)" },
  { value: "cocaine", label: "Cocaine / Crack" },
  { value: "meth", label: "Methamphetamine" },
  { value: "benzos", label: "Benzodiazepines (Xanax, Valium)" },
  { value: "marijuana", label: "Marijuana" },
  { value: "prescription", label: "Other Prescription Drugs" },
  { value: "other", label: "Other Substances" },
] as const;

export const LEVEL_OF_CARE_OPTIONS = [
  { value: "detox", label: "Medical Detox", description: "Supervised withdrawal management" },
  { value: "inpatient", label: "Inpatient / Residential", description: "24/7 care at a treatment facility" },
  { value: "php", label: "Partial Hospitalization (PHP)", description: "Day treatment, evenings at home" },
  { value: "iop", label: "Intensive Outpatient (IOP)", description: "Several hours a day, 3-5 days/week" },
  { value: "outpatient", label: "Standard Outpatient", description: "Weekly therapy sessions" },
  { value: "sober-living", label: "Sober Living", description: "Structured housing with peer support" },
  { value: "mat", label: "Medication-Assisted Treatment", description: "Suboxone, Methadone, Vivitrol" },
  { value: "not-sure", label: "Not Sure - I Need Guidance", description: "Help me understand my options" },
] as const;

export const DUAL_DIAGNOSIS_OPTIONS = [
  { value: "yes", label: "Yes", description: "Depression, anxiety, PTSD, bipolar, etc." },
  { value: "no", label: "No" },
  { value: "not-sure", label: "Not Sure" },
] as const;

export const SPECIAL_NEEDS_OPTIONS = [
  { value: "lgbtq", label: "LGBTQ+ Affirming" },
  { value: "veterans", label: "Veterans / Military" },
  { value: "women-only", label: "Women Only" },
  { value: "men-only", label: "Men Only" },
  { value: "young-adults", label: "Young Adults (18-25)" },
  { value: "seniors", label: "Seniors (55+)" },
  { value: "spanish", label: "Spanish Speaking" },
  { value: "court-ordered", label: "Court Ordered" },
  { value: "pregnant", label: "Pregnant / Postpartum" },
  { value: "chronic-pain", label: "Chronic Pain Management" },
  { value: "executives", label: "Executive / Professional" },
  { value: "faith-based", label: "Faith-Based Program" },
] as const;

export const INSURANCE_TYPE_OPTIONS = [
  { value: "ppo", label: "PPO / Private Insurance", description: "Blue Cross, Aetna, United, Cigna, etc." },
  { value: "hmo", label: "HMO", description: "Kaiser, etc." },
  { value: "medicaid", label: "Medicaid", description: "State-funded insurance" },
  { value: "medicare", label: "Medicare", description: "Federal insurance (65+ or disabled)" },
  { value: "tricare", label: "TRICARE / VA", description: "Military / Veterans insurance" },
  { value: "self-pay", label: "Self-Pay / Cash", description: "Paying out of pocket" },
  { value: "not-sure", label: "Not Sure", description: "I need help understanding my coverage" },
] as const;

export const BUDGET_OPTIONS = [
  { value: "low", label: "Budget-Conscious", description: "Looking for affordable options" },
  { value: "moderate", label: "Moderate", description: "Balance of cost and quality" },
  { value: "flexible", label: "Flexible", description: "Quality is priority, cost secondary" },
  { value: "luxury", label: "Luxury / Executive", description: "Premium amenities and privacy" },
] as const;

export const PREFERRED_CONTACT_OPTIONS = [
  { value: "call", label: "Phone Call", emoji: "📞" },
  { value: "text", label: "Text Message", emoji: "💬" },
  { value: "email", label: "Email", emoji: "📧" },
] as const;
