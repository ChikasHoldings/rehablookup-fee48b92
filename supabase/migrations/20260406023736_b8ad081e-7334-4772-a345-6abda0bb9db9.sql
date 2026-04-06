
-- Function for providers to check lead access without requiring unlock
CREATE OR REPLACE FUNCTION public.check_lead_access(p_lead_id uuid, p_facility_id uuid)
RETURNS TABLE(
  has_access boolean,
  is_original boolean,
  is_redistributed boolean,
  distributed_at timestamptz,
  redistribution_status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_lead RECORD;
  v_dist RECORD;
BEGIN
  -- Verify caller owns the facility
  IF NOT EXISTS (
    SELECT 1 FROM public.facilities WHERE id = p_facility_id AND user_id = auth.uid()
  ) AND NOT has_role(auth.uid(), 'admin') THEN
    RETURN QUERY SELECT false, false, false, NULL::timestamptz, NULL::text;
    RETURN;
  END IF;

  -- Check lead
  SELECT l.facility_id, l.original_facility_id, l.redistribution_status
  INTO v_lead
  FROM public.leads l WHERE l.id = p_lead_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, false, false, NULL::timestamptz, NULL::text;
    RETURN;
  END IF;

  -- Original facility match
  IF v_lead.facility_id = p_facility_id THEN
    RETURN QUERY SELECT true, true, false, NULL::timestamptz, v_lead.redistribution_status;
    RETURN;
  END IF;

  -- Check distributions
  SELECT ld.is_original, ld.distributed_at
  INTO v_dist
  FROM public.lead_distributions ld
  WHERE ld.lead_id = p_lead_id AND ld.facility_id = p_facility_id;

  IF FOUND THEN
    RETURN QUERY SELECT true, v_dist.is_original, NOT v_dist.is_original, v_dist.distributed_at, v_lead.redistribution_status;
    RETURN;
  END IF;

  RETURN QUERY SELECT false, false, false, NULL::timestamptz, v_lead.redistribution_status;
END;
$$;

-- Function to count pending (new) leads across all provider facilities
CREATE OR REPLACE FUNCTION public.get_pending_leads_count(p_user_id uuid)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_count bigint;
BEGIN
  -- Verify caller
  IF auth.uid() != p_user_id AND NOT has_role(auth.uid(), 'admin') THEN
    RETURN 0;
  END IF;

  SELECT COUNT(*) INTO v_count
  FROM public.leads l
  JOIN public.facilities f ON l.facility_id = f.id
  WHERE f.user_id = p_user_id AND l.status = 'new';

  RETURN COALESCE(v_count, 0);
END;
$$;

-- Function for seekers to view their own submitted leads
CREATE OR REPLACE FUNCTION public.get_seeker_submitted_leads()
RETURNS TABLE(
  id uuid,
  facility_id uuid,
  created_at timestamptz,
  status text,
  urgency text,
  preferred_contact text,
  provider_responded_at timestamptz,
  provider_response_status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_email text;
BEGIN
  -- Get caller's email
  SELECT au.email INTO v_email FROM auth.users au WHERE au.id = auth.uid();
  
  IF v_email IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT l.id, l.facility_id, l.created_at, l.status, l.urgency,
         l.preferred_contact, l.provider_responded_at, l.provider_response_status
  FROM public.leads l
  WHERE LOWER(l.email) = LOWER(v_email)
    AND l.facility_id IS NOT NULL
  ORDER BY l.created_at DESC
  LIMIT 200;
END;
$$;
