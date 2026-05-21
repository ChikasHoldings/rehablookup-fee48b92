-- Bug fix: AdvisorTrustCard (seeker-facing) was SELECTing
-- admin_user_profiles directly, but the RLS policies on that table
-- restrict SELECT to (a) admins and (b) the row's own user. A seeker
-- can't see their assigned advisor's display name, so the card
-- silently rendered the "advisor not assigned yet" state for every
-- seeker with an assigned advisor.
--
-- This RPC is SECURITY DEFINER + STABLE so it bypasses the
-- admin_user_profiles RLS, but it only returns the four public-safe
-- columns (first_name, last_name, display_name, avatar_url) AND
-- only when the calling user actually owns the inquiry that lists
-- the advisor. No other admin columns are exposed.

CREATE OR REPLACE FUNCTION public.get_inquiry_advisor_public_info(p_inquiry_id uuid)
RETURNS TABLE (
  first_name text,
  last_name text,
  display_name text,
  avatar_url text
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path TO 'public'
AS $$
BEGIN
  -- Auth gate: only the seeker who owns the inquiry can read the
  -- advisor's display info. Caller must be authenticated.
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  RETURN QUERY
  SELECT
    aup.first_name,
    aup.last_name,
    aup.display_name,
    aup.avatar_url
  FROM public.admin_user_profiles aup
  WHERE aup.user_id = (
    SELECT ci.assigned_advisor_id
    FROM public.concierge_inquiries ci
    WHERE ci.id = p_inquiry_id
      AND ci.user_id = auth.uid()
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_inquiry_advisor_public_info(uuid) TO authenticated;
