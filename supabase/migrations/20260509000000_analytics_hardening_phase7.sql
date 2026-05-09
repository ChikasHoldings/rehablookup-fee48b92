-- ============================================================================
-- Phase 7: Analytics Hardening
-- Fixes:
--   1. Restore `exclusivity` column to leads_provider_view (was accidentally
--      dropped in 20260508170000_leads_workflow_hardening.sql).
--   2. Ensure `preferred_contact` is always exposed (it is PII-gated already).
-- ============================================================================

-- Recreate the view with exclusivity column restored
DROP VIEW IF EXISTS public.leads_provider_view;

CREATE OR REPLACE VIEW public.leads_provider_view AS
SELECT
  l.id,
  l.facility_id,
  l.original_facility_id,
  l.status,
  l.created_at,
  l.urgency,
  l.level_of_care,
  l.source,
  l.location_city_state,
  l.location_zip,
  l.primary_substance,
  l.insurance_type,
  l.insurance_provider,
  l.inquiry_type,
  l.who_seeking_help,
  l.age_range,
  l.gender,
  l.dual_diagnosis,
  l.co_occurring_conditions,
  l.previous_treatment,
  l.readiness_level,
  l.special_needs,
  l.message,
  l.lead_score,
  l.lead_score_label,
  l.credit_cost,
  l.redistribution_status,
  l.assignment_status,
  l.exclusive_until,
  l.extended_until,
  l.assigned_at,
  l.lead_expired_at,
  l.shared_with,
  l.provider_response_status,
  l.provider_responded_at,
  l.provider_response_notes,
  l.quality_flag,
  l.snooze_until,
  l.employment_status,
  l.veteran_status,
  l.legal_involvement,
  -- Non-PII metadata (safe to expose without unlock)
  l.exclusivity,
  -- PII: only exposed when unlocked
  CASE
    WHEN public.is_lead_unlocked(l.id, l.facility_id) THEN l.name
    ELSE NULL
  END AS name,
  CASE
    WHEN public.is_lead_unlocked(l.id, l.facility_id) THEN l.email
    ELSE NULL
  END AS email,
  CASE
    WHEN public.is_lead_unlocked(l.id, l.facility_id) THEN l.phone
    ELSE NULL
  END AS phone,
  CASE
    WHEN public.is_lead_unlocked(l.id, l.facility_id) THEN l.preferred_contact
    ELSE NULL
  END AS preferred_contact,
  CASE
    WHEN public.is_lead_unlocked(l.id, l.facility_id) THEN l.best_time_to_call
    ELSE NULL
  END AS best_time_to_call,
  CASE
    WHEN public.is_lead_unlocked(l.id, l.facility_id) THEN l.relationship_to_patient
    ELSE NULL
  END AS relationship_to_patient,
  CASE
    WHEN public.is_lead_unlocked(l.id, l.facility_id) THEN l.previous_treatment_details
    ELSE NULL
  END AS previous_treatment_details,
  CASE
    WHEN public.is_lead_unlocked(l.id, l.facility_id) THEN l.budget_preference
    ELSE NULL
  END AS budget_preference,
  -- is_unlocked flag for UI
  public.is_lead_unlocked(l.id, l.facility_id) AS is_unlocked
FROM public.leads l
WHERE
  -- Facility owner sees their leads
  l.facility_id IN (
    SELECT f.id FROM public.facilities f WHERE f.user_id = auth.uid()
  )
  OR
  -- Provider sees redistributed leads
  l.id IN (
    SELECT ld.lead_id
    FROM public.lead_distributions ld
    JOIN public.facilities f ON ld.facility_id = f.id
    WHERE f.user_id = auth.uid()
  );

-- Grant SELECT on the view to authenticated users
GRANT SELECT ON public.leads_provider_view TO authenticated;

-- ============================================================================
-- Add index to speed up analytics queries that filter by facility_id + created_at
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_provider_events_facility_created
  ON public.provider_events (facility_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_provider_events_type_created
  ON public.provider_events (event_type, created_at DESC);
