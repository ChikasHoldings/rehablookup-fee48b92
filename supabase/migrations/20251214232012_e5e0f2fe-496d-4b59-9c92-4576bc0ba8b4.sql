-- Add granular lead notification preferences
ALTER TABLE public.notification_preferences 
ADD COLUMN IF NOT EXISTS lead_notification_frequency text DEFAULT 'instant',
ADD COLUMN IF NOT EXISTS notify_new_leads boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS notify_lead_status_changes boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS notify_lead_limit_warnings boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS notify_facility_views boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS digest_time text DEFAULT '09:00';

-- Add comment explaining the frequency options
COMMENT ON COLUMN public.notification_preferences.lead_notification_frequency IS 'Options: instant, daily_digest, weekly_digest, none';