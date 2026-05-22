-- Add covering B-tree indexes on 35 unindexed foreign keys.
--
-- Source: Supabase advisor (performance.unindexed_foreign_keys, 35 entries).
-- Pattern: `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_<table>_<column>
--           ON <table> (<column>);`
--
-- CONCURRENTLY avoids the ACCESS EXCLUSIVE lock that a plain CREATE INDEX
-- would take. It cannot run inside a transaction; these were applied via
-- supabase MCP `execute_sql` (non-transactional) rather than apply_migration.
--
-- Behavior: no behavior change; query planner gains indexes for FK joins
-- and ON DELETE CASCADE / SET NULL checks.

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_advisor_earnings_inquiry_id ON public.advisor_earnings (inquiry_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_concierge_inquiries_placed_facility_id ON public.concierge_inquiries (placed_facility_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_concierge_inquiries_user_id ON public.concierge_inquiries (user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_concierge_introduction_audit_originating_facility_id ON public.concierge_introduction_audit (originating_facility_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_concierge_introduction_audit_reviewed_by ON public.concierge_introduction_audit (reviewed_by);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_concierge_messages_thread_id ON public.concierge_messages (thread_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_concierge_partner_facilities_subscription_id ON public.concierge_partner_facilities (subscription_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_concierge_rejected_facilities_facility_id ON public.concierge_rejected_facilities (facility_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_concierge_threads_facility_id ON public.concierge_threads (facility_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_concierge_tour_requests_facility_id ON public.concierge_tour_requests (facility_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_concierge_tour_requests_inquiry_id ON public.concierge_tour_requests (inquiry_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_facilities_claim_owner_id ON public.facilities (claim_owner_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_facilities_user_id ON public.facilities (user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_facility_claim_requests_reviewed_by ON public.facility_claim_requests (reviewed_by);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_facility_credentials_facility_id ON public.facility_credentials (facility_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_facility_match_clusters_reviewed_by ON public.facility_match_clusters (reviewed_by);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_facility_reviews_facility_id ON public.facility_reviews (facility_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_featured_placements_subscription_id ON public.featured_placements (subscription_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_insurance_verification_requests_linked_user_id ON public.insurance_verification_requests (linked_user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_insurance_verification_requests_verified_by ON public.insurance_verification_requests (verified_by);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_lead_notes_lead_id ON public.lead_notes (lead_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_lead_routing_logs_requested_facility_id ON public.lead_routing_logs (requested_facility_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leads_original_facility_id ON public.leads (original_facility_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_platform_settings_updated_by ON public.platform_settings (updated_by);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_provider_notifications_facility_id ON public.provider_notifications (facility_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_provider_onboarding_drip_facility_id ON public.provider_onboarding_drip (facility_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_provider_onboarding_state_selected_facility_id ON public.provider_onboarding_state (selected_facility_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_request_help_analytics_facility_id ON public.request_help_analytics (facility_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_review_disputes_facility_id ON public.review_disputes (facility_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_review_helpful_votes_user_id ON public.review_helpful_votes (user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_review_responses_facility_id ON public.review_responses (facility_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_seeker_facility_alerts_facility_id ON public.seeker_facility_alerts (facility_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_subscription_cancellations_canceled_by ON public.subscription_cancellations (canceled_by);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_compare_list_facility_id ON public.user_compare_list (facility_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_favorites_facility_id ON public.user_favorites (facility_id);
