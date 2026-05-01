CREATE OR REPLACE FUNCTION public.admin_get_lead_unlock_audit(
  p_from timestamptz DEFAULT NULL,
  p_to timestamptz DEFAULT NULL,
  p_facility_id uuid DEFAULT NULL,
  p_provider_id uuid DEFAULT NULL,
  p_limit integer DEFAULT 100,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  unlock_id uuid,
  unlocked_at timestamptz,
  lead_id uuid,
  lead_created_at timestamptz,
  lead_location text,
  lead_level_of_care text,
  lead_source text,
  facility_id uuid,
  facility_name text,
  facility_city text,
  facility_state text,
  provider_id uuid,
  provider_email text,
  provider_first_name text,
  provider_last_name text,
  unlock_price_cents integer,
  payment_method text,
  stripe_payment_intent_id text,
  total_count bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_total bigint;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Admin access required' USING ERRCODE = '42501';
  END IF;

  SELECT COUNT(*) INTO v_total
  FROM public.lead_unlocks lu
  WHERE (p_from IS NULL OR lu.unlocked_at >= p_from)
    AND (p_to IS NULL OR lu.unlocked_at <= p_to)
    AND (p_facility_id IS NULL OR lu.facility_id = p_facility_id)
    AND (p_provider_id IS NULL OR lu.provider_id = p_provider_id);

  RETURN QUERY
  SELECT
    lu.id            AS unlock_id,
    lu.unlocked_at,
    lu.lead_id,
    l.created_at     AS lead_created_at,
    l.location_city_state AS lead_location,
    l.level_of_care  AS lead_level_of_care,
    l.source         AS lead_source,
    lu.facility_id,
    f.name           AS facility_name,
    f.city           AS facility_city,
    f.state          AS facility_state,
    lu.provider_id,
    au.email::text   AS provider_email,
    p.first_name     AS provider_first_name,
    p.last_name      AS provider_last_name,
    lu.unlock_price_cents,
    lu.payment_method,
    lu.stripe_payment_intent_id,
    v_total          AS total_count
  FROM public.lead_unlocks lu
  LEFT JOIN public.leads l       ON l.id = lu.lead_id
  LEFT JOIN public.facilities f  ON f.id = lu.facility_id
  LEFT JOIN auth.users au        ON au.id = lu.provider_id
  LEFT JOIN public.profiles p    ON p.user_id = lu.provider_id
  WHERE (p_from IS NULL OR lu.unlocked_at >= p_from)
    AND (p_to IS NULL OR lu.unlocked_at <= p_to)
    AND (p_facility_id IS NULL OR lu.facility_id = p_facility_id)
    AND (p_provider_id IS NULL OR lu.provider_id = p_provider_id)
  ORDER BY lu.unlocked_at DESC
  LIMIT GREATEST(LEAST(p_limit, 500), 1)
  OFFSET GREATEST(p_offset, 0);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_lead_unlock_audit(timestamptz, timestamptz, uuid, uuid, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_lead_unlock_audit(timestamptz, timestamptz, uuid, uuid, integer, integer) TO authenticated;