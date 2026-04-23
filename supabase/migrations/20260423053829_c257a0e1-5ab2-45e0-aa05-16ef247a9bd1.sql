-- ============================================================
-- 1. purge_provider_data: comprehensive provider deletion
-- ============================================================
CREATE OR REPLACE FUNCTION public.purge_provider_data(
  p_facility_id uuid,
  p_delete_user boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_other_facilities int;
  v_user_email text;
  v_lead_ids uuid[];
  v_review_ids uuid[];
  v_inquiry_ids uuid[];
  v_result jsonb;
BEGIN
  -- Resolve owner
  SELECT user_id INTO v_user_id
  FROM public.facilities
  WHERE id = p_facility_id;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Facility % not found', p_facility_id;
  END IF;

  SELECT email::text INTO v_user_email FROM auth.users WHERE id = v_user_id;

  -- Collect dependent IDs
  SELECT array_agg(id) INTO v_lead_ids FROM public.leads WHERE facility_id = p_facility_id;
  SELECT array_agg(id) INTO v_review_ids FROM public.facility_reviews WHERE facility_id = p_facility_id;
  SELECT array_agg(id) INTO v_inquiry_ids FROM public.concierge_inquiries WHERE placed_facility_id = p_facility_id;

  -- Lead-related cleanup
  IF v_lead_ids IS NOT NULL THEN
    DELETE FROM public.lead_notes WHERE lead_id = ANY(v_lead_ids);
    DELETE FROM public.lead_emails WHERE lead_id = ANY(v_lead_ids);
    DELETE FROM public.lead_unlocks WHERE lead_id = ANY(v_lead_ids);
    DELETE FROM public.lead_distributions WHERE lead_id = ANY(v_lead_ids);
    DELETE FROM public.lead_routing_logs WHERE lead_id = ANY(v_lead_ids);
  END IF;

  -- Review cleanup
  IF v_review_ids IS NOT NULL THEN
    DELETE FROM public.review_helpful_votes WHERE review_id = ANY(v_review_ids);
    DELETE FROM public.review_responses WHERE review_id = ANY(v_review_ids);
    DELETE FROM public.review_disputes WHERE review_id = ANY(v_review_ids);
  END IF;

  -- Concierge inquiry cleanup (don't delete the inquiry itself; just unlink the placement)
  IF v_inquiry_ids IS NOT NULL THEN
    UPDATE public.concierge_inquiries
       SET placed_facility_id = NULL,
           placement_confirmed = false,
           placement_confirmed_at = NULL
     WHERE id = ANY(v_inquiry_ids);
  END IF;

  -- Concierge engagements / introductions / threads / tour requests / rejections
  DELETE FROM public.concierge_engagements WHERE facility_id = p_facility_id;
  DELETE FROM public.concierge_introductions WHERE facility_id = p_facility_id;
  DELETE FROM public.concierge_tour_requests WHERE facility_id = p_facility_id;
  DELETE FROM public.concierge_threads WHERE facility_id = p_facility_id;
  DELETE FROM public.concierge_rejected_facilities WHERE facility_id = p_facility_id;

  -- Placement system
  DELETE FROM public.placement_case_providers WHERE facility_id = p_facility_id;
  DELETE FROM public.placement_invoices WHERE facility_id = p_facility_id;
  DELETE FROM public.placement_fee_events WHERE facility_id = p_facility_id;
  DELETE FROM public.placement_agreements WHERE facility_id = p_facility_id;

  -- Pro / credits / payment methods
  DELETE FROM public.pro_subscriptions WHERE facility_id = p_facility_id OR provider_id = v_user_id;
  DELETE FROM public.provider_payment_methods WHERE facility_id = p_facility_id;
  DELETE FROM public.credit_transactions WHERE facility_id = p_facility_id OR provider_id = v_user_id;
  -- Keep provider_credits balance row keyed on provider_id; will be removed only when user is deleted
  IF p_delete_user THEN
    DELETE FROM public.provider_credits WHERE provider_id = v_user_id;
  END IF;

  -- Facility-side cleanup
  DELETE FROM public.facility_staff WHERE facility_id = p_facility_id;
  DELETE FROM public.leads WHERE facility_id = p_facility_id;
  DELETE FROM public.facility_views WHERE facility_id = p_facility_id;
  DELETE FROM public.facility_interactions WHERE facility_id = p_facility_id;
  DELETE FROM public.facility_services WHERE facility_id = p_facility_id;
  DELETE FROM public.facility_insurance WHERE facility_id = p_facility_id;
  DELETE FROM public.facility_age_groups WHERE facility_id = p_facility_id;
  DELETE FROM public.facility_credentials WHERE facility_id = p_facility_id;
  DELETE FROM public.facility_accreditations WHERE facility_id = p_facility_id;
  DELETE FROM public.facility_credential_documents WHERE facility_id = p_facility_id;
  DELETE FROM public.facility_reviews WHERE facility_id = p_facility_id;
  DELETE FROM public.facility_pending_changes WHERE facility_id = p_facility_id;
  DELETE FROM public.provider_events WHERE facility_id = p_facility_id;
  DELETE FROM public.provider_notifications WHERE facility_id = p_facility_id;
  DELETE FROM public.featured_placement_analytics WHERE facility_id = p_facility_id;
  DELETE FROM public.flagged_images WHERE facility_id = p_facility_id;
  DELETE FROM public.reply_email_verification_codes WHERE facility_id = p_facility_id;
  DELETE FROM public.request_help_analytics WHERE facility_id = p_facility_id;
  DELETE FROM public.user_favorites WHERE facility_id = p_facility_id;
  DELETE FROM public.badge_impressions WHERE facility_id = p_facility_id;
  DELETE FROM public.lead_routing_logs WHERE assigned_provider_id = p_facility_id OR requested_facility_id = p_facility_id;

  -- Finally delete the facility
  DELETE FROM public.facilities WHERE id = p_facility_id;

  -- Optionally purge user account if no other facilities remain
  IF p_delete_user THEN
    SELECT COUNT(*) INTO v_other_facilities FROM public.facilities WHERE user_id = v_user_id;
    IF v_other_facilities = 0 THEN
      DELETE FROM public.profiles WHERE user_id = v_user_id;
      DELETE FROM public.notification_preferences WHERE user_id = v_user_id;
      DELETE FROM public.user_roles WHERE user_id = v_user_id;
      DELETE FROM public.user_sessions WHERE user_id = v_user_id;
      DELETE FROM public.account_activity_log WHERE user_id = v_user_id;
      DELETE FROM public.subscription_alerts WHERE user_id = v_user_id;
      DELETE FROM public.subscription_events WHERE user_id = v_user_id;
      IF v_user_email IS NOT NULL THEN
        DELETE FROM public.email_verification_codes WHERE email = LOWER(v_user_email);
      END IF;
    END IF;
  END IF;

  v_result := jsonb_build_object(
    'facility_id', p_facility_id,
    'user_id', v_user_id,
    'user_email', v_user_email,
    'leads_deleted', COALESCE(array_length(v_lead_ids, 1), 0),
    'reviews_deleted', COALESCE(array_length(v_review_ids, 1), 0),
    'inquiries_unlinked', COALESCE(array_length(v_inquiry_ids, 1), 0),
    'user_eligible_for_deletion', p_delete_user AND COALESCE(v_other_facilities, 0) = 0
  );

  RETURN v_result;
END;
$$;

-- ============================================================
-- 2. admin_user_notifications & admin_notifications: tighten role
-- ============================================================
DROP POLICY IF EXISTS "Users can view their own admin notifications" ON public.admin_user_notifications;
DROP POLICY IF EXISTS "Users can update their own admin notifications" ON public.admin_user_notifications;
DROP POLICY IF EXISTS "Users can delete their own admin notifications" ON public.admin_user_notifications;
CREATE POLICY "Users can view their own admin notifications"
  ON public.admin_user_notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own admin notifications"
  ON public.admin_user_notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own admin notifications"
  ON public.admin_user_notifications FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all admin notifications" ON public.admin_notifications;
DROP POLICY IF EXISTS "Admins can update admin notifications" ON public.admin_notifications;
DROP POLICY IF EXISTS "Admins can delete admin notifications" ON public.admin_notifications;
CREATE POLICY "Admins can view all admin notifications"
  ON public.admin_notifications FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update admin notifications"
  ON public.admin_notifications FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete admin notifications"
  ON public.admin_notifications FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- ============================================================
-- 3. admin_audit_log: dedupe + append-only enforcement
-- ============================================================
DROP POLICY IF EXISTS "Admins can view audit log" ON public.admin_audit_log;
-- "Admins can view audit logs" already exists; keep that as the canonical SELECT policy.

-- Trigger to block UPDATE / DELETE for non-service-role contexts
CREATE OR REPLACE FUNCTION public.prevent_audit_log_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_setting('role', true) = 'service_role' OR auth.role() = 'service_role' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  RAISE EXCEPTION 'admin_audit_log entries are append-only and cannot be modified';
END;
$$;

DROP TRIGGER IF EXISTS prevent_audit_log_update ON public.admin_audit_log;
CREATE TRIGGER prevent_audit_log_update
  BEFORE UPDATE OR DELETE ON public.admin_audit_log
  FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_log_mutation();

-- ============================================================
-- 4. admin_impersonation_log: auto-expire stale sessions (60 min cap)
-- ============================================================
CREATE OR REPLACE FUNCTION public.auto_expire_impersonation_sessions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.admin_impersonation_log
     SET ended_at = now()
   WHERE ended_at IS NULL
     AND started_at < now() - interval '60 minutes';
  RETURN NULL; -- AFTER trigger
END;
$$;

DROP TRIGGER IF EXISTS auto_expire_impersonation_trg ON public.admin_impersonation_log;
CREATE TRIGGER auto_expire_impersonation_trg
  AFTER INSERT ON public.admin_impersonation_log
  FOR EACH STATEMENT EXECUTE FUNCTION public.auto_expire_impersonation_sessions();

-- ============================================================
-- 5. placement_invoices: dedupe policies + status guard
-- ============================================================
DROP POLICY IF EXISTS "Admins can manage all invoices" ON public.placement_invoices;
DROP POLICY IF EXISTS "Service role manages invoices" ON public.placement_invoices;
DROP POLICY IF EXISTS "Providers can view invoices for their facilities" ON public.placement_invoices;

CREATE POLICY "Admins can manage all invoices"
  ON public.placement_invoices FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Status transition guard
CREATE OR REPLACE FUNCTION public.validate_invoice_status_transition()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Terminal states cannot be transitioned away from
  IF OLD.status IN ('paid', 'refunded', 'waived') THEN
    RAISE EXCEPTION 'Invoice in terminal status % cannot be changed (attempted -> %)', OLD.status, NEW.status;
  END IF;

  -- Allowed transitions
  IF NEW.status NOT IN ('pending', 'sent', 'paid', 'overdue', 'failed', 'waived', 'refunded', 'delinquent') THEN
    RAISE EXCEPTION 'Invalid invoice status: %', NEW.status;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_invoice_status_transition_trg ON public.placement_invoices;
CREATE TRIGGER validate_invoice_status_transition_trg
  BEFORE UPDATE ON public.placement_invoices
  FOR EACH ROW EXECUTE FUNCTION public.validate_invoice_status_transition();

-- ============================================================
-- 6. request_help_analytics & badge_impressions: tighten public INSERT
-- ============================================================
DROP POLICY IF EXISTS "Anyone can insert analytics events" ON public.request_help_analytics;
CREATE POLICY "Public can insert analytics events"
  ON public.request_help_analytics FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public inserts for badge tracking" ON public.badge_impressions;
CREATE POLICY "Public can insert badge impressions"
  ON public.badge_impressions FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- ============================================================
-- 7. admin_can_manage_invoices helper
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_can_manage_invoices(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_user_profiles
    WHERE user_id = _user_id
      AND status = 'active'
      AND admin_role IN ('super_admin', 'manager')
  ) AND public.has_role(_user_id, 'admin');
$$;