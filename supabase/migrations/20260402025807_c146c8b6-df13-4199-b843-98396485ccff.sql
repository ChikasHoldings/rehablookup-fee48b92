CREATE UNIQUE INDEX IF NOT EXISTS idx_subscription_events_stripe_event_idempotency 
ON public.subscription_events (stripe_event_id) 
WHERE stripe_event_id IS NOT NULL;