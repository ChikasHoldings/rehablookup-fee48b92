-- ============================================================================
-- HARDEN LEADS PII PROTECTION
-- ============================================================================
-- Problem: The leads table has a permissive SELECT RLS policy that allows
-- providers to query the raw table directly (bypassing the view) and read
-- PII columns (name, email, phone, message) without paying for an unlock.
--
-- Solution:
-- 1. Remove security_invoker from the view (view runs as owner, bypasses RLS)
-- 2. View's own WHERE clause + current_auth_uid() handles row filtering
-- 3. View's CASE expressions mask PII for locked leads
-- 4. REVOKE SELECT on PII columns from authenticated/anon roles
-- 5. Add masking for previous_treatment_details and best_time_to_call
-- ============================================================================

-- Step 1: Drop and recreate the view WITHOUT security_invoker
-- The view runs as the owner (postgres) who has full column access.
-- security_barrier prevents predicate pushdown attacks on masked columns.
DROP VIEW IF EXISTS public.leads_provider_view CASCADE;

CREATE VIEW public.leads_provider_view
WITH (security_barrier = true)
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
  -- PII: name masked for locked leads
  CASE
    WHEN EXISTS (
      SELECT 1 FROM lead_unlocks lu
      JOIN facilities f ON lu.facility_id = f.id
      WHERE lu.lead_id = l.id AND f.user_id = current_auth_uid()
    ) THEN l.name
    ELSE concat(
      left(split_part(l.name, ' ', 1), 1),
      repeat('*', GREATEST(length(split_part(l.name, ' ', 1)) - 1, 2)),
      ' ',
      CASE WHEN split_part(l.name, ' ', 2) <> '' THEN left(split_part(l.name, ' ', 2), 1) || '.' ELSE '' END
    )
  END AS name,
  -- PII: email masked for locked leads
  CASE
    WHEN EXISTS (
      SELECT 1 FROM lead_unlocks lu
      JOIN facilities f ON lu.facility_id = f.id
      WHERE lu.lead_id = l.id AND f.user_id = current_auth_uid()
    ) THEN l.email
    ELSE '••••@••••.•••'
  END AS email,
  -- PII: phone masked for locked leads
  CASE
    WHEN EXISTS (
      SELECT 1 FROM lead_unlocks lu
      JOIN facilities f ON lu.facility_id = f.id
      WHERE lu.lead_id = l.id AND f.user_id = current_auth_uid()
    ) THEN l.phone
    ELSE '(•••) •••-••••'
  END AS phone,
  -- PII: message masked for locked leads (messages often contain names/phone numbers)
  CASE
    WHEN EXISTS (
      SELECT 1 FROM lead_unlocks lu
      JOIN facilities f ON lu.facility_id = f.id
      WHERE lu.lead_id = l.id AND f.user_id = current_auth_uid()
    ) THEN l.message
    ELSE NULL
  END AS message,
  -- PII: previous_treatment_details masked (free-text, may contain doctor/facility names)
  CASE
    WHEN EXISTS (
      SELECT 1 FROM lead_unlocks lu
      JOIN facilities f ON lu.facility_id = f.id
      WHERE lu.lead_id = l.id AND f.user_id = current_auth_uid()
    ) THEN l.previous_treatment_details
    ELSE NULL
  END AS previous_treatment_details,
  -- PII: best_time_to_call masked (scheduling info gated behind unlock)
  CASE
    WHEN EXISTS (
      SELECT 1 FROM lead_unlocks lu
      JOIN facilities f ON lu.facility_id = f.id
      WHERE lu.lead_id = l.id AND f.user_id = current_auth_uid()
    ) THEN l.best_time_to_call
    ELSE NULL
  END AS best_time_to_call,
  -- Unlock status flag
  EXISTS (
    SELECT 1 FROM lead_unlocks lu
    JOIN facilities f ON lu.facility_id = f.id
    WHERE lu.lead_id = l.id AND f.user_id = current_auth_uid()
  ) AS is_unlocked,
  l.preferred_contact,
  l.special_needs,
  l.age_range,
  l.gender,
  l.relationship_to_patient,
  l.previous_treatment,
  l.co_occurring_conditions,
  l.readiness_level,
  l.exclusive_until,
  l.redistribution_status,
  l.original_facility_id,
  l.extended_until
FROM leads l
WHERE
  l.facility_id IN (SELECT f.id FROM facilities f WHERE f.user_id = current_auth_uid())
  OR l.id IN (
    SELECT ld.lead_id FROM lead_distributions ld
    JOIN facilities f2 ON ld.facility_id = f2.id
    WHERE f2.user_id = current_auth_uid()
  );

-- Grant SELECT on the view to authenticated users only
REVOKE ALL ON public.leads_provider_view FROM PUBLIC;
REVOKE ALL ON public.leads_provider_view FROM anon;
GRANT SELECT ON public.leads_provider_view TO authenticated;
GRANT SELECT ON public.leads_provider_view TO service_role;

-- Step 2: REVOKE SELECT on PII columns from authenticated and anon roles
-- This prevents direct table queries from reading PII even if RLS allows the row.
-- The view (running as owner) can still read these columns.
REVOKE SELECT (name, email, phone, message) ON public.leads FROM authenticated;
REVOKE SELECT (name, email, phone, message) ON public.leads FROM anon;

-- Step 3: Drop the overly permissive SELECT policies that are no longer needed
-- Since the view runs as owner (bypasses RLS), providers don't need direct SELECT on leads.
-- We keep the policies for: count queries (head:true works without PII columns),
-- UPDATE operations (gated by unlock check), and admin access.
-- NOTE: We do NOT drop these policies because:
-- - The count queries in RequestInfoModal use .select("*", { count: "exact", head: true })
-- - The UPDATE policy requires the SELECT policy to evaluate the USING clause
-- - Admin access needs to remain unrestricted
-- Instead, the column REVOKE handles the PII protection at the column level.

-- Step 4: Ensure the "Owners can view unlocked facility leads" restrictive policy
-- is dropped (it was superseded by the permissive one and is now redundant)
DROP POLICY IF EXISTS "Owners can view unlocked facility leads" ON public.leads;
