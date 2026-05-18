-- Drop unlock_discount_percent from facility_subscriptions.
--
-- The credit-based unlock model is retired; no code reads or writes this
-- column anymore. stripe-webhook v10 (deployed alongside this migration)
-- stopped writing it; all frontend reads were removed in Phase 2 of the
-- monetization cleanup (commit 9049e7617).
--
-- This is the deferred drop that the 20260613000000 cleanup migration's
-- header note flagged as "requires coordinated stripe-webhook redeploy first".
ALTER TABLE public.facility_subscriptions DROP COLUMN IF EXISTS unlock_discount_percent;
