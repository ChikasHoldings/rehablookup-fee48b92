-- ROUND 20 round-up: retire the dead lead-unlock + credit-balance +
-- Pro-discount functions left behind by the EKRA flat-fee refactor. They
-- all referenced public.{pro_subscriptions, provider_credits,
-- credit_transactions, lead_unlocks} which were dropped; every call site
-- (RLS predicates on leads, admin dashboard, seeker info, ranking helpers)
-- would crash 42P01.
--
-- Strategy: keep the function names + signatures so existing callers and
-- RLS policies don't have to be touched, but rewrite bodies to model
-- the EKRA reality where every lead is accessible to its facility owner
-- and there are no credits/discounts.

-- has_active_pro(facility_id) — sources from facility_subscriptions
CREATE OR REPLACE FUNCTION public.has_active_pro(p_facility_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.facility_subscriptions
    WHERE facility_id = p_facility_id
      AND tier = 'pro'
      AND status = 'active'
      AND (current_period_end IS NULL OR current_period_end > now())
  );
END;
$$;

-- get_pro_discount — flat-fee model has no per-lead discount
CREATE OR REPLACE FUNCTION public.get_pro_discount(p_facility_id uuid)
RETURNS integer
LANGUAGE plpgsql
IMMUTABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN 0;
END;
$$;

-- get_provider_credit_balance — credits model retired
CREATE OR REPLACE FUNCTION public.get_provider_credit_balance(p_provider_id uuid)
RETURNS integer
LANGUAGE plpgsql
IMMUTABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN 0;
END;
$$;

-- is_lead_unlocked overloads: EKRA flat-fee — every lead is accessible to
-- its facility owner. The 2-arg form just confirms the lead exists for
-- that facility; the 3-arg form additionally confirms the provider owns
-- the facility.
CREATE OR REPLACE FUNCTION public.is_lead_unlocked(p_lead_id uuid, p_facility_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.leads
    WHERE id = p_lead_id AND facility_id = p_facility_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_lead_unlocked(p_lead_id uuid, p_facility_id uuid, p_provider_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.leads l
    JOIN public.facilities f ON f.id = l.facility_id
    WHERE l.id = p_lead_id
      AND l.facility_id = p_facility_id
      AND f.user_id = p_provider_id
  );
END;
$$;

-- admin_get_lead_unlock_audit — no unlock model; empty result set.
DROP FUNCTION IF EXISTS public.admin_get_lead_unlock_audit(timestamp with time zone, timestamp with time zone, uuid, uuid, integer, integer);

CREATE OR REPLACE FUNCTION public.admin_get_lead_unlock_audit(
  p_from timestamp with time zone DEFAULT NULL,
  p_to timestamp with time zone DEFAULT NULL,
  p_facility_id uuid DEFAULT NULL,
  p_provider_id uuid DEFAULT NULL,
  p_limit integer DEFAULT 100,
  p_offset integer DEFAULT 0
)
RETURNS TABLE(
  unlock_id uuid, unlocked_at timestamp with time zone,
  lead_id uuid, lead_created_at timestamp with time zone,
  lead_location text, lead_level_of_care text, lead_source text,
  facility_id uuid, facility_name text, facility_city text, facility_state text,
  provider_id uuid, provider_email text, provider_first_name text, provider_last_name text,
  unlock_price_cents integer, payment_method text, stripe_payment_intent_id text,
  total_count bigint
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Admin access required' USING ERRCODE = '42501';
  END IF;
  RETURN;
END;
$$;

-- get_seeker_lead_unlock_info — no unlock model; empty result set.
CREATE OR REPLACE FUNCTION public.get_seeker_lead_unlock_info(p_lead_id uuid)
RETURNS TABLE(unlocked_at timestamp with time zone, facility_id uuid)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN;
END;
$$;

-- unlock_lead_atomic — credit/unlock model retired. Drop the RPC.
DROP FUNCTION IF EXISTS public.unlock_lead_atomic(uuid, uuid, uuid, integer, integer, text, boolean, integer, text);

-- get_admin_dashboard_stats — source from facility_subscriptions, drop
-- references to lead_unlocks (always 0 now).
CREATE OR REPLACE FUNCTION public.get_admin_dashboard_stats()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
    'unlocked_leads', 0,
    'active_subscriptions', (SELECT count(*) FROM facility_subscriptions WHERE status = 'active' AND tier = 'pro'),
    'open_support_tickets', (SELECT count(*) FROM support_tickets WHERE status = 'open'),
    'open_escalations', (SELECT count(*) FROM admin_escalations WHERE status NOT IN ('resolved', 'closed')),
    'active_placement_cases', (SELECT count(*) FROM placement_cases WHERE status NOT IN ('completed', 'cancelled')),
    'total_reviews', (SELECT count(*) FROM facility_reviews),
    'pending_reviews', (SELECT count(*) FROM facility_reviews WHERE status = 'pending')
  ) INTO result;
  RETURN result;
END;
$$;

-- RLS on public.leads — drop the dead unlock-gated UPDATE/SELECT policies
-- (the broader "Owners can view their facility leads" already grants
-- SELECT). Add a clean ownership-based UPDATE policy so providers can
-- manage their own leads (status, notes, etc.).
DROP POLICY IF EXISTS "Owners can view unlocked facility leads" ON public.leads;
DROP POLICY IF EXISTS "Providers can update their unlocked leads" ON public.leads;

CREATE POLICY "Owners can update their facility leads"
ON public.leads
FOR UPDATE
TO authenticated
USING (
  facility_id IN (
    SELECT f.id FROM public.facilities f WHERE f.user_id = (SELECT auth.uid())
  )
)
WITH CHECK (
  facility_id IN (
    SELECT f.id FROM public.facilities f WHERE f.user_id = (SELECT auth.uid())
  )
);
