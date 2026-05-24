-- Fix photo-cap drift by reading per-facility Pro status from the
-- canonical source (facility_subscriptions via has_active_pro) instead
-- of the owner's profiles.plan mirror.
--
-- Two real bugs in the previous behaviour:
--
--   1. DRIFT — Stripe webhook activates Pro by writing both
--      facility_subscriptions.tier='pro' AND profiles.plan='pro'.
--      The second write can fail silently (the webhook captures the
--      error into a result diagnostic but proceeds). When that
--      happens, has_active_pro() still returns true, but
--      enforce_facility_plan_photo_cap reads the unmirrored
--      profiles.plan='free' and rejects the Pro user's 6th photo with
--      a Free-plan error. Stripe billing said one thing; the cap
--      said another.
--
--   2. WRONG SCOPE — facility_subscriptions is keyed by facility_id,
--      so a provider can have one Pro location and one Free location.
--      The old cap looked at the OWNER's profile and gave both
--      facilities the same cap, contradicting how the rest of the
--      system gates Pro. The new cap is per-facility.
--
-- Behaviour preserved:
--   * Unclaimed rows (no user_id / claim_owner_id) skip the cap.
--   * UPDATE that doesn't touch gallery_urls is a no-op early-out.
--   * Same numeric limits: Free=5, Pro=10.
--
-- profiles.plan stays in place — Stripe still mirrors to it (used by
-- a handful of UI surfaces). It just isn't the source of truth for
-- the photo cap anymore.

CREATE OR REPLACE FUNCTION public.enforce_facility_plan_photo_cap()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  owner_id uuid;
  is_pro boolean;
  cap int;
  photo_count int;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.gallery_urls IS NOT DISTINCT FROM OLD.gallery_urls THEN
    RETURN NEW;
  END IF;

  owner_id := COALESCE(NEW.claim_owner_id, NEW.user_id);
  IF owner_id IS NULL THEN
    -- Unclaimed rows (SAMHSA-imported, no owner yet) skip the cap.
    RETURN NEW;
  END IF;

  -- Per-facility Pro status. has_active_pro is the canonical gate
  -- used by every other Pro feature on the platform; the photo cap
  -- now agrees with it.
  is_pro := public.has_active_pro(NEW.id);
  cap := CASE WHEN is_pro THEN 10 ELSE 5 END;

  photo_count := COALESCE(array_length(NEW.gallery_urls, 1), 0);
  IF photo_count > cap THEN
    RAISE EXCEPTION
      'Plan limit: % plan supports up to % gallery photos. Current upload count: %.',
      CASE WHEN is_pro THEN 'Pro' ELSE 'Free' END, cap, photo_count
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$function$;
