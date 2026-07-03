-- =============================================================================
-- Scope facility-staff-photos storage INSERT/DELETE to the owning folder (P3).
--
-- ROOT CAUSE
--   The broad multi-bucket policies objects_insert_consolidated /
--   objects_delete_consolidated each contain an UNSCOPED branch
--   `OR (bucket_id = 'facility-staff-photos')`. Because storage RLS policies
--   are PERMISSIVE (OR-combined), the later owner-scoped
--   facility_staff_photos_owner_insert / _delete policies do not actually
--   constrain anything — the unscoped branch still lets any authenticated user
--   insert into, or delete from, ANY provider's staff-photos folder.
--
-- FIX
--   Add narrow RESTRICTIVE policies. A RESTRICTIVE policy is AND-combined with
--   the permissive set, so it can only tighten. Each predicate is a no-op for
--   every other bucket (`bucket_id <> 'facility-staff-photos'` short-circuits to
--   true) and, for facility-staff-photos, requires the first path segment to be
--   the caller's own uid. This closes the cross-provider tamper hole without
--   editing the large shared consolidated policies (which also govern
--   facility-images, claim-photos, etc.) — minimal blast radius. service_role
--   (system uploads) bypasses RLS and is unaffected. The bucket has no client
--   caller today, so no legitimate path is impacted.
--
-- ROLLBACK
--   DROP POLICY IF EXISTS facility_staff_photos_scope_insert ON storage.objects;
--   DROP POLICY IF EXISTS facility_staff_photos_scope_delete ON storage.objects;
-- =============================================================================

DROP POLICY IF EXISTS facility_staff_photos_scope_insert ON storage.objects;
CREATE POLICY facility_staff_photos_scope_insert
  ON storage.objects
  AS RESTRICTIVE
  FOR INSERT
  TO public
  WITH CHECK (
    bucket_id <> 'facility-staff-photos'
    OR (auth.uid())::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS facility_staff_photos_scope_delete ON storage.objects;
CREATE POLICY facility_staff_photos_scope_delete
  ON storage.objects
  AS RESTRICTIVE
  FOR DELETE
  TO public
  USING (
    bucket_id <> 'facility-staff-photos'
    OR (auth.uid())::text = (storage.foldername(name))[1]
  );
