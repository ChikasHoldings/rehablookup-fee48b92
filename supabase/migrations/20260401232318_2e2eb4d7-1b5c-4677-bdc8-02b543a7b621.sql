
-- Tighten provider lead UPDATE policy: only allow updates on leads the provider has unlocked
DROP POLICY IF EXISTS "Providers can update their leads" ON public.leads;

CREATE POLICY "Providers can update their unlocked leads"
ON public.leads
FOR UPDATE
USING (
  facility_id IN (
    SELECT f.id FROM facilities f WHERE f.user_id = auth.uid()
  )
  AND public.is_lead_unlocked(id, facility_id)
);
