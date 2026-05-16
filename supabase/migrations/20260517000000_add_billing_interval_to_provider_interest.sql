-- Add billing_interval to provider_interest
-- ──────────────────────────────────────────
-- The restructured /for-providers page asks design-partner waitlist
-- entries which billing cadence they're most interested in. The four
-- chip values are mirrored from the form: "monthly", "annual",
-- "either", "not_sure". Nullable because earlier waitlist submissions
-- pre-date this column.

ALTER TABLE public.provider_interest
  ADD COLUMN IF NOT EXISTS billing_interval text;

COMMENT ON COLUMN public.provider_interest.billing_interval IS
  'Preferred billing cadence captured from the sales-page chip group:
   "monthly" | "annual" | "either" | "not_sure". Nullable for legacy rows.';
