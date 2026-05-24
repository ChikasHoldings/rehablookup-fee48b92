-- Server-side paywall guard for the Featured + Concierge add-on tables.
--
-- The INSERT RLS WITH CHECK on featured_placements / concierge_partner_facilities
-- only proves facility OWNERSHIP. The slot-cap triggers only enforced the cap.
-- Neither verified that the facility actually holds the paid add-on, so a
-- facility owner could insert an `active = true` row directly via the API and
-- obtain free Featured / Concierge inventory (the public `active = true` SELECT
-- policy then exposes it, and any reader that doesn't independently re-check
-- the subscription would surface it).
--
-- Fix: the existing BEFORE INSERT/UPDATE cap triggers (SECURITY DEFINER, already
-- gating exactly these writes) now also require the facility's subscription to
-- carry the matching paid add-on flag whenever a row is being ACTIVATED.
--
-- Safe for the legitimate flow: activateFeaturedAddon / activateConciergePartner
-- both set has_featured / has_concierge_partner = true BEFORE seeding any active
-- row, and the provider add-forms only render when the flag is already true. The
-- guards below only fire on transitions INTO active = true, so updates to
-- already-active rows (rotation bookkeeping) and deactivations are untouched.

CREATE OR REPLACE FUNCTION public.enforce_featured_placement_cap()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_cap integer; v_used integer;
BEGIN
  IF NEW.active IS DISTINCT FROM true THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.active = true THEN RETURN NEW; END IF;

  -- Paywall: only a facility with the paid Featured add-on may activate a
  -- placement. Closes the direct-insert bypass the ownership-only RLS allowed.
  IF NOT EXISTS (
    SELECT 1 FROM public.facility_subscriptions fs
    WHERE fs.facility_id = NEW.facility_id
      AND fs.has_featured = true
  ) THEN
    RAISE EXCEPTION 'Featured add-on is not active for this facility'
      USING ERRCODE = 'check_violation';
  END IF;

  SELECT max_slots INTO v_cap FROM public.placement_caps WHERE placement_type = NEW.placement_type AND placement_value = NEW.placement_value;
  IF v_cap IS NULL THEN
    SELECT GREATEST(5, AVG(max_slots)::int) INTO v_cap FROM public.placement_caps WHERE placement_type = NEW.placement_type;
    v_cap := COALESCE(v_cap, 10);
  END IF;
  SELECT COUNT(*) INTO v_used FROM public.featured_placements
    WHERE placement_type = NEW.placement_type AND placement_value = NEW.placement_value AND active = true AND id <> NEW.id;
  IF v_used >= v_cap THEN
    RAISE EXCEPTION 'Featured slot cap reached for %=%: % of % slots in use', NEW.placement_type, NEW.placement_value, v_used, v_cap
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.enforce_concierge_geo_cap()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_state text := upper(trim(NEW.geo_state));
  v_city_key text := COALESCE(NULLIF(trim(NEW.geo_city), ''), '*');
  v_cap integer; v_used integer;
BEGIN
  IF NEW.active IS DISTINCT FROM true THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.active = true THEN RETURN NEW; END IF;

  -- Paywall: only a facility with the paid Concierge Partner add-on may
  -- activate a geo. Closes the direct-insert bypass the ownership-only RLS
  -- allowed.
  IF NOT EXISTS (
    SELECT 1 FROM public.facility_subscriptions fs
    WHERE fs.facility_id = NEW.facility_id
      AND fs.has_concierge_partner = true
  ) THEN
    RAISE EXCEPTION 'Concierge Partner add-on is not active for this facility'
      USING ERRCODE = 'check_violation';
  END IF;

  SELECT max_slots INTO v_cap FROM public.concierge_geo_caps WHERE geo_state = v_state AND geo_city = v_city_key;
  IF v_cap IS NULL THEN
    SELECT max_slots INTO v_cap FROM public.concierge_geo_caps WHERE geo_state = v_state AND geo_city = '*';
  END IF;
  v_cap := COALESCE(v_cap, 3);
  SELECT COUNT(*) INTO v_used FROM public.concierge_partner_facilities
    WHERE geo_state = v_state AND active = true AND id <> NEW.id
      AND ((v_city_key = '*' AND geo_city IS NULL) OR (v_city_key <> '*' AND lower(geo_city) = lower(v_city_key)));
  IF v_used >= v_cap THEN
    RAISE EXCEPTION 'Concierge partner cap reached for %/%: % of % slots in use', v_state, v_city_key, v_used, v_cap
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$function$;
