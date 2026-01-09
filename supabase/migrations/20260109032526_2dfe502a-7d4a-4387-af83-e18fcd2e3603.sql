-- Add ranking score columns to facilities table
ALTER TABLE public.facilities 
ADD COLUMN IF NOT EXISTS listing_completeness_score integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS response_rate_score integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_activity_at timestamptz,
ADD COLUMN IF NOT EXISTS calculated_ranking_score integer DEFAULT 0;

-- Add ranking weights to platform_settings
INSERT INTO public.platform_settings (setting_key, setting_value)
VALUES ('ranking_weights', '{
  "pro_boost": 50,
  "listing_completeness": 20,
  "response_rate": 15,
  "recency": 10,
  "location_relevance": 5
}'::jsonb)
ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value;