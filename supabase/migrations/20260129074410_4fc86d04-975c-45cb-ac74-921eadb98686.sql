-- Add industry-standard fields to leads table for enhanced intake
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS age_range text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS gender text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS relationship_to_patient text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS previous_treatment text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS previous_treatment_details text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS co_occurring_conditions text[];
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS employment_status text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS veteran_status text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS legal_involvement text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS readiness_level text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS best_time_to_call text;

-- Drop and recreate the view with new fields (maintaining exact column order)
DROP VIEW IF EXISTS public.leads_provider_view;

CREATE VIEW public.leads_provider_view
WITH (security_invoker = on)
AS
SELECT 
  l.id,
  l.facility_id,
  l.status,
  l.created_at,
  l.urgency,
  l.level_of_care,
  l.source,
  l.location_city_state,
  l.location_zip,
  l.primary_substance,
  l.insurance_type,
  l.message,
  l.who_seeking_help,
  l.dual_diagnosis,
  l.insurance_provider,
  l.budget_preference,
  l.email_verified,
  l.qualified,
  l.qualification_reason,
  l.assignment_status,
  l.inquiry_type,
  l.provider_response_status,
  l.provider_responded_at,
  l.follow_up_reminder_sent_at,
  l.snooze_until,
  -- Masked PII fields
  CASE 
    WHEN public.is_lead_unlocked(l.id, l.facility_id) THEN l.name
    ELSE concat(left(split_part(l.name, ' ', 1), 1), repeat('*', greatest(length(split_part(l.name, ' ', 1)) - 1, 2)), ' ', 
         CASE WHEN split_part(l.name, ' ', 2) != '' THEN left(split_part(l.name, ' ', 2), 1) || '.' ELSE '' END)
  END AS name,
  CASE 
    WHEN public.is_lead_unlocked(l.id, l.facility_id) THEN l.email
    ELSE '••••@••••.•••'
  END AS email,
  CASE 
    WHEN public.is_lead_unlocked(l.id, l.facility_id) THEN l.phone
    ELSE '(•••) •••-••••'
  END AS phone,
  public.is_lead_unlocked(l.id, l.facility_id) AS is_unlocked,
  -- Additional non-PII fields
  l.preferred_contact,
  l.special_needs,
  l.exclusivity,
  l.routing_order,
  l.assigned_at,
  l.assignment_reason,
  l.shared_with,
  l.validation_status,
  l.quality_flag,
  l.ip_hash,
  -- NEW enhanced intake fields (non-PII, always visible)
  l.age_range,
  l.gender,
  l.relationship_to_patient,
  l.previous_treatment,
  l.previous_treatment_details,
  l.co_occurring_conditions,
  l.employment_status,
  l.veteran_status,
  l.legal_involvement,
  l.readiness_level,
  l.best_time_to_call
FROM public.leads l;