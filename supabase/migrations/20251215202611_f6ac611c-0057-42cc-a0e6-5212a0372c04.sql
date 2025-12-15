-- Add follow-up reminder settings to notification_preferences
ALTER TABLE public.notification_preferences 
ADD COLUMN IF NOT EXISTS followup_reminders_enabled boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS default_snooze_duration text DEFAULT '1_day';