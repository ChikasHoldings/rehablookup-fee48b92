-- Server-side enforcement of the facility_staff per-facility cap.
--
-- The UI prevents Free providers from adding more than 3 staff and
-- Pro providers from adding more than 10, but the cap was previously
-- enforced ONLY in the UI. A provider hitting the supabase client
-- directly (curl, JS console, scripted onboarding tool) could insert
-- arbitrarily many staff rows. With this trigger the limit is enforced
-- in the database, so the UI gate is defense-in-depth.
--
-- Cap rule:
--   has_active_pro(facility_id) = true  → up to 10 visible+hidden staff
--   has_active_pro(facility_id) = false → up to 3
--
-- Admins (anyone with `is_admin()`) bypass the cap so support reps can
-- repair stuck accounts.

CREATE OR REPLACE FUNCTION public.enforce_facility_staff_cap()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_count integer;
  v_is_pro        boolean;
  v_cap           integer;
BEGIN
  -- Admins bypass.
  IF auth.uid() IS NOT NULL AND public.is_admin(auth.uid()) THEN
    RETURN NEW;
  END IF;

  -- Count BEFORE this insert.
  SELECT COUNT(*) INTO v_current_count
  FROM public.facility_staff
  WHERE facility_id = NEW.facility_id;

  v_is_pro := public.has_active_pro(NEW.facility_id);
  v_cap    := CASE WHEN v_is_pro THEN 10 ELSE 3 END;

  IF v_current_count >= v_cap THEN
    RAISE EXCEPTION
      USING
        MESSAGE = format(
          'Staff limit reached for this facility (%s of %s). %s',
          v_current_count,
          v_cap,
          CASE WHEN v_is_pro
               THEN 'Remove an existing staff member before adding more.'
               ELSE 'Upgrade to Pro for up to 10 staff members.'
          END
        ),
        ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_facility_staff_cap_trg ON public.facility_staff;

CREATE TRIGGER enforce_facility_staff_cap_trg
  BEFORE INSERT ON public.facility_staff
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_facility_staff_cap();

COMMENT ON FUNCTION public.enforce_facility_staff_cap() IS
  'BEFORE-INSERT guard on facility_staff. Limits to 3 rows for Free '
  'facilities and 10 for Pro. Admins bypass. The UI enforces the same '
  'cap; this is defense-in-depth against direct API calls.';
