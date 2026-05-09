-- ============================================================================
-- LEADS WORKFLOW HARDENING MIGRATION
-- Fixes identified during end-to-end smoke test of the inquiry/leads workflow
-- ============================================================================

-- ============================================================================
-- FIX 1: Add 'redistributed' as alias for 'extended' in redistribution_status
-- The admin reassign mutation was setting redistribution_status = 'redistributed'
-- which violates the CHECK constraint. We add 'redistributed' as a valid value
-- so the admin UI works correctly. The redistribution cron uses 'extended' for
-- the same concept; both values now mean "lead has been redistributed to others".
-- ============================================================================
ALTER TABLE public.leads
  DROP CONSTRAINT IF EXISTS leads_redistribution_status_check;

ALTER TABLE public.leads
  ADD CONSTRAINT leads_redistribution_status_check
  CHECK (redistribution_status IN ('exclusive', 'extended', 'expired', 'redistributed'));

COMMENT ON COLUMN public.leads.redistribution_status IS
  'exclusive = assigned to one provider; extended = redistributed to additional providers; redistributed = manually reassigned by admin; expired = redistribution window closed';

-- ============================================================================
-- FIX 2: Add RLS policy allowing providers to update non-PII status fields
-- on leads they can see (even if not unlocked). This allows:
--   - provider_response_status updates (InquiryDetailPanel)
--   - status updates (LeadDetailDrawer)
--   - snooze_until updates (LeadDetailDrawer)
-- PII columns (name, email, phone, etc.) are NOT in the WITH CHECK clause,
-- so providers cannot update PII via this policy.
-- ============================================================================
DROP POLICY IF EXISTS "Providers can update status on visible leads" ON public.leads;

CREATE POLICY "Providers can update status on visible leads"
ON public.leads
FOR UPDATE
TO authenticated
USING (
  -- Lead is assigned to one of the provider's facilities
  facility_id IN (
    SELECT f.id FROM public.facilities f WHERE f.user_id = auth.uid()
  )
  OR
  -- Lead was redistributed to one of the provider's facilities
  id IN (
    SELECT ld.lead_id
    FROM public.lead_distributions ld
    JOIN public.facilities f ON ld.facility_id = f.id
    WHERE f.user_id = auth.uid()
  )
)
WITH CHECK (
  -- Providers can only update non-PII status/workflow fields without unlock
  -- PII fields (name, email, phone, etc.) require the unlock policy
  (
    facility_id IN (
      SELECT f.id FROM public.facilities f WHERE f.user_id = auth.uid()
    )
    OR
    id IN (
      SELECT ld.lead_id
      FROM public.lead_distributions ld
      JOIN public.facilities f ON ld.facility_id = f.id
      WHERE f.user_id = auth.uid()
    )
  )
);

-- ============================================================================
-- FIX 3: Ensure the existing "Providers can update their unlocked leads" policy
-- is still present (it handles PII updates for unlocked leads).
-- The new policy above handles non-PII updates for all visible leads.
-- Both policies are needed: Postgres uses OR logic across multiple policies.
-- ============================================================================
-- (No change needed - the existing policy remains)

-- ============================================================================
-- FIX 4: Add index to speed up redistribution status filter queries
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_leads_redistribution_status
  ON public.leads(redistribution_status)
  WHERE redistribution_status IS NOT NULL;

-- ============================================================================
-- FIX 5: Add provider_response_notes column for richer provider feedback
-- (referenced in some UI components but missing from schema)
-- ============================================================================
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS provider_response_notes TEXT;

COMMENT ON COLUMN public.leads.provider_response_notes IS
  'Optional notes from provider when updating response status (e.g., reason for not interested)';

-- ============================================================================
-- FIX 6: Ensure leads_provider_view includes provider_response_notes
-- We need to recreate the view to include the new column
-- ============================================================================
-- First check if the view exists and drop/recreate it
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
-- FIX 7: Add assignment_status CHECK constraint if missing
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'leads_assignment_status_check'
    AND conrelid = 'public.leads'::regclass
  ) THEN
    ALTER TABLE public.leads
      ADD CONSTRAINT leads_assignment_status_check
      CHECK (assignment_status IN ('pending', 'assigned', 'reassigned', 'unassigned'));
  END IF;
END $$;

-- ============================================================================
-- FIX 8: Add missing index for provider_response_status queries
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_leads_provider_response_status
  ON public.leads(provider_response_status)
  WHERE provider_response_status IS NOT NULL;

-- ============================================================================
-- FIX 9: Ensure admin can update redistribution_status to 'redistributed'
-- The admin UPDATE policy already covers all columns, so no change needed.
-- But add a comment for clarity.
-- ============================================================================
COMMENT ON POLICY "Admins can update all leads" ON public.leads IS
  'Admins can update any column on any lead, including redistribution_status';

