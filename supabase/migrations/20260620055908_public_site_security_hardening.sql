-- Public website security hardening (2026-06-20)
--
-- 1) facilities_dedup_backup_20260619: a dated dedup snapshot left in the
--    public schema with RLS DISABLED and full anon/authenticated grants
--    (SELECT/INSERT/UPDATE/DELETE/TRUNCATE) over columns including email,
--    phone, and user_id. Lock it down: enable RLS (no policies => no
--    anon/authenticated access) and revoke the table grants. Data is preserved;
--    the table can be dropped by an operator once confirmed unneeded.
--
-- 2) Storage bucket facility-staff-photos was world-writable AND world-
--    deletable by anon: the consolidated permissive INSERT/DELETE policies
--    contained a bare `bucket_id = 'facility-staff-photos'` clause with no
--    ownership guard (every other bucket requires auth.uid() = first folder
--    segment). Rather than rewrite the large consolidated policies (which guard
--    many other buckets), add narrow RESTRICTIVE policies: a no-op for every
--    other bucket, and for facility-staff-photos they require the uploader to
--    own the path — mirroring facility-images / seeker-avatars / claim-photos.
--    (facility_staff has no rows and no frontend uploader yet, so this cannot
--    regress an existing flow; it makes the future feature owner-scoped.)
--
-- ROLLBACK:
--   ALTER TABLE public.facilities_dedup_backup_20260619 DISABLE ROW LEVEL SECURITY;
--   GRANT SELECT, INSERT, UPDATE, DELETE ON public.facilities_dedup_backup_20260619 TO anon, authenticated;
--   DROP POLICY IF EXISTS "facility_staff_photos_owner_insert" ON storage.objects;
--   DROP POLICY IF EXISTS "facility_staff_photos_owner_delete" ON storage.objects;

ALTER TABLE public.facilities_dedup_backup_20260619 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.facilities_dedup_backup_20260619 FROM anon, authenticated;

DROP POLICY IF EXISTS "facility_staff_photos_owner_insert" ON storage.objects;
CREATE POLICY "facility_staff_photos_owner_insert"
  ON storage.objects AS RESTRICTIVE FOR INSERT TO public
  WITH CHECK (
    bucket_id <> 'facility-staff-photos'
    OR (auth.uid())::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "facility_staff_photos_owner_delete" ON storage.objects;
CREATE POLICY "facility_staff_photos_owner_delete"
  ON storage.objects AS RESTRICTIVE FOR DELETE TO public
  USING (
    bucket_id <> 'facility-staff-photos'
    OR (auth.uid())::text = (storage.foldername(name))[1]
  );
