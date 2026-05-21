-- Featured Add-On — track a separate Stripe subscription ID so the
-- canonical `facility_subscriptions.stripe_subscription_id` (Pro) can
-- coexist with an independent Featured sub keyed on the same facility.
--
-- Featured can be billed monthly OR annually independent of the Pro
-- sub's interval (see FeaturedMarketingDetail.tsx copy), so it ships
-- as its own Stripe subscription rather than a line item on the Pro
-- sub. `facility_subscriptions.has_featured` flips true when the
-- Featured sub is active, false when it's canceled/refunded.

BEGIN;

ALTER TABLE public.facility_subscriptions
  ADD COLUMN IF NOT EXISTS featured_stripe_subscription_id text;

CREATE UNIQUE INDEX IF NOT EXISTS facility_subs_featured_sub_id_uq
  ON public.facility_subscriptions (featured_stripe_subscription_id)
  WHERE featured_stripe_subscription_id IS NOT NULL;

COMMENT ON COLUMN public.facility_subscriptions.featured_stripe_subscription_id IS
  'Stripe subscription id for the Featured Add-On, when it exists as a '
  'separate sub from the Pro stripe_subscription_id. Set by stripe-webhook '
  'when a Featured-only subscription is created; cleared when canceled.';

COMMIT;
