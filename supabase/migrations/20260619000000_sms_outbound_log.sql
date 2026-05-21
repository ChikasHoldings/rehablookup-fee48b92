-- Outbound SMS audit + budget table.
--
-- send-sms-notification writes a row per attempt (status='sent' or
-- 'failed') so we have:
--   1. A daily-budget query that caps SMS-per-user at 50/24h, stopping
--      a bug or malicious caller from racking up hundreds of dollars
--      of Twilio charges via lead-event amplification.
--   2. An audit trail that admins can grep for outage diagnostics
--      (last 200 chars of Twilio's error body land in error_message).
--   3. A foundation for a future delivery-status webhook
--      (StatusCallback → updates twilio_status: queued → sent →
--      delivered / undelivered / failed).
--
-- Idempotent — IF NOT EXISTS on table + indexes.

CREATE TABLE IF NOT EXISTS public.sms_outbound_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  notification_type text NOT NULL,
  recipient_phone text NOT NULL,
  status text NOT NULL,
  twilio_sid text,
  twilio_status integer,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  delivered_at timestamptz,
  CONSTRAINT sms_outbound_log_status_check
    CHECK (status = ANY (ARRAY[
      'sent'::text,
      'failed'::text,
      'delivered'::text,
      'undelivered'::text,
      'queued'::text
    ]))
);

CREATE INDEX IF NOT EXISTS idx_sms_outbound_log_user_id_created
  ON public.sms_outbound_log(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sms_outbound_log_twilio_sid
  ON public.sms_outbound_log(twilio_sid)
  WHERE twilio_sid IS NOT NULL;

ALTER TABLE public.sms_outbound_log ENABLE ROW LEVEL SECURITY;

-- Only the service role writes / reads. Edge functions use the service
-- role; admins query through admin functions; users have no direct
-- access (PII: recipient phone numbers).
DROP POLICY IF EXISTS "Service role can manage sms outbound log"
  ON public.sms_outbound_log;
CREATE POLICY "Service role can manage sms outbound log"
  ON public.sms_outbound_log
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
