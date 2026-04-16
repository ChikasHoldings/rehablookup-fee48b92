-- Add missing indexes on facility_id foreign keys to eliminate sequential scans
-- These tables are read on every facility detail page view
CREATE INDEX IF NOT EXISTS idx_facility_insurance_facility_id ON public.facility_insurance(facility_id);
CREATE INDEX IF NOT EXISTS idx_facility_services_facility_id ON public.facility_services(facility_id);
CREATE INDEX IF NOT EXISTS idx_facility_age_groups_facility_id ON public.facility_age_groups(facility_id);

-- Refresh planner statistics on hot tables for optimal query plans under load
ANALYZE public.facilities;
ANALYZE public.facility_insurance;
ANALYZE public.facility_services;
ANALYZE public.facility_age_groups;
ANALYZE public.leads;
ANALYZE public.lead_unlocks;
ANALYZE public.provider_events;
ANALYZE public.concierge_inquiries;
ANALYZE public.platform_settings;
ANALYZE public.credit_transactions;
ANALYZE public.facility_accreditations;
ANALYZE public.facility_credentials;
ANALYZE public.badge_impressions;
ANALYZE public.blog_articles;
ANALYZE public.admin_user_profiles;