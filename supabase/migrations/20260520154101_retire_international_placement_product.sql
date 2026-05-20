-- 2026-05-20 retire the paid international placement product.
--
-- Drops the 3 tables that backed the $3,000-per-admission international
-- placement workflow (international_placement_cases, international_facility_invoices,
-- international_payments) and removes their references from the two RPCs that
-- still queried them (get_admin_dashboard_stats + get_provider_facility_placements).
--
-- Code-side surfaces (admin tab, seeker page, application form, edge
-- functions) were removed in the same commit. Each of the five
-- international edge functions returns 410 Gone with code='function_retired'
-- for any stale callers.
--
-- Historical records: this is a hard drop. If accounting needs the
-- closed-out cases for tax purposes, recover from Stripe (the
-- payment processor is the system of record for paid admissions).

-- ── 1. Refresh RPCs first so they no longer reference the about-to-be-
--       dropped tables. CREATE OR REPLACE preserves grants/permissions.

CREATE OR REPLACE FUNCTION public.get_admin_dashboard_stats()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result JSONB;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not authorized: admin role required';
  END IF;
  SELECT jsonb_build_object(
    'total_facilities', (SELECT count(*) FROM facilities),
    'pending_approval', (SELECT count(*) FROM facilities WHERE status = 'pending_review'),
    'approved_facilities', (SELECT count(*) FROM facilities WHERE status = 'approved'),
    'total_providers', (SELECT count(DISTINCT user_id) FROM facilities WHERE user_id IS NOT NULL),
    'total_seekers', (SELECT count(*) FROM seeker_profiles),
    'total_leads', (SELECT count(*) FROM leads),
    'active_subscriptions', (SELECT count(*) FROM facility_subscriptions WHERE status = 'active' AND tier = 'pro'),
    'open_support_tickets', (SELECT count(*) FROM support_tickets WHERE status = 'open'),
    'open_escalations', (SELECT count(*) FROM admin_escalations WHERE status NOT IN ('resolved', 'closed')),
    'total_reviews', (SELECT count(*) FROM facility_reviews),
    'pending_reviews', (SELECT count(*) FROM facility_reviews WHERE status = 'pending')
  ) INTO result;
  RETURN result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_provider_facility_placements(p_facility_id uuid)
 RETURNS TABLE(id uuid, case_kind text, user_name text, status text, placed_facility_id uuid, placement_confirmed boolean, placement_confirmed_at timestamp with time zone, provider_fee_cents integer, provider_fee_status text, provider_fee_type text, level_of_care text, created_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_caller uuid := auth.uid();
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.facilities
    WHERE id = p_facility_id AND user_id = v_caller
  ) THEN
    RAISE EXCEPTION 'Not authorized for this facility' USING ERRCODE = '42501';
  END IF;
  -- Domestic concierge placements only — international placements
  -- retired 2026-05-20 with the paid international product.
  RETURN QUERY
  SELECT
    ci.id,
    'domestic'::text AS case_kind,
    ci.user_name,
    ci.status,
    ci.placed_facility_id,
    ci.placement_confirmed,
    ci.placement_confirmed_at,
    NULL::integer AS provider_fee_cents,
    NULL::text    AS provider_fee_status,
    NULL::text    AS provider_fee_type,
    ci.level_of_care,
    ci.created_at,
    ci.updated_at
  FROM public.concierge_inquiries ci
  WHERE ci.placed_facility_id = p_facility_id
    AND ci.status IN ('admitted', 'billed', 'completed')
  ORDER BY placement_confirmed_at DESC NULLS LAST;
END;
$function$;

-- ── 2. Drop the 3 tables (CASCADE removes their RLS policies, triggers,
--       FKs, and the FK from international_facility_invoices.case_id to
--       international_placement_cases). Other tables (facilities) keep
--       all their data; only the FKs pointing INTO them are removed.

DROP TABLE IF EXISTS public.international_facility_invoices CASCADE;
DROP TABLE IF EXISTS public.international_payments CASCADE;
DROP TABLE IF EXISTS public.international_placement_cases CASCADE;
