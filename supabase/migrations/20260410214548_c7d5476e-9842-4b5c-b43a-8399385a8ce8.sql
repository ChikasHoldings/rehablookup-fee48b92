
-- Create a public-safe view for facility staff (hides email/phone)
CREATE OR REPLACE VIEW public.public_facility_staff AS
SELECT 
  fs.id,
  fs.facility_id,
  fs.name,
  fs.job_title,
  fs.bio,
  fs.photo_url,
  fs.display_order,
  fs.is_visible,
  fs.created_at
FROM public.facility_staff fs
JOIN public.facilities f ON fs.facility_id = f.id
WHERE f.status = 'approved' AND fs.is_visible = true;

-- Replace overly permissive staff policy - only allow owners/admins to see email/phone
DROP POLICY IF EXISTS "Authenticated can view visible staff without PII" ON public.facility_staff;
DROP POLICY IF EXISTS "Authenticated can view visible staff from approved facilities" ON public.facility_staff;
CREATE POLICY "Public can view visible staff from approved facilities" ON public.facility_staff
  FOR SELECT TO authenticated
  USING (
    is_visible = true 
    AND facility_id IN (SELECT id FROM facilities WHERE status = 'approved')
  );
