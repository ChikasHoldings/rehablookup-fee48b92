/**
 * Shared constants for facility-related data across onboarding and editing.
 * This ensures consistency between ProviderSignup and ListingEditor.
 */

export const FACILITY_TYPES = [
  { value: "Residential Treatment Center", label: "Residential Treatment Center" },
  { value: "Outpatient Program", label: "Outpatient Program" },
  { value: "Detox Center", label: "Detox Center" },
  { value: "Intensive Outpatient (IOP)", label: "Intensive Outpatient (IOP)" },
  { value: "Partial Hospitalization (PHP)", label: "Partial Hospitalization (PHP)" },
  { value: "Sober Living", label: "Sober Living" },
  { value: "Dual Diagnosis", label: "Dual Diagnosis" },
  { value: "Luxury Rehab", label: "Luxury Rehab" },
  { value: "Telehealth/Virtual", label: "Telehealth/Virtual" },
] as const;

export const FACILITY_TYPE_VALUES = FACILITY_TYPES.map(t => t.value);

export const TREATMENT_SERVICES = [
  "Detox Programs",
  "Inpatient Treatment",
  "Outpatient Treatment",
  "Intensive Outpatient (IOP)",
  "Partial Hospitalization (PHP)",
  "Medication-Assisted Treatment (MAT)",
  "Dual Diagnosis Treatment",
  "Individual Therapy",
  "Group Therapy",
  "Family Therapy",
  "Cognitive Behavioral Therapy (CBT)",
  "Trauma Therapy",
  "12-Step Programs",
  "Holistic Therapy",
  "Aftercare Planning",
  "Relapse Prevention",
  "Mental Health Services",
] as const;

export const INSURANCE_PROVIDERS = [
  "Aetna",
  "Anthem Blue Cross",
  "Blue Cross Blue Shield",
  "Cigna",
  "Humana",
  "Kaiser Permanente",
  "UnitedHealthcare",
  "Medicare",
  "Medicaid",
  "Tricare",
  "Self-Pay",
  "Private Pay",
  "Sliding Scale",
  "Financial Assistance",
] as const;

export const AGE_GROUPS = [
  "Adults (18+)",
  "Young Adults (18-25)",
  "Adolescents (13-17)",
  "Seniors (65+)",
  "All Ages",
] as const;

export const GENDER_OPTIONS = [
  { value: "all", label: "All Genders" },
  { value: "male", label: "Men Only" },
  { value: "female", label: "Women Only" },
] as const;

export const BED_COUNT_OPTIONS = [
  { value: "1-10", label: "1-10" },
  { value: "11-25", label: "11-25" },
  { value: "26-50", label: "26-50" },
  { value: "51-100", label: "51-100" },
  { value: "100+", label: "100+" },
] as const;

export const US_STATES = [
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut",
  "Delaware", "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa",
  "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan",
  "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire",
  "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio",
  "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota",
  "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington", "West Virginia",
  "Wisconsin", "Wyoming"
] as const;

export const ACCREDITATION_OPTIONS = [
  { value: "JCAHO", label: "JCAHO Accredited", description: "Joint Commission on Accreditation of Healthcare Organizations" },
  { value: "CARF", label: "CARF Certified", description: "Commission on Accreditation of Rehabilitation Facilities" },
  { value: "LegitScript", label: "LegitScript Certified", description: "Verified for advertising compliance" },
  { value: "NAATP", label: "NAATP Member", description: "National Association of Addiction Treatment Providers" },
  { value: "State Licensed", label: "State Licensed", description: "Licensed by state regulatory authority" },
  { value: "SAMHSA Listed", label: "SAMHSA Listed", description: "Listed in SAMHSA's National Directory" },
] as const;
