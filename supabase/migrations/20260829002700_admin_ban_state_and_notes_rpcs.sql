-- Admin ban-state + seeker-note reader RPCs (SECURITY DEFINER).
--
-- blocked_identifiers and admin_audit_log have is_super_admin-only SELECT RLS,
-- but manager / customer_rep (who manage seekers and see UserProfileModal) read
-- them directly to show the Ban/Active badge and prior admin notes. Under RLS
-- they got 0 rows — so a banned seeker showed as "Active" and saved notes were
-- invisible (a false-negative, not a write bug; the ban write goes through an
-- edge function). These readers run as definer (bypass RLS) but self-gate on
-- user_is_admin(auth.uid()) so only admins get data; non-admins get the safe
-- default (false / null) with no leak.

CREATE OR REPLACE FUNCTION public.is_user_banned(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.user_is_admin((SELECT auth.uid()))
     AND EXISTS (
       SELECT 1 FROM public.blocked_identifiers
       WHERE identifier = p_user_id::text AND is_active = true
     );
$$;

CREATE OR REPLACE FUNCTION public.get_seeker_admin_note(p_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE WHEN public.user_is_admin((SELECT auth.uid())) THEN (
    SELECT details->>'note'
    FROM public.admin_audit_log
    WHERE target_id = p_user_id
      AND target_type = 'seeker'
      AND action_type = 'seeker_note'
    ORDER BY created_at DESC
    LIMIT 1
  ) END;
$$;

REVOKE ALL ON FUNCTION public.is_user_banned(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_seeker_admin_note(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_user_banned(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_seeker_admin_note(uuid) TO authenticated;
