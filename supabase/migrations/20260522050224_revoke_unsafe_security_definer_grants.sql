-- Revoke EXECUTE on SECURITY DEFINER functions that should never be
-- reachable via PostgREST /rest/v1/rpc/<name> from anon or authenticated.
--
-- Why: Supabase advisor lint `function_in_public_security_definer` fires for
-- every function in the public schema that is SECURITY DEFINER AND has EXECUTE
-- granted to anon or authenticated.  These grants were inherited from the
-- default Postgres USAGE grant on the public schema; they were never intended.
--
-- Buckets (see docs/security-definer-inventory.md for full classification):
--   CRON-ONLY   — called only by pg_cron / postgres role.
--                 Revoke anon + authenticated.
--   TRIGGER-ONLY — called only by trigger bodies.
--                  Revoke anon (authenticated not granted).
--   HELPER       — internal helpers used inside other functions / RLS.
--                  Revoke anon; keep authenticated (needed by RLS policies).
--   USER-SAFE RPC — intentional REST endpoints for logged-in users only.
--                   Revoke anon; keep authenticated.
--
-- PUBLIC functions (assess_login_risk, check_rate_limit, etc.) are unchanged.

-- ────────────────────────────────────────────────────────────────────────────
-- 1. CRON-ONLY — revoke anon + authenticated
-- ────────────────────────────────────────────────────────────────────────────

REVOKE EXECUTE ON FUNCTION public.send_subscription_renewal_reminders() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_dunning_state() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.regenerate_facility_descriptions_canonical() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.backfill_samhsa_descriptions() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.backfill_samhsa_enrichment() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_renewal_reminder_setup() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enqueue_renewal_reminder(uuid, text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_can_manage_invoices(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_force_concierge_status(uuid, text, text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.verify_leads_provider_view_rls() FROM anon, authenticated;

-- ────────────────────────────────────────────────────────────────────────────
-- 2. TRIGGER-ONLY — revoke anon (trigger bodies run as table owner / postgres)
-- ────────────────────────────────────────────────────────────────────────────

REVOKE EXECUTE ON FUNCTION public.enforce_concierge_geo_cap() FROM anon;
REVOKE EXECUTE ON FUNCTION public.enforce_facility_plan_photo_cap() FROM anon;
REVOKE EXECUTE ON FUNCTION public.enforce_featured_placement_cap() FROM anon;
REVOKE EXECUTE ON FUNCTION public.enforce_onboarding_state_completion_requires_plan() FROM anon;
REVOKE EXECUTE ON FUNCTION public.enforce_profile_sensitive_column_guard() FROM anon;
REVOKE EXECUTE ON FUNCTION public.enqueue_onboarding_email_sequence() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_introduction_decline() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_provider() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_review_dispute_flag() FROM anon;
REVOKE EXECUTE ON FUNCTION public.notify_addon_waitlist_on_concierge_free() FROM anon;
REVOKE EXECUTE ON FUNCTION public.notify_addon_waitlist_on_featured_free() FROM anon;
REVOKE EXECUTE ON FUNCTION public.notify_admins_on_escalation_insert() FROM anon;
REVOKE EXECUTE ON FUNCTION public.touch_insurance_verification_updated_at() FROM anon;

-- ────────────────────────────────────────────────────────────────────────────
-- 3. HELPER — revoke anon; authenticated kept for RLS and internal callers
-- ────────────────────────────────────────────────────────────────────────────

REVOKE EXECUTE ON FUNCTION public.can_access_lead(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.can_moderate_users(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.check_lead_access(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.current_auth_uid() FROM anon;
REVOKE EXECUTE ON FUNCTION public.current_user_email() FROM anon;
REVOKE EXECUTE ON FUNCTION public.generate_facility_slug() FROM anon;
REVOKE EXECUTE ON FUNCTION public.generate_facility_slug(text, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_admin_role(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_waitlist_demand_summary(integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_admin_permission(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_admin_role(uuid, admin_role_type) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_admin_session_active(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_email_admin(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_email_provider(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_email_seeker(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_super_admin(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.provider_has_introduction(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.user_has_provider_profile(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.user_has_seeker_profile(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.user_is_admin(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.user_owns_facility(uuid, uuid) FROM anon;

-- ────────────────────────────────────────────────────────────────────────────
-- 4. USER-SAFE RPC — revoke anon; authenticated kept for legitimate callers
-- ────────────────────────────────────────────────────────────────────────────

REVOKE EXECUTE ON FUNCTION public.complete_provider_onboarding() FROM anon;
REVOKE EXECUTE ON FUNCTION public.complete_provider_onboarding_with_plan(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_addon_waitlist_position(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_provider_engagement_summary(uuid[], timestamptz, timestamptz) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_provider_facility_placements(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_seeker_lead_detail(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.log_account_activity(text, text, jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.search_provider_facilities(text, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.seeker_confirm_placement(uuid, uuid) FROM anon;
