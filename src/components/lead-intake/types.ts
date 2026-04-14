// Unified Lead Intake Form Types

export interface LeadIntakeFormData {
  // Step 1 - Immediate Need
  whoSeekingHelp: string;
  locationZip: string;
  locationCityState: string;
  urgency: string;
  
  // NEW - Demographics (Step 1)
  ageRange: string;
  gender: string;
  relationshipToPatient: string;
  
  // Step 2 - Eligibility & Fit
  primarySubstance: string[];
  levelOfCare: string;
  dualDiagnosis: string;
  insuranceType: string;
  insuranceProvider: string;
  budgetPreference: string;
  specialNeeds: string[];
  
  // NEW - Clinical & Background (Step 2)
  previousTreatment: string;
  previousTreatmentDetails: string;
  coOccurringConditions: string[];
  veteranStatus: string;
  legalInvolvement: string;
  readinessLevel: string;
  
  // Step 3 - Contact & Verification
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  preferredContact: string;
  message: string;
  
  // NEW - Contact Preferences (Step 3)
  bestTimeToCall: string;
  employmentStatus: string;
  
  // Anti-spam honeypot (should remain empty)
  website: string;
}

export const initialLeadIntakeFormData: LeadIntakeFormData = {
  whoSeekingHelp: "",
  locationZip: "",
  locationCityState: "",
  urgency: "",
  ageRange: "",
  gender: "",
  relationshipToPatient: "",
  primarySubstance: [],
  levelOfCare: "",
  dualDiagnosis: "",
  insuranceType: "",
  insuranceProvider: "",
  budgetPreference: "",
  specialNeeds: [],
  previousTreatment: "",
  previousTreatmentDetails: "",
  coOccurringConditions: [],
  veteranStatus: "",
  legalInvolvement: "",
  readinessLevel: "",
  firstName: "",
  lastName: "",
  phone: "",
  email: "",
  preferredContact: "call",
  message: "",
  bestTimeToCall: "",
  employmentStatus: "",
  website: "", // Honeypot
};

export interface LeadIntakeContextValue {
  formData: LeadIntakeFormData;
  updateFormData: (updates: Partial<LeadIntakeFormData>) => void;
  currentStep: number;
  setCurrentStep: (step: number) => void;
  facilityId: string | null;
  facilityName: string | null;
  isSubmitting: boolean;
  isSubmitted: boolean;
  handleSubmit: () => Promise<void>;
}

export const TOTAL_STEPS = 3;

// Form options
export const WHO_SEEKING_OPTIONS = [
  { value: "self", label: "Myself" },
  { value: "loved-one", label: "A Loved One" },
];

export const URGENCY_OPTIONS = [
  { value: "immediate", label: "ASAP or urgently" },
  { value: "within-week", label: "Within a week" },
  { value: "flexible", label: "Flexible — just exploring options" },
];

// NEW - Age Range Options
export const AGE_RANGE_OPTIONS = [
  { value: "18-25", label: "18-25 years old" },
  { value: "26-35", label: "26-35 years old" },
  { value: "36-45", label: "36-45 years old" },
  { value: "46-55", label: "46-55 years old" },
  { value: "56+", label: "56+ years old" },
];

// NEW - Gender Options
export const GENDER_OPTIONS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "non-binary", label: "Non-binary" },
  { value: "prefer-not-say", label: "Prefer not to say" },
];

// NEW - Relationship to Patient Options
export const RELATIONSHIP_OPTIONS = [
  { value: "self", label: "Self (I am the patient)" },
  { value: "parent", label: "Parent" },
  { value: "spouse", label: "Spouse/Partner" },
  { value: "child", label: "Adult Child" },
  { value: "sibling", label: "Sibling" },
  { value: "friend", label: "Friend" },
  { value: "professional", label: "Healthcare Professional" },
  { value: "other", label: "Other" },
];

export const SUBSTANCE_OPTIONS = [
  "Alcohol",
  "Opioids (Heroin, Fentanyl, etc.)",
  "Prescription Drugs",
  "Cocaine/Crack",
  "Methamphetamine",
  "Marijuana",
  "Benzodiazepines",
  "Other",
];

export const LEVEL_OF_CARE_OPTIONS = [
  { value: "detox", label: "Medical Detox" },
  { value: "inpatient", label: "Inpatient / Residential" },
  { value: "php", label: "Partial Hospitalization (PHP)" },
  { value: "iop", label: "Intensive Outpatient (IOP)" },
  { value: "outpatient", label: "Standard Outpatient" },
  { value: "sober-living", label: "Sober Living / Halfway House" },
  { value: "mat", label: "Medication-Assisted Treatment (MAT)" },
  { value: "dual-diagnosis", label: "Dual Diagnosis Treatment" },
  { value: "not-sure", label: "Not sure — I need guidance" },
];

export const DUAL_DIAGNOSIS_OPTIONS = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
  { value: "not-sure", label: "Not Sure" },
];

export const INSURANCE_TYPE_OPTIONS = [
  { value: "ppo", label: "PPO / Private Insurance" },
  { value: "medicaid", label: "Medicaid" },
  { value: "medicare", label: "Medicare" },
  { value: "self-pay", label: "Self-Pay / No Insurance" },
  { value: "not-sure", label: "Not sure" },
];

export const BUDGET_OPTIONS = [
  { value: "low", label: "Budget-conscious" },
  { value: "medium", label: "Moderate" },
  { value: "flexible", label: "Flexible / Cost not a concern" },
];

export const SPECIAL_NEEDS_OPTIONS = [
  { value: "dual-diagnosis", label: "Dual Diagnosis (Mental Health)" },
  { value: "court-ordered", label: "Court Ordered" },
  { value: "couples-family", label: "Couples / Family Treatment" },
  { value: "spanish-speaking", label: "Spanish Speaking" },
  { value: "women-only", label: "Women Only" },
  { value: "men-only", label: "Men Only" },
  { value: "lgbtq-friendly", label: "LGBTQ+ Friendly" },
];

// NEW - Previous Treatment Options
export const PREVIOUS_TREATMENT_OPTIONS = [
  { value: "none", label: "No previous treatment" },
  { value: "once", label: "Been to treatment once before" },
  { value: "multiple", label: "Multiple treatment experiences" },
  { value: "currently-in", label: "Currently in treatment (looking to step up/down)" },
];

// NEW - Readiness Level Options
export const READINESS_OPTIONS = [
  { value: "ready-now", label: "Ready to start immediately" },
  { value: "considering", label: "Seriously considering, need more info" },
  { value: "researching", label: "Early research, exploring options" },
  { value: "helping-someone", label: "Helping someone else decide" },
];

// NEW - Best Time to Call Options
export const BEST_TIME_OPTIONS = [
  { value: "morning", label: "Morning (8am-12pm)" },
  { value: "afternoon", label: "Afternoon (12pm-5pm)" },
  { value: "evening", label: "Evening (5pm-8pm)" },
  { value: "anytime", label: "Anytime" },
];

// NEW - Veteran Status Options
export const VETERAN_STATUS_OPTIONS = [
  { value: "none", label: "Not applicable" },
  { value: "veteran", label: "Veteran" },
  { value: "active-duty", label: "Active Duty Military" },
  { value: "family-of-veteran", label: "Family member of Veteran" },
];

// NEW - Legal Involvement Options
export const LEGAL_OPTIONS = [
  { value: "none", label: "No legal involvement" },
  { value: "court-ordered", label: "Court ordered treatment" },
  { value: "drug-court", label: "Drug court participant" },
  { value: "probation", label: "On probation/parole" },
  { value: "pending", label: "Pending legal matters" },
];

// NEW - Employment Status Options
export const EMPLOYMENT_OPTIONS = [
  { value: "employed", label: "Employed (full/part time)" },
  { value: "unemployed", label: "Unemployed" },
  { value: "student", label: "Student" },
  { value: "retired", label: "Retired" },
  { value: "disabled", label: "On disability" },
];

// NEW - Co-Occurring Conditions Options
export const CO_OCCURRING_OPTIONS = [
  { value: "anxiety", label: "Anxiety" },
  { value: "depression", label: "Depression" },
  { value: "ptsd", label: "PTSD / Trauma" },
  { value: "bipolar", label: "Bipolar Disorder" },
  { value: "eating-disorder", label: "Eating Disorder" },
  { value: "adhd", label: "ADHD" },
  { value: "other", label: "Other" },
];