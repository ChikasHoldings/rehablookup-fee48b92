-- Add columns for featured rotation tracking and admin override
ALTER TABLE public.facilities 
ADD COLUMN IF NOT EXISTS last_featured_shown_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS featured_pinned BOOLEAN DEFAULT FALSE;

-- Add index for efficient featured rotation queries
CREATE INDEX IF NOT EXISTS idx_facilities_featured_rotation 
ON public.facilities (status, suspended, last_featured_shown_at NULLS FIRST)
WHERE status = 'approved' AND (suspended IS NULL OR suspended = false);