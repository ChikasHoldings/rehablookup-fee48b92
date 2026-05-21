-- 2026-05-20 /admin/insurance-verifications hardening pass.
-- Adds a partial index for the "Urgent open" KPI + SLA-stale badge
-- query shape (urgency='immediate' AND status NOT IN terminal).
-- Stays small because most rows are non-urgent or already closed.

CREATE INDEX IF NOT EXISTS idx_ivr_urgent_open
  ON public.insurance_verification_requests (urgency, created_at DESC)
  WHERE urgency = 'immediate'
    AND status NOT IN ('verified', 'no_coverage', 'unable_to_verify', 'closed');

-- Partial for "stale unverified" — fast lookup for the SLA badge
-- query without a sequential scan on the whole table.
CREATE INDEX IF NOT EXISTS idx_ivr_stale_open
  ON public.insurance_verification_requests (created_at DESC)
  WHERE status NOT IN ('verified', 'no_coverage', 'unable_to_verify', 'closed');
