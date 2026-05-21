-- Add switch_to_monthly_at_renewal flag to facility_subscriptions
-- ──────────────────────────────────────────────────────────────
-- Annual subscribers cannot switch to monthly mid-year, but they CAN
-- request the switch at renewal time. This flag captures that intent;
-- the renewal Stripe-invoice handler reads the flag and creates a
-- monthly subscription instead of renewing the annual one.

ALTER TABLE public.facility_subscriptions
  ADD COLUMN IF NOT EXISTS switch_to_monthly_at_renewal boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.facility_subscriptions.switch_to_monthly_at_renewal IS
  'Annual subscriber has requested a switch to monthly at the next
   renewal. The renewal Stripe-invoice handler picks this up and
   creates a monthly subscription instead of renewing annual.';
