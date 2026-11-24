-- International patients: open the opt-in to every listing owner (2026-11-24).
--
-- Why
--   accepts_international_patients was made a Concierge-Partner-only
--   capability (20260827000900, 20260829005000): a trigger rejected
--   enabling it unless the facility held an active Concierge Partner
--   subscription. The Concierge Partner add-on was retired on 2026-11-23
--   (0 facilities ever held it), so no listing could opt in at all.
--   The owner asked for a self-serve opt-in for providers that accept
--   international patients.
--
-- What
--   Drops the partner-only trigger and its function. Who may write the
--   column is unchanged: facilities RLS still limits updates to the
--   listing's owner (and admins / service role).
--
-- Data: no rows change. Before this migration 0 of 3,810 facilities had
-- accepts_international_patients = true (checked 2026-11-24).
--
-- Rollback (restores the partner-only gate exactly as before)
--   CREATE OR REPLACE FUNCTION public.enforce_international_partner_only()
--   RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
--   BEGIN
--     IF NEW.accepts_international_patients = true
--        AND (OLD.accepts_international_patients IS DISTINCT FROM true)
--        AND NOT public.is_active_concierge_partner(NEW.id) THEN
--       RAISE EXCEPTION 'accepts_international_patients can only be enabled for active Concierge Partners';
--     END IF;
--     RETURN NEW;
--   END; $$;
--   CREATE TRIGGER trg_enforce_international_partner_only
--     BEFORE INSERT OR UPDATE OF accepts_international_patients ON public.facilities
--     FOR EACH ROW EXECUTE FUNCTION public.enforce_international_partner_only();

DROP TRIGGER IF EXISTS trg_enforce_international_partner_only ON public.facilities;
DROP FUNCTION IF EXISTS public.enforce_international_partner_only();

COMMENT ON COLUMN public.facilities.accepts_international_patients IS
  'Provider-reported: the facility admits patients travelling from outside the US. Set by the listing owner in the provider portal; not verified by RehabLookup.';
