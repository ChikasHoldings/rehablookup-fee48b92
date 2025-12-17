-- Add storage policies for admin avatar uploads
-- Admin users can upload to admin-avatars folder

CREATE POLICY "Admin users can upload avatars"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'facility-images' 
  AND (storage.foldername(name))[1] = 'admin-avatars'
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'moderator')
  )
);

CREATE POLICY "Admin users can update their avatars"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'facility-images' 
  AND (storage.foldername(name))[1] = 'admin-avatars'
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'moderator')
  )
);

CREATE POLICY "Admin users can delete their avatars"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'facility-images' 
  AND (storage.foldername(name))[1] = 'admin-avatars'
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'moderator')
  )
);