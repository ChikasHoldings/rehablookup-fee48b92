-- =============================================================================
-- Close the accepts_international_patients self-grant on INSERT.
--
-- FINDING
--   trg_enforce_international_partner_only fires BEFORE UPDATE only (tgtype=19),
--   so accepts_international_patients=true can be self-granted at facility
--   CREATE time (AddLocation / ProviderSignup) by a non-partner, bypassing the
--   Concierge-Partner gate that guards the UPDATE path.
--
-- FIX
--   Re-point the trigger to BEFORE INSERT OR UPDATE. The existing guard function
--   enforce_international_partner_only already handles INSERT correctly: on
--   INSERT OLD is NULL, so (OLD.accepts_international_patients IS DISTINCT FROM
--   true) is true, and a brand-new facility is never an active Concierge Partner
--   (is_active_concierge_partner(NEW.id) = false) — so true is rejected. Setting
--   the flag remains possible for eligible partners via the Concierge upgrade
--   path (service role) and via UPDATE on an already-partner facility.
--
-- ROLLBACK:
--   DROP TRIGGER IF EXISTS trg_enforce_international_partner_only ON public.facilities;
--   CREATE TRIGGER trg_enforce_international_partner_only
--     BEFORE UPDATE OF accepts_international_patients ON public.facilities
--     FOR EACH ROW EXECUTE FUNCTION public.enforce_international_partner_only();
-- =============================================================================

DROP TRIGGER IF EXISTS trg_enforce_international_partner_only ON public.facilities;
CREATE TRIGGER trg_enforce_international_partner_only
  BEFORE INSERT OR UPDATE OF accepts_international_patients
  ON public.facilities
  FOR EACH ROW EXECUTE FUNCTION public.enforce_international_partner_only();
