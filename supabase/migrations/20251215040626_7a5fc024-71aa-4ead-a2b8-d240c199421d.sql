-- Create a table to track flagged facility images
CREATE TABLE public.flagged_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id uuid NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  image_type text NOT NULL CHECK (image_type IN ('logo', 'gallery')),
  reason text,
  flagged_by uuid NOT NULL,
  flagged_at timestamp with time zone NOT NULL DEFAULT now(),
  resolved boolean DEFAULT false,
  resolved_at timestamp with time zone,
  resolved_by uuid,
  resolution_notes text,
  UNIQUE(facility_id, image_url)
);

-- Enable RLS
ALTER TABLE public.flagged_images ENABLE ROW LEVEL SECURITY;

-- Admins can view all flagged images
CREATE POLICY "Admins can view flagged images"
ON public.flagged_images
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can insert flagged images
CREATE POLICY "Admins can insert flagged images"
ON public.flagged_images
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Admins can update flagged images
CREATE POLICY "Admins can update flagged images"
ON public.flagged_images
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can delete flagged images
CREATE POLICY "Admins can delete flagged images"
ON public.flagged_images
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));