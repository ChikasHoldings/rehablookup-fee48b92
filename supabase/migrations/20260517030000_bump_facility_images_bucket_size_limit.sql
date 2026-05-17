-- Bucket file_size_limit was 5 MB (5_242_880) but the client-side image
-- validator in FacilityImageUpload + imageUtils accepts up to 10 MB
-- pre-compression. A provider uploading an 8 MB photo would pass client
-- validation, get compressed, but in edge cases (e.g. very-high-res RAW
-- photos) the compressed WebP could still exceed 5 MB and bounce off the
-- bucket with a confusing 413. Bump to 10 MB to keep the client + bucket
-- ceilings aligned.
--
-- Idempotent: UPDATE; the bucket row is guaranteed to exist (created in
-- migration 20251214200648).
UPDATE storage.buckets
SET file_size_limit = 10485760
WHERE id = 'facility-images';
