-- Slot-cap enforcement for the Featured + Concierge add-ons.
--
-- Featured: cap table already exists (placement_caps with PK on
-- (placement_type, placement_value), 118 rows seeded covering homepage,
-- state, city, treatment, insurance pools). We add a server-side
-- enforcement trigger on featured_placements + a public RPC the Add
-- form calls for live availability display.
--
-- Concierge: no cap table existed. We add concierge_geo_caps with
-- PK (geo_state, geo_city) where geo_city='*' means the statewide
-- default; specific cities can be tuned by an admin. Same trigger +
-- RPC pattern. We use '*' rather than NULL because Postgres treats
-- NULL as distinct in unique constraints, which would let us
-- accidentally insert duplicate statewide caps.
--
-- Both triggers count only `active=true` rows so a deactivation
-- (cancel / remove) frees the slot immediately.
--
-- Idempotent: every CREATE OR REPLACE / IF NOT EXISTS / pg_trigger
-- gating means re-running this migration is a no-op.

BEGIN;

-- ============================================================
-- 1. concierge_geo_caps table + default seed (statewide cap = 3)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.concierge_geo_caps (
  geo_state text NOT NULL,
  geo_city text NOT NULL DEFAULT '*',
  max_slots integer NOT NULL,
  notes text,
  PRIMARY KEY (geo_state, geo_city)
);

COMMENT ON TABLE public.concierge_geo_caps IS
  'Per-(state, city) cap on active concierge_partner_facilities rows. '
  'geo_city = ''*'' is the statewide-default cap; specific cities can be '
  'tuned by an admin. The enforce_concierge_geo_cap trigger consults '
  'this table at INSERT/UPDATE time.';

INSERT INTO public.concierge_geo_caps (geo_state, geo_city, max_slots, notes)
SELECT s, '*', 3, 'default statewide cap'
FROM unnest(ARRAY[
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY','DC'
]) AS s
ON CONFLICT (geo_state, geo_city) DO NOTHING;

-- ============================================================
-- 2. get_placement_availability(p_type, p_value)
--    Returns { cap, used, remaining } for the Featured Add Form
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_placement_availability(
  p_type text,
  p_value text
)
RETURNS TABLE (
  cap integer,
  used integer,
  remaining integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cap integer;
  v_used integer;
BEGIN
  SELECT max_slots INTO v_cap
    FROM public.placement_caps
   WHERE placement_type = p_type AND placement_value = p_value;

  IF v_cap IS NULL THEN
    -- No explicit cap for this (type, value). Fall back to a
    -- type-level default by averaging the seeded values, then
    -- clamping to a sane minimum. This lets new geos work
    -- without a pre-seed step.
    SELECT GREATEST(5, AVG(max_slots)::int) INTO v_cap
      FROM public.placement_caps
     WHERE placement_type = p_type;
    v_cap := COALESCE(v_cap, 10);
  END IF;

  SELECT COUNT(*) INTO v_used
    FROM public.featured_placements
   WHERE placement_type = p_type
     AND placement_value = p_value
     AND active = true;

  RETURN QUERY SELECT v_cap, v_used, GREATEST(0, v_cap - v_used);
END;
$$;

REVOKE ALL ON FUNCTION public.get_placement_availability(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_placement_availability(text, text) TO authenticated;

-- ============================================================
-- 3. get_concierge_availability(p_state, p_city)
--    Returns { cap, used, remaining } for the Concierge Add Form.
--    p_city = NULL means statewide.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_concierge_availability(
  p_state text,
  p_city text DEFAULT NULL
)
RETURNS TABLE (
  cap integer,
  used integer,
  remaining integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_state text := upper(trim(p_state));
  v_city_key text := COALESCE(NULLIF(trim(p_city), ''), '*');
  v_cap integer;
  v_used integer;
BEGIN
  -- 1. Look up a specific (state, city) cap; if none, fall back to the
  --    statewide-default ('*'). If still none, default to 3.
  SELECT max_slots INTO v_cap
    FROM public.concierge_geo_caps
   WHERE geo_state = v_state AND geo_city = v_city_key;

  IF v_cap IS NULL THEN
    SELECT max_slots INTO v_cap
      FROM public.concierge_geo_caps
     WHERE geo_state = v_state AND geo_city = '*';
  END IF;

  v_cap := COALESCE(v_cap, 3);

  -- 2. Count active partner rows in the same geo. NULL geo_city in
  --    the partner table means statewide; treat it as a match for
  --    statewide queries only.
  SELECT COUNT(*) INTO v_used
    FROM public.concierge_partner_facilities
   WHERE geo_state = v_state
     AND active = true
     AND (
       (v_city_key = '*' AND geo_city IS NULL) OR
       (v_city_key <> '*' AND lower(geo_city) = lower(v_city_key))
     );

  RETURN QUERY SELECT v_cap, v_used, GREATEST(0, v_cap - v_used);
END;
$$;

REVOKE ALL ON FUNCTION public.get_concierge_availability(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_concierge_availability(text, text) TO authenticated;

-- ============================================================
-- 4. enforce_featured_placement_cap trigger
-- ============================================================

CREATE OR REPLACE FUNCTION public.enforce_featured_placement_cap()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cap integer;
  v_used integer;
BEGIN
  -- Only enforce when the row is being made active. Deactivations
  -- (active true → false) skip the check entirely.
  IF NEW.active IS DISTINCT FROM true THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.active = true THEN
    -- Already counted as active; nothing changes.
    RETURN NEW;
  END IF;

  SELECT max_slots INTO v_cap
    FROM public.placement_caps
   WHERE placement_type = NEW.placement_type
     AND placement_value = NEW.placement_value;
  IF v_cap IS NULL THEN
    SELECT GREATEST(5, AVG(max_slots)::int) INTO v_cap
      FROM public.placement_caps
     WHERE placement_type = NEW.placement_type;
    v_cap := COALESCE(v_cap, 10);
  END IF;

  SELECT COUNT(*) INTO v_used
    FROM public.featured_placements
   WHERE placement_type = NEW.placement_type
     AND placement_value = NEW.placement_value
     AND active = true
     AND id <> NEW.id;  -- exclude self on UPDATE
  IF v_used >= v_cap THEN
    RAISE EXCEPTION
      'Featured slot cap reached for %=%: % of % slots in use',
      NEW.placement_type, NEW.placement_value, v_used, v_cap
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_enforce_featured_placement_cap'
  ) THEN
    EXECUTE 'CREATE TRIGGER trg_enforce_featured_placement_cap '
            'BEFORE INSERT OR UPDATE ON public.featured_placements '
            'FOR EACH ROW EXECUTE FUNCTION public.enforce_featured_placement_cap()';
  END IF;
END $$;

-- ============================================================
-- 5. enforce_concierge_geo_cap trigger
-- ============================================================

CREATE OR REPLACE FUNCTION public.enforce_concierge_geo_cap()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_state text := upper(trim(NEW.geo_state));
  v_city_key text := COALESCE(NULLIF(trim(NEW.geo_city), ''), '*');
  v_cap integer;
  v_used integer;
BEGIN
  IF NEW.active IS DISTINCT FROM true THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.active = true THEN
    RETURN NEW;
  END IF;

  SELECT max_slots INTO v_cap
    FROM public.concierge_geo_caps
   WHERE geo_state = v_state AND geo_city = v_city_key;
  IF v_cap IS NULL THEN
    SELECT max_slots INTO v_cap
      FROM public.concierge_geo_caps
     WHERE geo_state = v_state AND geo_city = '*';
  END IF;
  v_cap := COALESCE(v_cap, 3);

  SELECT COUNT(*) INTO v_used
    FROM public.concierge_partner_facilities
   WHERE geo_state = v_state
     AND active = true
     AND id <> NEW.id
     AND (
       (v_city_key = '*' AND geo_city IS NULL) OR
       (v_city_key <> '*' AND lower(geo_city) = lower(v_city_key))
     );
  IF v_used >= v_cap THEN
    RAISE EXCEPTION
      'Concierge partner cap reached for %/%: % of % slots in use',
      v_state, v_city_key, v_used, v_cap
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_enforce_concierge_geo_cap'
  ) THEN
    EXECUTE 'CREATE TRIGGER trg_enforce_concierge_geo_cap '
            'BEFORE INSERT OR UPDATE ON public.concierge_partner_facilities '
            'FOR EACH ROW EXECUTE FUNCTION public.enforce_concierge_geo_cap()';
  END IF;
END $$;

COMMIT;
