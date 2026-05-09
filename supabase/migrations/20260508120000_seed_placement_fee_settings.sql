-- Seed placement fee settings in platform_settings so that
-- charge-placement-fee and AdminConfirmPlacement don't rely solely on hardcoded defaults.
-- Correct pricing:
--   Domestic Placement Fee: $1,000 (100000 cents)
--   International Admission Fee: $3,000 (300000 cents)
--   Pro Discount: 20%

INSERT INTO public.platform_settings (setting_key, setting_value, description)
VALUES
  ('placement_fee_domestic', '{"cents": 100000}', 'Domestic placement service fee charged to provider ($1,000)'),
  ('placement_fee_international', '{"cents": 300000}', 'International admission facility fee charged to provider ($3,000)')
ON CONFLICT (setting_key) DO UPDATE
  SET setting_value = EXCLUDED.setting_value,
      description = EXCLUDED.description,
      updated_at = now();
