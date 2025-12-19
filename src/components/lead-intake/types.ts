// Unified Lead Intake Form Types

export interface LeadIntakeFormData {
  // Step 1 - Immediate Need
  whoSeekingHelp: string;
  locationZip: string;
  locationCityState: string;
  urgency: string;
  
  // Step 2 - Eligibility & Fit
  primarySubstance: string[];
  levelOfCare: string;
  dualDiagnosis: string;
  insuranceType: string;
  insuranceProvider: string;
  budgetPreference: string;
  specialNeeds: string[];
  
  // Step 3 - Contact & Verification
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  preferredContact: string;
  message: string;
  
  // Anti-spam honeypot (should remain empty)
  website: string;
}

export const initialLeadIntakeFormData: LeadIntakeFormData = {
  whoSeekingHelp: "",
  locationZip: "",
  locationCityState: "",
  urgency: "",
  primarySubstance: [],
  levelOfCare: "",
  dualDiagnosis: "",
  insuranceType: "",
  insuranceProvider: "",
  budgetPreference: "",
  specialNeeds: [],
  firstName: "",
  lastName: "",
  phone: "",
  email: "",
  preferredContact: "call",
  message: "",
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

export const STEP_LABELS = ["About You", "Treatment Details", "Contact Info"];
export const TOTAL_STEPS = 3;

// Form options
export const WHO_SEEKING_OPTIONS = [
  { value: "self", label: "Myself" },
  { value: "loved-one", label: "A Loved One" },
];

export const URGENCY_OPTIONS = [
  { value: "immediate", label: "Immediate — I need help today" },
  { value: "within-week", label: "Within a week" },
  { value: "flexible", label: "Flexible — just exploring options" },
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
  { value: "detox", label: "Detox" },
  { value: "inpatient", label: "Inpatient / Residential" },
  { value: "outpatient", label: "Outpatient" },
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
