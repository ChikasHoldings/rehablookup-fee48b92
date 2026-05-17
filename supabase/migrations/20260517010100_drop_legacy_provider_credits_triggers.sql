-- CRITICAL FIX (round 20 E2E smoke): two trigger functions on facilities
-- reference public.provider_credits which was dropped during the EKRA
-- refactor (when we moved from the per-lead unlock-credits model to flat
-- per-facility Pro $99/mo). Every facilities INSERT crashed with:
--   ERROR 42P01: relation "public.provider_credits" does not exist
-- in trigger create_provider_credits_on_insert. The approval-fired sibling
-- create_provider_credits_on_approval has the same bug and would crash
-- whenever an admin approves a facility.
--
-- Both are dead weight from a removed product model. Drop the triggers
-- AND the now-orphaned trigger functions.
--
-- Idempotent: gated on existence.

DROP TRIGGER IF EXISTS on_facility_created_credits ON public.facilities;
DROP TRIGGER IF EXISTS on_facility_approved_credits ON public.facilities;
DROP FUNCTION IF EXISTS public.create_provider_credits_on_insert();
DROP FUNCTION IF EXISTS public.create_provider_credits_on_approval();
