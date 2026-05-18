-- =============================================================================
-- Drop the vestigial NULL-placeholder columns on public.leads_provider_view
-- that survived the credit/unlock retirement only because frontend code still
-- SELECT-listed them. Phase E of the monetization cleanup removed every UI and
-- analytics reference to `lead_score`, `lead_score_label`, and `is_unlocked`,
-- so the placeholder columns can finally be removed from the view shape.
--
-- Removed columns:
--   - lead_score        (NULL::integer placeholder — never populated)
--   - lead_score_label  (NULL::text placeholder — never populated)
--   - is_unlocked       (constant `true` — leads have no lock state under the
--                        flat-fee model; Free-tier inquiries are routed to
--                        concierge upstream and never reach `leads`)
-- =============================================================================

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
  name, email, phone
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
  'Per-provider lead view. Returns full PII for the facility owner — no '
  'lock/unlock or scoring state under the flat-fee monetization model. '
  'Free-tier inquiries route to concierge upstream and never reach this view.';
