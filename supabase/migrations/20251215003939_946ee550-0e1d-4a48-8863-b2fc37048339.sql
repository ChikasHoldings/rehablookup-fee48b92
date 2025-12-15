-- Add column to track profile completion reminder emails
ALTER TABLE public.facilities
ADD COLUMN IF NOT EXISTS profile_reminder_sent_at timestamp with time zone DEFAULT NULL;

-- Add column to track reminder count to avoid over-sending
ALTER TABLE public.facilities
ADD COLUMN IF NOT EXISTS profile_reminder_count integer DEFAULT 0;

-- Create index for efficient querying of incomplete profiles
CREATE INDEX IF NOT EXISTS idx_facilities_reminder_status 
ON public.facilities (status, profile_reminder_sent_at, profile_reminder_count);