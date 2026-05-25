// Canonical Lead row type shared across the provider & admin lead surfaces.
// (Extracted from the former LeadDetailPanel component, which was unused and
//  removed; consumers import this type only.)

export interface Lead {
  id: string;
  name: string;
  phone: string;
  email: string;
  message: string | null;
  preferred_contact: string;
  created_at: string;
  status: string;
  facility_id: string;
  source: string | null;
  email_verified: boolean | null;
  snooze_until: string | null;
  who_seeking_help: string | null;
  location_zip: string | null;
  location_city_state: string | null;
  urgency: string | null;
  primary_substance: string[] | null;
  level_of_care: string | null;
  dual_diagnosis: string | null;
  insurance_type: string | null;
  insurance_provider: string | null;
  budget_preference: string | null;
  special_needs: string[] | null;
  qualified: boolean | null;
  exclusivity: string | null;
  // Additional fields
  assignment_status: string | null;
  assignment_reason: string | null;
  assigned_at: string | null;
  validation_status: string | null;
  quality_flag: string | null;
  routing_order: number | null;
  shared_with: string[] | null;
  follow_up_reminder_sent_at: string | null;
  ip_hash: string | null;
  qualification_reason: string | null;
  // NEW: Industry-standard fields
  age_range: string | null;
  gender: string | null;
  relationship_to_patient: string | null;
  previous_treatment: string | null;
  previous_treatment_details: string | null;
  co_occurring_conditions: string[] | null;
  employment_status: string | null;
  veteran_status: string | null;
  legal_involvement: string | null;
  readiness_level: string | null;
  best_time_to_call: string | null;
  // Redistribution fields
  redistribution_status: string | null;
  exclusive_until: string | null;
  extended_until: string | null;
  original_facility_id: string | null;
  provider_response_status: string | null;
  provider_responded_at: string | null;
  provider_response_notes: string | null;
  inquiry_type: string | null;
}
