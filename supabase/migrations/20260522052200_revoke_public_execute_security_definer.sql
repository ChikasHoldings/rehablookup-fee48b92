-- Correct approach: REVOKE FROM PUBLIC (not from individual roles).
--
-- PostgreSQL grants EXECUTE to PUBLIC by default for new functions.
-- anon and authenticated inherit from PUBLIC, so REVOKE FROM anon/authenticated
-- alone is a no-op as long as the PUBLIC grant remains.
--
-- Strategy:
--   CRON-ONLY   — REVOKE FROM PUBLIC (removes both anon+authenticated inherited access)
--   TRIGGER-ONLY — REVOKE FROM PUBLIC + FROM authenticated
--                  (trigger fns also had explicit authenticated=X grants from earlier migrations)
--   HELPER       — REVOKE FROM PUBLIC only
--                  (authenticated keeps its explicit grant — needed for RLS policies)
--   USER-SAFE RPC — REVOKE FROM PUBLIC only
--                   (authenticated keeps its explicit grant — needed for REST API)
--
-- Functions already clean (no PUBLIC grant, correct ACL):
--   complete_provider_onboarding, complete_provider_onboarding_with_plan,
--   current_user_email, generate_facility_slug(text,text,text),
--   get_addon_waitlist_position, get_waitlist_demand_summary, is_admin,
--   log_account_activity, search_provider_facilities, verify_leads_provider_view_rls

-- ────────────────────────────────────────────────────────────────────────────
-- 1. CRON-ONLY — revoke PUBLIC (no authenticated re-grant needed)
-- ────────────────────────────────────────────────────────────────────────────

REVOKE EXECUTE ON FUNCTION public.send_subscription_renewal_reminders() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.sync_dunning_state() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.regenerate_facility_descriptions_canonical() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.backfill_samhsa_descriptions() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.backfill_samhsa_enrichment() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.check_renewal_reminder_setup() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.enqueue_renewal_reminder(uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_can_manage_invoices(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_force_concierge_status(uuid, text, text) FROM PUBLIC;

-- ────────────────────────────────────────────────────────────────────────────
-- 2. TRIGGER-ONLY — revoke PUBLIC + authenticated
--    (trigger bodies execute as the table owner, never as the calling session)
-- ────────────────────────────────────────────────────────────────────────────

REVOKE EXECUTE ON FUNCTION public.enforce_concierge_geo_cap() FROM PUBLIC, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_facility_plan_photo_cap() FROM PUBLIC, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_featured_placement_cap() FROM PUBLIC, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_onboarding_state_completion_requires_plan() FROM PUBLIC, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_profile_sensitive_column_guard() FROM PUBLIC, authenticated;
REVOKE EXECUTE ON FUNCTION public.enqueue_onboarding_email_sequence() FROM PUBLIC, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_introduction_decline() FROM PUBLIC, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_provider() FROM PUBLIC, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_review_dispute_flag() FROM PUBLIC, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_addon_waitlist_on_concierge_free() FROM PUBLIC, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_addon_waitlist_on_featured_free() FROM PUBLIC, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_admins_on_escalation_insert() FROM PUBLIC, authenticated;
REVOKE EXECUTE ON FUNCTION public.touch_insurance_verification_updated_at() FROM PUBLIC, authenticated;

-- ────────────────────────────────────────────────────────────────────────────
-- 3. HELPER — revoke PUBLIC; authenticated keeps its explicit grant (RLS)
-- ────────────────────────────────────────────────────────────────────────────

REVOKE EXECUTE ON FUNCTION public.can_access_lead(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.can_moderate_users(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.check_lead_access(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.current_auth_uid() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.generate_facility_slug() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_admin_role(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_admin_permission(uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_admin_role(uuid, admin_role_type) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_admin_session_active(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_email_admin(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_email_provider(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_email_seeker(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_super_admin(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.provider_has_introduction(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.user_has_provider_profile(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.user_has_seeker_profile(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.user_is_admin(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.user_owns_facility(uuid, uuid) FROM PUBLIC;

-- ────────────────────────────────────────────────────────────────────────────
-- 4. USER-SAFE RPC — revoke PUBLIC; authenticated keeps its explicit grant
-- ────────────────────────────────────────────────────────────────────────────

REVOKE EXECUTE ON FUNCTION public.get_provider_engagement_summary(uuid[], timestamptz, timestamptz) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_provider_facility_placements(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_seeker_lead_detail(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.seeker_confirm_placement(uuid, uuid) FROM PUBLIC;
