-- Provider helper: list placements at the caller's facility (admitted/billed/completed)
-- Returns only the safe subset of fields the provider needs to manage their own placements.
CREATE OR REPLACE FUNCTION public.get_provider_facility_placements(p_facility_id uuid)
RETURNS TABLE (
  id uuid,
  user_name text,
  status text,
  placed_facility_id uuid,
  placement_confirmed boolean,
  placement_confirmed_at timestamptz,
  provider_fee_cents integer,
  provider_fee_status text,
  provider_fee_type text,
  level_of_care text,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path TO 'public'
AS $$
DECLARE
  v_caller uuid := auth.uid();
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  -- Caller must own the facility.
  IF NOT EXISTS (
    SELECT 1 FROM public.facilities
    WHERE id = p_facility_id AND user_id = v_caller
  ) THEN
    RAISE EXCEPTION 'Not authorized for this facility' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    ci.id,
    ci.user_name,
    ci.status,
    ci.placed_facility_id,
    ci.placement_confirmed,
    ci.placement_confirmed_at,
    ci.provider_fee_cents,
    ci.provider_fee_status,
    ci.provider_fee_type,
    ci.level_of_care,
    ci.created_at,
    ci.updated_at
  FROM public.concierge_inquiries ci
  WHERE ci.placed_facility_id = p_facility_id
    AND ci.status IN ('admitted', 'billed', 'completed')
  ORDER BY ci.placement_confirmed_at DESC NULLS LAST;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_provider_facility_placements(uuid) TO authenticated;
