-- ╔══════════════════════════════════════════════════════════════════╗
-- ║  Renewal Reminder Health Check                                     ║
-- ║                                                                    ║
-- ║  Adds public.check_renewal_reminder_setup() — a single-call SQL    ║
-- ║  function that reports every prerequisite for the renewal-         ║
-- ║  reminder cron to actually fire emails:                            ║
-- ║                                                                    ║
-- ║    pg_cron / pg_net extensions, cron job presence + active flag,   ║
-- ║    cron schedule expression, app.settings.functions_url +          ║
-- ║    service_role_key configured, driver / enqueue function          ║
-- ║    presence, payment_method_warning_sent_at column.                ║
-- ║                                                                    ║
-- ║  Returns a JSON object with ready_to_dispatch=true ONLY when       ║
-- ║  every requirement is met. Ops should call this immediately after  ║
-- ║  any schema change, project restore, or environment migration:    ║
-- ║                                                                    ║
-- ║    SELECT public.check_renewal_reminder_setup();                   ║
-- ║                                                                    ║
-- ║  Common failure mode: functions_url_set = false and / or           ║
-- ║  service_role_key_set = false. Both must be configured by ops      ║
-- ║  at the Postgres superuser level (they cannot be set from a        ║
-- ║  migration; ALTER DATABASE on these parameters is permission-      ║
-- ║  protected by Supabase). Run from the Supabase dashboard SQL       ║
-- ║  editor:                                                           ║
-- ║                                                                    ║
-- ║    ALTER DATABASE postgres                                         ║
-- ║      SET app.settings.functions_url                                ║
-- ║      TO 'https://<project>.supabase.co/functions/v1';              ║
-- ║                                                                    ║
-- ║    ALTER DATABASE postgres                                         ║
-- ║      SET app.settings.service_role_key                             ║
-- ║      TO '<service role JWT>';                                      ║
-- ║                                                                    ║
-- ║  Then `SELECT pg_reload_conf();` and re-run the health check.      ║
-- ╚══════════════════════════════════════════════════════════════════╝

CREATE OR REPLACE FUNCTION public.check_renewal_reminder_setup()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_pg_cron boolean;
  v_pg_net boolean;
  v_job record;
  v_functions_url text;
  v_service_role_set boolean;
  v_driver_fn boolean;
  v_enqueue_fn boolean;
  v_payment_warning_col boolean;
  v_ready boolean;
BEGIN
  SELECT EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') INTO v_pg_cron;
  SELECT EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'pg_net')  INTO v_pg_net;

  SELECT jobname, schedule, active INTO v_job
  FROM cron.job WHERE jobname = 'send-renewal-reminders' LIMIT 1;

  v_functions_url := current_setting('app.settings.functions_url', true);
  v_service_role_set := current_setting('app.settings.service_role_key', true) IS NOT NULL;

  SELECT EXISTS(
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'send_subscription_renewal_reminders'
  ) INTO v_driver_fn;

  SELECT EXISTS(
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'enqueue_renewal_reminder'
  ) INTO v_enqueue_fn;

  SELECT EXISTS(
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'facility_subscriptions'
      AND column_name = 'payment_method_warning_sent_at'
  ) INTO v_payment_warning_col;

  v_ready := v_pg_cron AND v_pg_net
    AND v_job.jobname IS NOT NULL AND COALESCE(v_job.active, false)
    AND v_functions_url IS NOT NULL
    AND v_service_role_set
    AND v_driver_fn AND v_enqueue_fn
    AND v_payment_warning_col;

  RETURN jsonb_build_object(
    'pg_cron_extension', v_pg_cron,
    'pg_net_extension', v_pg_net,
    'cron_job_scheduled', v_job.jobname IS NOT NULL,
    'cron_job_active', COALESCE(v_job.active, false),
    'cron_schedule', v_job.schedule,
    'functions_url_set', v_functions_url IS NOT NULL,
    'functions_url', v_functions_url,
    'service_role_key_set', v_service_role_set,
    'driver_function_present', v_driver_fn,
    'enqueue_function_present', v_enqueue_fn,
    'payment_warning_column', v_payment_warning_col,
    'ready_to_dispatch', v_ready,
    'checked_at', now()
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_renewal_reminder_setup() TO authenticated, service_role;

COMMENT ON FUNCTION public.check_renewal_reminder_setup IS
  'Returns a JSON report of every renewal-reminder cron setup requirement.
   ready_to_dispatch=true means the cron will actually fire emails on its
   next run. If false, the individual flags pinpoint what to fix
   (commonly: functions_url_set / service_role_key_set need ops to run
   ALTER DATABASE postgres SET app.settings.functions_url TO ''https://...''
   and the same for service_role_key via Supabase dashboard).';
