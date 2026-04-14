-- Drop the overly restrictive SELECT policy that blocks locked leads
DROP POLICY IF EXISTS "Owners can view unlocked leads only" ON public.leads;

-- Create new policy: providers can see ALL leads for their facilities
-- PII masking is handled by the leads_provider_view, not by RLS
CREATE POLICY "Owners can view their facility leads"
ON public.leads
FOR SELECT
TO authenticated
USING (
  facility_id IN (
    SELECT f.id FROM facilities f WHERE f.user_id = auth.uid()
  )
);