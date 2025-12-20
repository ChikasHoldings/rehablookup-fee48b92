-- Remove direct public access to facilities table
-- Public users should query public_facilities view instead (which excludes admin_notes)

DROP POLICY IF EXISTS "Anyone can view approved facilities" ON public.facilities;

-- The public_facilities view (created in previous migration) provides safe public access
-- It explicitly excludes: admin_notes, user_id, lead_limit_override, bonus_leads, etc.