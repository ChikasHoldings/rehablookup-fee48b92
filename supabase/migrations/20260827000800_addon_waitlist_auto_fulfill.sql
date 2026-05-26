-- ============================================================
-- addon_waitlist auto-fulfillment triggers
-- ------------------------------------------------------------
-- Complements the existing notify_addon_waitlist_on_*_free triggers
-- (which fire when a slot is RELEASED). These fire when a slot is
-- CLAIMED: inserting (or re-activating) a featured_placements /
-- concierge_partner_facilities row whose scope matches an OPEN
-- (waiting | invited) waitlist entry for the same facility marks that
-- entry 'fulfilled' and stamps closed_at.
--
-- Why a trigger (not client-side): the addon_waitlist RLS policy only
-- lets a provider transition their own row to 'canceled' — never
-- 'fulfilled'. The fulfillment transition must run with definer rights.
-- This also covers the webhook activation path (activateFeaturedAddon /
-- activateConciergePartner seed placements), so a provider who was
-- waitlisted and then purchased gets their entry closed automatically.
--
-- Without this, a claimed entry lingers as "Invited — claim by <date>"
-- in the provider's dashboard until the 7-day drain expiry, and inflates
-- the waitlist_demand_summary 'invited' count for that window.
-- ============================================================

CREATE OR REPLACE FUNCTION public.fulfill_addon_waitlist_on_featured_claim()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  claimed boolean := false;
BEGIN
  IF TG_OP = 'INSERT' THEN
    claimed := NEW.active = true;
  ELSIF TG_OP = 'UPDATE' THEN
    claimed := (OLD.active = false OR OLD.active IS NULL) AND NEW.active = true;
  END IF;

  IF NOT claimed THEN
    RETURN NEW;
  END IF;

  UPDATE public.addon_waitlist
     SET status = 'fulfilled',
         closed_at = now()
   WHERE addon_type = 'featured'
     AND facility_id = NEW.facility_id
     AND scope_type = NEW.placement_type
     AND scope_value = NEW.placement_value
     AND status IN ('waiting', 'invited');

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.fulfill_addon_waitlist_on_concierge_claim()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  claimed boolean := false;
BEGIN
  IF TG_OP = 'INSERT' THEN
    claimed := NEW.active = true;
  ELSIF TG_OP = 'UPDATE' THEN
    claimed := (OLD.active = false OR OLD.active IS NULL) AND NEW.active = true;
  END IF;

  IF NOT claimed THEN
    RETURN NEW;
  END IF;

  -- geo_city IS NOT DISTINCT FROM handles the statewide (NULL city) case.
  UPDATE public.addon_waitlist
     SET status = 'fulfilled',
         closed_at = now()
   WHERE addon_type = 'concierge'
     AND facility_id = NEW.facility_id
     AND geo_state = NEW.geo_state
     AND geo_city IS NOT DISTINCT FROM NEW.geo_city
     AND status IN ('waiting', 'invited');

  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_fulfill_addon_waitlist_on_featured_claim'
  ) THEN
    EXECUTE 'CREATE TRIGGER trg_fulfill_addon_waitlist_on_featured_claim '
            'AFTER INSERT OR UPDATE OF active ON public.featured_placements '
            'FOR EACH ROW EXECUTE FUNCTION public.fulfill_addon_waitlist_on_featured_claim()';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_fulfill_addon_waitlist_on_concierge_claim'
  ) THEN
    EXECUTE 'CREATE TRIGGER trg_fulfill_addon_waitlist_on_concierge_claim '
            'AFTER INSERT OR UPDATE OF active ON public.concierge_partner_facilities '
            'FOR EACH ROW EXECUTE FUNCTION public.fulfill_addon_waitlist_on_concierge_claim()';
  END IF;
END $$;
