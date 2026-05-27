-- Move accreditation documents into the private facility-credentials bucket.
--
-- Accreditation docs were uploaded to the PUBLIC facility-images bucket,
-- whose MIME allowlist rejects application/pdf — so PDF certificates (the
-- most common format) hard-failed, and image certs were world-readable.
-- They now upload to the private facility-credentials bucket via the
-- validate-and-upload edge function (which already allows PDF + images).
-- We track the object path here and sign short-lived URLs at render time.

-- 1. Storage path within facility-credentials for the accreditation doc.
--    New uploads set this and leave document_url null; legacy rows keep
--    their public document_url for backward-compatible display.
ALTER TABLE public.facility_accreditations
  ADD COLUMN IF NOT EXISTS storage_path text;

COMMENT ON COLUMN public.facility_accreditations.storage_path IS
  'Object path in the private facility-credentials bucket. New accreditation '
  'document uploads set this (document_url left null); render code signs a '
  'short-lived URL. Legacy rows keep a public document_url instead.';

-- 2. The facility-credentials SELECT policy only grants the owning provider
--    read access (auth.uid() = foldername[1]); admins could not read uploaded
--    credential/accreditation documents to verify them. Add an additive
--    permissive policy granting admins read across the bucket so the admin
--    verification UI can sign URLs for these private objects.
DROP POLICY IF EXISTS "facility_credentials_admin_read" ON storage.objects;
CREATE POLICY "facility_credentials_admin_read"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'facility-credentials'
    AND public.is_admin((SELECT auth.uid()))
  );
