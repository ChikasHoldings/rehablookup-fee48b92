-- ─────────────────────────────────────────────────────────────────────────
-- Billing fix (P1 / audit finding H6): keep Pro benefits during the Stripe
-- payment-retry (past_due) grace window.
--
-- Before: has_active_pro required status='active', so the moment a renewal
-- charge failed and Stripe flipped the subscription to `past_due` (while still
-- auto-retrying), the provider lost Pro — contradicting the dunning email that
-- tells them to "update payment to avoid losing benefits".
--
-- After: a `past_due` subscription retains Pro while Stripe keeps retrying.
-- The grace window is naturally bounded by Stripe's dunning: when retries are
-- exhausted Stripe deletes the subscription, the stripe-webhook
-- subscription.deleted handler flips the row to `canceled`, and benefits drop.
--
-- `active` keeps its period-validity guard; only `past_due` is allowed through
-- regardless of current_period_end (which can sit at/just past the failed
-- renewal boundary during retries).
--
-- CREATE OR REPLACE preserves the existing EXECUTE grants — this is a public,
-- RLS-facing read helper and intentionally stays callable by anon/authenticated.
-- ─────────────────────────────────────────────────────────────────────────

create or replace function public.has_active_pro(p_facility_id uuid)
 returns boolean
 language plpgsql
 stable security definer
 set search_path to 'public'
as $function$
begin
  return exists (
    select 1 from public.facility_subscriptions
    where facility_id = p_facility_id
      and tier = 'pro'
      and (
        (status = 'active' and (current_period_end is null or current_period_end > now()))
        or status = 'past_due'  -- grace: Stripe still retrying; revoked on subscription.deleted → canceled
      )
  );
end;
$function$;
