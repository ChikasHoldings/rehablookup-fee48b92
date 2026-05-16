-- ╔══════════════════════════════════════════════════════════════════╗
-- ║  Renewal Reminder Cron — v2                                        ║
-- ║                                                                    ║
-- ║  Builds on 20260516020000_renewal_reminder_cron.sql:               ║
-- ║                                                                    ║
-- ║  • Adds `payment_method_warning_sent_at` column for the parallel   ║
-- ║    past-due notification path.                                     ║
-- ║                                                                    ║
-- ║  • Rewrites `send_subscription_renewal_reminders()` to:            ║
-- ║      - Restrict 60/30/14/7-day reminders to annual subscribers     ║
-- ║        (`billing_period = 'annual'`) — monthly subs renew silently.║
-- ║      - Branch on cancel_at_period_end: send the 60-day reactivation║
-- ║        offer instead of the standard renewal reminder, and skip    ║
-- ║        30/14/7 entirely for already-canceling subs (we don't       ║
-- ║        re-pester someone who has chosen to leave).                 ║
-- ║      - Iterate past-due subscribers separately (any billing        ║
-- ║        period) and dispatch a payment-method warning with a        ║
-- ║        14-day cooldown.                                            ║
-- ║      - Stop marking `_sent_at` synchronously. The edge function    ║
-- ║        now marks the column ONLY on a successful Resend dispatch,  ║
-- ║        so transient failures naturally retry on the next cron run. ║
-- ║                                                                    ║
-- ║  • Schedules the cron job itself (`'send-renewal-reminders'`) at  ║
-- ║    09:00 UTC daily. Previously the schedule was only documented in ║
-- ║    a comment, not actually invoked.                                ║
-- ╚══════════════════════════════════════════════════════════════════╝

-- ── 1. New column for payment-warning cooldown tracking ─────────────────
ALTER TABLE public.facility_subscriptions
  ADD COLUMN IF NOT EXISTS payment_method_warning_sent_at timestamptz;

COMMENT ON COLUMN public.facility_subscriptions.payment_method_warning_sent_at IS
  'Last time we emailed the provider that their card-on-file failed.
   14-day cooldown — used by send_subscription_renewal_reminders() to
   suppress re-sends while Stripe is still retrying the invoice.';


-- ── 2. Rewritten cron driver ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.send_subscription_renewal_reminders()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_sub record;
  v_days numeric;
  v_summary jsonb := jsonb_build_object(
    'reminders_60d', 0,
    'reminders_30d', 0,
    'reminders_14d', 0,
    'reminders_7d', 0,
    'cancel_reactivation_60d', 0,
    'payment_warnings', 0,
    'subscriptions_checked', 0
  );
BEGIN
  -- ── Renewal reminders (annual only) ──────────────────────────────────
  --
  -- 60/30/14/7-day milestones for ANNUAL subscribers only. Monthly subs
  -- renew silently — they're on autopilot by definition.
  --
  -- Cancel-at-period-end branch: if the sub is already set to cancel
  -- AT the period end, we suppress 30/14/7 (they're going away) and
  -- swap the 60-day reminder for a "you can still change your mind"
  -- reactivation offer.
  --
  -- We don't mark `_sent_at` here. The edge function marks it only on
  -- successful Resend dispatch so transient failures retry next day.
  --
  FOR v_sub IN
    SELECT
      id,
      cancel_at_period_end,
      renewal_reminder_60d_sent_at,
      renewal_reminder_30d_sent_at,
      renewal_reminder_14d_sent_at,
      renewal_reminder_7d_sent_at,
      EXTRACT(EPOCH FROM (current_period_end - now())) / 86400 AS days_until_renewal
    FROM public.facility_subscriptions
    WHERE status = 'active'
      AND billing_period = 'annual'
      AND current_period_end IS NOT NULL
      AND current_period_end > now()
      AND current_period_end <= now() + interval '61 days'
  LOOP
    v_summary := jsonb_set(
      v_summary,
      '{subscriptions_checked}',
      to_jsonb(((v_summary->>'subscriptions_checked')::int) + 1)
    );
    v_days := v_sub.days_until_renewal;

    -- 60-day window: send EITHER the standard 60d reminder OR the
    -- cancellation reactivation offer, never both.
    IF v_days BETWEEN 59.0 AND 60.0
       AND v_sub.renewal_reminder_60d_sent_at IS NULL THEN
      IF v_sub.cancel_at_period_end THEN
        PERFORM public.enqueue_renewal_reminder(v_sub.id, 'cancel_reactivation');
        v_summary := jsonb_set(v_summary, '{cancel_reactivation_60d}', to_jsonb(((v_summary->>'cancel_reactivation_60d')::int) + 1));
      ELSE
        PERFORM public.enqueue_renewal_reminder(v_sub.id, '60');
        v_summary := jsonb_set(v_summary, '{reminders_60d}', to_jsonb(((v_summary->>'reminders_60d')::int) + 1));
      END IF;

    -- 30/14/7 day windows: suppress for canceling subs.
    ELSIF v_days BETWEEN 29.0 AND 30.0
       AND v_sub.renewal_reminder_30d_sent_at IS NULL
       AND NOT v_sub.cancel_at_period_end THEN
      PERFORM public.enqueue_renewal_reminder(v_sub.id, '30');
      v_summary := jsonb_set(v_summary, '{reminders_30d}', to_jsonb(((v_summary->>'reminders_30d')::int) + 1));

    ELSIF v_days BETWEEN 13.0 AND 14.0
       AND v_sub.renewal_reminder_14d_sent_at IS NULL
       AND NOT v_sub.cancel_at_period_end THEN
      PERFORM public.enqueue_renewal_reminder(v_sub.id, '14');
      v_summary := jsonb_set(v_summary, '{reminders_14d}', to_jsonb(((v_summary->>'reminders_14d')::int) + 1));

    ELSIF v_days BETWEEN 6.0 AND 7.0
       AND v_sub.renewal_reminder_7d_sent_at IS NULL
       AND NOT v_sub.cancel_at_period_end THEN
      PERFORM public.enqueue_renewal_reminder(v_sub.id, '7');
      v_summary := jsonb_set(v_summary, '{reminders_7d}', to_jsonb(((v_summary->>'reminders_7d')::int) + 1));
    END IF;
  END LOOP;

  -- ── Payment-method warnings (monthly + annual) ───────────────────────
  --
  -- Anyone whose Stripe subscription went past_due gets a one-time
  -- warning email per 14 days. Stripe retries the failed invoice
  -- automatically over the next 7 days; the 14-day cooldown means we
  -- don't spam them during the retry window. After the cooldown, if
  -- they're still past_due, we nudge again.
  --
  FOR v_sub IN
    SELECT id, payment_method_warning_sent_at
    FROM public.facility_subscriptions
    WHERE status = 'past_due'
      AND (
        payment_method_warning_sent_at IS NULL
        OR payment_method_warning_sent_at < now() - interval '14 days'
      )
  LOOP
    PERFORM public.enqueue_renewal_reminder(v_sub.id, 'payment_warning');
    v_summary := jsonb_set(v_summary, '{payment_warnings}', to_jsonb(((v_summary->>'payment_warnings')::int) + 1));
  END LOOP;

  RETURN v_summary;
END;
$$;

COMMENT ON FUNCTION public.send_subscription_renewal_reminders IS
  'Daily cron driver: dispatches renewal-reminder emails at 60/30/14/7
   day milestones for annual subscribers (or a 60-day reactivation
   offer for canceling subs), plus payment-method warnings (14-day
   cooldown) for past_due subscribers. Edge function marks the
   timestamps only on successful Resend dispatch.';


-- ── 3. Updated enqueue helper — milestone is now a text label ───────────
--
-- Was `(p_subscription_id, p_milestone_days integer)`. The integer
-- couldn't express the two new dispatch types
-- ('cancel_reactivation', 'payment_warning'), so the helper now takes
-- a text label and the edge function dispatches on it. Backwards-
-- compatible call sites (PR-3) passing integers must be migrated to
-- the string form (e.g. 60 → '60').
--
DROP FUNCTION IF EXISTS public.enqueue_renewal_reminder(uuid, integer);

CREATE OR REPLACE FUNCTION public.enqueue_renewal_reminder(
  p_subscription_id uuid,
  p_milestone text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_pg_net_present boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_net'
  ) INTO v_pg_net_present;

  IF NOT v_pg_net_present THEN
    RAISE NOTICE
      'pg_net not installed — renewal reminder for subscription % (%) not dispatched',
      p_subscription_id, p_milestone;
    RETURN;
  END IF;

  IF current_setting('app.settings.functions_url', true) IS NULL THEN
    RAISE NOTICE
      'app.settings.functions_url not set — renewal reminder for subscription % (%) not dispatched',
      p_subscription_id, p_milestone;
    RETURN;
  END IF;

  PERFORM extensions.http_post(
    url := current_setting('app.settings.functions_url') || '/send-renewal-reminder',
    body := jsonb_build_object(
      'subscription_id', p_subscription_id,
      'milestone', p_milestone
    )::text,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || coalesce(current_setting('app.settings.service_role_key', true), '')
    )::jsonb,
    timeout_milliseconds := 5000
  );
END;
$$;

COMMENT ON FUNCTION public.enqueue_renewal_reminder IS
  'Dispatches a POST to the send-renewal-reminder edge function via pg_net.
   Milestone is one of: ''60'', ''30'', ''14'', ''7'', ''cancel_reactivation'',
   ''payment_warning''. Skips with NOTICE if pg_net or functions_url is
   missing.';


-- ── 4. Schedule the cron job ────────────────────────────────────────────
--
-- 09:00 UTC daily. Unschedule any previous job of the same name first so
-- this migration is re-runnable.
--
DO $$
BEGIN
  PERFORM cron.unschedule('send-renewal-reminders');
EXCEPTION WHEN OTHERS THEN
  -- cron.unschedule errors if the job doesn't exist; ignore.
  NULL;
END
$$;

SELECT cron.schedule(
  'send-renewal-reminders',
  '0 9 * * *',
  $cron$ SELECT public.send_subscription_renewal_reminders(); $cron$
);
