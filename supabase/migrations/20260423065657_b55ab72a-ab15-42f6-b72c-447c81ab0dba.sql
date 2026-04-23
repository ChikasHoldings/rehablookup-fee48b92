-- Fix: is_lead_unlocked must verify the unlock belongs to the calling provider.
-- Without this, any provider whose facility matches the lead's facility_id could
-- read PII via an unlock created by a different provider on the same facility
-- (multi-owner facilities, ownership transfers, or future shared-facility models).
--
-- We add an OPTIONAL provider_id parameter (defaulting to auth.uid()) so:
--   • Existing callers (RLS policies) keep their 2-arg signature working — the
--     overload below resolves to auth.uid() automatically, tightening security.
--   • Service-role / admin paths that need to check unlock for arbitrary
--     providers can pass an explicit p_provider_id.

CREATE OR REPLACE FUNCTION public.is_lead_unlocked(p_lead_id uuid, p_facility_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_caller uuid := auth.uid();
BEGIN
  -- Service-role / no-auth contexts (edge functions using service key, cron,
  -- triggers) — fall back to the broad existence check so they aren't broken.
  IF v_caller IS NULL THEN
    RETURN EXISTS (
      SELECT 1 FROM public.lead_unlocks
      WHERE lead_id = p_lead_id AND facility_id = p_facility_id
    );
  END IF;

  -- Authenticated path: the unlock must belong to the caller's provider account.
  RETURN EXISTS (
    SELECT 1 FROM public.lead_unlocks
    WHERE lead_id = p_lead_id
      AND facility_id = p_facility_id
      AND provider_id = v_caller
  );
END;
$function$;

-- Explicit-provider overload for admin/service workflows that legitimately need
-- to check on behalf of someone else (e.g. admin panel "view as provider").
CREATE OR REPLACE FUNCTION public.is_lead_unlocked(p_lead_id uuid, p_facility_id uuid, p_provider_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.lead_unlocks
    WHERE lead_id = p_lead_id
      AND facility_id = p_facility_id
      AND provider_id = p_provider_id
  );
END;
$function$;