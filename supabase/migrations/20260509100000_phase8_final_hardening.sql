-- ============================================================================
-- Phase 8: Final Provider Panel Hardening
-- Fixes:
--   1. Restore `assignment_reason` column to leads_provider_view.
--      The Dashboard page selects this column but it was accidentally dropped
--      in the Phase 7 migration (20260509000000_analytics_hardening_phase7.sql).
--   2. Add composite indexes to improve Inquiries page and Dashboard query
--      performance for providers with large lead volumes.
--   3. Add index on lead_unlocks(facility_id, lead_id) for faster unlock checks.
-- ============================================================================

-- ============================================================================
-- 1. Recreate leads_provider_view with assignment_reason restored
-- ============================================================================
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
  -- BUGFIX Phase 8: Restore assignment_reason — was present in all prior view
  -- definitions but accidentally dropped in Phase 7 migration. The Dashboard
  -- page selects this column and silently received NULL for every row.
  l.assignment_reason,
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
  -- Provider sees redistributed leads assigned to their facilities
  l.id IN (
    SELECT ld.lead_id
    FROM public.lead_distributions ld
    JOIN public.facilities f ON ld.facility_id = f.id
    WHERE f.user_id = auth.uid()
  );

-- Grant SELECT on the view to authenticated users
GRANT SELECT ON public.leads_provider_view TO authenticated;

-- ============================================================================
-- 2. Performance indexes for Inquiries page and Dashboard queries
-- ============================================================================

-- Composite index: facility_id + created_at DESC — used by Inquiries page
-- (.in(facilityIds).order(created_at, desc).limit(2000)) and Dashboard
-- (.eq(facility_id).order(created_at, desc).limit(4))
CREATE INDEX IF NOT EXISTS idx_leads_facility_created_desc
  ON public.leads (facility_id, created_at DESC);

-- Composite index: facility_id + status — used by DashboardKPIStrip
-- (.eq(facility_id).gte(created_at, weekStart)) and DashboardMissedLeads
-- (.eq(facility_id).in(status, ['expired','closed']))
CREATE INDEX IF NOT EXISTS idx_leads_facility_status
  ON public.leads (facility_id, status);

-- ============================================================================
-- 3. Performance index for lead_unlocks
-- ============================================================================

-- Composite index: facility_id + lead_id — used by is_lead_unlocked() function
-- which is called for every row in leads_provider_view. Without this index,
-- the function performs a sequential scan on lead_unlocks for every lead row.
CREATE INDEX IF NOT EXISTS idx_lead_unlocks_facility_lead
  ON public.lead_unlocks (facility_id, lead_id);

-- ============================================================================
-- 4. Index for provider_events analytics queries
-- ============================================================================

-- Already created in Phase 7 but using IF NOT EXISTS for safety
CREATE INDEX IF NOT EXISTS idx_provider_events_facility_created
  ON public.provider_events (facility_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_provider_events_type_facility
  ON public.provider_events (event_type, facility_id, created_at DESC);
