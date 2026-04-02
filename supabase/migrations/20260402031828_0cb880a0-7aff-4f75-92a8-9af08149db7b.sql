
-- Step 1: Create a security-definer helper to get auth.uid() safely
CREATE OR REPLACE FUNCTION public.current_auth_uid()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT auth.uid();
$$;

-- Step 2: Drop the existing view
DROP VIEW IF EXISTS public.leads_provider_view;

-- Step 3: Recreate the view WITHOUT security_invoker
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
      CASE
        WHEN split_part(l.name, ' ', 2) <> '' THEN left(split_part(l.name, ' ', 2), 1) || '.'
        ELSE ''
      END
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
  l.ip_hash,
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
FROM public.leads l
WHERE 
  l.facility_id IN (SELECT f.id FROM facilities f WHERE f.user_id = public.current_auth_uid())
  OR
  l.id IN (
    SELECT ld.lead_id FROM lead_distributions ld
    JOIN facilities f ON ld.facility_id = f.id
    WHERE f.user_id = public.current_auth_uid()
  )
  OR
  has_role(public.current_auth_uid(), 'admin');

-- Step 4: Grant SELECT on the view
GRANT SELECT ON public.leads_provider_view TO authenticated;
GRANT SELECT ON public.leads_provider_view TO service_role;

-- Step 5: Restrict raw leads table
DROP POLICY IF EXISTS "Owners can view their leads" ON public.leads;

CREATE POLICY "Owners can view unlocked leads only"
ON public.leads
FOR SELECT
TO authenticated
USING (
  leads.facility_id IN (
    SELECT f.id FROM facilities f WHERE f.user_id = auth.uid()
  )
  AND is_lead_unlocked(leads.id, leads.facility_id)
);

DROP POLICY IF EXISTS "Providers can view redistributed leads" ON public.leads;

CREATE POLICY "Providers can view unlocked redistributed leads"
ON public.leads
FOR SELECT
TO authenticated
USING (
  leads.id IN (
    SELECT ld.lead_id FROM lead_distributions ld
    JOIN facilities f ON ld.facility_id = f.id
    WHERE f.user_id = auth.uid()
  )
  AND EXISTS (
    SELECT 1 FROM lead_unlocks lu
    JOIN facilities f2 ON lu.facility_id = f2.id
    WHERE lu.lead_id = leads.id AND f2.user_id = auth.uid()
  )
);
