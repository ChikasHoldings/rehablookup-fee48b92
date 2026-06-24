-- enforce_admin_escalation_update() is a trigger function: it fires from the
-- admin_escalations BEFORE UPDATE trigger regardless of EXECUTE grants, and a
-- direct call errors out ("trigger functions can only be called as triggers").
-- Revoke the default PUBLIC EXECUTE so it is not gratuitously exposed to
-- anon/authenticated as a directly-callable SECURITY DEFINER function (clears
-- the anon/authenticated security-definer-executable advisory it would
-- otherwise raise). Does NOT affect the trigger firing.
--
-- Supabase grants EXECUTE to anon/authenticated explicitly via default
-- privileges, so REVOKE FROM PUBLIC alone is a no-op — revoke from the roles
-- directly as well.
REVOKE EXECUTE ON FUNCTION public.enforce_admin_escalation_update() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.enforce_admin_escalation_update() FROM anon, authenticated;
