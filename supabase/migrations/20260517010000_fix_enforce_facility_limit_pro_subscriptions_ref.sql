-- CRITICAL FIX (round 20 E2E smoke): enforce_facility_limit() referenced
-- a non-existent table public.pro_subscriptions (legacy schema name,
-- removed during EKRA refactor). Every facilities INSERT for every user
-- was crashing with:
--   ERROR 42P01: relation "public.pro_subscriptions" does not exist
-- which silently broke the entire "List new facility" wizard path AND
-- the legacy listing builder AND any admin-side facility create.
--
-- Root cause: the trigger function was authored before the EKRA refactor
-- that consolidated subscriptions into public.facility_subscriptions.
-- The DDL was never updated.
--
-- Fix: rewrite the EXISTS lookup against the canonical Pro mirror
-- profiles.plan (same pattern enforce_facility_plan_photo_cap uses),
-- with a fallback to facility_subscriptions for safety if the mirror is
-- stale during a webhook race. Same business rule:
--   Free → max 1 facility + purchased_listing_slots
--   Pro  → max 5 facilities + purchased_listing_slots

CREATE OR REPLACE FUNCTION public.enforce_facility_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_count INT;
  is_pro BOOLEAN;
  purchased_slots INT;
  max_allowed INT;
BEGIN
  SELECT COUNT(*) INTO current_count
  FROM public.facilities
  WHERE user_id = NEW.user_id;

  SELECT (
    COALESCE((SELECT plan FROM public.profiles WHERE user_id = NEW.user_id), 'free') = 'pro'
    OR EXISTS (
      SELECT 1 FROM public.facility_subscriptions
      WHERE provider_id = NEW.user_id
        AND tier = 'pro'
        AND status = 'active'
        AND (current_period_end IS NULL OR current_period_end > now())
    )
  ) INTO is_pro;

  SELECT COALESCE(COUNT(*), 0) INTO purchased_slots
  FROM public.purchased_listing_slots
  WHERE user_id = NEW.user_id
    AND status = 'completed';

  IF is_pro THEN
    max_allowed := 5 + purchased_slots;
  ELSE
    max_allowed := 1 + purchased_slots;
  END IF;

  IF current_count >= max_allowed THEN
    RAISE EXCEPTION 'Facility limit reached. Your plan allows % facilities.', max_allowed;
  END IF;

  RETURN NEW;
END;
$function$;
