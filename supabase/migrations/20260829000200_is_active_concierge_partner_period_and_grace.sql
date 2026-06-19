-- ─────────────────────────────────────────────────────────────────────────
-- Audit finding M6 (+ H6 grace consistency): tighten and align
-- is_active_concierge_partner.
--
-- Before:
--   has_concierge_partner = true AND status = 'active'
--   • No check on concierge_current_period_end, so a row whose add-on period
--     has lapsed but whose has_concierge_partner flag was never cleared (e.g. a
--     missed subscription.deleted webhook) would still read as an active
--     partner and keep the international-patients capability.
--   • status = 'active' stripped the partner the instant the Pro sub went
--     past_due — inconsistent with the H6 decision to keep benefits during the
--     Stripe payment-retry grace window (has_active_pro now allows past_due).
--
-- After:
--   has_concierge_partner = true
--   AND status IN ('active','past_due')                       -- grace, mirrors has_active_pro
--   AND (concierge_current_period_end IS NULL                 -- M6 period guard
--        OR concierge_current_period_end > now())
--
-- Safe during grace: the stripe-webhook customer.subscription.updated handler
-- refreshes concierge_current_period_end from Stripe on every add-on update,
-- and Stripe advances current_period_end into the future while a subscription
-- is past_due — so the period guard only trips on a genuinely lapsed add-on,
-- never on one that is mid-retry. Teardown still happens on subscription.deleted
-- (which clears has_concierge_partner).
--
-- Preserves SECURITY DEFINER + search_path; CREATE OR REPLACE keeps grants.
-- ─────────────────────────────────────────────────────────────────────────

create or replace function public.is_active_concierge_partner(p_facility_id uuid)
 returns boolean
 language sql
 stable security definer
 set search_path to 'public'
as $function$
  select exists (
    select 1 from public.facility_subscriptions s
     where s.facility_id = p_facility_id
       and s.has_concierge_partner = true
       and s.status in ('active', 'past_due')
       and (s.concierge_current_period_end is null or s.concierge_current_period_end > now())
  );
$function$;
