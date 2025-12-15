-- Create platform settings table for admin configuration
CREATE TABLE public.platform_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text NOT NULL UNIQUE,
  setting_value jsonb NOT NULL DEFAULT '{}'::jsonb,
  description text,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

-- Enable Row Level Security
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- Create policies - only admins can read/write
CREATE POLICY "Admins can view settings"
  ON public.platform_settings
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update settings"
  ON public.platform_settings
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert settings"
  ON public.platform_settings
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_platform_settings_updated_at
  BEFORE UPDATE ON public.platform_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default settings
INSERT INTO public.platform_settings (setting_key, setting_value, description) VALUES
  ('maintenance_mode', '{"enabled": false}'::jsonb, 'Enable/disable maintenance mode'),
  ('api_rate_limiting', '{"level": "default"}'::jsonb, 'API rate limiting configuration'),
  ('session_timeout', '{"minutes": 30}'::jsonb, 'Session timeout in minutes'),
  ('timestamp_display', '{"format": "relative"}'::jsonb, 'Timestamp display format preference');

-- Enable realtime for settings updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.platform_settings;