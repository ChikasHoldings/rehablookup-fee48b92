-- =============================================================================
-- Constrain image-only storage buckets to image MIME types + a size ceiling.
--
-- FINDING
--   facility-staff-photos and seeker-avatars had NULL allowed_mime_types and
--   NULL file_size_limit — any file of any size could be uploaded, unlike
--   facility-images (image/jpeg,png,webp + 10 MB). Both buckets are image-only
--   by intent (staff headshots / user avatars).
--
-- FIX
--   Match facility-images' MIME allow-list. Cap staff photos at 10 MB (same as
--   facility-images) and avatars at 5 MB. This only tightens: non-image or
--   oversized uploads are rejected at the storage layer. service_role uploads
--   are unaffected by MIME/size? (No — bucket constraints apply to all writers,
--   which is the intended hardening; app image uploads are well within limits.)
--
-- ROLLBACK: UPDATE storage.buckets SET allowed_mime_types=NULL, file_size_limit=NULL
--           WHERE id IN ('facility-staff-photos','seeker-avatars');
-- =============================================================================

UPDATE storage.buckets
SET allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp'],
    file_size_limit = 10485760  -- 10 MB
WHERE id = 'facility-staff-photos';

UPDATE storage.buckets
SET allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp'],
    file_size_limit = 5242880  -- 5 MB
WHERE id = 'seeker-avatars';
