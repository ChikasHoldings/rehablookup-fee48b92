-- Drop the overly permissive SELECT policy that exposes PII without unlock
DROP POLICY IF EXISTS "Owners can view their facility leads" ON public.leads;

-- Replace with a policy that requires unlock for direct table access
-- The leads_provider_view (SECURITY DEFINER) handles the listing with PII masking
CREATE POLICY "Owners can view unlocked facility leads"
ON public.leads
FOR SELECT
TO authenticated
USING (
  facility_id IN (
    SELECT f.id FROM facilities f WHERE f.user_id = auth.uid()
  )
  AND is_lead_unlocked(id, facility_id)
);

-- Also ensure admin access remains unrestricted (already exists but confirm)
-- Admins still have full access via "Admins can view all leads" policy