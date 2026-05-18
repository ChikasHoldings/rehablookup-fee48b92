-- =============================================================================
-- Retire the leftover DB artifacts from the credit-based unlock model.
-- =============================================================================
-- The credit/unlock monetization was retired by
-- 20260517010300_retire_legacy_lead_unlock_credit_model.sql, which neutered the
-- helper functions to return empty/0 but left the function bodies and a stray
-- `credit_cost` NULL placeholder on leads_provider_view in place.
--
-- Frontend reads of `credit_cost` have been removed across Phase 1+2 of the
-- monetization cleanup. No DB function, view, trigger, or RLS policy in this
-- project still references the six vestigial functions (verified via pg_proc /
-- pg_views search before this migration was authored).
--
-- This migration:
--   1. Rebuilds public.leads_provider_view to drop the `credit_cost` column.
--      All real columns + `lead_score`, `lead_score_label`, and `is_unlocked`
--      placeholders are preserved (consumers still SELECT those).
--   2. Drops the 6 retired DB functions: is_lead_unlocked (2 overloads),
--      get_provider_credit_balance, get_unlocked_lead_data,
--      get_seeker_lead_unlock_info, admin_get_lead_unlock_audit.
--
-- NOT included (deferred — requires coordinated stripe-webhook redeploy first):
--   - DROP COLUMN public.facility_subscriptions.unlock_discount_percent
-- =============================================================================

-- 1. Rebuild leads_provider_view without `credit_cost`.
DROP VIEW IF EXISTS public.leads_provider_view;

CREATE VIEW public.leads_provider_view AS
SELECT
  id, facility_id, original_facility_id, status, created_at, urgency,
  level_of_care, source, location_city_state, location_zip, primary_substance,
  insurance_type, insurance_provider, inquiry_type, who_seeking_help, age_range,
  gender, dual_diagnosis, co_occurring_conditions, previous_treatment,
  previous_treatment_details, readiness_level, special_needs, message,
  redistribution_status, assignment_status, assignment_reason, exclusive_until,
  extended_until, assigned_at, lead_expired_at, shared_with,
  provider_response_status, provider_responded_at, provider_response_notes,
  quality_flag, snooze_until, employment_status, veteran_status, legal_involvement,
  exclusivity, budget_preference, relationship_to_patient, preferred_contact,
  best_time_to_call,
  name, email, phone,
  NULL::integer AS lead_score,
  NULL::text AS lead_score_label,
  true AS is_unlocked
FROM public.leads
WHERE
  facility_id IN (SELECT f.id FROM public.facilities f WHERE f.user_id = auth.uid())
  OR id IN (
    SELECT ld.lead_id FROM public.lead_distributions ld
    JOIN public.facilities f ON ld.facility_id = f.id
    WHERE f.user_id = auth.uid()
  );

GRANT SELECT ON public.leads_provider_view TO authenticated;

COMMENT ON VIEW public.leads_provider_view IS
  'Per-provider lead view. Returns full PII for the facility owner — there is no '
  'lock/unlock state under the flat-fee monetization model. lead_score, '
  'lead_score_label, is_unlocked are kept as columns for backward-compat with '
  'callers that SELECT them; values are constant (NULL, NULL, true).';

-- 2. Drop the six retired credit/unlock functions.
DROP FUNCTION IF EXISTS public.is_lead_unlocked(uuid, uuid);
DROP FUNCTION IF EXISTS public.is_lead_unlocked(uuid, uuid, uuid);
DROP FUNCTION IF EXISTS public.get_provider_credit_balance(uuid);
DROP FUNCTION IF EXISTS public.get_unlocked_lead_data(uuid, uuid);
DROP FUNCTION IF EXISTS public.get_seeker_lead_unlock_info(uuid);
DROP FUNCTION IF EXISTS public.admin_get_lead_unlock_audit(
  timestamp with time zone, timestamp with time zone, uuid, uuid, integer, integer
);
