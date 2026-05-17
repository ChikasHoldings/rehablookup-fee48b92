-- TCPA compliance: track SMS opt-out (STOP keyword) and opt-in resume
-- (START keyword), with audit trail of every inbound Twilio webhook.
--
-- Added 2026-05-17 (round 18: notifications audit). Backs the new
-- twilio-sms-inbound edge function which Twilio POSTs every inbound SMS to,
-- and the send-sms-notification function which gates outbound on
-- profiles.sms_opted_out_at IS NULL.
--
-- TCPA / 47 CFR §64.1200 requires honoring STOP requests within a
-- reasonable time. Both Twilio's carrier-aggregator layer AND our DB-level
-- gate honor STOP — the DB gate is the source of truth for our own
-- gating decisions (the carrier layer is a defense-in-depth).
--
-- Idempotent: gated on column existence + IF NOT EXISTS for the table.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS sms_opted_out_at TIMESTAMPTZ;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS sms_opted_in_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.sms_inbound_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_phone TEXT NOT NULL,
  to_phone TEXT NOT NULL,
  body TEXT NOT NULL,
  keyword TEXT,
  matched_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT,
  twilio_message_sid TEXT,
  raw_payload JSONB,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sms_inbound_log_received_at
  ON public.sms_inbound_log(received_at DESC);
CREATE INDEX IF NOT EXISTS idx_sms_inbound_log_from_phone
  ON public.sms_inbound_log(from_phone);
CREATE INDEX IF NOT EXISTS idx_sms_inbound_log_user
  ON public.sms_inbound_log(matched_user_id) WHERE matched_user_id IS NOT NULL;

ALTER TABLE public.sms_inbound_log ENABLE ROW LEVEL SECURITY;

-- service-role-only: no policies → bypassed only by service role.
COMMENT ON TABLE public.sms_inbound_log IS
  'TCPA-compliance audit: every Twilio inbound webhook delivery (STOP/HELP/etc). Service-role only.';
