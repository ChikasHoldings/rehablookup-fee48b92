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

export const treatmentTypes = [
  "Detox",
  "Inpatient",
  "Outpatient",
  "Dual Diagnosis",
  "Residential Treatment",
  "Partial Hospitalization (PHP)",
  "Intensive Outpatient (IOP)",
];

export const insuranceProviders = [
  "Aetna",
  "Ambetter",
  "Anthem",
  "Blue Cross Blue Shield",
  "Carelon",
  "Cigna",
  "Humana",
  "Kaiser Permanente",
  "Magellan",
  "Medicare",
  "Medicaid",
  "Molina Healthcare",
  "MultiPlan",
  "Oscar Health",
  "Oxford",
  "Tricare",
  "United Healthcare",
  "Self-Pay",
  "Other",
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
