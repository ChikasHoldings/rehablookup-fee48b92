-- Add column to track last digest sent
ALTER TABLE public.notification_preferences 
ADD COLUMN IF NOT EXISTS last_digest_sent_at timestamp with time zone;