-- Add-on subscriptions (Featured $599/mo, Concierge $1000/mo) are SEPARATE
-- Stripe subscriptions that bill independently of the Pro base subscription.
-- The provider UI previously displayed facility_subscriptions.current_period_end
-- (the Pro period) as the add-on's "Paid through" date and as the basis for the
-- "re-claim a removed slot free before {date}" promise — wrong whenever an
-- add-on was purchased off-cycle from Pro.
--
-- Store each add-on's own period end so the UI can show the correct renewal
-- date. Nullable: existing rows stay null until the next add-on
-- activation/renewal webhook writes them, and the UI falls back to
-- current_period_end in the meantime (no worse than today).

alter table public.facility_subscriptions
  add column if not exists featured_current_period_end timestamptz,
  add column if not exists concierge_current_period_end timestamptz;

comment on column public.facility_subscriptions.featured_current_period_end is
  'Period end of the Featured add-on Stripe subscription (bills independently of Pro). Written by the stripe-webhook on activation + renewal; UI falls back to current_period_end when null.';
comment on column public.facility_subscriptions.concierge_current_period_end is
  'Period end of the Concierge add-on Stripe subscription (bills independently of Pro). Written by the stripe-webhook on activation + renewal; UI falls back to current_period_end when null.';
