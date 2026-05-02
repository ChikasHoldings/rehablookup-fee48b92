CREATE TABLE public.lead_email_resend_attempts (
  email text NOT NULL,
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  count integer NOT NULL DEFAULT 0,
  last_sent_at timestamptz NOT NULL DEFAULT now(),
  window_started_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (email, lead_id)
);

ALTER TABLE public.lead_email_resend_attempts ENABLE ROW LEVEL SECURITY;

-- No policies: this table is service-role-only by design. The
-- `resend-lead-confirmation` edge function reads/writes it via the
-- service-role key; anon/authenticated clients have no direct access.

CREATE INDEX idx_lead_email_resend_attempts_lead_id
  ON public.lead_email_resend_attempts (lead_id);

CREATE TRIGGER update_lead_email_resend_attempts_updated_at
  BEFORE UPDATE ON public.lead_email_resend_attempts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();