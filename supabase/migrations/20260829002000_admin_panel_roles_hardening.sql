-- ============================================================================
-- Admin Panel + Admin Roles — targeted production hardening
--
-- Closes confirmed findings from the admin audit. Every change is a backend
-- least-privilege or correctness fix; none loosen security. Each loose policy
-- is DROPped by its exact live name and replaced (verified single SELECT/DELETE
-- policy per table, so no leftover permissive policy remains).
--
-- Findings addressed:
--   F4  user_roles DELETE allowed any admin (escalation/lockout)
--   F7  admin_audit_log / rate_limit_log / blocked_identifiers readable by any
--       admin though the audit-log & security-logs pages are super-admin-only
--   F8  get_admin_profile disclosed admin PII to any authenticated user
--   F9  guard_seeker_inquiry_update referenced dropped columns (42703 at runtime)
--   F10 create_advisor_earning_on_placement dead + broken (dropped-column insert)
--
-- ROLLBACK: restore each policy's USING to has_role(auth.uid(),'admin'); restore
-- the original get_admin_profile body (no caller gate); restore guard_seeker_
-- inquiry_update with the dropped-column comparisons; recreate the advisor-earning
-- trigger. (Not advised — these revert security/correctness fixes.)
-- ============================================================================

-- ── F4: user_roles DELETE must require super_admin (matches INSERT) ──────────
-- INSERT already requires is_super_admin, but DELETE only required has_role
-- (admin), letting a non-super admin delete role rows (disable a super_admin /
-- demote peers) via direct PostgREST, bypassing manage-admin-user's anti-lockout
-- guards. No client performs a direct user_roles DELETE (verified); all legit
-- role changes go through service-role edge functions, which bypass RLS.
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;
CREATE POLICY "Super admins can delete roles" ON public.user_roles
  FOR DELETE TO authenticated
  USING (public.is_super_admin((SELECT auth.uid())));

-- ── F7: tighten super-admin-only sensitive reads to match the UI ─────────────
-- The audit-log page ('audit_log' perm) and security-logs page ('security_logs'
-- perm) are super-admin-only, but these tables allowed SELECT by ANY admin, so a
-- lower-tier admin could read them via direct API. The only client readers are
-- super-admin-only surfaces (AdminAuditLog, AdminSecurityLogs, and
-- DataHealthMonitor inside the super-only AdminSettings). SECURITY DEFINER RPCs
-- bypass RLS and are unaffected.
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.admin_audit_log;
CREATE POLICY "Super admins can view audit logs" ON public.admin_audit_log
  FOR SELECT TO authenticated
  USING (public.is_super_admin((SELECT auth.uid())));

DROP POLICY IF EXISTS "Admins can view rate limit logs" ON public.rate_limit_log;
CREATE POLICY "Super admins can view rate limit logs" ON public.rate_limit_log
  FOR SELECT TO authenticated
  USING (public.is_super_admin((SELECT auth.uid())));

DROP POLICY IF EXISTS "Admins can view blocked identifiers" ON public.blocked_identifiers;
CREATE POLICY "Super admins can view blocked identifiers" ON public.blocked_identifiers
  FOR SELECT TO authenticated
  USING (public.is_super_admin((SELECT auth.uid())));

-- ── F8: get_admin_profile must not disclose admin PII to any authenticated user ─
-- It returned an admin's profile (incl. MFA posture / force_password_change) for
-- ANY p_user_id with no caller gate; any logged-in user could read it. Restrict
-- to self OR an admin caller. Preserves the legit use (useAdminAuth fetches the
-- caller's OWN profile; admins reading any profile keep working).
CREATE OR REPLACE FUNCTION public.get_admin_profile(p_user_id uuid)
 RETURNS TABLE(user_id uuid, first_name text, last_name text, display_name text, avatar_url text, admin_role admin_role_type, status text, force_password_change boolean, mfa_enabled boolean, mfa_skip boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    aup.user_id,
    aup.first_name,
    aup.last_name,
    aup.display_name,
    aup.avatar_url,
    aup.admin_role,
    aup.status,
    aup.force_password_change,
    aup.mfa_enabled,
    aup.mfa_skip
  FROM public.admin_user_profiles aup
  WHERE aup.user_id = p_user_id
    AND (p_user_id = (SELECT auth.uid()) OR public.has_role((SELECT auth.uid()), 'admin'));
$function$;

-- ── F9: guard_seeker_inquiry_update references dropped concierge_inquiries cols ─
-- payment_status / payment_amount_cents / provider_invoice_id / provider_fee_status
-- / stripe_customer_id / stripe_payment_intent_id / checkout_session_id were all
-- dropped in the monetization rebuild, but the guard still compared them, so any
-- non-admin / non-service / non-bypass UPDATE raised 42703 ("record new has no
-- field ..."). Recreate over only the surviving privileged columns (all verified
-- present). Behavior is otherwise identical: admins / service-role / the bypass
-- GUC short-circuit; a seeker may only touch non-privileged fields of their own
-- inquiry.
CREATE OR REPLACE FUNCTION public.guard_seeker_inquiry_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_is_admin boolean;
  v_bypass text;
BEGIN
  -- Admins, service role, and SECURITY DEFINER RPCs bypass the guard.
  v_is_admin := has_role(auth.uid(), 'admin'::app_role);
  v_bypass := current_setting('app.bypass_seeker_inquiry_guard', true);

  IF v_is_admin OR auth.uid() IS NULL OR v_bypass = 'on' THEN
    RETURN NEW;
  END IF;

  IF NEW.user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Cannot modify another user''s inquiry';
  END IF;

  IF NEW.placed_facility_id          IS DISTINCT FROM OLD.placed_facility_id          OR
     NEW.placement_confirmed         IS DISTINCT FROM OLD.placement_confirmed         OR
     NEW.placement_confirmed_at      IS DISTINCT FROM OLD.placement_confirmed_at      OR
     NEW.seeker_confirmed            IS DISTINCT FROM OLD.seeker_confirmed            OR
     NEW.seeker_confirmed_at         IS DISTINCT FROM OLD.seeker_confirmed_at         OR
     NEW.assigned_advisor_id         IS DISTINCT FROM OLD.assigned_advisor_id         OR
     NEW.matched_facility_ids        IS DISTINCT FROM OLD.matched_facility_ids        OR
     NEW.admin_matched_facility_ids  IS DISTINCT FROM OLD.admin_matched_facility_ids  OR
     NEW.match_scores                IS DISTINCT FROM OLD.match_scores                OR
     NEW.admin_notes                 IS DISTINCT FROM OLD.admin_notes                 OR
     NEW.status                      IS DISTINCT FROM OLD.status                      OR
     NEW.tour_coordination_status    IS DISTINCT FROM OLD.tour_coordination_status    OR
     NEW.admission_status            IS DISTINCT FROM OLD.admission_status            OR
     NEW.admission_substatus         IS DISTINCT FROM OLD.admission_substatus         OR
     NEW.idempotency_key             IS DISTINCT FROM OLD.idempotency_key             OR
     NEW.draft_id                    IS DISTINCT FROM OLD.draft_id                    OR
     NEW.user_id                     IS DISTINCT FROM OLD.user_id
  THEN
    RAISE EXCEPTION 'You are not permitted to modify these inquiry fields';
  END IF;

  RETURN NEW;
END;
$function$;

-- ── F10: drop the dead + broken advisor-earning-on-placement trigger ─────────
-- create_advisor_earning_on_placement fires only on status='placed' (a status no
-- longer in the concierge vocabulary, so it never runs) AND references the
-- dropped concierge_inquiries.provider_fee_cents and inserts the dropped
-- advisor_earnings.placement_fee_cents column — so it cannot function. Remove the
-- vestigial trigger + function (per-placement provider fees were retired with the
-- flat-fee model). NOTE: this is NOT the advisor auto-assignment trigger
-- (trg_auto_assign_advisor_on_insert), which is left intact.
DROP TRIGGER IF EXISTS create_advisor_earning_trigger ON public.concierge_inquiries;
DROP FUNCTION IF EXISTS public.create_advisor_earning_on_placement();
