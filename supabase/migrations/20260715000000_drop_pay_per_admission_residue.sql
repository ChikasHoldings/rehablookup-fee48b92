-- ============================================================================
-- Drop all remaining pay-per-admission column residue + wipe placement records
-- ============================================================================
--
-- Companion to the 2026-05-18 monetization rebuild that retired the
-- per-lead-unlock / per-admission-fee model in favour of the EKRA-compliant
-- flat-fee Pro subscription ($99/mo) + Featured / Concierge add-ons.
--
-- This migration:
--   1. Drops every legacy payment-tracking column from `concierge_inquiries`
--      that hasn't been written to since the rebuild.
--   2. Drops the orphan `placement_fee_cents` column from `advisor_earnings`
--      (commission base is no longer per-admission revenue).
--   3. DELETES every existing concierge inquiry / placement record (and via
--      ON DELETE CASCADE, all dependent introduction / engagement / event
--      / tour / message / audit / threads rows). The user has explicitly
--      requested a clean slate so the rebuilt workflow starts from zero.
--   4. Drops any indexes / constraints pinned to the removed columns.
--
-- Safe to re-run: every DROP uses IF EXISTS; the DELETE is unconditional and
-- idempotent on an empty table.
--
-- After this migration, regenerate Supabase TypeScript types so the
-- frontend's `Database` type loses the dead column references:
--   supabase gen types typescript --linked > src/integrations/supabase/types.ts
-- ============================================================================

-- ── 1. Drop pay-per-admission columns from concierge_inquiries ──────────────
DO $$
BEGIN
  -- Drop indexes first if they exist (they pin to the column)
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_concierge_inquiries_payment_status') THEN
    EXECUTE 'DROP INDEX IF EXISTS public.idx_concierge_inquiries_payment_status';
  END IF;

  ALTER TABLE IF EXISTS public.concierge_inquiries
    DROP COLUMN IF EXISTS payment_status,
    DROP COLUMN IF EXISTS payment_amount_cents,
    DROP COLUMN IF EXISTS payment_reminder_count,
    DROP COLUMN IF EXISTS stripe_payment_intent_id,
    DROP COLUMN IF EXISTS stripe_customer_id,
    DROP COLUMN IF EXISTS checkout_session_id;
END $$;

-- ── 2. Drop placement_fee_cents from advisor_earnings ───────────────────────
ALTER TABLE IF EXISTS public.advisor_earnings
  DROP COLUMN IF EXISTS placement_fee_cents;

-- ── 3. Wipe every existing concierge / placement record ────────────────────
-- The ON DELETE CASCADE on every child table (concierge_introductions,
-- concierge_case_events, concierge_engagements if present, concierge_tour_requests,
-- concierge_threads, concierge_messages, concierge_introduction_audit,
-- concierge_rejected_facilities, advisor_earnings via inquiry_id, etc.)
-- ensures dependent rows go away cleanly. If any child table is missing
-- the CASCADE, surface the error rather than silently leaving orphans.
DELETE FROM public.concierge_inquiries;

-- Also explicitly clear advisor_earnings whose inquiry_id is now null
-- after the CASCADE — they're orphan commission records with no case
-- attached and no value going forward.
DELETE FROM public.advisor_earnings WHERE inquiry_id IS NULL;
