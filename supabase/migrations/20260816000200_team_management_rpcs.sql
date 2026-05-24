-- Provider team / RBAC — phase 3: Pro-gate the member path + management RPCs.

-- Harden facility_role: the OWNER always has access (any plan), but a
-- team MEMBER's role only resolves when the facility is on active Pro.
-- This makes team a true Pro feature AND gives clean downgrade — when
-- Pro lapses, members fall to NULL (no access) automatically; the owner
-- is unaffected; re-upgrade restores members. Fail-closed.
CREATE OR REPLACE FUNCTION public.facility_role(_facility_id uuid, _user_id uuid)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT CASE
    WHEN EXISTS (
      SELECT 1 FROM public.facilities f
      WHERE f.id = _facility_id AND f.user_id = _user_id
    ) THEN 'owner'
    WHEN public.has_active_pro(_facility_id) THEN (
      SELECT tm.role
      FROM public.facility_team_members tm
      WHERE tm.facility_id = _facility_id
        AND tm.user_id = _user_id
        AND tm.status = 'active'
      LIMIT 1
    )
    ELSE NULL
  END;
$$;

-- Invite (or re-invite) a team member. Owner-only + Pro-gated. Resolves
-- an existing account by email and activates immediately; otherwise
-- stores a pending invite that link_pending_team_invites() binds on the
-- invitee's next login.
CREATE OR REPLACE FUNCTION public.invite_facility_team_member(
  p_facility_id uuid,
  p_email text,
  p_role text
)
RETURNS TABLE(id uuid, status text, linked boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_email text := lower(trim(p_email));
  v_target_user uuid;
  v_owner_email text;
  v_row_id uuid;
  v_status text;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;
  IF NOT public.user_owns_facility(p_facility_id, v_caller) THEN
    RAISE EXCEPTION 'Only the facility owner can manage the team' USING ERRCODE = '42501';
  END IF;
  IF NOT public.has_active_pro(p_facility_id) THEN
    RAISE EXCEPTION 'Pro subscription required to add team members' USING ERRCODE = 'P0001';
  END IF;
  IF p_role NOT IN ('manager', 'viewer') THEN
    RAISE EXCEPTION 'Role must be manager or viewer' USING ERRCODE = '22023';
  END IF;
  IF v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RAISE EXCEPTION 'A valid email is required' USING ERRCODE = '22023';
  END IF;

  -- Can't invite the owner as a team member.
  SELECT lower(pr.email) INTO v_owner_email
  FROM public.profiles pr
  WHERE pr.user_id = v_caller;
  IF v_owner_email = v_email THEN
    RAISE EXCEPTION 'You already own this facility' USING ERRCODE = '22023';
  END IF;

  -- Resolve an existing account by email.
  SELECT pr.user_id INTO v_target_user
  FROM public.profiles pr
  WHERE lower(pr.email) = v_email
  LIMIT 1;

  v_status := CASE WHEN v_target_user IS NOT NULL THEN 'active' ELSE 'pending' END;

  INSERT INTO public.facility_team_members AS tm
    (facility_id, user_id, email, role, status, invited_by, accepted_at)
  VALUES (
    p_facility_id, v_target_user, v_email, p_role, v_status, v_caller,
    CASE WHEN v_target_user IS NOT NULL THEN now() ELSE NULL END
  )
  ON CONFLICT (facility_id, email) DO UPDATE
    SET role = EXCLUDED.role,
        -- Re-inviting a revoked/pending member reactivates per resolution.
        user_id = COALESCE(EXCLUDED.user_id, tm.user_id),
        status = EXCLUDED.status,
        invited_by = EXCLUDED.invited_by,
        accepted_at = EXCLUDED.accepted_at,
        updated_at = now()
  RETURNING tm.id, tm.status INTO v_row_id, v_status;

  RETURN QUERY SELECT v_row_id, v_status, (v_target_user IS NOT NULL);
END;
$$;

-- Called by a signed-in user to bind any pending invites addressed to
-- their email. Safe to call on every team-page load / login.
CREATE OR REPLACE FUNCTION public.link_pending_team_invites()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_email text;
  v_count integer;
BEGIN
  IF v_caller IS NULL THEN RETURN 0; END IF;
  SELECT lower(email) INTO v_email FROM public.profiles WHERE user_id = v_caller;
  IF v_email IS NULL THEN RETURN 0; END IF;

  WITH linked AS (
    UPDATE public.facility_team_members
    SET user_id = v_caller, status = 'active', accepted_at = now(), updated_at = now()
    WHERE lower(email) = v_email
      AND user_id IS NULL
      AND status = 'pending'
    RETURNING 1
  )
  SELECT count(*) INTO v_count FROM linked;
  RETURN v_count;
END;
$$;

-- Roster reader: owner + active/pending members with display names.
-- SECURITY DEFINER so it can read other users' profile names. Caller
-- must be able to access the facility.
CREATE OR REPLACE FUNCTION public.get_facility_team(p_facility_id uuid)
RETURNS TABLE(
  member_id uuid,
  user_id uuid,
  email text,
  role text,
  status text,
  display_name text,
  is_owner boolean
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_caller uuid := auth.uid();
BEGIN
  IF v_caller IS NULL OR NOT public.user_can_access_facility(p_facility_id, v_caller) THEN
    RAISE EXCEPTION 'Not authorized for this facility' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  -- Owner row (synthetic).
  SELECT
    NULL::uuid AS member_id,
    f.user_id,
    op.email,
    'owner'::text AS role,
    'active'::text AS status,
    NULLIF(trim(concat_ws(' ', op.first_name, op.last_name)), '') AS display_name,
    true AS is_owner
  FROM public.facilities f
  LEFT JOIN public.profiles op ON op.user_id = f.user_id
  WHERE f.id = p_facility_id

  UNION ALL

  SELECT
    tm.id AS member_id,
    tm.user_id,
    tm.email,
    tm.role,
    tm.status,
    NULLIF(trim(concat_ws(' ', mp.first_name, mp.last_name)), '') AS display_name,
    false AS is_owner
  FROM public.facility_team_members tm
  LEFT JOIN public.profiles mp ON mp.user_id = tm.user_id
  WHERE tm.facility_id = p_facility_id
    AND tm.status <> 'revoked'
  ORDER BY is_owner DESC, role, email;
END;
$$;

GRANT EXECUTE ON FUNCTION public.invite_facility_team_member(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.link_pending_team_invites() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_facility_team(uuid) TO authenticated;
