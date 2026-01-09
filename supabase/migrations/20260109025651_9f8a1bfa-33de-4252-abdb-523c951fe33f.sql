-- Add inquiry_type column to leads table if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'leads' AND column_name = 'inquiry_type') THEN
    ALTER TABLE public.leads ADD COLUMN inquiry_type TEXT DEFAULT 'request_info';
  END IF;
END $$;

-- Insert unlock pricing settings (upsert to avoid duplicates)
INSERT INTO public.platform_settings (setting_key, setting_value, description)
VALUES 
  ('unlock_price_request_info', '{"cents": 3900}', 'Unlock price for Request Info inquiries ($39.00)'),
  ('unlock_price_request_callback', '{"cents": 4900}', 'Unlock price for Request Callback inquiries ($49.00)'),
  ('pro_discount_percent', '{"value": 20}', 'Pro subscriber discount percentage on unlocks')
ON CONFLICT (setting_key) DO UPDATE SET 
  setting_value = EXCLUDED.setting_value,
  description = EXCLUDED.description,
  updated_at = now();

-- Remove placement_match pricing if it exists
DELETE FROM public.platform_settings WHERE setting_key = 'unlock_price_placement_match';