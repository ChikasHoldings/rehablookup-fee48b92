-- Phase 0 of the Featured(local)/Concierge(national upgrade) repositioning.
-- 1) Allow an 'international' featured placement type (Concierge advertising on
--    the international-facing pages).
-- 2) Widen the featured-placement paywall guard so a facility holding EITHER the
--    Featured add-on OR the Concierge Partner add-on may own featured_placements
--    (Concierge now includes Featured exposure + national/international).
-- 3) Cap seeding: national + international are tier-inclusive for Concierge
--    (auto-granted to every partner), so they get generous caps; the scarce
--    per-state/city caps for self-serve Featured are untouched. Tunable.

-- 1) placement_type CHECK + 'international'
ALTER TABLE public.featured_placements DROP CONSTRAINT featured_placements_placement_type_check;
ALTER TABLE public.featured_placements ADD CONSTRAINT featured_placements_placement_type_check
  CHECK (placement_type = ANY (ARRAY['homepage','state','city','search','near_me','treatment','insurance','article','international']));

-- 2) Widen the paywall guard (was has_featured-only).
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

  -- Paywall: a facility may activate a Featured placement if it holds EITHER the
  -- Featured add-on OR the Concierge Partner add-on (Concierge includes Featured
  -- exposure plus national/international). Closes the direct-insert bypass that
  -- the ownership-only RLS allowed.
  IF NOT EXISTS (
    SELECT 1 FROM public.facility_subscriptions fs
    WHERE fs.facility_id = NEW.facility_id
      AND (fs.has_featured = true OR fs.has_concierge_partner = true)
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

-- 3) Caps for the tier-inclusive national + international buckets (generous;
--    rotation handles fair per-visitor display). Idempotent.
INSERT INTO public.placement_caps (placement_type, placement_value, max_slots)
SELECT 'international', 'global', 250
WHERE NOT EXISTS (SELECT 1 FROM public.placement_caps WHERE placement_type='international' AND placement_value='global');

UPDATE public.placement_caps SET max_slots = 250
WHERE placement_type = 'homepage' AND placement_value = 'national' AND max_slots < 250;
