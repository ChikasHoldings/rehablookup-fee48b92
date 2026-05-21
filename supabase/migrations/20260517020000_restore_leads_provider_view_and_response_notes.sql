-- Round 21 critical fix: 16+ provider-panel components query the view
-- public.leads_provider_view which was dropped at some point during the
-- EKRA refactor — entire provider Dashboard, Inquiries page, KPI strip,
-- analytics widgets, lead-conversion widget, multi-facility overview,
-- ListingCard, ProviderPerformanceFeedback, useLeadAnalytics,
-- useCentralizedLeadAnalytics, useProviderSearch, useFacilityBadges, and
-- DashboardMissedLeads all crashed silently with "relation does not exist".
-- Additionally the leads.provider_response_notes column referenced by the
-- Inquiries page (and WRITTEN by InquiryDetailPanel.tsx) was missing.
--
-- Fix:
-- 1. Add provider_response_notes column to leads (vendoring it back from
--    the original schema). InquiryDetailPanel saves notes to this column;
--    the Inquiries view reads them back.
-- 2. Recreate leads_provider_view as a clean pass-through that exposes
--    every column callers expect, with no PII gating (every lead is
--    accessible to its facility owner in the EKRA flat-fee model).
--    Synthesize is_unlocked = TRUE so legacy UI badges still render.
--    Synthesize lead_score / lead_score_label / credit_cost as NULL
--    (vestigial from the old credit-priced lead-ranking model).
-- 3. Re-grant SELECT to authenticated. The view is NOT SECURITY DEFINER
--    so each caller's RLS context applies — the explicit facility-ownership
--    WHERE clause in the view enforces tenant isolation.

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS provider_response_notes text;

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
  l.previous_treatment_details,
  l.readiness_level,
  l.special_needs,
  l.message,
  l.redistribution_status,
  l.assignment_status,
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
  l.exclusivity,
  l.budget_preference,
  l.relationship_to_patient,
  l.preferred_contact,
  l.best_time_to_call,
  l.name,
  l.email,
  l.phone,
  NULL::integer AS lead_score,
  NULL::text    AS lead_score_label,
  NULL::integer AS credit_cost,
  TRUE AS is_unlocked
FROM public.leads l
WHERE
  l.facility_id IN (
    SELECT f.id FROM public.facilities f WHERE f.user_id = auth.uid()
  )
  OR
  l.id IN (
    SELECT ld.lead_id
    FROM public.lead_distributions ld
    JOIN public.facilities f ON ld.facility_id = f.id
    WHERE f.user_id = auth.uid()
  );

GRANT SELECT ON public.leads_provider_view TO authenticated;

CREATE INDEX IF NOT EXISTS idx_leads_facility_created_desc
  ON public.leads (facility_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_leads_facility_status
  ON public.leads (facility_id, status);

COMMENT ON VIEW public.leads_provider_view IS
  'EKRA flat-fee model: returns every column a provider needs for their lead-management UI. PII is exposed to the facility owner (no per-lead unlock). is_unlocked is always TRUE; lead_score / credit_cost are vestigial NULL slots. RLS on the underlying leads table is the access gate via the WHERE clause on facility ownership.';
