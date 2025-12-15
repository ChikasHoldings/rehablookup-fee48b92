-- Add security settings to platform_settings table
INSERT INTO public.platform_settings (setting_key, setting_value, description) 
VALUES 
  ('two_factor_required', 'false', 'Require 2FA for all admin accounts'),
  ('password_requirements', '"strong"', 'Minimum password strength: basic, strong, very-strong'),
  ('password_expiry_days', '"never"', 'Force password change period: 30, 60, 90, never'),
  ('ip_whitelist_enabled', 'false', 'Enable IP whitelist for admin access'),
  ('failed_login_lockout', '5', 'Number of failed logins before lockout'),
  ('lockout_duration_minutes', '15', 'Duration of account lockout in minutes')
ON CONFLICT (setting_key) DO NOTHING;