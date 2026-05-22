# Security DEFINER Function Inventory

**Date:** 2026-05-22  
**Project:** `mldbxpntzcjalgjmwnqa` (production)  
**Scope:** All `public` schema functions that are SECURITY DEFINER and callable via REST (`/rest/v1/rpc/<name>`) by `anon` or `authenticated` roles.

## Summary

| Bucket | Count | Action |
|--------|-------|--------|
| CRON-ONLY | 10 | REVOKE anon + authenticated |
| TRIGGER-ONLY | 13 | REVOKE anon (auth already denied by trigger context) |
| HELPER | 22 | REVOKE anon, keep authenticated |
| USER-SAFE RPC | 9 | REVOKE anon, keep authenticated, audit caller check |
| PUBLIC | 10 | No change — intentionally public |
| **Total** | **64** | |

---

## Bucket 1: CRON-ONLY

Called exclusively by pg_cron jobs via `postgres` role. Neither `anon` nor `authenticated` should be able to invoke these via REST.

**Migration:** `revoke_unsafe_security_definer_grants` — revokes EXECUTE from both `anon` and `authenticated`.

| Function | Purpose |
|----------|---------|
| `send_subscription_renewal_reminders` | Email renewal notices — cron job |
| `sync_dunning_state` | Payment dunning sync — cron job |
| `regenerate_facility_descriptions_canonical` | AI description backfill — cron job |
| `backfill_samhsa_descriptions` | SAMHSA data backfill — cron job |
| `backfill_samhsa_enrichment` | SAMHSA enrichment — cron job |
| `check_renewal_reminder_setup` | Renewal reminder health check — cron job |
| `enqueue_renewal_reminder` | Renewal reminder queue — cron job |
| `admin_can_manage_invoices` | Admin invoice management — admin-only operation |
| `admin_force_concierge_status` | Force concierge status — admin-only operation |
| `verify_leads_provider_view_rls` | RLS verification utility — admin/dev tool |

---

## Bucket 2: TRIGGER-ONLY

Called only from trigger bodies. `authenticated` grant was never needed; `anon` grant is removed as a precaution. These do not generate REST WARN lints (trigger functions are not callable via `rpc/`) but are included for completeness.

| Function | Trigger table |
|----------|--------------|
| `enforce_concierge_geo_cap` | `concierge_addons` |
| `enforce_facility_plan_photo_cap` | `facility_photos` |
| `enforce_featured_placement_cap` | `featured_addons` |
| `enforce_onboarding_state_completion_requires_plan` | `provider_onboarding_state` |
| `enforce_profile_sensitive_column_guard` | `profiles` |
| `enqueue_onboarding_email_sequence` | `provider_onboarding_state` |
| `handle_introduction_decline` | `provider_introductions` |
| `handle_new_provider` | `profiles` |
| `handle_review_dispute_flag` | `reviews` |
| `notify_addon_waitlist_on_concierge_free` | `concierge_addons` |
| `notify_addon_waitlist_on_featured_free` | `featured_addons` |
| `notify_admins_on_escalation_insert` | `escalations` |
| `touch_insurance_verification_updated_at` | `insurance_verifications` |

---

## Bucket 3: HELPER

Internal PL/pgSQL helpers used inside other functions or RLS policies. Must remain callable by `authenticated` (used in RLS USING clauses and other SECURITY DEFINER functions). `anon` grant removed.

| Function | Used by |
|----------|---------|
| `can_access_lead` | Lead access RLS |
| `can_moderate_users` | Admin moderation RLS |
| `check_lead_access` | Lead detail RPC |
| `current_auth_uid` | Various RLS policies |
| `current_user_email` | Various RLS policies |
| `generate_facility_slug` | Facility creation trigger |
| `get_admin_role` | Admin shell |
| `get_waitlist_demand_summary` | Admin waitlist view |
| `has_admin_permission` | Admin RLS |
| `has_admin_role` | Admin RLS |
| `has_role` | Role-based RLS |
| `is_admin` | Admin RLS |
| `is_admin_session_active` | Admin session check |
| `is_email_admin` | Auth helpers |
| `is_email_provider` | Auth helpers |
| `is_email_seeker` | Auth helpers |
| `is_super_admin` | Super-admin RLS |
| `provider_has_introduction` | Introduction RLS |
| `user_has_provider_profile` | Profile RLS |
| `user_has_seeker_profile` | Profile RLS |
| `user_is_admin` | Admin RLS |
| `user_owns_facility` | Facility ownership RLS |

---

## Bucket 4: USER-SAFE RPC

Callable by authenticated users via `/rest/v1/rpc/<name>`. Each must contain an explicit `auth.uid()` caller check; `anon` grant removed.

| Function | Caller check present | Notes |
|----------|---------------------|-------|
| `complete_provider_onboarding` | Yes | Checks `auth.uid()` matches provider profile |
| `complete_provider_onboarding_with_plan` | Yes | Checks `auth.uid()` matches provider profile |
| `get_addon_waitlist_position` | Yes | Returns data for `auth.uid()` |
| `get_provider_engagement_summary` | Yes | Checks facility ownership via `user_owns_facility()` |
| `get_provider_facility_placements` | Yes | Checks facility ownership via `user_owns_facility()` |
| `get_seeker_lead_detail` | Yes | Checks `auth.uid()` matches seeker on lead |
| `log_account_activity` | Yes | Logs for `auth.uid()` only |
| `search_provider_facilities` | No (data non-sensitive) | Returns only public approved facilities; no ownership filter needed |
| `seeker_confirm_placement` | Yes | Checks `auth.uid()` matches seeker on placement |

---

## Bucket 5: PUBLIC

Intentionally callable by anonymous and authenticated users. These serve unauthenticated public pages (facility listings, rate limiting, availability checks).

| Function | Reason for public access |
|----------|-------------------------|
| `assess_login_risk` | Pre-auth risk check |
| `check_rate_limit` | Rate limiting for public endpoints |
| `get_concierge_availability` | Public availability display |
| `get_inquiry_advisor_public_info` | Public advisor profiles |
| `get_placement_availability` | Public placement display |
| `get_public_facility_data` | Public facility pages |
| `has_active_pro` | Subscription badge on public listings |
| `is_approved_facility` | Used in public RLS policies |
| `is_email_verified` | Pre-auth email checks |
| `is_identifier_blocked` | Pre-auth block check |

---

## Additional USER-SAFE RPC Functions (discovered during audit)

These were not in the original inventory but appeared in the `authenticated_security_definer_function_executable` lint results. All have proper `auth.uid()` caller checks. `anon` access already absent (no PUBLIC grant). Authenticated access intentional.

| Function | Purpose |
|----------|---------|
| `complete_admin_mfa_setup(uuid)` | Admin MFA — admin caller check inside |
| `complete_admin_password_setup(uuid)` | Admin password setup — admin caller check inside |
| `get_admin_dashboard_stats()` | Admin dashboard data — admin check inside |
| `get_admin_profile(uuid)` | Admin profile read — admin check inside |
| `get_admin_users_list()` | Admin user list — admin check inside |
| `get_facility_leads_count(uuid)` | Provider lead count — ownership check inside |
| `get_owner_facility_data(uuid)` | Provider facility data — ownership check inside |
| `get_pending_leads_count(uuid)` | Provider pending leads — caller check inside |
| `get_pro_discount(uuid)` | Pro subscription discount — caller check inside |
| `get_provider_safe_inquiries(uuid)` | Provider inquiries — ownership check inside |
| `get_seeker_lead_notes(uuid)` | Seeker lead notes — ownership check inside |
| `get_seeker_submitted_leads()` | Seeker lead history — filters by auth.uid() |
| `get_user_sessions_safe(uuid)` | Session audit — admin/self check inside |
| `register_trusted_device(uuid, text, text, text, text)` | Device trust — caller check inside |
| `touch_admin_activity(uuid)` | Admin activity log — admin check inside |
| `try_acquire_auto_reload_lock(uuid)` | Provider auto-reload — ownership check inside |

---

## Migrations Applied

**Migration 1** — `supabase/migrations/20260522050224_revoke_unsafe_security_definer_grants.sql`  
Initial attempt: `REVOKE EXECUTE FROM anon, authenticated` on CRON-ONLY, `FROM anon` on others.  
**Result:** No change — Postgres grants EXECUTE to `PUBLIC` by default; revoking from individual roles while PUBLIC grant exists is a no-op.

**Migration 2** — `supabase/migrations/20260522052200_revoke_public_execute_security_definer.sql`  
Correct fix: `REVOKE EXECUTE FROM PUBLIC` on all non-PUBLIC-bucket functions. Also `REVOKE FROM authenticated` on TRIGGER-ONLY functions (which had explicit `authenticated=X` grants).

---

## Actual Results

| Metric | Before | After |
|--------|--------|-------|
| Total WARN lints | 144 | 67 |
| `anon_security_definer_function_executable` | 54 | 10 |
| `authenticated_security_definer_function_executable` | 90 | 57 |
| Reduction | — | **53.5%** |
| ERROR lints | 2 | 0 |

### Remaining lints (67) — all accepted

**Anon (10):** All PUBLIC bucket — `assess_login_risk`, `check_rate_limit`, `get_concierge_availability`, `get_inquiry_advisor_public_info`, `get_placement_availability`, `get_public_facility_data`, `has_active_pro`, `is_approved_facility`, `is_email_verified`, `is_identifier_blocked`. These serve unauthenticated public pages and cannot be restricted.

**Authenticated (57):** All in categories where `authenticated` access is required:
- **PUBLIC bucket (10):** Same functions as above — also lint for `authenticated` since authenticated inherits PUBLIC grants.
- **HELPER (21):** Called from RLS policy bodies — PostgreSQL evaluates RLS in the caller's security context, so `authenticated` must have EXECUTE or RLS queries fail.
- **USER-SAFE RPC + admin RPC (26):** Legitimate client-callable endpoints for logged-in users.

### Path to further reduction

To eliminate the 57 authenticated lints would require moving all HELPER functions to an `internal` schema not exposed by PostgREST. In that schema, `authenticated` can hold EXECUTE (the advisor only lints `public` schema) and RLS policies can reference them via `internal.func_name()`. This is a substantial refactor estimated at 2-3 days.
