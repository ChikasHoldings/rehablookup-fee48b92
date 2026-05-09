-- ============================================================================
-- PLACEMENT HARDENING FIXES
-- ============================================================================
-- Fixes discovered during the final hardening pass:
-- 1. Add 'expired' to provider_response CHECK constraint
-- 2. Add introduction_type column for tracking auto vs manual introductions
-- 3. Add provider_decline_reason column for auto-decline messages
-- ============================================================================

-- ─── 1. Update provider_response CHECK to include 'expired' ─────────────────
-- Drop the existing constraint and recreate with the new value
ALTER TABLE public.concierge_introductions
  DROP CONSTRAINT IF EXISTS concierge_introductions_provider_response_check;
ALTER TABLE public.concierge_introductions
  ADD CONSTRAINT concierge_introductions_provider_response_check
  CHECK (provider_response IN ('pending', 'interested', 'declined', 'no_response', 'expired'));

-- ─── 2. Add introduction_type column ────────────────────────────────────────
ALTER TABLE public.concierge_introductions
  ADD COLUMN IF NOT EXISTS introduction_type text DEFAULT 'manual'
    CHECK (introduction_type IN ('manual', 'auto', 'cron_retry'));

-- ─── 3. Add provider_decline_reason column ──────────────────────────────────
ALTER TABLE public.concierge_introductions
  ADD COLUMN IF NOT EXISTS provider_decline_reason text;

-- ─── 4. Add index for expired introductions cleanup ─────────────────────────
CREATE INDEX IF NOT EXISTS idx_introductions_expired
  ON public.concierge_introductions (provider_response, provider_responded_at)
  WHERE provider_response = 'expired';
