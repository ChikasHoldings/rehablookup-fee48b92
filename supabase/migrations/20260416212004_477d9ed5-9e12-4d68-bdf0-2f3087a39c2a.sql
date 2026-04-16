-- Provider dashboard hot path
CREATE INDEX IF NOT EXISTS idx_facilities_user_id ON public.facilities(user_id);
CREATE INDEX IF NOT EXISTS idx_facility_credentials_facility_id ON public.facility_credentials(facility_id);

-- Lead notes (read on every lead detail view)
CREATE INDEX IF NOT EXISTS idx_lead_notes_lead_id ON public.lead_notes(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_notes_user_id ON public.lead_notes(user_id);

-- Concierge / placement flow
CREATE INDEX IF NOT EXISTS idx_concierge_inquiries_user_id ON public.concierge_inquiries(user_id);
CREATE INDEX IF NOT EXISTS idx_concierge_threads_user_id ON public.concierge_threads(user_id);
CREATE INDEX IF NOT EXISTS idx_concierge_tour_requests_inquiry_id ON public.concierge_tour_requests(inquiry_id);
CREATE INDEX IF NOT EXISTS idx_concierge_tour_requests_facility_id ON public.concierge_tour_requests(facility_id);
CREATE INDEX IF NOT EXISTS idx_concierge_tour_requests_user_id ON public.concierge_tour_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_concierge_engagements_provider_id ON public.concierge_engagements(provider_id);
CREATE INDEX IF NOT EXISTS idx_advisor_earnings_inquiry_id ON public.advisor_earnings(inquiry_id);

-- Placement
CREATE INDEX IF NOT EXISTS idx_placement_agreements_provider_id ON public.placement_agreements(provider_id);
CREATE INDEX IF NOT EXISTS idx_placement_case_providers_provider_id ON public.placement_case_providers(provider_id);
CREATE INDEX IF NOT EXISTS idx_placement_fee_events_facility_id ON public.placement_fee_events(facility_id);
CREATE INDEX IF NOT EXISTS idx_placement_fee_events_inquiry_id ON public.placement_fee_events(inquiry_id);

-- International placement
CREATE INDEX IF NOT EXISTS idx_international_facility_invoices_provider_id ON public.international_facility_invoices(provider_id);
CREATE INDEX IF NOT EXISTS idx_international_payments_user_id ON public.international_payments(user_id);

-- Provider operations
CREATE INDEX IF NOT EXISTS idx_provider_auto_reload_settings_facility_id ON public.provider_auto_reload_settings(facility_id);
CREATE INDEX IF NOT EXISTS idx_provider_notifications_facility_id ON public.provider_notifications(facility_id);
CREATE INDEX IF NOT EXISTS idx_provider_onboarding_drip_facility_id ON public.provider_onboarding_drip(facility_id);

-- Analytics & moderation
CREATE INDEX IF NOT EXISTS idx_request_help_analytics_facility_id ON public.request_help_analytics(facility_id);
CREATE INDEX IF NOT EXISTS idx_review_disputes_facility_id ON public.review_disputes(facility_id);
CREATE INDEX IF NOT EXISTS idx_review_responses_facility_id ON public.review_responses(facility_id);

-- Refresh stats on touched tables
ANALYZE public.facilities;
ANALYZE public.facility_credentials;
ANALYZE public.lead_notes;
ANALYZE public.concierge_inquiries;
ANALYZE public.concierge_threads;
ANALYZE public.concierge_tour_requests;
ANALYZE public.concierge_engagements;
ANALYZE public.advisor_earnings;
ANALYZE public.placement_agreements;
ANALYZE public.placement_case_providers;
ANALYZE public.placement_fee_events;
ANALYZE public.provider_auto_reload_settings;
ANALYZE public.provider_notifications;
ANALYZE public.provider_onboarding_drip;