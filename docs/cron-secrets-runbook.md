# Cron secrets runbook

Three pg_cron jobs HTTP-POST into Supabase Edge Functions:

| Cron job | Schedule | Edge function |
|---|---|---|
| `send-renewal-reminders` | `0 9 * * *` | `send-renewal-reminder` |
| `drain-addon-waitlist` | `*/5 * * * *` | `drain-addon-waitlist` |
| `send-dunning-emails` | `0 10 * * *` | `send-dunning-emails` |

All three read two secrets from **supabase_vault**:

| Vault secret name | Value |
|---|---|
| `functions_url` | `https://<project-ref>.supabase.co/functions/v1` |
| `service_role_key` | The legacy JWT-shaped service-role key OR the new `sb_secret_*` key. Either passes the role-claim check in the cron-only edge functions. |

## Why Vault, not `app.settings.*` GUCs

`ALTER DATABASE postgres SET app.settings.functions_url TO …` requires
postgres superuser, which Supabase managed projects don't expose to
either the dashboard SQL editor or the MCP `apply_migration` connection.
Vault is the supported alternative.

## Adding / rotating secrets

1. Supabase dashboard → Settings → Vault → New secret.
2. Name **must** match exactly: `functions_url` or `service_role_key`.
3. Save. The cron picks it up on the next tick — no redeploy needed.

Or via SQL (using the dashboard's SQL editor):

```sql
SELECT vault.create_secret(
  'https://<project-ref>.supabase.co/functions/v1',
  'functions_url',
  'Supabase Edge Functions base URL for cron-fired HTTP posts.'
);
SELECT vault.create_secret(
  '<service-role-key>',
  'service_role_key',
  'Cron-only edge fns gate on JWT role=service_role.'
);
```

## Why the cron-only edge functions check the JWT `role` claim, not literal SRK equality

Supabase has migrated from JWT-shaped service-role keys (`eyJ…role:service_role…`)
to opaque secret keys (`sb_secret_…`). Both pass `verify_jwt:true` at the
platform level, but `Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")` returns
the **new** format while the legacy JWT-SRK in Vault is the **old** format.
A literal-equality check `token === env.SUPABASE_SERVICE_ROLE_KEY` would
mismatch and reject every cron call.

The fix (deployed in v1.0.1 of both `drain-addon-waitlist` and
`send-dunning-emails`): decode the JWT payload and assert
`payload.role === 'service_role'`. The platform's `verify_jwt:true` has
already validated the signature, so the role claim is trustworthy.

## Verification

```sql
-- Confirm both secrets exist + look reasonable.
SELECT
  CASE WHEN (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='functions_url' LIMIT 1) IS NOT NULL
       THEN 'set' ELSE 'MISSING' END AS functions_url,
  CASE WHEN (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='service_role_key' LIMIT 1) IS NOT NULL
       THEN 'set' ELSE 'MISSING' END AS service_role_key;

-- Trigger a manual run of each cron, then check the pg_net response table.
SELECT net.http_post(
  url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'functions_url' LIMIT 1) || '/drain-addon-waitlist',
  body := '{}'::jsonb,
  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1)
  ),
  timeout_milliseconds := 30000
) AS request_id;

-- Wait a few seconds, then:
SELECT id, status_code, substring(content::text, 1, 300)
FROM net._http_response ORDER BY id DESC LIMIT 1;
-- Expected: status_code=200, body like {"success":true,"stats":{...}}
```

## Status as of 2026-05-17 (round 14)

| Item | Status |
|---|---|
| `functions_url` Vault secret | ✓ set |
| `service_role_key` Vault secret | ✓ set |
| `drain-addon-waitlist` edge function deployed | ✓ v1.0.1 |
| `send-dunning-emails` edge function deployed | ✓ v1.0.1 |
| `drain-addon-waitlist` cron scheduled | ✓ every 5 min |
| `send-dunning-emails` cron scheduled | ✓ daily 10am UTC |
| `enqueue_renewal_reminder` switched to Vault + `net.http_post` | ✓ |
| Live smoke test of both cron edge fns | ✓ 200 OK |
