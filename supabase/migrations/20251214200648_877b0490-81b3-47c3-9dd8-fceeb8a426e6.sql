-- Add logo and gallery columns to facilities table
ALTER TABLE public.facilities
ADD COLUMN logo_url TEXT,
ADD COLUMN gallery_urls TEXT[] DEFAULT '{}';

-- Create storage bucket for facility images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'facility-images',
  'facility-images',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp']
);

-- RLS policies for facility-images bucket

-- Anyone can view facility images (public bucket)
CREATE POLICY "Anyone can view facility images"
ON storage.objects FOR SELECT
USING (bucket_id = 'facility-images');

-- Users can upload images to their own facility folder
CREATE POLICY "Users can upload their facility images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'facility-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can update their own facility images
CREATE POLICY "Users can update their facility images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'facility-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can delete their own facility images
CREATE POLICY "Users can delete their facility images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'facility-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);