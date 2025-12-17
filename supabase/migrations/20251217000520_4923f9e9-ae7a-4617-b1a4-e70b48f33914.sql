-- Add featured display order column for controlling homepage order
ALTER TABLE public.facilities 
ADD COLUMN IF NOT EXISTS featured_display_order integer DEFAULT NULL;

-- Create index for efficient sorting
CREATE INDEX IF NOT EXISTS idx_facilities_featured_display_order 
ON public.facilities (featured_display_order NULLS LAST)
WHERE featured = true OR featured_pinned = true;