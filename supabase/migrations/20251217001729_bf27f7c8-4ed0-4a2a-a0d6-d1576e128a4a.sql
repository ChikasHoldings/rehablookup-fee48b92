-- Add email notification preferences to admin_user_profiles
ALTER TABLE public.admin_user_profiles
ADD COLUMN IF NOT EXISTS notify_new_providers boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS notify_new_leads boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS notify_security_events boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS notify_system_alerts boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS notify_subscription_changes boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS email_digest_frequency text DEFAULT 'daily';