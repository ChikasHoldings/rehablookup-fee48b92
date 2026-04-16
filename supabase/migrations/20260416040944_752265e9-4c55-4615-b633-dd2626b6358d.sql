
-- Create a security definer function to fetch a seeker's own lead details
-- This bypasses RLS on the leads table (which has no seeker SELECT policy)
CREATE OR REPLACE FUNCTION public.get_seeker_lead_detail(p_lead_id uuid)
RETURNS TABLE(
  id uuid,
  name text,
  email text,
  phone text,
  created_at timestamptz,
  status text,
  urgency text,
  preferred_contact text,
  level_of_care text,
  insurance_type text,
  primary_substance text[],
  message text,
  location_city_state text,
  location_zip text,
  who_seeking_help text,
  age_range text,
  gender text,
  provider_responded_at timestamptz,
  provider_response_status text,
  facility_id uuid,
  source text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_user_email text;
BEGIN
  -- Get calling user's email
  SELECT au.email INTO v_user_email
  FROM auth.users au WHERE au.id = auth.uid();

  IF v_user_email IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT 
    l.id, l.name, l.email, l.phone, l.created_at, l.status,
    l.urgency, l.preferred_contact, l.level_of_care, l.insurance_type,
    l.primary_substance, l.message, l.location_city_state, l.location_zip,
    l.who_seeking_help, l.age_range, l.gender,
    l.provider_responded_at, l.provider_response_status,
    l.facility_id, l.source
  FROM public.leads l
  WHERE l.id = p_lead_id
    AND LOWER(l.email) = LOWER(v_user_email);
END;
$$;

-- Create a function to get lead notes visible to the seeker
CREATE OR REPLACE FUNCTION public.get_seeker_lead_notes(p_lead_id uuid)
RETURNS TABLE(
  note text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_user_email text;
BEGIN
  SELECT au.email INTO v_user_email
  FROM auth.users au WHERE au.id = auth.uid();

  IF v_user_email IS NULL THEN RETURN; END IF;

  -- Verify the lead belongs to this seeker
  IF NOT EXISTS (
    SELECT 1 FROM public.leads l
    WHERE l.id = p_lead_id AND LOWER(l.email) = LOWER(v_user_email)
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT ln.note, ln.created_at
  FROM public.lead_notes ln
  WHERE ln.lead_id = p_lead_id
  ORDER BY ln.created_at ASC
  LIMIT 50;
END;
$$;

-- Create a function to check if a lead was unlocked
CREATE OR REPLACE FUNCTION public.get_seeker_lead_unlock_info(p_lead_id uuid)
RETURNS TABLE(
  unlocked_at timestamptz,
  facility_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_user_email text;
BEGIN
  SELECT au.email INTO v_user_email
  FROM auth.users au WHERE au.id = auth.uid();

  IF v_user_email IS NULL THEN RETURN; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.leads l
    WHERE l.id = p_lead_id AND LOWER(l.email) = LOWER(v_user_email)
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT lu.unlocked_at, lu.facility_id
  FROM public.lead_unlocks lu
  WHERE lu.lead_id = p_lead_id
  ORDER BY lu.unlocked_at DESC
  LIMIT 1;
END;
$$;
