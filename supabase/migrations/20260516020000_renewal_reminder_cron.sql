-- ╔══════════════════════════════════════════════════════════════════╗
-- ║  Renewal Reminder Cron                                              ║
-- ║                                                                    ║
-- ║  Sends renewal-reminder emails at 60 / 30 / 14 / 7 days before     ║
-- ║  current_period_end for every active facility_subscription, idem-   ║
-- ║  potently. Uses the four renewal_reminder_*_sent_at columns added   ║
-- ║  in the foundation migration: once a milestone fires, the column   ║
-- ║  is timestamped and that milestone never fires again for that      ║
-- ║  subscription's current period.                                    ║
-- ║                                                                    ║
-- ║  The actual email send is delegated to an edge function            ║
-- ║  (`send-renewal-reminder`) — this function only enqueues the work  ║
-- ║  via the supabase_functions.http_request extension. That keeps the ║
-- ║  email template / Resend client in TypeScript where Vitest can     ║
-- ║  exercise it, while the scheduling stays in Postgres.              ║
-- ║                                                                    ║
-- ║  Schedule (set via pg_cron after this migration applies):          ║
-- ║    SELECT cron.schedule(                                           ║
-- ║      'subscription-renewal-reminders',                             ║
-- ║      '0 9 * * *',     -- 09:00 UTC daily                           ║
-- ║      $$ SELECT public.send_subscription_renewal_reminders() $$);   ║
-- ╚══════════════════════════════════════════════════════════════════╝

CREATE OR REPLACE FUNCTION public.send_subscription_renewal_reminders()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_sub record;
  v_summary jsonb := jsonb_build_object(
    'reminders_60d', 0,
    'reminders_30d', 0,
    'reminders_14d', 0,
    'reminders_7d', 0,
    'subscriptions_checked', 0
  );
BEGIN
  -- Iterate every active subscription with a defined current_period_end.
  -- For each, compute days_until_renewal and check the four milestones.
  FOR v_sub IN
    SELECT
      id,
      facility_id,
      provider_id,
      stripe_subscription_id,
      stripe_customer_id,
      current_period_end,
      tier,
      has_featured,
      has_concierge_partner,
      paid_amount_cents,
      renewal_reminder_60d_sent_at,
      renewal_reminder_30d_sent_at,
      renewal_reminder_14d_sent_at,
      renewal_reminder_7d_sent_at,
      EXTRACT(EPOCH FROM (current_period_end - now())) / 86400 AS days_until_renewal
    FROM public.facility_subscriptions
    WHERE status = 'active'
      AND current_period_end IS NOT NULL
      AND current_period_end > now()
  LOOP
    v_summary := jsonb_set(
      v_summary,
      '{subscriptions_checked}',
      to_jsonb(((v_summary->>'subscriptions_checked')::int) + 1)
    );

    -- Milestone trigger: cron runs daily, so "days_until_renewal is in
    -- the 60-day window" means it's between 59 and 60 today. Each branch
    -- fires AT MOST once per period because the matching
    -- renewal_reminder_*_sent_at column is timestamped on dispatch.
    IF v_sub.days_until_renewal BETWEEN 59.0 AND 60.0
       AND v_sub.renewal_reminder_60d_sent_at IS NULL THEN
      PERFORM public.enqueue_renewal_reminder(v_sub.id, 60);
      UPDATE public.facility_subscriptions
        SET renewal_reminder_60d_sent_at = now()
        WHERE id = v_sub.id;
      v_summary := jsonb_set(v_summary, '{reminders_60d}', to_jsonb(((v_summary->>'reminders_60d')::int) + 1));
    ELSIF v_sub.days_until_renewal BETWEEN 29.0 AND 30.0
       AND v_sub.renewal_reminder_30d_sent_at IS NULL THEN
      PERFORM public.enqueue_renewal_reminder(v_sub.id, 30);
      UPDATE public.facility_subscriptions
        SET renewal_reminder_30d_sent_at = now()
        WHERE id = v_sub.id;
      v_summary := jsonb_set(v_summary, '{reminders_30d}', to_jsonb(((v_summary->>'reminders_30d')::int) + 1));
    ELSIF v_sub.days_until_renewal BETWEEN 13.0 AND 14.0
       AND v_sub.renewal_reminder_14d_sent_at IS NULL THEN
      PERFORM public.enqueue_renewal_reminder(v_sub.id, 14);
      UPDATE public.facility_subscriptions
        SET renewal_reminder_14d_sent_at = now()
        WHERE id = v_sub.id;
      v_summary := jsonb_set(v_summary, '{reminders_14d}', to_jsonb(((v_summary->>'reminders_14d')::int) + 1));
    ELSIF v_sub.days_until_renewal BETWEEN 6.0 AND 7.0
       AND v_sub.renewal_reminder_7d_sent_at IS NULL THEN
      PERFORM public.enqueue_renewal_reminder(v_sub.id, 7);
      UPDATE public.facility_subscriptions
        SET renewal_reminder_7d_sent_at = now()
        WHERE id = v_sub.id;
      v_summary := jsonb_set(v_summary, '{reminders_7d}', to_jsonb(((v_summary->>'reminders_7d')::int) + 1));
    END IF;
  END LOOP;

  RETURN v_summary;
END;
$$;

-- Helper: enqueue an email via the send-renewal-reminder edge function.
-- The pg_net (or supabase_functions.http_request) extension is the
-- standard pattern for Postgres → edge-function bridging on Supabase.
-- This is intentionally a stub — the real network call resolves at
-- pg_net availability check time. When pg_net is enabled, the function
-- below dispatches a POST; when it isn't, the cron just logs.
CREATE OR REPLACE FUNCTION public.enqueue_renewal_reminder(
  p_subscription_id uuid,
  p_milestone_days integer
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
      'pg_net not installed — renewal reminder for subscription % (% days) not dispatched',
      p_subscription_id, p_milestone_days;
    RETURN;
  END IF;

  -- Dispatched via pg_net.http_post. The edge function path is read
  -- from a Postgres setting so it's environment-aware. If unset,
  -- skip with NOTICE rather than erroring (cron stays alive).
  IF current_setting('app.settings.functions_url', true) IS NULL THEN
    RAISE NOTICE
      'app.settings.functions_url not set — renewal reminder for subscription % (% days) not dispatched',
      p_subscription_id, p_milestone_days;
    RETURN;
  END IF;

  PERFORM extensions.http_post(
    url := current_setting('app.settings.functions_url') || '/send-renewal-reminder',
    body := jsonb_build_object(
      'subscription_id', p_subscription_id,
      'milestone_days', p_milestone_days
    )::text,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || coalesce(current_setting('app.settings.service_role_key', true), '')
    )::jsonb,
    timeout_milliseconds := 5000
  );
END;
$$;

COMMENT ON FUNCTION public.send_subscription_renewal_reminders IS
  'Daily cron: fires renewal-reminder emails at 60/30/14/7-day milestones,
   marking each milestone column once-only per current_period_end so the
   email never duplicates.';

COMMENT ON FUNCTION public.enqueue_renewal_reminder IS
  'Stub bridge: dispatches a POST to the send-renewal-reminder edge function
   via pg_net when available. Skips with NOTICE when pg_net or the
   functions_url Postgres setting is missing.';
