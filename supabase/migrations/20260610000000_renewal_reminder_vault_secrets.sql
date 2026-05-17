-- Repair the existing send-renewal-reminders cron path.
--
-- enqueue_renewal_reminder (migration 20260522000000) calls
-- extensions.http_post with current_setting('app.settings.functions_url')
-- and current_setting('app.settings.service_role_key'). On Supabase
-- platform managed projects, ALTER DATABASE ... SET app.settings.*
-- requires postgres superuser, which the platform doesn't expose, so
-- both GUCs have been NULL since deployment and the renewal-reminder
-- cron has been firing into the void.
--
-- The 20260605000000 + 20260609000000 cron migrations switched to
-- Vault. For consistency, this migration switches the renewal-reminder
-- function to the same Vault pattern so the existing cron starts
-- working too.
--
-- Idempotent: CREATE OR REPLACE FUNCTION.

BEGIN;

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
  v_functions_url text;
  v_service_role_key text;
BEGIN
  SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net')
    INTO v_pg_net_present;
  IF NOT v_pg_net_present THEN
    RAISE NOTICE 'pg_net not installed — renewal reminder for subscription % (%) not dispatched', p_subscription_id, p_milestone;
    RETURN;
  END IF;

  SELECT decrypted_secret INTO v_functions_url
    FROM vault.decrypted_secrets WHERE name = 'functions_url' LIMIT 1;
  SELECT decrypted_secret INTO v_service_role_key
    FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1;

  IF v_functions_url IS NULL OR v_service_role_key IS NULL THEN
    RAISE NOTICE 'Vault secrets functions_url/service_role_key missing — renewal reminder for subscription % (%) not dispatched', p_subscription_id, p_milestone;
    RETURN;
  END IF;

  PERFORM extensions.http_post(
    url := v_functions_url || '/send-renewal-reminder',
    body := jsonb_build_object(
      'subscription_id', p_subscription_id,
      'milestone', p_milestone
    )::text,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_service_role_key
    )::jsonb,
    timeout_milliseconds := 5000
  );
END;
$$;

COMMIT;
