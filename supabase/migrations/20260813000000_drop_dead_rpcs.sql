-- Drop 4 RPCs that the Phase 1 panel audit + Phase 2 sweep classified
-- as truly dead (zero callers from any client, edge function, HTML
-- widget, cron job, or RLS policy; bodies that are either stubs or
-- 1:1 wrappers over what the client already does safely via RLS).
--
--   compute_cancellation_refund  — body is a stub returning all zeros.
--                                   The real refund math lives in
--                                   supabase/functions/_shared/
--                                   subscription-math.ts and is called
--                                   from the preview-cancellation-refund
--                                   edge function.
--
--   get_pro_discount             — returns 0 hardcoded. Retired with
--                                   the flat-fee monetization model;
--                                   no callers remain.
--
--   get_owner_facility_data      — SECURITY DEFINER wrapper that
--                                   returns the same `facilities` row
--                                   columns the client already SELECTs
--                                   directly through RLS-protected
--                                   queries (useProviderFacilities,
--                                   useFacilityBySlug). Redundant.
--
--   get_user_sessions_safe       — SECURITY DEFINER wrapper over
--                                   user_sessions returning the same
--                                   columns the client SELECTs
--                                   directly via useSessionManager.
--                                   Redundant (the table's RLS
--                                   already restricts to the caller's
--                                   own rows).
--
-- The 5th orphan from the same audit — get_provider_facility_placements
-- — was wired into ConciergeManagementPanel in the same Phase 2 PR
-- (ConciergePlacementHistory component) and is now live.

DROP FUNCTION IF EXISTS public.compute_cancellation_refund(uuid, timestamp with time zone);
DROP FUNCTION IF EXISTS public.get_pro_discount(uuid);
DROP FUNCTION IF EXISTS public.get_owner_facility_data(uuid);
DROP FUNCTION IF EXISTS public.get_user_sessions_safe(uuid);
