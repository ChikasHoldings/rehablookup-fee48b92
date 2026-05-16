-- ╔══════════════════════════════════════════════════════════════════╗
-- ║  Monetization Rebuild — billing_period correction (monthly+annual)  ║
-- ║                                                                    ║
-- ║  PR-1 foundation migration assumed annual-only billing. We're now ║
-- ║  shipping monthly as the DEFAULT interval and annual as a 15%-off  ║
-- ║  upsell. This migration:                                           ║
-- ║                                                                    ║
-- ║   1. Drops the annual-only CHECK on facility_subscriptions.        ║
-- ║   2. Changes the column DEFAULT from 'annual' → 'monthly'.         ║
-- ║   3. Adds a new CHECK allowing both 'monthly' and 'annual'.        ║
-- ║   4. Adds current_monthly_period_start for monthly-cadence period  ║
-- ║      tracking (mirrors period_start for annual subscribers).       ║
-- ║                                                                    ║
-- ║  Existing rows aren't touched — billing_period stays 'annual' for   ║
-- ║  any rows already inserted under the old default. For monthly      ║
-- ║  subscribers, the webhook will set the values explicitly using     ║
-- ║  the Stripe price's recurring.interval.                            ║
-- ╚══════════════════════════════════════════════════════════════════╝

-- 1) Drop the annual-only CHECK. Postgres auto-names this constraint
--    from the column name; we don't reference it elsewhere, so DROP
--    CONSTRAINT IF EXISTS is the safe form.
ALTER TABLE public.facility_subscriptions
  DROP CONSTRAINT IF EXISTS facility_subscriptions_billing_period_check;

-- 2) Change the DEFAULT.
ALTER TABLE public.facility_subscriptions
  ALTER COLUMN billing_period SET DEFAULT 'monthly';

-- 3) Add the new CHECK accepting both intervals.
ALTER TABLE public.facility_subscriptions
  ADD CONSTRAINT facility_subscriptions_billing_period_check
  CHECK (billing_period IN ('monthly', 'annual'));

-- 4) Add the monthly-period tracking column. Nullable — for annual
--    subscribers this mirrors period_start; for monthly it advances
--    each renewal so the cancellation flow knows which month was
--    actually consumed.
ALTER TABLE public.facility_subscriptions
  ADD COLUMN IF NOT EXISTS current_monthly_period_start timestamptz;

COMMENT ON COLUMN public.facility_subscriptions.billing_period IS
  'Subscriber-chosen billing cadence. Default ''monthly'' — the standard
   interval. ''annual'' is the 15%-discount upsell. Derived by the
   stripe-webhook from price.recurring.interval (month → monthly,
   year → annual).';

COMMENT ON COLUMN public.facility_subscriptions.current_monthly_period_start IS
  'For monthly subscribers, the start of the current 30-day billing window.
   Advances on every successful renewal invoice. For annual subscribers,
   mirrors period_start (the helper that reads this column should fall
   back to period_start when current_monthly_period_start is NULL).';

COMMENT ON COLUMN public.facility_subscriptions.original_annual_cents IS
  'Sticker-price annual amount in cents BEFORE the 15% discount, for
   annual subscribers. NULL for monthly subscribers (monthly never
   has an annual sticker).';

COMMENT ON COLUMN public.facility_subscriptions.discount_applied_cents IS
  'Annual-discount amount in cents (15% of original_annual_cents) for
   annual subscribers. Always 0 for monthly subscribers — they don''t
   get the discount.';

COMMENT ON COLUMN public.facility_subscriptions.paid_amount_cents IS
  'What Stripe actually charged at the most recent renewal.
   For monthly: the monthly amount ($99 / $599 / $1,000 per add-on).
   For annual: the discounted annual ($1,009.80 / $6,108.60 / $10,200).';
