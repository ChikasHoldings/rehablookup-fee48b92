-- 1. Restrict anonymous facilities access: drop old permissive policy, add column-restricted one
-- We can't do column-level RLS in Postgres, but we can drop the anon policy on the raw table
-- and force anon access through the public_facilities view instead.
-- First, drop the overly-permissive anon policy on raw facilities table
DROP POLICY IF EXISTS "Anonymous can view approved facilities basic info" ON public.facilities;

-- Anon users should use the public_facilities view (which already strips sensitive columns).
-- The view is SECURITY INVOKER so it respects RLS. We need authenticated users to still access facilities.
-- Re-add a policy that only allows authenticated users (providers/admins access their own via other policies).
-- Anon users will be directed to use the public_facilities view or get-public-facilities edge function.

-- 2. Restrict staff: drop old policy, add column-restricted approach
DROP POLICY IF EXISTS "Public can view visible staff from approved facilities" ON public.facility_staff;

-- Re-create with same logic but only for authenticated users; anon should use public_facility_staff view
CREATE POLICY "Authenticated can view visible staff from approved facilities"
ON public.facility_staff
FOR SELECT
TO authenticated
USING (
  is_visible = true 
  AND facility_id IN (SELECT id FROM facilities WHERE status = 'approved')
);

-- Ensure the public_facilities view is accessible to anon
GRANT SELECT ON public.public_facilities TO anon;
GRANT SELECT ON public.public_facility_staff TO anon;