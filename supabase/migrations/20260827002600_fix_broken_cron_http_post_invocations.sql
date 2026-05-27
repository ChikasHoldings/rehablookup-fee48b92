-- Fix two cron jobs that have failed on EVERY run since they were created.
--
-- Both were scheduled to invoke their edge function via
--   extensions.http_post(url => text, body => text, headers => jsonb, ...)
-- but that function/signature does not exist on this instance — pg_net exposes
--   net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds int)
-- in the `net` schema. Every run raised
--   "function extensions.http_post(...) does not exist"
-- so the FOMO promo-campaign email sequence and the placement-review-request
-- emails NEVER fired.
--
-- Re-point both at the canonical scheduled.call_edge_function(slug) wrapper
-- that every other edge-invoking cron already uses. It reads project_url +
-- service_role_key + cron_secret from Vault and calls net.http_post with the
-- correct signature, sending both `Authorization: Bearer <service_role_key>`
-- and `X-Cron-Secret`, which satisfies each function's assertCronSecret +
-- service-role gate. Schedules are unchanged.
SELECT cron.schedule(
  'send-promo-campaign-emails',
  '37 * * * *',
  $$SELECT scheduled.call_edge_function('send-promo-campaign-emails');$$
);

SELECT cron.schedule(
  'send-placement-review-requests',
  '17 * * * *',
  $$SELECT scheduled.call_edge_function('send-placement-review-requests');$$
);
