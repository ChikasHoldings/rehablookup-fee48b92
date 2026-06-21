-- Featured placement integrity (Provider Pro / monetization hardening)
--
-- 1) GATE THE LEGACY FEATURED COLUMNS ON facilities
--    facilities owner-UPDATE RLS (facilities_update_consolidated / _team_update)
--    permits updating ANY column, and NO trigger guarded `featured`,
--    `featured_pinned`, or `featured_display_order` (unlike `verified` and
--    `status`, which are gated). So a non-paying owner could
--      UPDATE facilities SET featured=true, featured_pinned=true WHERE id=<own>
--    directly via the client API and appear — even pinned to the top — on the
--    homepage/featured rails (get-featured-facilities surfaces featured=true),
--    bypassing the paid Featured add-on entirely. The app UI never sends these
--    columns, so this is an API-direct revenue bypass. Add a trigger that lets
--    ONLY the Stripe webhook/cancellation functions (service_role), DB
--    maintenance (postgres), and admins set these columns; a facility owner
--    editing their own listing is blocked. Legitimate activation continues to
--    flow through the webhook's _shared/pro-benefits.ts (service_role).
--
-- 2) STATUS-GATE THE FEATURED PLACEMENT PAYWALL
--    enforce_featured_placement_cap() checked has_featured/has_concierge_partner
--    booleans but not subscription status, so a row whose flag was still true
--    while status had drifted to past_due/canceled could re-activate placements
--    that the active-only display path would never show. Require status='active'
--    to match the get-featured-rotation display gate.
--
-- ROLLBACK:
--   DROP TRIGGER IF EXISTS enforce_facility_featured_gate_trg ON public.facilities;
--   DROP FUNCTION IF EXISTS public.enforce_facility_featured_gate();
--   -- and restore enforce_featured_placement_cap() without the status filter.

-- 1) ----------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_facility_featured_gate()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  -- Only act when a guarded (paid-placement) column actually changes.
  IF TG_OP = 'UPDATE'
     AND NEW.featured IS NOT DISTINCT FROM OLD.featured
     AND NEW.featured_pinned IS NOT DISTINCT FROM OLD.featured_pinned
     AND NEW.featured_display_order IS NOT DISTINCT FROM OLD.featured_display_order THEN
    RETURN NEW;
  END IF;
  -- On INSERT, ignore rows that don't set any featured value (the normal case;
  -- e.g. SAMHSA imports insert featured=false).
  IF TG_OP = 'INSERT'
     AND COALESCE(NEW.featured, false) = false
     AND COALESCE(NEW.featured_pinned, false) = false
     AND NEW.featured_display_order IS NULL THEN
    RETURN NEW;
  END IF;

  -- Privileged writers only. The Stripe webhook + cancellation Edge Functions
  -- run as service_role; migrations / cron / SECURITY DEFINER maintenance run
  -- as postgres; admins may curate manually. A facility owner editing their own
  -- listing via the client (role 'authenticated', not admin) is blocked.
  IF current_setting('role', true) = 'service_role'
     OR auth.role() = 'service_role'
     OR current_user IN ('postgres', 'supabase_admin', 'service_role')
     OR has_role((SELECT auth.uid()), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION
    'Cannot set facilities.featured / featured_pinned / featured_display_order '
    'directly on facility %. Featured placement is granted by an active paid '
    'subscription (via the Stripe webhook) or by an admin.', NEW.id
    USING ERRCODE = 'check_violation';
END;
$$;

DROP TRIGGER IF EXISTS enforce_facility_featured_gate_trg ON public.facilities;
CREATE TRIGGER enforce_facility_featured_gate_trg
  BEFORE INSERT OR UPDATE OF featured, featured_pinned, featured_display_order
  ON public.facilities
  FOR EACH ROW EXECUTE FUNCTION public.enforce_facility_featured_gate();

-- 2) ----------------------------------------------------------------------
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
  -- exposure plus national/international) on an ACTIVE subscription. The
  -- status='active' filter (added 2026) matches the active-only display gate in
  -- get-featured-rotation, so a stale flag on a past_due/canceled row can't
  -- activate placements that would never display. Closes the direct-insert
  -- bypass that the ownership-only RLS allowed.
  IF NOT EXISTS (
    SELECT 1 FROM public.facility_subscriptions fs
    WHERE fs.facility_id = NEW.facility_id
      AND fs.status = 'active'
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
