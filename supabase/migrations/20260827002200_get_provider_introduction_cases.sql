-- Placement-partner case details for the in-app introduction responder.
-- concierge_inquiries is RLS-hidden from a partner until an advisor
-- discloses PII / they win the placement, so this SECURITY DEFINER RPC
-- returns the de-identified clinical summary the partner needs to decide
-- (same fields as the introduction email), and exposes the client's
-- name/email/phone ONLY when the same disclosure condition the
-- concierge_inquiries RLS uses is met. Authorizes the caller as an
-- owner or active team member of the facility.
CREATE OR REPLACE FUNCTION public.get_provider_introduction_cases(p_facility_id uuid)
RETURNS TABLE (
  introduction_id uuid,
  inquiry_id uuid,
  sent_at timestamptz,
  created_at timestamptz,
  provider_response text,
  provider_responded_at timestamptz,
  response_deadline_at timestamptz,
  status text,
  level_of_care text,
  primary_concern text,
  insurance_carrier text,
  payment_type text,
  preferred_city text,
  preferred_state text,
  gender text,
  age_range text,
  timeline_urgency text,
  pii_disclosed boolean,
  client_name text,
  client_email text,
  client_phone text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.facilities f WHERE f.id = p_facility_id AND f.user_id = auth.uid()
  ) AND NOT EXISTS (
    SELECT 1 FROM public.facility_team_members tm
    WHERE tm.facility_id = p_facility_id AND tm.user_id = auth.uid() AND tm.status = 'active'
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    ci.id,
    inq.id,
    ci.sent_at,
    ci.created_at,
    ci.provider_response,
    ci.provider_responded_at,
    ci.response_deadline_at,
    inq.status,
    inq.level_of_care,
    inq.primary_concern,
    inq.insurance_carrier,
    inq.payment_type,
    inq.preferred_city,
    inq.preferred_state,
    inq.gender,
    inq.age_range,
    inq.timeline_urgency,
    d.v,
    CASE WHEN d.v THEN inq.user_name  ELSE NULL END,
    CASE WHEN d.v THEN inq.user_email ELSE NULL END,
    CASE WHEN d.v THEN inq.user_phone ELSE NULL END
  FROM public.concierge_introductions ci
  JOIN public.concierge_inquiries inq ON inq.id = ci.inquiry_id
  CROSS JOIN LATERAL (
    SELECT (ci.admin_disclosed_pii_at IS NOT NULL
            OR (inq.seeker_confirmed = true AND inq.placed_facility_id = p_facility_id)) AS v
  ) d
  WHERE ci.facility_id = p_facility_id
  ORDER BY ci.sent_at DESC NULLS LAST, ci.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_provider_introduction_cases(uuid) TO authenticated;
