
DROP VIEW IF EXISTS public.leads_provider_view CASCADE;

CREATE VIEW public.leads_provider_view
WITH (security_invoker = true)
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
  CASE
    WHEN EXISTS (
      SELECT 1 FROM lead_unlocks lu
      JOIN facilities f ON lu.facility_id = f.id
      WHERE lu.lead_id = l.id AND f.user_id = public.current_auth_uid()
    ) THEN l.name
    ELSE concat(
      left(split_part(l.name, ' ', 1), 1),
      repeat('*', GREATEST(length(split_part(l.name, ' ', 1)) - 1, 2)),
      ' ',
      CASE WHEN split_part(l.name, ' ', 2) <> '' THEN left(split_part(l.name, ' ', 2), 1) || '.' ELSE '' END
    )
  END AS name,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM lead_unlocks lu
      JOIN facilities f ON lu.facility_id = f.id
      WHERE lu.lead_id = l.id AND f.user_id = public.current_auth_uid()
    ) THEN l.email
    ELSE '••••@••••.•••'
  END AS email,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM lead_unlocks lu
      JOIN facilities f ON lu.facility_id = f.id
      WHERE lu.lead_id = l.id AND f.user_id = public.current_auth_uid()
    ) THEN l.phone
    ELSE '(•••) •••-••••'
  END AS phone,
  EXISTS (
    SELECT 1 FROM lead_unlocks lu
    JOIN facilities f ON lu.facility_id = f.id
    WHERE lu.lead_id = l.id AND f.user_id = public.current_auth_uid()
  ) AS is_unlocked,
  l.preferred_contact,
  l.special_needs,
  l.exclusivity,
  l.routing_order,
  l.assigned_at,
  l.assignment_reason,
  l.shared_with,
  l.validation_status,
  l.quality_flag,
  l.ip_hash
FROM public.leads l;
