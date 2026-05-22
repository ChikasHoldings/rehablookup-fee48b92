-- Wire X-Cron-Secret end-to-end on the SQL/cron side.
--
-- Background: Phase 2B added assertCronSecret() to 28 cron-triggered edge
-- functions (the function source reads Deno.env.get("CRON_SECRET") and
-- compares to the X-Cron-Secret request header). But the cron jobs never
-- started sending the header — the wrapper scheduled.call_edge_function
-- only sets `Authorization: Bearer <service_role_key>`. The vault row
-- `cron_secret` was also never created.
--
-- This migration completes the SQL half of that chain. The operator still
-- has to set the CRON_SECRET env var on each edge function in the
-- dashboard and redeploy (see docs/cron-inventory.md for the runbook).
-- Until that happens, this migration is a no-op for the deployed
-- functions — they ignore the new header — and the system stays in its
-- current authentication state (service_role_key via Authorization).

-- ─────────────────────────────────────────────────────────────────────────
-- 1. Create the cron_secret in vault if it doesn't exist.
--    Uses gen_random_bytes for cryptographic strength (32 bytes = 256
--    bits, hex-encoded = 64 chars).
-- ─────────────────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'cron_secret') THEN
    PERFORM vault.create_secret(
      encode(gen_random_bytes(32), 'hex'),
      'cron_secret',
      'Shared secret for X-Cron-Secret header on cron-triggered edge functions. '
        || 'Rotate via vault.update_secret(); operator must mirror to '
        || 'CRON_SECRET env var on edge functions afterward.'
    );
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────
-- 2. Rewrite the wrapper to include X-Cron-Secret. The header is the
--    second factor; the existing Authorization Bearer remains the primary
--    auth so we don't break currently-deployed functions that don't yet
--    enforce the header.
-- ─────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION scheduled.call_edge_function(
  function_slug text,
  body jsonb DEFAULT '{}'::jsonb
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_url        TEXT;
  v_key        TEXT;
  v_cron_secret TEXT;
  v_request_id BIGINT;
BEGIN
  SELECT decrypted_secret INTO v_url
  FROM vault.decrypted_secrets WHERE name = 'project_url' LIMIT 1;
  IF v_url IS NULL THEN
    RAISE EXCEPTION 'vault.secrets missing "project_url"';
  END IF;

  SELECT decrypted_secret INTO v_key
  FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1;
  IF v_key IS NULL THEN
    RAISE EXCEPTION 'vault.secrets missing "service_role_key"';
  END IF;

  -- cron_secret is OPTIONAL during the rollout window — if it's missing
  -- (e.g. a fresh staging branch where the operator hasn't created it),
  -- we still call the function with the Authorization header. The
  -- post-Phase-2B function code requires CRON_SECRET to be set on the
  -- function side AND the matching header on the request side, so the
  -- migration sequence is:
  --   (a) this migration creates vault.cron_secret + wrapper sends header
  --   (b) operator sets CRON_SECRET env on each function
  --   (c) operator redeploys each function
  -- (a) is harmless if (b)+(c) haven't happened yet; (b)+(c) without (a)
  -- would break cron entirely. So this order is safe.
  SELECT decrypted_secret INTO v_cron_secret
  FROM vault.decrypted_secrets WHERE name = 'cron_secret' LIMIT 1;

  SELECT net.http_post(
    url := v_url || '/functions/v1/' || function_slug,
    body := body,
    headers := CASE
      WHEN v_cron_secret IS NULL THEN
        jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || v_key
        )
      ELSE
        jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || v_key,
          'X-Cron-Secret', v_cron_secret
        )
    END,
    timeout_milliseconds := 25000
  ) INTO v_request_id;

  INSERT INTO scheduled.edge_function_call_log (function_slug, request_id, body)
  VALUES (function_slug, v_request_id, body);

  RETURN v_request_id;
END;
$function$;

-- ─────────────────────────────────────────────────────────────────────────
-- 3. Move the 4 inline-net.http_post cron jobs onto the wrapper. Same
--    cron schedule, just calling scheduled.call_edge_function() so the
--    auth headers are unified.
-- ─────────────────────────────────────────────────────────────────────────

-- Helper: unschedule an existing job by name, ignore if absent.
DO $$
DECLARE
  v_jobs text[] := ARRAY[
    'drain-addon-waitlist',
    'send-dunning-emails',
    'send_provider_weekly_digest',
    'process-onboarding-emails-hourly'
  ];
  v_name text;
BEGIN
  FOREACH v_name IN ARRAY v_jobs LOOP
    BEGIN
      PERFORM cron.unschedule(jobid)
      FROM cron.job
      WHERE jobname = v_name;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END LOOP;
END $$;

-- Re-schedule with the wrapper. Same slugs, same crontab.
SELECT cron.schedule(
  'drain-addon-waitlist', '*/5 * * * *',
  $$SELECT scheduled.call_edge_function('drain-addon-waitlist');$$
);
SELECT cron.schedule(
  'send-dunning-emails', '0 10 * * *',
  $$SELECT scheduled.call_edge_function('send-dunning-emails');$$
);
SELECT cron.schedule(
  'send_provider_weekly_digest', '0 13 * * 0',
  $$SELECT scheduled.call_edge_function('send-provider-weekly-digest');$$
);
SELECT cron.schedule(
  'process-onboarding-emails-hourly', '0 * * * *',
  $$SELECT scheduled.call_edge_function('process-onboarding-emails');$$
);

-- ─────────────────────────────────────────────────────────────────────────
-- 4. Drop the duplicate subscription-renewal-reminders job.
--    Identical schedule + command as send-renewal-reminders; keeping both
--    runs the work twice at 09:00 UTC, which costs Stripe API calls.
-- ─────────────────────────────────────────────────────────────────────────

DO $$
BEGIN
  PERFORM cron.unschedule(jobid)
  FROM cron.job
  WHERE jobname = 'subscription-renewal-reminders';
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;
