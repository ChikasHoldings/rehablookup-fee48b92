-- Outbound SMS audit trail. Referenced by send-sms-notification (provider
-- alerts + daily-cap budget check) and the shared twilio-sms helper (seeker
-- response SMS), but the table was never created — so audit rows silently
-- no-op'd and the provider daily-cap check failed open. Create it.
CREATE TABLE IF NOT EXISTS public.sms_outbound_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  notification_type text NOT NULL,
  recipient_phone text,
  status text NOT NULL DEFAULT 'sent',
  twilio_sid text,
  twilio_status integer,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sms_outbound_log_user_created
  ON public.sms_outbound_log (user_id, created_at DESC);

ALTER TABLE public.sms_outbound_log ENABLE ROW LEVEL SECURITY;

-- Writes happen via service-role functions (bypass RLS). Reads are
-- admin-only — this is an internal audit/compliance log, never exposed
-- to providers or seekers.
DROP POLICY IF EXISTS "sms_outbound_log_admin_select" ON public.sms_outbound_log;
CREATE POLICY "sms_outbound_log_admin_select" ON public.sms_outbound_log
  FOR SELECT TO authenticated
  USING (has_role((SELECT auth.uid()), 'admin'::app_role));
