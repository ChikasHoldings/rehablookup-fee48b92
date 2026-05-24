-- Credential Kit storage bucket — holds the on-demand-generated zip
-- of marketing + credibility assets for Pro-verified facilities.
--
-- DISTINCT FROM `facility-credentials` (uploaded credential
-- DOCUMENTS the provider sends in for verification review). This
-- bucket holds DOWNLOADABLE marketing assets we generate FOR them
-- once they're verified.
--
-- Storage path: credential-kits/<facility_id>/kit-<unix_ms>.zip
--
-- Privacy: private bucket (public=false). Downloads are served via
-- signed URLs minted by the generate-credential-kit edge function
-- after it auth-gates the caller. Direct anon reads are blocked by
-- RLS; the provider's signed URL is good for 1 hour per generation.

BEGIN;

-- 1. Bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'credential-kits',
  'credential-kits',
  false,
  -- 25 MB cap. Realistic kit is ~200KB (PDF + SVGs + HTML zipped).
  -- The cap protects against a future asset-bloat regression.
  26214400,
  ARRAY['application/zip', 'application/octet-stream']
)
ON CONFLICT (id) DO NOTHING;

-- 2. RLS policies on storage.objects for this bucket only.
--    Owners can SELECT their own facility's objects; service role
--    (edge function) handles INSERT + UPDATE + DELETE.
DROP POLICY IF EXISTS "credential_kits_select_owner" ON storage.objects;
CREATE POLICY "credential_kits_select_owner"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'credential-kits'
    AND EXISTS (
      SELECT 1 FROM public.facilities f
      WHERE f.id::text = (storage.foldername(name))[1]
        AND f.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "credential_kits_select_admin" ON storage.objects;
CREATE POLICY "credential_kits_select_admin"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'credential-kits'
    AND has_role(auth.uid(), 'admin'::app_role)
  );

-- Service-role bypasses RLS by default, but we keep an explicit
-- INSERT/UPDATE/DELETE policy off the table — authenticated providers
-- never write to this bucket directly. All writes go through the
-- edge function (which uses the service-role key).

COMMIT;
