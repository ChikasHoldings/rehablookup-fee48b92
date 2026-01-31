-- Add redistribution columns to leads table
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS exclusive_until TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS extended_until TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS redistribution_status TEXT DEFAULT 'exclusive',
ADD COLUMN IF NOT EXISTS original_facility_id UUID REFERENCES public.facilities(id),
ADD COLUMN IF NOT EXISTS reminder_6h_sent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS reminder_12h_sent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS reminder_24h_sent_at TIMESTAMPTZ;

-- Add check constraint for redistribution_status
ALTER TABLE public.leads 
ADD CONSTRAINT leads_redistribution_status_check 
CHECK (redistribution_status IN ('exclusive', 'extended', 'expired'));

-- Create index for redistribution queries
CREATE INDEX IF NOT EXISTS idx_leads_redistribution_status ON public.leads(redistribution_status);
CREATE INDEX IF NOT EXISTS idx_leads_exclusive_until ON public.leads(exclusive_until) WHERE redistribution_status = 'exclusive';

-- Create lead_distributions table
CREATE TABLE IF NOT EXISTS public.lead_distributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  facility_id UUID NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
  is_original BOOLEAN NOT NULL DEFAULT false,
  distributed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notification_sent BOOLEAN NOT NULL DEFAULT false,
  notification_sent_at TIMESTAMPTZ,
  unlocked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(lead_id, facility_id)
);

-- Create indexes for lead_distributions
CREATE INDEX IF NOT EXISTS idx_lead_distributions_lead_id ON public.lead_distributions(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_distributions_facility_id ON public.lead_distributions(facility_id);
CREATE INDEX IF NOT EXISTS idx_lead_distributions_pending_notification ON public.lead_distributions(notification_sent) WHERE notification_sent = false;

-- Enable RLS on lead_distributions
ALTER TABLE public.lead_distributions ENABLE ROW LEVEL SECURITY;

-- RLS policies for lead_distributions
CREATE POLICY "Providers can view their own lead distributions"
ON public.lead_distributions FOR SELECT
USING (
  facility_id IN (SELECT id FROM public.facilities WHERE user_id = auth.uid())
);

CREATE POLICY "Admins can view all lead distributions"
ON public.lead_distributions FOR SELECT
USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Admins can manage lead distributions"
ON public.lead_distributions FOR ALL
USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Insert platform settings for redistribution
INSERT INTO public.platform_settings (setting_key, setting_value, description)
VALUES 
  ('exclusive_window_hours', '{"value": 24}', 'Hours before lead redistribution to nearby facilities'),
  ('extended_window_hours', '{"value": 48}', 'Hours for extended redistribution phase'),
  ('redistributed_unlock_price', '{"cents": 1500}', 'Price in cents for unlocking redistributed leads ($15)'),
  ('max_redistribution_facilities', '{"value": 3}', 'Maximum number of facilities to redistribute a lead to')
ON CONFLICT (setting_key) DO NOTHING;