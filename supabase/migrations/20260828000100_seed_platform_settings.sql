-- Re-seed platform_settings defaults.
-- The original CREATE TABLE migration included these INSERTs but they
-- were never applied to the live project. Uses ON CONFLICT DO NOTHING so
-- re-running is safe and any admin-edited values are preserved.

INSERT INTO public.platform_settings (setting_key, setting_value, description) VALUES
  ('maintenance_mode',   '{"enabled": false}'::jsonb,      'Enable/disable maintenance mode'),
  ('api_rate_limiting',  '{"level": "default"}'::jsonb,    'API rate limiting configuration'),
  ('session_timeout',    '{"minutes": 30}'::jsonb,         'Session timeout in minutes'),
  ('timestamp_display',  '{"format": "relative"}'::jsonb,  'Timestamp display format preference'),
  ('ip_whitelist',       '{"enabled": false, "ips": []}'::jsonb, 'Admin IP whitelist configuration'),
  ('concierge_enabled',  '{"enabled": true}'::jsonb,       'Enable/disable concierge placement service'),
  ('featured_enabled',   '{"enabled": true}'::jsonb,       'Enable/disable featured placement rotation'),
  ('review_moderation',  '{"auto_approve": false}'::jsonb, 'Review auto-approval setting')
ON CONFLICT (setting_key) DO NOTHING;
