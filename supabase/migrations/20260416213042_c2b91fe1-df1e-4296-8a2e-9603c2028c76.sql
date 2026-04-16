-- ============================================================
-- 1. STRIPE WEBHOOK EVENT DEDUPLICATION
-- Stops duplicate notifications/emails when Stripe retries an event
-- (financial uniques already protect credits/unlocks/subscriptions)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
  event_id text PRIMARY KEY,
  event_type text NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  status text NOT NULL DEFAULT 'received', -- received | processed | failed
  error_message text,
  payload_summary jsonb
);

ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;

-- Only admins can read this audit log
CREATE POLICY "Admins can view webhook events"
ON public.stripe_webhook_events
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Service role inserts/updates only (no client writes)
CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_received_at
  ON public.stripe_webhook_events(received_at DESC);
CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_status
  ON public.stripe_webhook_events(status) WHERE status <> 'processed';

-- Atomic claim helper: returns true if this is the first time we've seen the event,
-- false if it was already claimed (duplicate). Used as the entry guard in stripe-webhook.
CREATE OR REPLACE FUNCTION public.claim_stripe_webhook_event(
  p_event_id text,
  p_event_type text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.stripe_webhook_events (event_id, event_type, status)
  VALUES (p_event_id, p_event_type, 'received')
  ON CONFLICT (event_id) DO NOTHING;

  -- If a row was inserted by THIS call, FOUND is true -> we own the event
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_stripe_webhook_event_processed(
  p_event_id text,
  p_status text DEFAULT 'processed',
  p_error text DEFAULT NULL
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  UPDATE public.stripe_webhook_events
  SET processed_at = now(),
      status = p_status,
      error_message = p_error
  WHERE event_id = p_event_id;
$$;

-- ============================================================
-- 2. AUTO-RELOAD IN-FLIGHT LOCK
-- Prevents two near-simultaneous unlocks from each triggering a charge.
-- Uses an advisory lock per provider, returned by a helper function.
-- ============================================================
CREATE OR REPLACE FUNCTION public.try_acquire_auto_reload_lock(
  p_provider_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_lock_key bigint;
BEGIN
  -- Derive a stable bigint key from the provider UUID (hash-based, collision-tolerant)
  v_lock_key := ('x' || substr(md5('auto_reload:' || p_provider_id::text), 1, 16))::bit(64)::bigint;

  -- Session-level lock that auto-releases when the connection ends.
  -- Edge functions create a fresh connection per invocation, so the lock
  -- is naturally scoped to the current charge attempt.
  RETURN pg_try_advisory_lock(v_lock_key);
END;
$$;