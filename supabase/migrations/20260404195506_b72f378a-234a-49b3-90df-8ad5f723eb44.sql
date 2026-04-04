
-- Remove the overly permissive anon SELECT policy on facilities
-- Public access should go through the public_facilities view or the get-public-facilities edge function
DROP POLICY IF EXISTS "Anon can view approved facilities" ON public.facilities;

-- Re-create with explicit column restriction is not possible via RLS,
-- but we can restrict anon to use the view by removing direct table access
-- The public_facilities view already filters to safe columns

-- Grant anon access to the view explicitly
GRANT SELECT ON public.public_facilities TO anon;
GRANT SELECT ON public.public_facilities TO authenticated;
