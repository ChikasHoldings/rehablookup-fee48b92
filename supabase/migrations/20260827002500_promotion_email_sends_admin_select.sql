-- promotion_email_sends is the FOMO promo-email idempotency/audit log
-- (promotion_id, user_id, milestone). It is written ONLY by the
-- send-promo-campaign-emails edge function via the service-role key, which
-- bypasses RLS. The original conversion_promotions migration enabled RLS on it
-- but — unlike its siblings promotions / promotion_dismissals and the analogous
-- sms_outbound_log audit table — never added a policy, so it tripped the
-- 0008_rls_enabled_no_policy advisor and stayed unreadable even to admins
-- (blocking the Campaigns analytics surface that reports promo-email delivery).
--
-- Mirror sms_outbound_log_admin_select: grant admins SELECT only. Service-role
-- inserts are unaffected (they bypass RLS); no INSERT/UPDATE/DELETE policy is
-- added by design — the hourly cron is the sole writer.
DROP POLICY IF EXISTS "promotion_email_sends_admin_select" ON public.promotion_email_sends;
CREATE POLICY "promotion_email_sends_admin_select"
  ON public.promotion_email_sends
  FOR SELECT
  TO authenticated
  USING (has_role((SELECT auth.uid()), 'admin'::app_role));
