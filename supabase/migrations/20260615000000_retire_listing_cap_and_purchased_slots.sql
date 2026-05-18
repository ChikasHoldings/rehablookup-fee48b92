-- =============================================================================
-- Retire the listing-cap enforcement that the new flat-fee monetization model
-- no longer needs. Providers may now add unlimited facilities regardless of
-- plan tier, so the DB-level cap trigger was actively wrong (it blocked
-- Free users from adding a 2nd facility even though the UI said "unlimited").
-- This also drops the orphan paid-extra-slot table the trigger consulted.
-- =============================================================================

-- 1. Drop the trigger on facilities that called enforce_facility_limit() and
--    rejected new rows when the user was at their plan cap.
DROP TRIGGER IF EXISTS enforce_facility_limit_trigger ON public.facilities;

-- 2. Drop the cap-enforcement function itself.
DROP FUNCTION IF EXISTS public.enforce_facility_limit();

-- 3. Drop the helper that read the paid-extra-slot count.
DROP FUNCTION IF EXISTS public.get_purchased_slot_count(uuid);

-- 4. Drop the paid-extra-slot table. The pay-per-slot purchase flow was
--    retired with the credit/unlock model and the corresponding
--    purchase-listing-slot edge function is now an orphan with no callers.
DROP TABLE IF EXISTS public.purchased_listing_slots;

-- 5. Drop the legacy "low credit balance" notification preference column.
--    The "credits running low" Settings toggle was removed in commit
--    0184aae8b; the column has no remaining reads or writes.
ALTER TABLE public.notification_preferences DROP COLUMN IF EXISTS notify_lead_limit_warnings;
