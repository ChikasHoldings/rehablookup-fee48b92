# Unused-Index Monitor

**Date:** 2026-05-22  
**Project:** `mldbxpntzcjalgjmwnqa` (production)

## Why this exists

Supabase advisor flags 159 indexes with **zero scans** in the current
stats window. Total disk usage of all 159 is ~24 MB; the
CANDIDATE-FOR-DROP subset (78 indexes) accounts for ~17 MB of that.

**Do not drop yet.** Many of these indexes exist for features that
either:

- Haven't seen production traffic since launch.
- Back partial-index correctness for write paths (`WHERE …` predicates
  that PostgreSQL evaluates on every INSERT/UPDATE).
- Were just created today (2026-05-22) to satisfy the
  `unindexed_foreign_keys` advisor — they will earn scans as the
  associated JOINs and ON DELETE CASCADE queries run.

The intent of this doc is to **establish a baseline now** so a 30-day
post-launch comparison has something to diff against.

## Categories

| Category | Count | Total size | Action |
|----------|------:|-----------:|--------|
| `CANDIDATE-FOR-DROP` | 78 | ~17 MB | Re-evaluate after 30 days of real traffic |
| `NEW-FK-INDEX-2026-05-22` | 42 | ~0.4 MB | Added in `20260522061000_add_missing_fk_indexes`; expected to earn scans |
| `PARTIAL` | 39 | ~7 MB | Likely write-side correctness; do not drop without owner sign-off |

## Drop criteria (30-day reassessment)

After 30 days of real production traffic, re-run `get_advisors(performance)`
and drop an index **only if all** of the following are true:

1. Still has zero scans (`idx_scan = 0` in `pg_stat_user_indexes`).
2. Not a unique-constraint backing index (`pg_index.indisunique = false`).
3. Not a partial index (`pg_index.indpred IS NULL`). Partial indexes
   are commonly enforcing write-side rules (e.g.
   `WHERE deletion_purge_after IS NOT NULL`) — dropping silently
   weakens correctness.
4. Not in the `NEW-FK-INDEX-2026-05-22` set (these were created
   intentionally and need a few weeks of FK-join traffic before
   anyone can claim they're dead).
5. Drop is signed off by the feature owner — many CANDIDATE indexes
   target unreleased features (e.g. concierge, addon waitlist, blog
   article workflows).

## Drop procedure (when the time comes)

```sql
-- One per migration; CONCURRENTLY avoids ACCESS EXCLUSIVE locks.
-- Cannot run inside a transaction — apply via execute_sql (one stmt
-- per call) like the FK-index migration in 20260522061000_*.
DROP INDEX CONCURRENTLY IF EXISTS public.idx_<table>_<column>;
```

Document each drop in this file with the date, traffic-stats snapshot,
and the owner's name.

---

## Reassessment baseline (this file's snapshot)

Cross-referenced with `pg_stat_user_indexes`, `pg_class`, and
`pg_index` on 2026-05-22.

### CANDIDATE-FOR-DROP — re-evaluate after 30 days (78)

| Table | Index | Index size | Table size |
|---|---|---|---|
| `staged_directory` | `idx_staged_directory_name_trgm` | 10 MB | 106 MB |
| `staged_samhsa` | `idx_staged_samhsa_name_trgm` | 5816 kB | 35 MB |
| `not_found_events` | `not_found_events_path_idx` | 48 kB | 160 kB |
| `account_activity_log` | `idx_activity_log_created_at` | 16 kB | 24 kB |
| `admin_user_profiles` | `idx_admin_user_profiles_admin_role` | 16 kB | 8192 bytes |
| `analytics_events` | `analytics_events_created_at_idx` | 16 kB | 48 kB |
| `analytics_events` | `analytics_events_event_name_idx` | 16 kB | 48 kB |
| `badge_impressions` | `idx_badge_impressions_created_at` | 16 kB | 8192 bytes |
| `badge_impressions` | `idx_badge_impressions_referrer` | 16 kB | 8192 bytes |
| `concierge_inquiries` | `idx_concierge_inquiries_originating_facility` | 16 kB | 16 kB |
| `email_verification_codes` | `idx_verification_email_code` | 16 kB | 8192 bytes |
| `email_verification_codes` | `idx_verification_expires` | 16 kB | 8192 bytes |
| `facility_claim_requests` | `idx_claim_requests_verification_status` | 16 kB | 8192 bytes |
| `facility_views` | `idx_facility_views_date` | 16 kB | 8192 bytes |
| `lead_routing_logs` | `idx_lead_routing_logs_assigned_provider` | 16 kB | 0 bytes |
| `lead_routing_logs` | `idx_lead_routing_logs_created_at` | 16 kB | 0 bytes |
| `leads` | `idx_leads_assignment_status` | 16 kB | 8192 bytes |
| `leads` | `idx_leads_duplicate_check` | 16 kB | 8192 bytes |
| `leads` | `idx_leads_email_created` | 16 kB | 8192 bytes |
| `leads` | `idx_leads_facility_status` | 16 kB | 8192 bytes |
| `leads` | `idx_leads_ip_rate_limit` | 16 kB | 8192 bytes |
| `leads` | `idx_leads_provider_response_status` | 16 kB | 8192 bytes |
| `leads` | `idx_leads_qualified` | 16 kB | 8192 bytes |
| `leads` | `idx_leads_status_created_desc` | 16 kB | 8192 bytes |
| `marketing_leads` | `idx_marketing_leads_email` | 16 kB | 8192 bytes |
| `marketing_leads` | `idx_marketing_leads_followup` | 16 kB | 8192 bytes |
| `not_found_events` | `not_found_events_request_kind_idx` | 16 kB | 160 kB |
| `phi_access_log` | `idx_phi_access_log_occurred_at` | 16 kB | 16 kB |
| `phi_access_log` | `idx_phi_access_log_target` | 16 kB | 16 kB |
| `provider_interest` | `provider_interest_email_idx` | 16 kB | 8192 bytes |
| `provider_interest` | `provider_interest_status_idx` | 16 kB | 8192 bytes |
| `request_help_analytics` | `idx_request_help_analytics_source` | 16 kB | 72 kB |
| `review_requests` | `idx_review_requests_recipient_email` | 16 kB | 8192 bytes |
| `seeker_notifications` | `idx_seeker_notifications_created_at` | 16 kB | 8192 bytes |
| `staged_leads` | `idx_staged_leads_name_trgm` | 16 kB | 0 bytes |
| `stripe_webhook_events` | `idx_stripe_webhook_events_received_at` | 16 kB | 8192 bytes |
| `support_tickets` | `idx_support_tickets_created_at` | 16 kB | 8192 bytes |
| `support_tickets` | `idx_support_tickets_source` | 16 kB | 8192 bytes |
| `suppressed_emails` | `idx_suppressed_emails_email` | 16 kB | 8192 bytes |
| `addon_waitlist` | `addon_waitlist_concierge_lookup_idx` | 8192 bytes | 0 bytes |
| `addon_waitlist` | `addon_waitlist_featured_lookup_idx` | 8192 bytes | 0 bytes |
| `area_waitlist` | `area_waitlist_area_idx` | 8192 bytes | 0 bytes |
| `area_waitlist` | `area_waitlist_created_idx` | 8192 bytes | 0 bytes |
| `concierge_rejected_facilities` | `idx_concierge_rejected_facilities_user` | 8192 bytes | 0 bytes |
| `email_send_failures` | `idx_email_send_failures_recipient` | 8192 bytes | 0 bytes |
| `facility_credential_documents` | `idx_facility_credential_documents_status` | 8192 bytes | 0 bytes |
| `facility_pending_changes` | `idx_facility_pending_changes_provider` | 8192 bytes | 0 bytes |
| `facility_pending_changes` | `idx_facility_pending_changes_status` | 8192 bytes | 0 bytes |
| `featured_impressions` | `idx_featured_impressions_bucket_time` | 8192 bytes | 0 bytes |
| `featured_phone_clicks` | `idx_featured_phone_clicks_bucket_time` | 8192 bytes | 0 bytes |
| `insurance_verification_requests` | `idx_ivr_email_lower` | 8192 bytes | 0 bytes |
| `lead_contact_events` | `idx_lead_contact_events_provider` | 8192 bytes | 0 bytes |
| `lead_emails` | `idx_lead_emails_created_at` | 8192 bytes | 0 bytes |
| `not_found_searches` | `not_found_searches_created_at_idx` | 8192 bytes | 0 bytes |
| `not_found_searches` | `not_found_searches_event_kind_idx` | 8192 bytes | 0 bytes |
| `not_found_searches` | `not_found_searches_location_idx` | 8192 bytes | 0 bytes |
| `notification_events` | `idx_notification_events_facility` | 8192 bytes | 0 bytes |
| `notification_events` | `idx_notification_events_lead` | 8192 bytes | 0 bytes |
| `notification_events` | `idx_notification_events_stage` | 8192 bytes | 0 bytes |
| `notification_events` | `idx_notification_events_user` | 8192 bytes | 0 bytes |
| `phone_verification_codes` | `idx_phone_verification_codes_expires` | 8192 bytes | 0 bytes |
| `phone_verification_codes` | `idx_phone_verification_codes_phone` | 8192 bytes | 0 bytes |
| `pii_disclosure_log` | `idx_pii_disclosure_log_admin` | 8192 bytes | 0 bytes |
| `pii_disclosure_log` | `idx_pii_disclosure_log_disclosed_at` | 8192 bytes | 0 bytes |
| `pii_disclosure_log` | `idx_pii_disclosure_log_facility` | 8192 bytes | 0 bytes |
| `prerender_cache` | `idx_prerender_cache_cached_at` | 8192 bytes | 0 bytes |
| `prerender_cache` | `idx_prerender_cache_path` | 8192 bytes | 0 bytes |
| `provider_notifications` | `idx_provider_notifications_created_at` | 8192 bytes | 0 bytes |
| `sms_inbound_log` | `idx_sms_inbound_log_from_phone` | 8192 bytes | 0 bytes |
| `sms_inbound_log` | `idx_sms_inbound_log_received_at` | 8192 bytes | 0 bytes |
| `staged_leads` | `idx_staged_leads_batch` | 8192 bytes | 0 bytes |
| `staged_leads` | `idx_staged_leads_status` | 8192 bytes | 0 bytes |
| `subscription_events` | `idx_subscription_events_created_at` | 8192 bytes | 0 bytes |
| `subscription_events` | `idx_subscription_events_event_type` | 8192 bytes | 0 bytes |
| `subscription_events` | `idx_subscription_events_stripe_customer` | 8192 bytes | 0 bytes |
| `edge_function_call_log` | `idx_efc_log_called_at` | (new — pg_stat hasn't caught up) | |
| `edge_function_call_log` | `idx_efc_log_function_slug` | (new — pg_stat hasn't caught up) | |
| `edge_function_call_log` | `idx_efc_log_request_id` | (new — pg_stat hasn't caught up) | |

> Top single-index storage cost: `staged_directory.idx_staged_directory_name_trgm` (10 MB on a 106 MB table). If the trgm search isn't used in production, dropping it is the biggest single win.

### NEW-FK-INDEX-2026-05-22 — added today; expected to earn scans (42)

These were created by `supabase/migrations/20260522061000_add_missing_fk_indexes.sql` to clear the `unindexed_foreign_keys` advisor. They have not yet seen scans because pg_stat_user_indexes resets on index creation. Do not consider these for drop before the 30-day window — they back FK joins and ON DELETE CASCADE checks.

| Table | Index | Index size | Table size |
|---|---|---|---|
| `facility_match_clusters` | `idx_facility_match_clusters_reviewed_by` | 56 kB | 8592 kB |
| `facilities` | `idx_facilities_claim_owner_id` | 48 kB | 7824 kB |
| `facilities` | `idx_facilities_user_id` | 48 kB | 7824 kB |
| `badge_impressions` | `idx_badge_impressions_facility_id` | 16 kB | 8192 bytes |
| `facility_claim_requests` | `idx_facility_claim_requests_reviewed_by` | 16 kB | 8192 bytes |
| `facility_staff` | `idx_facility_staff_facility_id` | 16 kB | 8192 bytes |
| `facility_views` | `idx_facility_views_facility_id` | 16 kB | 8192 bytes |
| `lead_routing_logs` | `idx_lead_routing_logs_lead_id` | 16 kB | 0 bytes |
| `leads` | `idx_leads_original_facility_id` | 16 kB | 8192 bytes |
| `platform_settings` | `idx_platform_settings_updated_by` | 16 kB | 8192 bytes |
| `request_help_analytics` | `idx_request_help_analytics_facility_id` | 16 kB | 72 kB |
| `seeker_facility_alerts` | `idx_seeker_facility_alerts_facility_id` | 16 kB | 8192 bytes |
| `admin_mfa_recovery_codes` | `idx_admin_mfa_recovery_codes_user_id` | 8192 bytes | 0 bytes |
| `advisor_earnings` | `idx_advisor_earnings_inquiry_id` | 8192 bytes | 0 bytes |
| `concierge_inquiries` | `idx_concierge_inquiries_placed_facility_id` | 8192 bytes | 16 kB |
| `concierge_inquiries` | `idx_concierge_inquiries_user_id` | 8192 bytes | 16 kB |
| `concierge_introduction_audit` | `idx_concierge_introduction_audit_originating_facility_id` | 8192 bytes | 0 bytes |
| `concierge_introduction_audit` | `idx_concierge_introduction_audit_reviewed_by` | 8192 bytes | 0 bytes |
| `concierge_messages` | `idx_concierge_messages_thread_id` | 8192 bytes | 0 bytes |
| `concierge_partner_facilities` | `idx_concierge_partner_facilities_subscription_id` | 8192 bytes | 0 bytes |
| `concierge_rejected_facilities` | `idx_concierge_rejected_facilities_facility_id` | 8192 bytes | 0 bytes |
| `concierge_threads` | `idx_concierge_threads_facility_id` | 8192 bytes | 8192 bytes |
| `concierge_tour_requests` | `idx_concierge_tour_requests_facility_id` | 8192 bytes | 0 bytes |
| `concierge_tour_requests` | `idx_concierge_tour_requests_inquiry_id` | 8192 bytes | 0 bytes |
| `facility_credentials` | `idx_facility_credentials_facility_id` | 8192 bytes | 0 bytes |
| `facility_reviews` | `idx_facility_reviews_facility_id` | 8192 bytes | 8192 bytes |
| `featured_placements` | `idx_featured_placements_subscription_id` | 8192 bytes | 0 bytes |
| `insurance_verification_requests` | `idx_insurance_verification_requests_linked_user_id` | 8192 bytes | 0 bytes |
| `insurance_verification_requests` | `idx_insurance_verification_requests_verified_by` | 8192 bytes | 0 bytes |
| `lead_notes` | `idx_lead_notes_lead_id` | 8192 bytes | 0 bytes |
| `lead_routing_logs` | `idx_lead_routing_logs_requested_facility_id` | 8192 bytes | 0 bytes |
| `provider_notifications` | `idx_provider_notifications_facility_id` | 8192 bytes | 0 bytes |
| `provider_notifications` | `idx_provider_notifications_user_id` | 8192 bytes | 0 bytes |
| `provider_onboarding_drip` | `idx_provider_onboarding_drip_facility_id` | 8192 bytes | 0 bytes |
| `provider_onboarding_state` | `idx_provider_onboarding_state_selected_facility_id` | 8192 bytes | 8192 bytes |
| `review_disputes` | `idx_review_disputes_facility_id` | 8192 bytes | 8192 bytes |
| `review_helpful_votes` | `idx_review_helpful_votes_user_id` | 8192 bytes | 8192 bytes |
| `review_responses` | `idx_review_responses_facility_id` | 8192 bytes | 8192 bytes |
| `subscription_cancellations` | `idx_subscription_cancellations_canceled_by` | 8192 bytes | 0 bytes |
| `subscription_events` | `idx_subscription_events_user_id` | 8192 bytes | 0 bytes |
| `user_compare_list` | `idx_user_compare_list_facility_id` | 8192 bytes | 0 bytes |
| `user_favorites` | `idx_user_favorites_facility_id` | 8192 bytes | 8192 bytes |

### PARTIAL — likely write-side correctness; do not drop without owner sign-off (39)

| Table | Index | Index size | Table size |
|---|---|---|---|
| `staged_directory` | `idx_staged_directory_phone` | 1608 kB | 106 MB |
| `facilities` | `idx_facilities_name_trgm` | 1096 kB | 7824 kB |
| `staged_samhsa` | `idx_staged_samhsa_match_key` | 944 kB | 35 MB |
| `staged_directory` | `idx_staged_directory_state` | 840 kB | 106 MB |
| `staged_samhsa` | `idx_staged_samhsa_phone` | 632 kB | 35 MB |
| `staged_samhsa` | `idx_staged_samhsa_domain` | 496 kB | 35 MB |
| `facilities` | `idx_facilities_city_trgm` | 488 kB | 7824 kB |
| `staged_samhsa` | `idx_staged_samhsa_state` | 296 kB | 35 MB |
| `facilities` | `idx_facilities_featured_rotation` | 128 kB | 7824 kB |
| `facilities` | `idx_facilities_unclaimed_approved` | 96 kB | 7824 kB |
| `admin_trusted_devices` | `idx_trusted_devices_token` | 16 kB | 8192 bytes |
| `admin_trusted_devices` | `idx_trusted_devices_user` | 16 kB | 8192 bytes |
| `blog_authors` | `blog_authors_active_idx` | 16 kB | 8192 bytes |
| `email_verification_codes` | `idx_email_verification_codes_verified_at` | 16 kB | 8192 bytes |
| `facilities` | `idx_facilities_featured_display_order` | 16 kB | 7824 kB |
| `leads` | `idx_leads_reminder_check` | 16 kB | 8192 bytes |
| `marketing_leads` | `idx_marketing_leads_ip_hash` | 16 kB | 8192 bytes |
| `phi_access_log` | `idx_phi_access_log_actor` | 16 kB | 16 kB |
| `stripe_webhook_events` | `idx_stripe_webhook_events_status` | 16 kB | 8192 bytes |
| `admin_mfa_recovery_codes` | `idx_admin_mfa_recovery_codes_unused` | 8192 bytes | 0 bytes |
| `concierge_inquiries` | `idx_concierge_inquiries_admission_substatus` | 8192 bytes | 16 kB |
| `concierge_inquiries` | `idx_concierge_inquiries_contact_channel` | 8192 bytes | 16 kB |
| `concierge_introduction_audit` | `idx_concierge_audit_flagged` | 8192 bytes | 0 bytes |
| `email_verification_codes` | `idx_email_verification_codes_claim` | 8192 bytes | 8192 bytes |
| `facility_accreditations` | `idx_facility_accreditations_verification_number` | 8192 bytes | 1176 kB |
| `featured_impressions` | `idx_featured_impressions_surface_time` | 8192 bytes | 0 bytes |
| `insurance_verification_requests` | `idx_ivr_stale_open` | 8192 bytes | 0 bytes |
| `insurance_verification_requests` | `idx_ivr_urgent_open` | 8192 bytes | 0 bytes |
| `lead_distributions` | `idx_lead_distributions_pending_notification` | 8192 bytes | 8192 bytes |
| `leads` | `idx_leads_expired` | 8192 bytes | 8192 bytes |
| `leads` | `idx_leads_ip_hash_created` | 8192 bytes | 8192 bytes |
| `leads` | `idx_leads_unresponded_assigned` | 8192 bytes | 8192 bytes |
| `seeker_profiles` | `idx_seeker_profiles_deletion_purge_after` | 8192 bytes | 8192 bytes |
| `seeker_profiles` | `idx_seeker_profiles_phone` | 8192 bytes | 8192 bytes |
| `staged_leads` | `idx_staged_leads_email_domain` | 8192 bytes | 0 bytes |
| `staged_leads` | `idx_staged_leads_emailable` | 8192 bytes | 0 bytes |
| `staged_leads` | `idx_staged_leads_match_key` | 8192 bytes | 0 bytes |
| `staged_leads` | `idx_staged_leads_phone` | 8192 bytes | 0 bytes |
| `staged_leads` | `idx_staged_leads_website_domain` | 8192 bytes | 0 bytes |

## Reassessment task — TODO 2026-06-22

On or after **2026-06-22** (30 days post-baseline):

1. Re-run `get_advisors(performance)` and capture the new
   `unused_index` warning list.
2. Diff against this baseline. Any index in the
   `NEW-FK-INDEX-2026-05-22` set that **still** has zero scans
   warrants a deeper look — either the related queries aren't running,
   or the planner is using something else.
3. For each `CANDIDATE-FOR-DROP` index that's still zero-scan:
   confirm with the feature owner that the feature has actually been
   exercised in production. If yes → drop. If no → roll over to the
   next 30-day cycle.
4. Update this file with the snapshot date, the diff, and any drops
   performed (with their migration filenames).
