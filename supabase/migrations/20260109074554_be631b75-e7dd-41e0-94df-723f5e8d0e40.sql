-- Create storage bucket for concierge attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('concierge-attachments', 'concierge-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload their own attachments
CREATE POLICY "Users can upload concierge attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'concierge-attachments' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to read attachments from threads they have access to
CREATE POLICY "Users can read concierge attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'concierge-attachments' AND
  (
    -- User owns the file
    (storage.foldername(name))[1] = auth.uid()::text
    OR
    -- User is admin
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
    OR
    -- User is a facility owner with access to thread
    EXISTS (
      SELECT 1 FROM public.concierge_threads ct
      JOIN public.facilities f ON ct.facility_id = f.id
      WHERE f.user_id = auth.uid()
      AND ct.inquiry_id::text = (storage.foldername(name))[2]
    )
    OR
    -- User owns the inquiry
    EXISTS (
      SELECT 1 FROM public.concierge_inquiries ci
      WHERE ci.user_id = auth.uid()
      AND ci.id::text = (storage.foldername(name))[2]
    )
  )
);

-- Allow users to delete their own attachments
CREATE POLICY "Users can delete own concierge attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'concierge-attachments' AND
  (storage.foldername(name))[1] = auth.uid()::text
);