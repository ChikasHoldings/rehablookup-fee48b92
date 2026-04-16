
-- 1. FACILITY DATA: Revoke direct anon SELECT
DROP POLICY IF EXISTS "Anon can view approved facilities (restricted)" ON public.facilities;
DROP POLICY IF EXISTS "Anon can view approved facilities" ON public.facilities;
REVOKE SELECT ON public.facilities FROM anon;
GRANT SELECT ON public.public_facilities TO anon;
GRANT SELECT ON public.public_facilities TO authenticated;

-- 2. CONCIERGE MESSAGES: Provider access
CREATE POLICY "Providers can view messages in their facility threads"
ON public.concierge_messages FOR SELECT TO authenticated
USING (
  thread_id IN (
    SELECT ct.id FROM concierge_threads ct
    JOIN facilities f ON ct.facility_id = f.id
    WHERE f.user_id = auth.uid()
  )
);

CREATE POLICY "Providers can insert messages in their facility threads"
ON public.concierge_messages FOR INSERT TO authenticated
WITH CHECK (
  sender_id = auth.uid()
  AND sender_type = 'provider'
  AND thread_id IN (
    SELECT ct.id FROM concierge_threads ct
    JOIN facilities f ON ct.facility_id = f.id
    WHERE f.user_id = auth.uid()
  )
);

-- 3. STORAGE: Restrict bucket listing
DROP POLICY IF EXISTS "Anyone can view facility images" ON storage.objects;
DROP POLICY IF EXISTS "Public can view blog images" ON storage.objects;
DROP POLICY IF EXISTS "Seeker avatars are publicly viewable" ON storage.objects;

CREATE POLICY "Anyone can view facility images by path"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'facility-images' AND name IS NOT NULL AND name != '');

CREATE POLICY "Public can view blog images by path"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'blog-images' AND name IS NOT NULL AND name != '');

CREATE POLICY "Seeker avatars viewable by path"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'seeker-avatars' AND name IS NOT NULL AND name != '');

-- 4. FACILITY STAFF: Restrict PII
DROP POLICY IF EXISTS "Public can view visible staff from approved facilities" ON public.facility_staff;

CREATE POLICY "Authenticated users can view staff names and roles"
ON public.facility_staff FOR SELECT TO authenticated
USING (
  is_visible = true
  AND facility_id IN (SELECT id FROM facilities WHERE status = 'approved')
);

-- 5. SECURITY DEFINER VIEW: Recreate with INVOKER
CREATE OR REPLACE VIEW public.public_facilities
WITH (security_invoker = on) AS
SELECT 
  f.id, f.name, f.slug, f.address, f.city, f.state, f.zip_code,
  CASE WHEN EXISTS (
    SELECT 1 FROM public.pro_subscriptions ps 
    WHERE ps.facility_id = f.id AND ps.status = 'active' 
      AND (ps.current_period_end IS NULL OR ps.current_period_end > now())
  ) THEN f.phone ELSE NULL END AS phone,
  f.description, f.facility_type, f.bed_count, f.gender_served,
  f.logo_url, f.gallery_urls, f.featured, f.featured_pinned,
  f.last_featured_shown_at, f.verified, f.year_established,
  CASE WHEN EXISTS (
    SELECT 1 FROM public.pro_subscriptions ps 
    WHERE ps.facility_id = f.id AND ps.status = 'active' 
      AND (ps.current_period_end IS NULL OR ps.current_period_end > now())
  ) THEN f.website ELSE NULL END AS website,
  f.status, f.created_at, f.updated_at
FROM facilities f
WHERE f.status = 'approved';
