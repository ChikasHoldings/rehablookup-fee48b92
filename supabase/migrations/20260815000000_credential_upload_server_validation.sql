-- Server-side hardening for credential-document uploads.
--
-- Before: the facility-credentials bucket had NO allowed_mime_types and
-- NO file_size_limit — the only validation was client-side
-- (file.type + file.size in CredentialsUpload.tsx), trivially bypassed.
--
-- After:
--   1. Bucket-level MIME allowlist + 10MB size cap. Enforced by Supabase
--      Storage on every write regardless of path. (Declared-MIME + size.)
--   2. A RESTRICTIVE insert policy that blocks authenticated clients from
--      writing to facility-credentials directly. All credential uploads
--      now go through the validate-and-upload edge function, which runs
--      magic-byte content verification and writes via the service role
--      (service role bypasses RLS). This makes content verification
--      unbypassable — a client can no longer push a mislabeled file
--      straight into the bucket.
--
-- facility-images is intentionally NOT locked down here: it is written by
-- many flows (gallery, logo, staff photos, admin avatars, signup) and
-- already carries an image MIME allowlist + 10MB cap at the bucket level.
-- Gallery uploads additionally route through validate-and-upload for
-- magic-byte verification, but direct writes remain available to the
-- other legitimate writers (notably staff photos, which must not be
-- loosened or broken).

-- 1. Bucket allowlist + size for credentials (PDF + image formats).
UPDATE storage.buckets
SET
  allowed_mime_types = ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp'],
  file_size_limit = 10485760  -- 10 MB
WHERE id = 'facility-credentials';

-- 2. Force credential uploads through the validating edge function.
--    RESTRICTIVE policies AND with the permissive ones, so this denies
--    every authenticated direct insert into facility-credentials while
--    leaving all other buckets (and service-role writes) untouched.
DROP POLICY IF EXISTS "credentials_force_validated_upload" ON storage.objects;
CREATE POLICY "credentials_force_validated_upload"
  ON storage.objects
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id <> 'facility-credentials');
