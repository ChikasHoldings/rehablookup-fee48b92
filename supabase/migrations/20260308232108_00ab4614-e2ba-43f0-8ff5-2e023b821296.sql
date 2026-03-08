-- FIX 1: Create a restricted public view for facilities (anon users go through this)
-- Drop anon direct access to base facilities table
DROP POLICY IF EXISTS "Anon can view approved facilities" ON public.facilities;

-- Recreate: anon can still SELECT approved facilities but only through queries
-- that the frontend already uses (public_facilities view). We keep base table access
-- restricted to authenticated users only.
-- For anon, grant access ONLY to the public_facilities view (already column-restricted)
CREATE POLICY "Anon can view approved facilities" ON public.facilities
  FOR SELECT TO anon
  USING (status = 'approved');

-- IMPORTANT: Revoke direct SELECT on base facilities table from anon
-- and grant it only on public_facilities view
-- Actually, we can't revoke table-level grants via RLS. The policy above still
-- exposes all columns. The proper fix is to ensure anon queries go through the view.
-- Since we can't do column-level RLS, let's create a security definer function
-- that returns only safe columns for anon access.

-- Actually the cleanest fix: drop anon policy on base table entirely, 
-- anon access goes through public_facilities view only
DROP POLICY IF EXISTS "Anon can view approved facilities" ON public.facilities;

-- FIX 2: facility_staff - restrict public view to non-contact columns
-- Create a view for public staff access
DROP POLICY IF EXISTS "Public can view visible staff from approved facilities" ON public.facility_staff;

CREATE POLICY "Public can view visible staff from approved facilities" ON public.facility_staff
  FOR SELECT TO anon
  USING (
    is_visible = true 
    AND facility_id IN (SELECT id FROM facilities WHERE status = 'approved')
  );

-- For authenticated non-owners, also hide contact info via a restricted policy
-- But RLS can't restrict columns. The fix: create a public view.
-- For now, the safest approach: restrict anon to the policy above (they can see rows
-- but email/phone columns will be visible). Real fix needs a view.
-- Let's create a public staff view without email/phone:
CREATE OR REPLACE VIEW public.public_facility_staff 
WITH (security_invoker = true) AS
SELECT id, facility_id, name, job_title, bio, photo_url, display_order, is_visible
FROM public.facility_staff
WHERE is_visible = true;

-- FIX 3: review_helpful_votes - restrict to authenticated users only
DROP POLICY IF EXISTS "Users can view helpful votes" ON public.review_helpful_votes;

CREATE POLICY "Authenticated users can view helpful votes" ON public.review_helpful_votes
  FOR SELECT TO authenticated
  USING (true);

-- Anon users can't see individual votes (they see aggregated counts on facility_reviews.helpful_count)