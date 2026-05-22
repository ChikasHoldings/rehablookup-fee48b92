-- Follow-up to 20260522054500_rls_perf_wrap_auth_calls.sql.
-- Wraps auth.uid()/jwt()/role() calls in (select …) on all 25
-- storage.objects RLS policies. Same InitPlan promotion benefit;
-- the Supabase advisor doesn't lint the storage schema so these
-- didn't appear in the auth_rls_initplan count, but they have the
-- same per-row evaluation cost on bucket reads/uploads.
--
-- storage.objects is owned by supabase_storage_admin. Migrations
-- run as postgres which has CREATE/DROP rights on storage policies.

DROP POLICY IF EXISTS "Admin users can delete their avatars" ON storage.objects;
CREATE POLICY "Admin users can delete their avatars" ON storage.objects AS PERMISSIVE FOR DELETE
  TO authenticated
  USING (((bucket_id = 'facility-images'::text) AND ((storage.foldername(name))[1] = 'admin-avatars'::text) AND (EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = (select auth.uid())) AND (user_roles.role = ANY (ARRAY['admin'::app_role, 'moderator'::app_role])))))));

DROP POLICY IF EXISTS "Admin users can update their avatars" ON storage.objects;
CREATE POLICY "Admin users can update their avatars" ON storage.objects AS PERMISSIVE FOR UPDATE
  TO authenticated
  USING (((bucket_id = 'facility-images'::text) AND ((storage.foldername(name))[1] = 'admin-avatars'::text) AND (EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = (select auth.uid())) AND (user_roles.role = ANY (ARRAY['admin'::app_role, 'moderator'::app_role])))))));

DROP POLICY IF EXISTS "Admin users can upload avatars" ON storage.objects;
CREATE POLICY "Admin users can upload avatars" ON storage.objects AS PERMISSIVE FOR INSERT
  TO authenticated
  WITH CHECK (((bucket_id = 'facility-images'::text) AND ((storage.foldername(name))[1] = 'admin-avatars'::text) AND (EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = (select auth.uid())) AND (user_roles.role = ANY (ARRAY['admin'::app_role, 'moderator'::app_role])))))));

DROP POLICY IF EXISTS "Admins can delete blog images" ON storage.objects;
CREATE POLICY "Admins can delete blog images" ON storage.objects AS PERMISSIVE FOR DELETE
  USING (((bucket_id = 'blog-images'::text) AND user_is_admin((select auth.uid()))));

DROP POLICY IF EXISTS "Admins can update blog images" ON storage.objects;
CREATE POLICY "Admins can update blog images" ON storage.objects AS PERMISSIVE FOR UPDATE
  USING (((bucket_id = 'blog-images'::text) AND user_is_admin((select auth.uid()))));

DROP POLICY IF EXISTS "Admins can upload blog images" ON storage.objects;
CREATE POLICY "Admins can upload blog images" ON storage.objects AS PERMISSIVE FOR INSERT
  WITH CHECK (((bucket_id = 'blog-images'::text) AND user_is_admin((select auth.uid()))));

DROP POLICY IF EXISTS "Providers can delete their credentials" ON storage.objects;
CREATE POLICY "Providers can delete their credentials" ON storage.objects AS PERMISSIVE FOR DELETE
  TO authenticated
  USING (((bucket_id = 'facility-credentials'::text) AND (((select auth.uid()))::text = (storage.foldername(name))[1])));

DROP POLICY IF EXISTS "Providers can upload credentials" ON storage.objects;
CREATE POLICY "Providers can upload credentials" ON storage.objects AS PERMISSIVE FOR INSERT
  TO authenticated
  WITH CHECK (((bucket_id = 'facility-credentials'::text) AND (((select auth.uid()))::text = (storage.foldername(name))[1])));

DROP POLICY IF EXISTS "Providers can view their credentials" ON storage.objects;
CREATE POLICY "Providers can view their credentials" ON storage.objects AS PERMISSIVE FOR SELECT
  TO authenticated
  USING (((bucket_id = 'facility-credentials'::text) AND (((select auth.uid()))::text = (storage.foldername(name))[1])));

DROP POLICY IF EXISTS "Users can delete own concierge attachments" ON storage.objects;
CREATE POLICY "Users can delete own concierge attachments" ON storage.objects AS PERMISSIVE FOR DELETE
  TO authenticated
  USING (((bucket_id = 'concierge-attachments'::text) AND ((storage.foldername(name))[1] = ((select auth.uid()))::text)));

DROP POLICY IF EXISTS "Users can delete their facility images" ON storage.objects;
CREATE POLICY "Users can delete their facility images" ON storage.objects AS PERMISSIVE FOR DELETE
  USING (((bucket_id = 'facility-images'::text) AND (((select auth.uid()))::text = (storage.foldername(name))[1])));

DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;
CREATE POLICY "Users can delete their own avatar" ON storage.objects AS PERMISSIVE FOR DELETE
  USING (((bucket_id = 'seeker-avatars'::text) AND (((select auth.uid()))::text = (storage.foldername(name))[1])));

DROP POLICY IF EXISTS "Users can read concierge attachments" ON storage.objects;
CREATE POLICY "Users can read concierge attachments" ON storage.objects AS PERMISSIVE FOR SELECT
  TO authenticated
  USING (((bucket_id = 'concierge-attachments'::text) AND (((storage.foldername(name))[1] = ((select auth.uid()))::text) OR (EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = (select auth.uid())) AND (user_roles.role = 'admin'::app_role)))) OR (EXISTS ( SELECT 1
   FROM (concierge_threads ct
     JOIN facilities f ON ((ct.facility_id = f.id)))
  WHERE ((f.user_id = (select auth.uid())) AND ((ct.inquiry_id)::text = (storage.foldername(f.name))[2])))) OR (EXISTS ( SELECT 1
   FROM concierge_inquiries ci
  WHERE ((ci.user_id = (select auth.uid())) AND ((ci.id)::text = (storage.foldername(objects.name))[2])))))));

DROP POLICY IF EXISTS "Users can update their facility images" ON storage.objects;
CREATE POLICY "Users can update their facility images" ON storage.objects AS PERMISSIVE FOR UPDATE
  USING (((bucket_id = 'facility-images'::text) AND (((select auth.uid()))::text = (storage.foldername(name))[1])));

DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
CREATE POLICY "Users can update their own avatar" ON storage.objects AS PERMISSIVE FOR UPDATE
  USING (((bucket_id = 'seeker-avatars'::text) AND (((select auth.uid()))::text = (storage.foldername(name))[1])));

DROP POLICY IF EXISTS "Users can upload concierge attachments" ON storage.objects;
CREATE POLICY "Users can upload concierge attachments" ON storage.objects AS PERMISSIVE FOR INSERT
  TO authenticated
  WITH CHECK (((bucket_id = 'concierge-attachments'::text) AND ((storage.foldername(name))[1] = ((select auth.uid()))::text)));

DROP POLICY IF EXISTS "Users can upload their facility images" ON storage.objects;
CREATE POLICY "Users can upload their facility images" ON storage.objects AS PERMISSIVE FOR INSERT
  WITH CHECK (((bucket_id = 'facility-images'::text) AND (((select auth.uid()))::text = (storage.foldername(name))[1])));

DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
CREATE POLICY "Users can upload their own avatar" ON storage.objects AS PERMISSIVE FOR INSERT
  WITH CHECK (((bucket_id = 'seeker-avatars'::text) AND (((select auth.uid()))::text = (storage.foldername(name))[1])));

DROP POLICY IF EXISTS "claim_evidence_delete_own" ON storage.objects;
CREATE POLICY "claim_evidence_delete_own" ON storage.objects AS PERMISSIVE FOR DELETE
  TO authenticated
  USING (((bucket_id = 'claim-evidence'::text) AND ((storage.foldername(name))[1] = ((select auth.uid()))::text)));

DROP POLICY IF EXISTS "claim_evidence_insert_own" ON storage.objects;
CREATE POLICY "claim_evidence_insert_own" ON storage.objects AS PERMISSIVE FOR INSERT
  TO authenticated
  WITH CHECK (((bucket_id = 'claim-evidence'::text) AND ((storage.foldername(name))[1] = ((select auth.uid()))::text)));

DROP POLICY IF EXISTS "claim_evidence_select_own_or_admin" ON storage.objects;
CREATE POLICY "claim_evidence_select_own_or_admin" ON storage.objects AS PERMISSIVE FOR SELECT
  TO authenticated
  USING (((bucket_id = 'claim-evidence'::text) AND (((storage.foldername(name))[1] = ((select auth.uid()))::text) OR is_admin((select auth.uid())))));

DROP POLICY IF EXISTS "claim_evidence_update_own" ON storage.objects;
CREATE POLICY "claim_evidence_update_own" ON storage.objects AS PERMISSIVE FOR UPDATE
  TO authenticated
  USING (((bucket_id = 'claim-evidence'::text) AND ((storage.foldername(name))[1] = ((select auth.uid()))::text)))
  WITH CHECK (((bucket_id = 'claim-evidence'::text) AND ((storage.foldername(name))[1] = ((select auth.uid()))::text)));

DROP POLICY IF EXISTS "claim_photos_delete_own" ON storage.objects;
CREATE POLICY "claim_photos_delete_own" ON storage.objects AS PERMISSIVE FOR DELETE
  TO authenticated
  USING (((bucket_id = 'claim-photos'::text) AND ((storage.foldername(name))[1] = ((select auth.uid()))::text)));

DROP POLICY IF EXISTS "claim_photos_insert_own" ON storage.objects;
CREATE POLICY "claim_photos_insert_own" ON storage.objects AS PERMISSIVE FOR INSERT
  TO authenticated
  WITH CHECK (((bucket_id = 'claim-photos'::text) AND ((storage.foldername(name))[1] = ((select auth.uid()))::text)));

DROP POLICY IF EXISTS "claim_photos_update_own" ON storage.objects;
CREATE POLICY "claim_photos_update_own" ON storage.objects AS PERMISSIVE FOR UPDATE
  TO authenticated
  USING (((bucket_id = 'claim-photos'::text) AND ((storage.foldername(name))[1] = ((select auth.uid()))::text)))
  WITH CHECK (((bucket_id = 'claim-photos'::text) AND ((storage.foldername(name))[1] = ((select auth.uid()))::text)));
