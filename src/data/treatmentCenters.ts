export interface TreatmentCenter {
  id: string;
  name: string;
  city: string;
  state: string;
  zipCode: string;
  address: string;
  phone: string;
  treatmentTypes: string[];
  insuranceAccepted: string[];
  description: string;
  programOverview: string;
  featured?: boolean;
  rating: number | null;
  reviewCount: number;
  amenities: string[];
  image: string | null;
}

// Production: No static mock data - all facilities come from the database
export const treatmentCenters: TreatmentCenter[] = [];

// Hero `SearchForm` dropdown options. Mirror the canonical TREATMENT_FILTERS
// / INSURANCE_FILTERS labels in src/lib/searchFilters.ts so the values the
// hero writes into the `?treatment=` / `?insurance=` URL params resolve
// cleanly through `matchesTreatmentFilter` / `matchesInsuranceFilter` on
// the receiving SearchResults page. The matcher is label- and alias-
// tolerant so this list could in theory be free-text — keeping the labels
// in sync just makes the URL deterministic.
export const treatmentTypes = [
  "Detox",
  "Inpatient / Residential",
  "Outpatient",
  "Dual Diagnosis",
  "Holistic Therapy",
  "Medication-Assisted (MAT)",
  "Cognitive Behavioral (CBT)",
  "Trauma Therapy",
  "Aftercare / Continuing Care",
  "12-Step Programs",
  "Family Therapy",
];

export const insuranceProviders = [
  "Aetna",
  "Blue Cross Blue Shield",
  "Cigna",
  "United Healthcare",
  "Kaiser Permanente",
  "Humana",
  "Anthem",
  "Medicare",
  "Medicaid",
  "TRICARE",
  "Self-Pay / Private Pay",
  "Sliding Scale / Financial Assistance",
];

export const usStates = [
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut",
  "Delaware", "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa",
  "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan",
  "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire",
  "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio",
  "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota",
  "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington", "West Virginia",
  "Wisconsin", "Wyoming"
];
