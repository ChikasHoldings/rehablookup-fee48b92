-- Partial unique index on email_send_failures.idempotency_key.
--
-- Why partial: existing senders (send-lead-email, notify-payment-failed,
-- resend-lead-confirmation) sometimes insert without an idempotency_key
-- when they can't construct a stable one (e.g. a transient API timeout
-- with no Resend message-id yet). Those rows must remain insertable, so
-- the constraint only enforces uniqueness when the key IS NOT NULL.
--
-- This unblocks the upsert(..., {onConflict: "idempotency_key"}) pattern
-- in supabase/functions/resend-webhook/index.ts (added in this PR) and
-- prevents a retried bounce/complaint webhook from inserting two
-- failure rows for the same (email_id, event_type) tuple.
--
-- Verified empty before apply: email_send_failures had 0 rows when this
-- migration was authored, so no de-duplication backfill is required.

CREATE UNIQUE INDEX IF NOT EXISTS email_send_failures_idempotency_key_uniq
  ON public.email_send_failures (idempotency_key)
  WHERE idempotency_key IS NOT NULL;
