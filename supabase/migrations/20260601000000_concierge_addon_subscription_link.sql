-- Concierge Marketing Add-On — track a separate Stripe subscription id
-- so the canonical `facility_subscriptions.stripe_subscription_id` (Pro)
-- can coexist with an independent Concierge sub keyed on the same
-- facility. Mirrors the featured_stripe_subscription_id pattern from
-- migration 20260531000000.

BEGIN;

ALTER TABLE public.facility_subscriptions
  ADD COLUMN IF NOT EXISTS concierge_stripe_subscription_id text;

CREATE UNIQUE INDEX IF NOT EXISTS facility_subs_concierge_sub_id_uq
  ON public.facility_subscriptions (concierge_stripe_subscription_id)
  WHERE concierge_stripe_subscription_id IS NOT NULL;

COMMENT ON COLUMN public.facility_subscriptions.concierge_stripe_subscription_id IS
  'Stripe subscription id for the Concierge Marketing Add-On, when it '
  'exists as a separate sub from the Pro stripe_subscription_id. Set by '
  'stripe-webhook when a Concierge-only subscription is created; '
  'cleared when canceled.';

COMMIT;
