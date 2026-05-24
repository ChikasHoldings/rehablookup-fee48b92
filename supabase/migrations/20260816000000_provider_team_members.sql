-- Provider team / RBAC — phase 1: table + role helpers.
--
-- Model (confirmed product decision):
--   • Roles: owner / manager / viewer.
--   • The OWNER is implicit — facilities.user_id. They are never a row
--     here; they always outrank any team row.
--   • manager: edit listing content + leads + reviews + marketing.
--     NOT billing, team management, or account/facility deletion.
--   • viewer: read-only across the panel.
--   • Team management is a Pro feature (gated in the invite RPC by
--     has_active_pro); seats are unlimited.
--
-- Invites are keyed by email so an owner can invite someone who hasn't
-- signed up yet (status='pending', user_id NULL). When that person logs
-- in, link_pending_team_invites() binds the pending rows to their
-- user_id and flips them to 'active'.

CREATE TABLE IF NOT EXISTS public.facility_team_members (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id   uuid NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
  user_id       uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  email         text NOT NULL,
  role          text NOT NULL CHECK (role IN ('manager', 'viewer')),
  status        text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'revoked')),
  invited_by    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  invited_at    timestamptz NOT NULL DEFAULT now(),
  accepted_at   timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  -- One membership row per (facility, email). Re-inviting updates the row.
  CONSTRAINT facility_team_members_facility_email_uniq UNIQUE (facility_id, email)
);

CREATE INDEX IF NOT EXISTS idx_facility_team_members_facility ON public.facility_team_members(facility_id);
CREATE INDEX IF NOT EXISTS idx_facility_team_members_user ON public.facility_team_members(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_facility_team_members_email ON public.facility_team_members(lower(email));

CREATE TRIGGER update_facility_team_members_updated_at
  BEFORE UPDATE ON public.facility_team_members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.facility_team_members ENABLE ROW LEVEL SECURITY;

-- ─── Role resolution ────────────────────────────────────────────────
-- Returns the caller's effective role for a facility: 'owner' if they
-- own it, else their ACTIVE team role, else NULL. SECURITY DEFINER so it
-- can read facilities + team rows regardless of the caller's own RLS.
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
    ELSE (
      SELECT tm.role
      FROM public.facility_team_members tm
      WHERE tm.facility_id = _facility_id
        AND tm.user_id = _user_id
        AND tm.status = 'active'
      LIMIT 1
    )
  END;
$$;

-- Read/visibility: owner OR any active member (owner, manager, viewer).
CREATE OR REPLACE FUNCTION public.user_can_access_facility(_facility_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT public.facility_role(_facility_id, _user_id) IS NOT NULL;
$$;

-- Content writes (listing, leads, reviews, marketing): owner OR manager.
-- Viewers are read-only. Billing / team / delete are NOT covered here —
-- those stay owner-only on their own policies.
CREATE OR REPLACE FUNCTION public.user_can_edit_facility(_facility_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT public.facility_role(_facility_id, _user_id) IN ('owner', 'manager');
$$;

-- ─── RLS on the team table itself ───────────────────────────────────
-- A user can SELECT team rows for facilities they can access (so members
-- see the roster) OR their own membership rows.
DROP POLICY IF EXISTS facility_team_members_select ON public.facility_team_members;
CREATE POLICY facility_team_members_select ON public.facility_team_members
  FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR public.user_can_access_facility(facility_id, (SELECT auth.uid()))
    OR has_role((SELECT auth.uid()), 'admin')
  );

-- Only the facility OWNER may insert/update/delete team rows. (Managers
-- can't manage the team.) Writes go through the SECURITY DEFINER RPC for
-- the invite flow, but these policies are the backstop for any direct
-- client write.
DROP POLICY IF EXISTS facility_team_members_owner_write ON public.facility_team_members;
CREATE POLICY facility_team_members_owner_write ON public.facility_team_members
  FOR ALL TO authenticated
  USING (public.user_owns_facility(facility_id, (SELECT auth.uid())))
  WITH CHECK (public.user_owns_facility(facility_id, (SELECT auth.uid())));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.facility_team_members TO authenticated;

COMMENT ON TABLE public.facility_team_members IS
  'Provider RBAC: manager/viewer team members per facility. Owner is implicit (facilities.user_id). Pro-gated via the manage-facility-team edge function.';
