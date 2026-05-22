-- Batch 11/11 — consolidate multi-permissive RLS policies.
-- Tables: storage.objects
--
-- Strategy: drop service_role-only policies (no-op; service_role
-- bypasses RLS). For the remaining active policies in each (table,
-- command) group, OR them into a single PERMISSIVE policy with the
-- broadest role binding from the group. PostgreSQL OR-combines
-- multiple permissive policies anyway, so this is behavior-preserving
-- but eliminates the per-row planner overhead of evaluating each.

-- storage.objects • DELETE (9 policies; 0 service_role-only dropped, 9 active)
DROP POLICY IF EXISTS "Admin users can delete their avatars" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete blog images" ON storage.objects;
DROP POLICY IF EXISTS "Providers can delete staff photos" ON storage.objects;
DROP POLICY IF EXISTS "Providers can delete their credentials" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own concierge attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their facility images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "claim_evidence_delete_own" ON storage.objects;
DROP POLICY IF EXISTS "claim_photos_delete_own" ON storage.objects;
CREATE POLICY "objects_delete_consolidated"
  ON storage.objects
  AS PERMISSIVE FOR DELETE
  USING ((((bucket_id = 'facility-images'::text) AND ((storage.foldername(name))[1] = 'admin-avatars'::text) AND (EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = ( SELECT auth.uid() AS uid)) AND (user_roles.role = ANY (ARRAY['admin'::app_role, 'moderator'::app_role]))))))) OR (((bucket_id = 'blog-images'::text) AND user_is_admin(( SELECT auth.uid() AS uid)))) OR ((bucket_id = 'facility-staff-photos'::text)) OR (((bucket_id = 'facility-credentials'::text) AND ((( SELECT auth.uid() AS uid))::text = (storage.foldername(name))[1]))) OR (((bucket_id = 'concierge-attachments'::text) AND ((storage.foldername(name))[1] = (( SELECT auth.uid() AS uid))::text))) OR (((bucket_id = 'facility-images'::text) AND ((( SELECT auth.uid() AS uid))::text = (storage.foldername(name))[1]))) OR (((bucket_id = 'seeker-avatars'::text) AND ((( SELECT auth.uid() AS uid))::text = (storage.foldername(name))[1]))) OR (((bucket_id = 'claim-evidence'::text) AND ((storage.foldername(name))[1] = (( SELECT auth.uid() AS uid))::text))) OR (((bucket_id = 'claim-photos'::text) AND ((storage.foldername(name))[1] = (( SELECT auth.uid() AS uid))::text))));

-- storage.objects • INSERT (9 policies; 0 service_role-only dropped, 9 active)
DROP POLICY IF EXISTS "Admin users can upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload blog images" ON storage.objects;
DROP POLICY IF EXISTS "Providers can upload credentials" ON storage.objects;
DROP POLICY IF EXISTS "Providers can upload staff photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload concierge attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their facility images" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "claim_evidence_insert_own" ON storage.objects;
DROP POLICY IF EXISTS "claim_photos_insert_own" ON storage.objects;
CREATE POLICY "objects_insert_consolidated"
  ON storage.objects
  AS PERMISSIVE FOR INSERT
  WITH CHECK ((((bucket_id = 'facility-images'::text) AND ((storage.foldername(name))[1] = 'admin-avatars'::text) AND (EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = ( SELECT auth.uid() AS uid)) AND (user_roles.role = ANY (ARRAY['admin'::app_role, 'moderator'::app_role]))))))) OR (((bucket_id = 'blog-images'::text) AND user_is_admin(( SELECT auth.uid() AS uid)))) OR (((bucket_id = 'facility-credentials'::text) AND ((( SELECT auth.uid() AS uid))::text = (storage.foldername(name))[1]))) OR ((bucket_id = 'facility-staff-photos'::text)) OR (((bucket_id = 'concierge-attachments'::text) AND ((storage.foldername(name))[1] = (( SELECT auth.uid() AS uid))::text))) OR (((bucket_id = 'facility-images'::text) AND ((( SELECT auth.uid() AS uid))::text = (storage.foldername(name))[1]))) OR (((bucket_id = 'seeker-avatars'::text) AND ((( SELECT auth.uid() AS uid))::text = (storage.foldername(name))[1]))) OR (((bucket_id = 'claim-evidence'::text) AND ((storage.foldername(name))[1] = (( SELECT auth.uid() AS uid))::text))) OR (((bucket_id = 'claim-photos'::text) AND ((storage.foldername(name))[1] = (( SELECT auth.uid() AS uid))::text))));

-- storage.objects • SELECT (6 policies; 0 service_role-only dropped, 6 active)
DROP POLICY IF EXISTS "Anyone can view facility images by path" ON storage.objects;
DROP POLICY IF EXISTS "Providers can view their credentials" ON storage.objects;
DROP POLICY IF EXISTS "Public can view blog images by path" ON storage.objects;
DROP POLICY IF EXISTS "Seeker avatars viewable by path" ON storage.objects;
DROP POLICY IF EXISTS "Users can read concierge attachments" ON storage.objects;
DROP POLICY IF EXISTS "claim_evidence_select_own_or_admin" ON storage.objects;
CREATE POLICY "objects_select_consolidated"
  ON storage.objects
  AS PERMISSIVE FOR SELECT
  USING ((((bucket_id = 'facility-images'::text) AND (name IS NOT NULL) AND (name <> ''::text))) OR (((bucket_id = 'facility-credentials'::text) AND ((( SELECT auth.uid() AS uid))::text = (storage.foldername(name))[1]))) OR (((bucket_id = 'blog-images'::text) AND (name IS NOT NULL) AND (name <> ''::text))) OR (((bucket_id = 'seeker-avatars'::text) AND (name IS NOT NULL) AND (name <> ''::text))) OR (((bucket_id = 'concierge-attachments'::text) AND (((storage.foldername(name))[1] = (( SELECT auth.uid() AS uid))::text) OR (EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = ( SELECT auth.uid() AS uid)) AND (user_roles.role = 'admin'::app_role)))) OR (EXISTS ( SELECT 1
   FROM (concierge_threads ct
     JOIN facilities f ON ((ct.facility_id = f.id)))
  WHERE ((f.user_id = ( SELECT auth.uid() AS uid)) AND ((ct.inquiry_id)::text = (storage.foldername(f.name))[2])))) OR (EXISTS ( SELECT 1
   FROM concierge_inquiries ci
  WHERE ((ci.user_id = ( SELECT auth.uid() AS uid)) AND ((ci.id)::text = (storage.foldername(objects.name))[2]))))))) OR (((bucket_id = 'claim-evidence'::text) AND (((storage.foldername(name))[1] = (( SELECT auth.uid() AS uid))::text) OR is_admin(( SELECT auth.uid() AS uid))))));

-- storage.objects • UPDATE (6 policies; 0 service_role-only dropped, 6 active)
DROP POLICY IF EXISTS "Admin users can update their avatars" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update blog images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their facility images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "claim_evidence_update_own" ON storage.objects;
DROP POLICY IF EXISTS "claim_photos_update_own" ON storage.objects;
CREATE POLICY "objects_update_consolidated"
  ON storage.objects
  AS PERMISSIVE FOR UPDATE
  USING ((((bucket_id = 'facility-images'::text) AND ((storage.foldername(name))[1] = 'admin-avatars'::text) AND (EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = ( SELECT auth.uid() AS uid)) AND (user_roles.role = ANY (ARRAY['admin'::app_role, 'moderator'::app_role]))))))) OR (((bucket_id = 'blog-images'::text) AND user_is_admin(( SELECT auth.uid() AS uid)))) OR (((bucket_id = 'facility-images'::text) AND ((( SELECT auth.uid() AS uid))::text = (storage.foldername(name))[1]))) OR (((bucket_id = 'seeker-avatars'::text) AND ((( SELECT auth.uid() AS uid))::text = (storage.foldername(name))[1]))) OR (((bucket_id = 'claim-evidence'::text) AND ((storage.foldername(name))[1] = (( SELECT auth.uid() AS uid))::text))) OR (((bucket_id = 'claim-photos'::text) AND ((storage.foldername(name))[1] = (( SELECT auth.uid() AS uid))::text))))
  WITH CHECK ((((bucket_id = 'facility-images'::text) AND ((storage.foldername(name))[1] = 'admin-avatars'::text) AND (EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = ( SELECT auth.uid() AS uid)) AND (user_roles.role = ANY (ARRAY['admin'::app_role, 'moderator'::app_role]))))))) OR (((bucket_id = 'blog-images'::text) AND user_is_admin(( SELECT auth.uid() AS uid)))) OR (((bucket_id = 'facility-images'::text) AND ((( SELECT auth.uid() AS uid))::text = (storage.foldername(name))[1]))) OR (((bucket_id = 'seeker-avatars'::text) AND ((( SELECT auth.uid() AS uid))::text = (storage.foldername(name))[1]))) OR (((bucket_id = 'claim-evidence'::text) AND ((storage.foldername(name))[1] = (( SELECT auth.uid() AS uid))::text))) OR (((bucket_id = 'claim-photos'::text) AND ((storage.foldername(name))[1] = (( SELECT auth.uid() AS uid))::text))));
