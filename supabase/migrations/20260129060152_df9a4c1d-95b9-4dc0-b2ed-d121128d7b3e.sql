-- Phase 2: Database Security Hardening for Lead Masking
-- This creates a view that masks sensitive contact info for locked leads

-- Create the masked leads provider view
CREATE OR REPLACE VIEW public.leads_provider_view
WITH (security_invoker = on)
AS
SELECT 
  l.id,
  l.facility_id,
  l.status,
  l.created_at,
  l.urgency,
  l.level_of_care,
  l.source,
  l.location_city_state,
  l.location_zip,
  l.primary_substance,
  l.insurance_type,
  l.message,
  l.who_seeking_help,
  l.dual_diagnosis,
  l.insurance_provider,
  l.budget_preference,
  l.email_verified,
  l.qualified,
  l.qualification_reason,
  l.assignment_status,
  l.inquiry_type,
  l.provider_response_status,
  l.provider_responded_at,
  l.follow_up_reminder_sent_at,
  l.snooze_until,
  -- Masked fields unless unlocked
  CASE 
    WHEN public.is_lead_unlocked(l.id, l.facility_id) THEN l.name
    ELSE COALESCE(
      split_part(l.name, ' ', 1) || ' ' || 
      CASE WHEN position(' ' in l.name) > 0 THEN substring(split_part(l.name, ' ', 2) from 1 for 1) || '.' ELSE '' END,
      '●●●●●●'
    )
  END as name,
  CASE 
    WHEN public.is_lead_unlocked(l.id, l.facility_id) THEN l.email
    ELSE COALESCE(
      substring(l.email from 1 for 1) || '●●●@●●●.' || 
      COALESCE(substring(l.email from '\.([^.]+)$'), 'com'),
      '●●●@●●●.com'
    )
  END as email,
  CASE 
    WHEN public.is_lead_unlocked(l.id, l.facility_id) THEN l.phone
    ELSE '(●●●) ●●●-●●●●'
  END as phone,
  -- Unlock status indicator
  public.is_lead_unlocked(l.id, l.facility_id) as is_unlocked
FROM public.leads l;

-- Grant access to the view for authenticated users
GRANT SELECT ON public.leads_provider_view TO authenticated;

-- Create function to get full lead data only if unlocked
CREATE OR REPLACE FUNCTION public.get_unlocked_lead_data(p_lead_id uuid, p_facility_id uuid)
RETURNS TABLE (
  id uuid,
  facility_id uuid,
  name text,
  email text,
  phone text,
  status text,
  created_at timestamptz,
  urgency text,
  level_of_care text,
  source text,
  location_city_state text,
  location_zip text,
  primary_substance text[],
  insurance_type text,
  message text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if lead is unlocked for this facility
  IF NOT public.is_lead_unlocked(p_lead_id, p_facility_id) THEN
    RAISE EXCEPTION 'Lead is not unlocked for this facility';
  END IF;
  
  -- Return full unmasked lead data
  RETURN QUERY
  SELECT 
    l.id,
    l.facility_id,
    l.name,
    l.email,
    l.phone,
    l.status,
    l.created_at,
    l.urgency,
    l.level_of_care,
    l.source,
    l.location_city_state,
    l.location_zip,
    l.primary_substance,
    l.insurance_type,
    l.message
  FROM public.leads l
  WHERE l.id = p_lead_id;
END;
$$;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION public.get_unlocked_lead_data(uuid, uuid) TO authenticated;