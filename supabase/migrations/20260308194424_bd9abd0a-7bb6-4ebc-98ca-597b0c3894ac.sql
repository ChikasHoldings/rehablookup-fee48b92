-- CRITICAL SECURITY FIX: Change all "Service role" policies from targeting {public} to {service_role}
-- These policies were intended for backend-only access but incorrectly allowed unauthenticated access

-- 1. admin_mfa_recovery_codes
DROP POLICY IF EXISTS "Service role can manage recovery codes" ON public.admin_mfa_recovery_codes;
CREATE POLICY "Service role can manage recovery codes" ON public.admin_mfa_recovery_codes FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 2. concierge_case_events
DROP POLICY IF EXISTS "Service role can manage all events" ON public.concierge_case_events;
CREATE POLICY "Service role can manage all events" ON public.concierge_case_events FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 3. concierge_engagements
DROP POLICY IF EXISTS "Service role can manage engagements" ON public.concierge_engagements;
CREATE POLICY "Service role can manage engagements" ON public.concierge_engagements FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 4. concierge_inquiries
DROP POLICY IF EXISTS "Service role can manage concierge inquiries" ON public.concierge_inquiries;
CREATE POLICY "Service role can manage concierge inquiries" ON public.concierge_inquiries FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 5. email_tracking_events
DROP POLICY IF EXISTS "Service role can insert tracking events" ON public.email_tracking_events;
CREATE POLICY "Service role can insert tracking events" ON public.email_tracking_events FOR INSERT TO service_role WITH CHECK (true);

-- 6. facility_interactions
DROP POLICY IF EXISTS "Service role can update interactions" ON public.facility_interactions;
DROP POLICY IF EXISTS "Service role can insert interactions" ON public.facility_interactions;
CREATE POLICY "Service role can update interactions" ON public.facility_interactions FOR UPDATE TO service_role USING (true);
CREATE POLICY "Service role can insert interactions" ON public.facility_interactions FOR INSERT TO service_role WITH CHECK (true);

-- 7. facility_views
DROP POLICY IF EXISTS "Service role can insert views" ON public.facility_views;
DROP POLICY IF EXISTS "Service role can update views" ON public.facility_views;
CREATE POLICY "Service role can insert views" ON public.facility_views FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "Service role can update views" ON public.facility_views FOR UPDATE TO service_role USING (true);

-- 8. featured_placement_analytics
DROP POLICY IF EXISTS "Service role can update featured analytics" ON public.featured_placement_analytics;
DROP POLICY IF EXISTS "Service role can insert featured analytics" ON public.featured_placement_analytics;
CREATE POLICY "Service role can update featured analytics" ON public.featured_placement_analytics FOR UPDATE TO service_role USING (true);
CREATE POLICY "Service role can insert featured analytics" ON public.featured_placement_analytics FOR INSERT TO service_role WITH CHECK (true);

-- 9. international_payments
DROP POLICY IF EXISTS "Service role can manage international payments" ON public.international_payments;
CREATE POLICY "Service role can manage international payments" ON public.international_payments FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 10. phone_verification_codes
DROP POLICY IF EXISTS "Service role can manage phone verification codes" ON public.phone_verification_codes;
CREATE POLICY "Service role can manage phone verification codes" ON public.phone_verification_codes FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 11. placement_agreements
DROP POLICY IF EXISTS "Service role can manage agreements" ON public.placement_agreements;
CREATE POLICY "Service role can manage agreements" ON public.placement_agreements FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 12. placement_case_documents
DROP POLICY IF EXISTS "Service role can manage documents" ON public.placement_case_documents;
CREATE POLICY "Service role can manage documents" ON public.placement_case_documents FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 13. placement_case_messages
DROP POLICY IF EXISTS "Service role can manage messages" ON public.placement_case_messages;
CREATE POLICY "Service role can manage messages" ON public.placement_case_messages FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 14. placement_case_providers
DROP POLICY IF EXISTS "Service role can manage introductions" ON public.placement_case_providers;
CREATE POLICY "Service role can manage introductions" ON public.placement_case_providers FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 15. placement_cases
DROP POLICY IF EXISTS "Service role can manage cases" ON public.placement_cases;
CREATE POLICY "Service role can manage cases" ON public.placement_cases FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 16. placement_invoices
DROP POLICY IF EXISTS "Service role can manage invoices" ON public.placement_invoices;
CREATE POLICY "Service role can manage invoices" ON public.placement_invoices FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 17. pro_subscriptions
DROP POLICY IF EXISTS "Service role can manage pro subscriptions" ON public.pro_subscriptions;
CREATE POLICY "Service role can manage pro subscriptions" ON public.pro_subscriptions FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 18. provider_credits
DROP POLICY IF EXISTS "Service role can manage credits" ON public.provider_credits;
CREATE POLICY "Service role can manage credits" ON public.provider_credits FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 19. reply_email_verification_codes
DROP POLICY IF EXISTS "Service role can insert reply verification codes" ON public.reply_email_verification_codes;
DROP POLICY IF EXISTS "Service role can update reply verification codes" ON public.reply_email_verification_codes;
DROP POLICY IF EXISTS "Service role can delete reply verification codes" ON public.reply_email_verification_codes;
DROP POLICY IF EXISTS "Service role can select reply verification codes" ON public.reply_email_verification_codes;
CREATE POLICY "Service role can select reply verification codes" ON public.reply_email_verification_codes FOR SELECT TO service_role USING (true);
CREATE POLICY "Service role can insert reply verification codes" ON public.reply_email_verification_codes FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "Service role can update reply verification codes" ON public.reply_email_verification_codes FOR UPDATE TO service_role USING (true);
CREATE POLICY "Service role can delete reply verification codes" ON public.reply_email_verification_codes FOR DELETE TO service_role USING (true);

-- 20. seeker_notifications
DROP POLICY IF EXISTS "Service role can insert notifications" ON public.seeker_notifications;
CREATE POLICY "Service role can insert notifications" ON public.seeker_notifications FOR INSERT TO service_role WITH CHECK (true);

-- 21. subscription_alerts
DROP POLICY IF EXISTS "Service role can manage alerts" ON public.subscription_alerts;
CREATE POLICY "Service role can manage alerts" ON public.subscription_alerts FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 22. subscription_events
DROP POLICY IF EXISTS "Service role can insert subscription events" ON public.subscription_events;
CREATE POLICY "Service role can insert subscription events" ON public.subscription_events FOR INSERT TO service_role WITH CHECK (true);

-- 23. user_sessions
DROP POLICY IF EXISTS "Service role can insert sessions" ON public.user_sessions;
CREATE POLICY "Service role can insert sessions" ON public.user_sessions FOR INSERT TO service_role WITH CHECK (true);