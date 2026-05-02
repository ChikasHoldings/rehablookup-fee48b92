
-- 1. Suppressed emails (referenced by resilient-email-sender.ts but missing)
CREATE TABLE IF NOT EXISTS public.suppressed_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  reason text NOT NULL CHECK (reason IN ('bounced', 'complained', 'unsubscribed', 'manual', 'spam')),
  notes text,
  source text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_suppressed_emails_email ON public.suppressed_emails (lower(email));

ALTER TABLE public.suppressed_emails ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view suppressed emails" ON public.suppressed_emails;
CREATE POLICY "Admins can view suppressed emails"
  ON public.suppressed_emails FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can manage suppressed emails" ON public.suppressed_emails;
CREATE POLICY "Admins can manage suppressed emails"
  ON public.suppressed_emails FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- 2. Email send failures (DLQ for admin visibility)
CREATE TABLE IF NOT EXISTS public.email_send_failures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email_type text NOT NULL,
  recipient_email text NOT NULL,
  subject text,
  error_message text,
  attempts integer NOT NULL DEFAULT 0,
  metadata jsonb,
  idempotency_key text,
  resolved_at timestamptz,
  resolved_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_send_failures_unresolved
  ON public.email_send_failures (created_at DESC)
  WHERE resolved_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_email_send_failures_recipient
  ON public.email_send_failures (lower(recipient_email), created_at DESC);

ALTER TABLE public.email_send_failures ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view email failures" ON public.email_send_failures;
CREATE POLICY "Admins can view email failures"
  ON public.email_send_failures FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can manage email failures" ON public.email_send_failures;
CREATE POLICY "Admins can manage email failures"
  ON public.email_send_failures FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
