# pg_cron Inventory & Cron-Secret Audit

**Date:** 2026-05-22  
**Project:** `mldbxpntzcjalgjmwnqa` (production)

## TL;DR — current state of the X-Cron-Secret chain

The chain is **half-built**. The Phase 2B commit (`fix(edge): cron secret on cron-triggered functions`) added `assertCronSecret()` to 28 cron-triggered edge functions in the **repo**, with a header note saying:

> Operator next steps (one-time):  
>   1. `SELECT vault.create_secret('<openssl rand -hex 32>', 'cron_secret');`  
>   2. Set `CRON_SECRET` env var on each edge function to the same value.  
>   3. Update existing `cron.schedule` jobs to pass `X-Cron-Secret` header.

Pre-audit reality:

| Step | Status |
|------|--------|
| `cron_secret` row in vault | ❌ never created |
| `CRON_SECRET` env var on edge functions | ❌ not set (cron calls return 200, not 500 fail-closed → functions clearly aren't running the post-Phase-2B code with `assertCronSecret`) |
| Cron jobs send `X-Cron-Secret` header | ❌ not sent — see wrapper + inline analysis below |
| Deployed function code matches repo | ❌ Phase 2B source change present in repo but not deployed (otherwise the cron calls would return 500 or 401, not 200) |

Conclusion: **today, the cron pipeline authenticates via `Authorization: Bearer <service_role_key>` only.** That's a valid auth (service_role bypasses RLS and is itself a strong secret), but it's a single point of failure if the service-role key leaks. Adding `X-Cron-Secret` as a second factor is what Phase 2B was building toward, and this commit finishes the SQL/cron half of that work.

## Live cron.job inventory (34 jobs)

Authentication grouping:

| Pattern | Count | Notes |
|---------|------:|-------|
| `scheduled.call_edge_function('<slug>')` wrapper | 26 | adds `Authorization: Bearer <service_role_key>` from `vault.decrypted_secrets`. After this commit, also adds `X-Cron-Secret`. |
| Inline `net.http_post` reading vault | 3 | drain-addon-waitlist, send_provider_weekly_digest, send-dunning-emails. Migration in this commit refactors them to use the wrapper. |
| Inline `net.http_post` using `current_setting(...)` | 1 | process-onboarding-emails-hourly. Migrated to use the wrapper. |
| Direct SQL function call (no HTTP) | 4 | cleanup-stripe-webhook-events, send-renewal-reminders, subscription-renewal-reminders (duplicate of the previous), cleanup-stripe-webhook-events. No HTTP → no header concern. |

### Full table

| jobname | schedule | command | active |
|---|---|---|---|
| auto_decline_stale_introductions | `15 * * * *` | `scheduled.call_edge_function('auto-decline-stale-introductions')` | ✓ |
| auto_reload_sweep | `0 * * * *` | `scheduled.call_edge_function('auto-reload-sweep')` | ✓ |
| calculate_ranking_scores | `0 5 * * *` | `scheduled.call_edge_function('calculate-ranking-scores')` | ✓ |
| check_brute_force_alerts | `*/15 * * * *` | `scheduled.call_edge_function('check-brute-force-alerts')` | ✓ |
| check_churn_alerts | `0 14 * * *` | `scheduled.call_edge_function('check-churn-alerts')` | ✓ |
| check_not_found_alerts | `15 */4 * * *` | `scheduled.call_edge_function('check-not-found-alerts')` | ✓ |
| check_provider_health_alerts | `0 13 * * *` | `scheduled.call_edge_function('check-provider-health-alerts')` | ✓ |
| cleanup-stripe-webhook-events | `17 3 * * *` | direct SQL: `public.cleanup_old_stripe_webhook_events()` | ✓ |
| cleanup_audit_logs | `45 3 * * *` | `scheduled.call_edge_function('cleanup-audit-logs')` | ✓ |
| cleanup_orphan_storage | `0 4 * * *` | `scheduled.call_edge_function('cleanup-orphan-storage')` | ✓ |
| cleanup_rate_limit_logs | `30 3 * * *` | `scheduled.call_edge_function('cleanup-rate-limit-logs')` | ✓ |
| drain-addon-waitlist | `*/5 * * * *` | **inline** net.http_post → `/drain-addon-waitlist` | ✓ |
| process-onboarding-emails-hourly | `0 * * * *` | **inline** net.http_post → `/process-onboarding-emails` (uses `current_setting`) | ✓ |
| process_lead_redistribution | `*/30 * * * *` | `scheduled.call_edge_function('process-lead-redistribution')` | ✓ |
| process_provider_drip | `0 16 * * *` | `scheduled.call_edge_function('process-provider-drip')` | ✓ |
| process_seeker_drip | `15 16 * * *` | `scheduled.call_edge_function('process-seeker-drip')` | ✓ |
| process_seeker_followup_reminders | `30 16 * * *` | `scheduled.call_edge_function('process-seeker-followup-reminders')` | ✓ |
| purge_deleted_seekers | `30 4 * * *` | `scheduled.call_edge_function('purge-deleted-seekers')` | ✓ |
| retry_failed_payments | `0 */6 * * *` | `scheduled.call_edge_function('retry-failed-payments')` | ✓ |
| send-dunning-emails | `0 10 * * *` | **inline** net.http_post → `/send-dunning-emails` | ✓ |
| send-renewal-reminders | `0 9 * * *` | direct SQL: `public.send_subscription_renewal_reminders()` | ✓ |
| send_abandoned_placement_email | `45 15 * * *` | `scheduled.call_edge_function('send-abandoned-placement-email')` | ✓ |
| send_admin_daily_summary | `0 13 * * *` | `scheduled.call_edge_function('send-admin-daily-summary')` | ✓ |
| send_marketing_followup | `0 18 * * *` | `scheduled.call_edge_function('send-marketing-followup')` | ✓ |
| send_new_facility_alerts | `30 15 * * *` | `scheduled.call_edge_function('send-new-facility-alerts')` | ✓ |
| send_payment_reminder | `10 15 * * *` | `scheduled.call_edge_function('send-payment-reminder')` | ✓ |
| send_profile_reminders | `0 15 * * 1` | `scheduled.call_edge_function('send-profile-reminders')` | ✓ |
| send_provider_weekly_digest | `0 13 * * 0` | **inline** net.http_post → `/send-provider-weekly-digest` | ✓ |
| send_saved_search_alerts | `0 15 * * *` | `scheduled.call_edge_function('send-saved-search-alerts')` | ✓ |
| send_seeker_weekly_digest | `30 13 * * 0` | `scheduled.call_edge_function('send-seeker-weekly-digest')` | ✓ |
| send_subscription_alerts | `0 17 * * *` | `scheduled.call_edge_function('send-subscription-alerts')` | ✓ |
| send_unlock_reminders | `0 15 * * *` | `scheduled.call_edge_function('send-unlock-reminders')` | ✓ |
| subscription-renewal-reminders | `0 9 * * *` | direct SQL (DUPLICATE of `send-renewal-reminders`) | ✓ |
| send-abandoned-placement-email observation | — | already retired in source (returns 410 Gone) but still scheduled | ⚠ |

## What this commit changes

Migration `20260522081000_cron_x_cron_secret_wiring.sql`:

1. **Create `cron_secret` in `vault.secrets`** with a fresh 256-bit random value (`encode(gen_random_bytes(32), 'hex')`). Skips if a row already exists.

2. **Rewrite `scheduled.call_edge_function`** to also send `X-Cron-Secret: <vault.cron_secret>` alongside the existing `Authorization` header. Adds defense-in-depth: even if the service-role key leaks, an attacker can't impersonate cron unless they also have the cron secret.

3. **Refactor the 4 inline-net.http_post jobs** (`drain-addon-waitlist`, `send-dunning-emails`, `send_provider_weekly_digest`, `process-onboarding-emails-hourly`) to use the wrapper. This:
   - Eliminates `current_setting('app.settings.service_role_key', true)` (fragile session-level setting).
   - Centralises the auth headers in one place — future header changes (e.g., adding a tenant id) happen in one function.
   - Adds the `X-Cron-Secret` header to those jobs too.

4. **Drop the duplicate `subscription-renewal-reminders` job** (identical schedule + command as `send-renewal-reminders`). Leftover from an old rename.

## What this commit DOES NOT do

- ❌ Does not rotate the cron secret. There's nothing to rotate yet — this commit creates the row for the first time. A future commit can rotate via `vault.update_secret(<new>, 'cron_secret')`.

- ❌ Does not set the `CRON_SECRET` env var on each edge function. That's a Supabase Dashboard operation (Project Settings → Edge Functions → Secrets) and requires operator action. Until it's set, the deployed edge functions still don't enforce the header (cron calls still return 200, same as today). The system stays in its current state until the operator completes:

  1. **Dashboard → Edge Functions → Secrets:** add `CRON_SECRET` with the value from `SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cron_secret';`

  2. **`supabase functions deploy`** (or dashboard redeploy) for each of the 29 cron-triggered functions listed in `scripts/check-edge-function-auth.mjs` so the post-Phase-2B `assertCronSecret()` code goes live.

  Once both are done, cron calls will start enforcing the header, and any unauthenticated probe of `/functions/v1/<cron-slug>` will get 401 instead of running the function.

- ❌ Does not change the deployed function code. The repo already has `assertCronSecret()` in place from Phase 2B — it just hasn't been deployed.

## Operator runbook (rotation, once the chain is live)

```sql
-- 1. Generate a new value and rotate vault.
SELECT vault.update_secret(
  (SELECT id FROM vault.secrets WHERE name = 'cron_secret'),
  encode(gen_random_bytes(32), 'hex')
);
```

```bash
# 2. Read the new value back and update the env var.
psql -At -c "SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cron_secret';"
# Paste into Dashboard → Edge Functions → Secrets → CRON_SECRET
```

```bash
# 3. Redeploy any cron-triggered function whose CRON_SECRET env was cached
# at boot (Supabase reloads env on the next cold start, but force a deploy
# to be sure):
supabase functions deploy --all
```

Total downtime ≈ 0 (the wrapper picks up the new vault value at the next cron tick, but the function env may lag by one or two ticks — those calls return 401 until the env catches up; pg_cron retries on the next slot).

## Acceptance check (post-deploy)

```sql
-- Should return 401 once env vars are set + functions redeployed.
SELECT net.http_post(
  url := 'https://mldbxpntzcjalgjmwnqa.functions.supabase.co/check-brute-force-alerts',
  body := '{}'::jsonb,
  headers := jsonb_build_object('Content-Type', 'application/json')
  -- no X-Cron-Secret on purpose
);
SELECT status_code, left(content::text, 200) FROM net._http_response ORDER BY id DESC LIMIT 1;
-- expected: 401, body containing "Missing cron secret"
```
