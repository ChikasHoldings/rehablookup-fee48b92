-- =============================================================================
-- Plan-aware object-count ceiling for the facility-images bucket.
--
-- The 5/10 photo cap is enforced on facilities.gallery_urls (what the public
-- sees), but the storage bucket itself accepted unlimited uploads: the
-- consolidated INSERT policy checks only folder ownership. A Free provider
-- could push unbounded files into storage (cost/abuse), even though only 5
-- ever display.
--
-- Fix: a RESTRICTIVE policy (ANDs with the existing consolidated permissive
-- policy, so nothing else changes) that caps the number of objects a
-- provider can hold in their own facility-images folder. The bucket also
-- carries logos and staff photos, so the ceilings cover full legitimate
-- usage plus replacement slack:
--
--   Free → 20 objects  (1 facility × [5 gallery + 1 logo + 3 staff] = 9 + slack)
--   Pro  → 150 objects (5 facilities × [10 gallery + 1 logo + 10 staff] = 105 + slack)
--
-- These are anti-abuse ceilings, deliberately looser than the display caps —
-- the gallery trigger remains the precise limit on what renders. The
-- admin-avatars folder inside the same bucket is exempt (folder name is not
-- the uploader's uid, so the restrictive check passes it through).
-- validate-and-upload (service role, bypasses RLS) applies the same ceiling
-- in code.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.facility_images_upload_within_cap(p_user uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'storage', 'pg_temp'
AS $function$
DECLARE
  v_is_pro boolean;
  v_cap int;
  v_count int;
BEGIN
  IF p_user IS NULL THEN
    RETURN false;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.facility_subscriptions
    WHERE provider_id = p_user
      AND tier = 'pro'
      AND (
        (status = 'active' AND (current_period_end IS NULL OR current_period_end > now()))
        OR status = 'past_due'
      )
  ) INTO v_is_pro;

  v_cap := CASE WHEN v_is_pro THEN 150 ELSE 20 END;

  SELECT COUNT(*) INTO v_count
  FROM storage.objects o
  WHERE o.bucket_id = 'facility-images'
    AND (storage.foldername(o.name))[1] = p_user::text;

  RETURN v_count < v_cap;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.facility_images_upload_within_cap(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.facility_images_upload_within_cap(uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS facility_images_plan_object_cap ON storage.objects;
CREATE POLICY facility_images_plan_object_cap
  ON storage.objects AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id <> 'facility-images'
    OR (storage.foldername(name))[1] <> (SELECT auth.uid())::text
    OR public.facility_images_upload_within_cap((SELECT auth.uid()))
  );
