-- Add admin notification settings to platform_settings table
INSERT INTO public.platform_settings (setting_key, setting_value, description) 
VALUES 
  ('email_new_provider_signups', 'true', 'Email notification for new provider signups'),
  ('email_payment_failures', 'true', 'Email notification for payment failures'),
  ('email_system_alerts', 'true', 'Email notification for critical system alerts'),
  ('inapp_pending_approvals', 'true', 'In-app notification for pending provider approvals'),
  ('inapp_unassigned_leads', 'true', 'In-app notification for unassigned leads'),
  ('inapp_flagged_content', 'true', 'In-app notification for flagged images/content'),
  ('daily_summary_enabled', 'true', 'Enable daily summary email'),
  ('daily_summary_time', '"09:00"', 'Time to send daily summary email'),
  ('weekly_report_enabled', 'true', 'Enable weekly analytics report'),
  ('weekly_report_day', '"monday"', 'Day to send weekly report')
ON CONFLICT (setting_key) DO NOTHING;