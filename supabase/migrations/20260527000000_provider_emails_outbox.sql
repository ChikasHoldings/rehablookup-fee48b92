-- emails_outbox: scheduled-email queue for the provider onboarding
-- wizard's two drip sequences (free_to_pro, pro_to_featured).
--
-- Distinct from the existing provider_onboarding_drip (7-day general
-- onboarding drip). Each row here is one scheduled send. The cron
-- drain (process-onboarding-emails edge fn) reads pending rows whose
-- scheduled_for has elapsed and dispatches via Resend, re-reading
-- state per row so a no-longer-relevant email is silently skipped.

CREATE TABLE IF NOT EXISTS public.emails_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sequence text NOT NULL,
  step integer NOT NULL,
  scheduled_for timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  attempts integer NOT NULL DEFAULT 0,
  last_error text,
  sent_at timestamptz,
  skipped_reason text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='emails_outbox_sequence_chk') THEN
    ALTER TABLE public.emails_outbox
      ADD CONSTRAINT emails_outbox_sequence_chk
      CHECK (sequence IN ('free_to_pro','pro_to_featured'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='emails_outbox_status_chk') THEN
    ALTER TABLE public.emails_outbox
      ADD CONSTRAINT emails_outbox_status_chk
      CHECK (status IN ('pending','sent','skipped','failed'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='emails_outbox_step_chk') THEN
    ALTER TABLE public.emails_outbox
      ADD CONSTRAINT emails_outbox_step_chk CHECK (step >= 1 AND step <= 20);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='emails_outbox_unique_step') THEN
    ALTER TABLE public.emails_outbox
      ADD CONSTRAINT emails_outbox_unique_step UNIQUE (user_id, sequence, step);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_emails_outbox_pending_due
  ON public.emails_outbox (scheduled_for)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_emails_outbox_user_seq
  ON public.emails_outbox (user_id, sequence);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='emails_outbox_set_updated_at')
     AND EXISTS (SELECT 1 FROM pg_proc WHERE proname='set_updated_at_timestamp') THEN
    EXECUTE 'CREATE TRIGGER emails_outbox_set_updated_at '
            'BEFORE UPDATE ON public.emails_outbox '
            'FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp()';
  END IF;
END $$;

ALTER TABLE public.emails_outbox ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy
    WHERE polname='emails_outbox_service_role_full'
      AND polrelid='public.emails_outbox'::regclass
  ) THEN
    EXECUTE 'CREATE POLICY emails_outbox_service_role_full '
            'ON public.emails_outbox FOR ALL '
            'USING (false) WITH CHECK (false)';
  END IF;
END $$;

COMMENT ON TABLE public.emails_outbox IS
  'Scheduled-email queue for provider onboarding sequences. One row '
  'per planned send. The cron drain re-reads state per row and bails '
  'when the user has upgraded, unsubscribed, or never verified email.';

CREATE OR REPLACE FUNCTION public.enqueue_onboarding_email_sequence()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_plan text;
  base_now timestamptz := now();
BEGIN
  IF OLD.onboarding_completed_at IS NOT NULL THEN
    RETURN NEW;
  END IF;
  IF NEW.onboarding_completed_at IS NULL THEN
    RETURN NEW;
  END IF;

  user_plan := COALESCE(NEW.plan, 'free');

  IF user_plan = 'free' THEN
    INSERT INTO public.emails_outbox (user_id, sequence, step, scheduled_for)
    VALUES
      (NEW.user_id, 'free_to_pro', 1, base_now),
      (NEW.user_id, 'free_to_pro', 2, base_now + interval '1 day'),
      (NEW.user_id, 'free_to_pro', 3, base_now + interval '3 days'),
      (NEW.user_id, 'free_to_pro', 4, base_now + interval '7 days'),
      (NEW.user_id, 'free_to_pro', 5, base_now + interval '14 days')
    ON CONFLICT (user_id, sequence, step) DO NOTHING;
  ELSIF user_plan = 'pro' THEN
    INSERT INTO public.emails_outbox (user_id, sequence, step, scheduled_for)
    VALUES
      (NEW.user_id, 'pro_to_featured', 1, base_now + interval '1 day'),
      (NEW.user_id, 'pro_to_featured', 2, base_now + interval '7 days'),
      (NEW.user_id, 'pro_to_featured', 3, base_now + interval '14 days'),
      (NEW.user_id, 'pro_to_featured', 4, base_now + interval '21 days')
    ON CONFLICT (user_id, sequence, step) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='profiles_enqueue_onboarding_emails') THEN
    EXECUTE 'CREATE TRIGGER profiles_enqueue_onboarding_emails '
            'AFTER UPDATE OF onboarding_completed_at ON public.profiles '
            'FOR EACH ROW EXECUTE FUNCTION public.enqueue_onboarding_email_sequence()';
  END IF;
END $$;

COMMENT ON FUNCTION public.enqueue_onboarding_email_sequence() IS
  'Fires on profiles.onboarding_completed_at flip from NULL to set. '
  'Enqueues the correct sequence into emails_outbox based on '
  'profiles.plan at that moment.';
