-- Server-side enforcement of PLAN_LIMITS for facility gallery uploads.
-- The wizard's BuildStep + the existing ProviderSignup form gate at
-- the client; this trigger is belt-and-braces — anyone bypassing the
-- client (direct DB write via service-role key, custom API client,
-- replay attack) can't persist over their plan's cap.
--
-- Free plan: 5 gallery photos.
-- Pro plan : 10 gallery photos.
-- Plan is read from profiles.plan, joined via facilities.user_id.
--
-- Idempotent: every CREATE OR REPLACE / DO-block-gated trigger
-- attach is safe to re-run.

CREATE OR REPLACE FUNCTION public.enforce_facility_plan_photo_cap()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  owner_id uuid;
  owner_plan text;
  cap int;
  photo_count int;
BEGIN
  -- Only check INSERT/UPDATE that touches gallery_urls.
  IF TG_OP = 'UPDATE' AND NEW.gallery_urls IS NOT DISTINCT FROM OLD.gallery_urls THEN
    RETURN NEW;
  END IF;

  owner_id := COALESCE(NEW.claim_owner_id, NEW.user_id);
  IF owner_id IS NULL THEN
    -- Unclaimed rows (SAMHSA-imported, no owner yet) skip the cap.
    RETURN NEW;
  END IF;

  SELECT plan INTO owner_plan FROM public.profiles WHERE user_id = owner_id;
  cap := CASE COALESCE(owner_plan, 'free')
           WHEN 'pro' THEN 10
           ELSE 5
         END;

  photo_count := COALESCE(array_length(NEW.gallery_urls, 1), 0);
  IF photo_count > cap THEN
    RAISE EXCEPTION
      'Plan limit: % plan supports up to % gallery photos. Current upload count: %.',
      COALESCE(owner_plan, 'free'), cap, photo_count
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.enforce_facility_plan_photo_cap() IS
  'Belt-and-braces server-side cap on facilities.gallery_urls length, '
  'keyed off the owner profile''s plan (free=5, pro=10). Mirrors '
  'src/lib/planLimits.ts. Trigger fires on INSERT and on UPDATEs that '
  'change gallery_urls.';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'facilities_plan_photo_cap_chk'
  ) THEN
    EXECUTE 'CREATE TRIGGER facilities_plan_photo_cap_chk '
            'BEFORE INSERT OR UPDATE OF gallery_urls ON public.facilities '
            'FOR EACH ROW EXECUTE FUNCTION public.enforce_facility_plan_photo_cap()';
  END IF;
END $$;
