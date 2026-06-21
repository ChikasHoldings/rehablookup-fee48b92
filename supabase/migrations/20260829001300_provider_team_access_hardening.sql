-- ============================================================================
-- Provider team / multi-user access — hardening pass
--
-- Fixes three confirmed lifecycle issues (all verified live, rolled back):
--
-- F1 (HIGH, security) — Invite hijack. invite_facility_team_member() and
--   link_pending_team_invites() bound invites by lower(profiles.email).
--   profiles.email is user-mutable (RLS "Users can update their own profile"
--   has no column restriction; validate_profile_data only checks format; the
--   sensitive-column guard does not cover email). PROVEN: an attacker set their
--   own profiles.email to a pending invite's address and link_pending_team_
--   invites() bound that invite to them as 'active'. FIX: bind by the VERIFIED
--   auth.users.email (email_confirmed_at IS NOT NULL) — the canonical identity
--   a user cannot change without re-confirmation. For 99% of users
--   profiles.email already equals auth.users.email (handle_new_provider seeds
--   it), so legitimate behavior is unchanged; only the spoofable path is closed.
--
-- F2 (HIGH, correctness) — Team members locked out of leads. leads_provider_view
--   (security_invoker) and get_facility_leads_count gated owner-only
--   (facilities.user_id = auth.uid()), so managers/viewers saw 0 leads / 0 count
--   even though the leads table RLS (leads_team_select / leads_team_update) and
--   the documented role model intend team members to see leads (manager: view +
--   respond; viewer: read-only). FIX: gate both on user_can_access_facility()
--   (owner OR active manager/viewer). This is Pro-gated for members and
--   owner-always via facility_role(), and per-facility scoped, so cross-tenant
--   isolation and the Pro gate are preserved. The lead RESPONSE (write) gate is
--   unchanged — it stays leads_team_update (owner|manager) + the existing
--   active-Pro requirement; viewers remain read-only.
--
-- F4 (MED, integrity) — Owner shown twice after a claim-transfer. When a
--   claimant who was already a team member becomes owner (facilities.user_id),
--   their old facility_team_members row remains, so get_facility_team() listed
--   them as both Owner (synthetic) and their old manager/viewer row. FIX:
--   exclude member rows whose user_id equals the facility owner from the roster
--   (handles existing + future without touching the claim-approval trigger).
--
-- ROLLBACK: restore each function from the prior migrations
--   (20260816000200_team_management_rpcs.sql) and recreate leads_provider_view /
--   get_facility_leads_count with the owner-only predicate.
-- ============================================================================

-- ── F1: invite by VERIFIED auth identity ────────────────────────────────────
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

  -- Can't invite the owner as a team member. Compare against the owner's
  -- VERIFIED auth email (not the mutable profiles.email).
  SELECT lower(au.email) INTO v_owner_email
  FROM auth.users au
  WHERE au.id = v_caller;
  IF v_owner_email = v_email THEN
    RAISE EXCEPTION 'You already own this facility' USING ERRCODE = '22023';
  END IF;

  -- Resolve an existing account by VERIFIED auth email only. An account whose
  -- (mutable) profiles.email was set to this address but whose verified auth
  -- email differs is intentionally NOT matched, so it cannot be activated by
  -- email-squatting. Unverified/absent accounts fall through to a pending
  -- invite, bound later by link_pending_team_invites() on verified login.
  SELECT au.id INTO v_target_user
  FROM auth.users au
  WHERE lower(au.email) = v_email
    AND au.email_confirmed_at IS NOT NULL
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
        user_id = COALESCE(EXCLUDED.user_id, tm.user_id),
        status = EXCLUDED.status,
        invited_by = EXCLUDED.invited_by,
        accepted_at = EXCLUDED.accepted_at,
        updated_at = now()
  RETURNING tm.id, tm.status INTO v_row_id, v_status;

  RETURN QUERY SELECT v_row_id, v_status, (v_target_user IS NOT NULL);
END;
$$;

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
  -- Bind by the VERIFIED auth identity, never the user-mutable profiles.email.
  -- A user cannot change auth.users.email without re-confirmation, so this
  -- closes the invite-hijack vector (editing profiles.email no longer claims
  -- someone else's pending invite).
  SELECT lower(email) INTO v_email
  FROM auth.users
  WHERE id = v_caller AND email_confirmed_at IS NOT NULL;
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

-- ── F4: never list the owner twice in the roster ────────────────────────────
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
  v_owner uuid;
BEGIN
  IF v_caller IS NULL OR NOT public.user_can_access_facility(p_facility_id, v_caller) THEN
    RAISE EXCEPTION 'Not authorized for this facility' USING ERRCODE = '42501';
  END IF;

  SELECT f.user_id INTO v_owner FROM public.facilities f WHERE f.id = p_facility_id;

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
    -- Exclude a stale member row for someone who is now the OWNER (e.g. a team
    -- member who later claimed the facility) so the owner never appears twice.
    AND (tm.user_id IS NULL OR tm.user_id IS DISTINCT FROM v_owner)
  ORDER BY is_owner DESC, role, email;
END;
$$;

-- ── F2: leads visible to active team members (owner|manager|viewer) ──────────
-- security_invoker=true retained; the underlying leads RLS (leads_team_select)
-- already permits the same set, so this aligns the view with the table.
CREATE OR REPLACE VIEW public.leads_provider_view
WITH (security_invoker = true) AS
SELECT
  id, facility_id, original_facility_id, status, created_at, urgency, level_of_care, source,
  location_city_state, location_zip, primary_substance, insurance_type, insurance_provider, inquiry_type,
  who_seeking_help, age_range, gender, dual_diagnosis, co_occurring_conditions, previous_treatment,
  previous_treatment_details, readiness_level, special_needs, message, redistribution_status,
  assignment_status, assignment_reason, exclusive_until, extended_until, assigned_at, lead_expired_at,
  shared_with, provider_response_status, provider_responded_at, provider_response_notes, quality_flag,
  snooze_until, employment_status, veteran_status, legal_involvement, exclusivity, budget_preference,
  relationship_to_patient, preferred_contact, best_time_to_call, name, email, phone
FROM leads
WHERE public.user_can_access_facility(facility_id, auth.uid())
   OR id IN (
     SELECT ld.lead_id
     FROM lead_distributions ld
     WHERE public.user_can_access_facility(ld.facility_id, auth.uid())
   );

-- ── F2: dashboard lead count visible to active team members ──────────────────
CREATE OR REPLACE FUNCTION public.get_facility_leads_count(p_facility_id uuid)
RETURNS TABLE(total_count bigint, monthly_qualified_count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_total bigint;
  v_monthly bigint;
  v_start_of_month timestamptz;
BEGIN
  -- Owner OR active manager/viewer (Pro-gated for members) OR admin.
  IF NOT public.user_can_access_facility(p_facility_id, auth.uid())
     AND NOT has_role(auth.uid(), 'admin') THEN
    RETURN QUERY SELECT 0::bigint, 0::bigint;
    RETURN;
  END IF;

  v_start_of_month := date_trunc('month', now());

  SELECT COUNT(*) INTO v_total
  FROM public.leads
  WHERE facility_id = p_facility_id;

  SELECT COUNT(*) INTO v_monthly
  FROM public.leads
  WHERE facility_id = p_facility_id
    AND qualified = true
    AND created_at >= v_start_of_month;

  RETURN QUERY SELECT v_total, v_monthly;
END;
$$;
