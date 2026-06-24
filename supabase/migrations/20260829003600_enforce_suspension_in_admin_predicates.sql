-- Suspension defense-in-depth (follow-up #3): enforce admin suspension in the
-- role predicates themselves, not only via the Supabase Auth ban.
--
-- Today, suspending an admin (status='suspended') also bans them in auth, which
-- prevents them obtaining a valid JWT — so suspension is effective. But the
-- role predicates `is_super_admin()` / `user_is_admin()` keyed only off
-- user_roles / admin_user_permissions and did NOT check status, so the model
-- leaned entirely on the auth-ban side-effect. If any future suspend path ever
-- set status without banning in auth (or a ban were lifted out-of-band), every
-- RLS gate keyed on these predicates would silently re-open for the suspended
-- admin.
--
-- Add an explicit `NOT suspended` guard to both predicates. We use
-- `NOT EXISTS(... status='suspended')` rather than `EXISTS(... status='active')`
-- deliberately: the goal is to block SUSPENDED admins, and this form
--   * never blocks an admin in the transient 'pending_password_reset' state
--     (so the forced-password-reset login flow is unaffected), and
--   * preserves current behavior for any role='admin' user without a profile row.
-- (The generic has_role() is intentionally left untouched — it is a
-- role-grant check, not an admin-specific predicate.)
--
-- Verified safe: every current role='admin' user has an active profile, so no
-- active/operational admin loses access. The change only tightens (a suspended
-- admin now fails the predicate).

CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'admin'
  ) AND EXISTS (
    SELECT 1 FROM public.admin_user_permissions
    WHERE user_id = _user_id AND permission_key = 'super_admin' AND granted = true
  ) AND NOT EXISTS (
    SELECT 1 FROM public.admin_user_profiles
    WHERE user_id = _user_id AND status = 'suspended'
  )
$function$;

CREATE OR REPLACE FUNCTION public.user_is_admin(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = p_user_id AND role = 'admin'
  ) AND NOT EXISTS (
    SELECT 1 FROM public.admin_user_profiles
    WHERE user_id = p_user_id AND status = 'suspended'
  )
$function$;
