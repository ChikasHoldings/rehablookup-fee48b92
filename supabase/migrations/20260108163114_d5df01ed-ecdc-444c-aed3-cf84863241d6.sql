-- Add inquiry_type column to leads table
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS inquiry_type text DEFAULT 'request_info';

-- Add provider response workflow columns to leads table
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS provider_response_status text DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS provider_responded_at timestamp with time zone;

-- Add enhanced transaction logging columns to credit_transactions table
ALTER TABLE public.credit_transactions 
ADD COLUMN IF NOT EXISTS inquiry_type text,
ADD COLUMN IF NOT EXISTS base_price_cents integer,
ADD COLUMN IF NOT EXISTS discount_applied boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS discount_amount_cents integer DEFAULT 0;

-- Insert unlock pricing settings into platform_settings
INSERT INTO platform_settings (setting_key, setting_value, description) VALUES
  ('unlock_price_request_info', '{"cents": 3900}', 'Unlock price for Request Info inquiries ($39.00)')
ON CONFLICT (setting_key) DO NOTHING;

INSERT INTO platform_settings (setting_key, setting_value, description) VALUES
  ('unlock_price_request_callback', '{"cents": 4900}', 'Unlock price for Request Callback inquiries ($49.00)')
ON CONFLICT (setting_key) DO NOTHING;

INSERT INTO platform_settings (setting_key, setting_value, description) VALUES
  ('unlock_price_placement_match', '{"cents": 9900}', 'Unlock price for Placement Match inquiries ($99.00)')
ON CONFLICT (setting_key) DO NOTHING;

INSERT INTO platform_settings (setting_key, setting_value, description) VALUES
  ('pro_discount_percent', '{"value": 20}', 'Pro subscriber discount percentage on unlocks')
ON CONFLICT (setting_key) DO NOTHING;

-- Create index for faster inquiry type filtering
CREATE INDEX IF NOT EXISTS idx_leads_inquiry_type ON public.leads(inquiry_type);
CREATE INDEX IF NOT EXISTS idx_leads_provider_response_status ON public.leads(provider_response_status);