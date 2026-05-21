-- Final hardening pass — 2026-05-21 — closes the 4 trivial advisor findings
-- that remained after the seeker/admin/provider/public hardening:
--
--   * function_search_path_mutable on saved_searches_touch_updated_at +
--     blog_authors_touch_updated_at — trigger functions that didn't pin
--     search_path. Although neither references unqualified objects today,
--     pinning search_path defends against future search_path-injection
--     attacks and is the Supabase advisor's recommended default for every
--     function reachable from user-controlled DML.
--
--   * rls_enabled_no_policy on lead_email_resend_attempts + sms_inbound_log
--     — RLS is enabled but no policies exist, which means the tables are
--     effectively deny-all for non-service-role callers. That's already
--     SAFE (no data leak risk) but adding explicit deny-all policies makes
--     the intent visible to anyone reviewing the schema and silences the
--     advisor INFO.

-- 1. Pin search_path on the two trigger functions.
CREATE OR REPLACE FUNCTION public.saved_searches_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.blog_authors_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 2. Add explicit deny-by-default policies on the two service-only tables.
--    These tables exist for service-role writes only (email retry attempts
--    are written by the `retry-failed-payments` cron / `send-seeker-emails`
--    edge fn; SMS inbound is written by `twilio-sms-inbound`). Anon and
--    authenticated callers must NEVER read them — they hold delivery audit
--    metadata that could be enumerated to map seekers ↔ providers.
--
--    Service-role bypasses RLS (it's the same role both writers use), so
--    the existing write path is unaffected.

-- lead_email_resend_attempts
DROP POLICY IF EXISTS "Deny anon access to lead_email_resend_attempts" ON public.lead_email_resend_attempts;
CREATE POLICY "Deny anon access to lead_email_resend_attempts"
  ON public.lead_email_resend_attempts
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

-- sms_inbound_log
DROP POLICY IF EXISTS "Deny anon access to sms_inbound_log" ON public.sms_inbound_log;
CREATE POLICY "Deny anon access to sms_inbound_log"
  ON public.sms_inbound_log
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

-- Admins MAY need to read these for support/forensics. Adding a separate
-- read policy keyed on has_role() preserves the deny-all default for
-- everyone else while granting visibility to the right role.
DROP POLICY IF EXISTS "Admins can read lead_email_resend_attempts" ON public.lead_email_resend_attempts;
CREATE POLICY "Admins can read lead_email_resend_attempts"
  ON public.lead_email_resend_attempts
  FOR SELECT
  TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins can read sms_inbound_log" ON public.sms_inbound_log;
CREATE POLICY "Admins can read sms_inbound_log"
  ON public.sms_inbound_log
  FOR SELECT
  TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));
