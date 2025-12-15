-- Create template_tags table for merge field registry
CREATE TABLE public.template_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('lead', 'provider', 'platform')),
  path TEXT NOT NULL,
  fallback TEXT,
  is_required BOOLEAN NOT NULL DEFAULT false,
  example_value TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.template_tags ENABLE ROW LEVEL SECURITY;

-- Anyone can read template tags (they're public reference data)
CREATE POLICY "Anyone can view template tags"
ON public.template_tags
FOR SELECT
USING (true);

-- Only service role can modify template tags
CREATE POLICY "Service role can manage template tags"
ON public.template_tags
FOR ALL
USING (true)
WITH CHECK (true);

-- Add primary_contact_name to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS primary_contact_name TEXT;

-- Seed standard template tags
INSERT INTO public.template_tags (key, label, source, path, fallback, is_required, example_value) VALUES
-- Lead tags
('lead_first_name', 'Lead First Name', 'lead', 'name', NULL, true, 'John'),
('lead_last_name', 'Lead Last Name', 'lead', 'name', NULL, false, 'Smith'),
('lead_email', 'Lead Email', 'lead', 'email', NULL, true, 'john.smith@example.com'),
('lead_phone', 'Lead Phone', 'lead', 'phone', NULL, false, '(555) 123-4567'),
('lead_location', 'Lead Location', 'lead', 'location_city_state', NULL, false, 'Los Angeles, CA'),

-- Provider tags
('provider_contact_name', 'Provider Contact Name', 'provider', 'primary_contact_name', 'provider_name', false, 'Sarah Johnson'),
('provider_name', 'Provider/Facility Name', 'provider', 'facility_name', NULL, true, 'Recovery Center'),
('provider_city', 'Provider City', 'provider', 'city', NULL, false, 'Miami'),
('provider_state', 'Provider State', 'provider', 'state', NULL, false, 'FL'),
('provider_phone', 'Provider Phone', 'provider', 'phone', NULL, false, '(800) 555-0199'),
('provider_email', 'Provider Email', 'provider', 'email', NULL, false, 'contact@facility.com'),

-- Platform tags
('platform_name', 'Platform Name', 'platform', 'constant', NULL, true, 'RehabLookup'),
('support_email', 'Support Email', 'platform', 'constant', NULL, true, 'support@rehablookup.com');