
-- Harden leads_provider_view: remove internal fields and mask message for locked leads
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
  l.previous_treatment_details,
  l.co_occurring_conditions,
  l.readiness_level,
  l.best_time_to_call,
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

GRANT SELECT ON public.leads_provider_view TO authenticated;
GRANT SELECT ON public.leads_provider_view TO service_role;
