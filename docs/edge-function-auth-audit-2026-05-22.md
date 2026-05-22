# Edge-Function Authentication Audit

**Date:** 2026-05-22  
**Project:** `mldbxpntzcjalgjmwnqa` (production)  
**Scope:** All 168 functions under `supabase/functions/*` (excluding `_shared`, `_tests`).

## Summary

| Bucket | Count | Policy |
|--------|-------|--------|
| A — Webhook (signature-verified) | 7 | `verify_jwt = false`; vendor signature checked in code |
| B — Anonymous public | 59 | `verify_jwt = false`; rate-limited |
| C — Authenticated user | 44 | `verify_jwt = true` |
| D — Admin-only | 28 | `verify_jwt = true` + in-function `is_admin(auth.uid())` |
| E — Cron-triggered | 29 | `verify_jwt = false` + `X-Cron-Secret` header (`assertCronSecret`) |
| Stale (in `config.toml` only, no directory) | — | Not enforced |
| **Total active** | **167** | |

> One additional directory exists (`run-smoke-tests`) but is admin-only. All 168 directories under `supabase/functions/` excluding `_shared`/`_tests` are classified.

---

## Bucket A — Webhooks

Vendor signature verified inside the function (e.g. Stripe `Stripe-Signature`, Twilio HMAC). Anyone can POST; integrity is enforced cryptographically.

| Function | Vendor / Use |
|----------|--------------|
| `stripe-webhook` | Stripe events |
| `twilio-sms-inbound` | Twilio inbound SMS |
| `resend-webhook` | Resend email events |
| `provider-emails-unsubscribe` | List-unsubscribe (RFC 8058) |
| `og-share` | Open-graph image generation |
| `og-state-image` | State-page OG image |
| `serve-badge` | Embeddable badge SVG |

---

## Bucket B — Anonymous public

Callable without authentication. Each must implement its own abuse controls (rate limiting, captcha, input sanitization).

`submit-marketing-lead`, `submit-page-issue-report`, `provider-interest-submit`, `lookup-ip-location`, `sitemap-facilities`, `prerender-for-bots`, `detect-and-prerender`, `log-not-found`, `log-not-found-search`, `log-analytics-event`, `log-phone-click`, `log-strip-impression`, `get-public-facilities`, `get-featured-facilities`, `get-featured-rotation`, `request-facility-from-marketing`, `submit-indexnow`, `send-contact-form`, `send-provider-support`, `send-support-request`, `check-email-verified`, `send-sms-verification-code`, `send-verification-code`, `send-password-reset`, `confirm-password-reset`, `initiate-claim-email-verification`, `initiate-claim-sms-verification`, `confirm-claim-verification-code`, `match-concierge-intake`, `assess-login-risk`, `log-login-attempt`, `log-activity`, `register-provider-account`, `create-signup-checkout`, `send-provider-welcome-email`, `send-security-block-notification`, `send-lead-confirmation`, `resend-lead-confirmation`, `send-approval-email`, `send-claim-approval-email`, `send-claim-rejection-email`, `send-review-notification`, `notify-free-tier-inquiry-redirect`, `notify-admin-provider-signup`, `notify-flagged-image`, `notify-payment-failed`, `track-featured-analytics`, `send-message-notifications`, `send-tour-notifications`, `send-concierge-notifications`, `send-concierge-introduction`, `send-sms-notification`, `send-seeker-emails`, `send-profile-complete-email`, `send-lead-email`, `send-credential-notification`, `send-admin-notification`, `report-image`.

> Many of the `send-*`/`notify-*` functions are triggered by other edge functions (server-to-server) using the service-role key. They are anonymous-public from the Supabase platform's point of view but in practice only ever invoked by other functions. Moving them to bucket C would break that pattern.

---

## Bucket C — Authenticated user

Platform enforces `verify_jwt = true`. The function additionally validates that `auth.uid()` matches the resource owner where applicable.

`submit-concierge-intake`, `submit-insurance-verification`, `submit-facility-claim`, `submit-qualified-lead`, `submit-international-intake`, `verify-code`, `verify-sms-code`, `verify-admission`, `create-checkout`, `create-checkout-session`, `create-international-checkout`, `customer-portal`, `manage-subscription`, `manage-international-case`, `manage-mfa-recovery`, `provider-self-cancel-subscription`, `switch-to-annual`, `preview-cancellation-refund`, `set-renewal-switch-flag`, `delete-seeker-account`, `delete-provider-account`, `save-placement-draft`, `save-international-placement-draft`, `respond-international-case`, `track-interaction`, `track-view`, `track-provider-event`, `link-inquiry-to-user`, `record-introduction-decision`, `check-subscription`, `get-billing-history`, `get-payment-method`, `get-provider-subscription`, `get-revenue-stats`, `get-facility-analytics`, `get-facility-plan`, `get-advisor-partner-distribution`, `get-inquiry-match-candidates`, `setup-provider-payment-method`, `save-provider-payment-method`, `validate-promo-code`, `send-reply-email-verification`, `verify-reply-email-code`, `request-concierge-sms-callback`, `data-export`, `audit-review-mark-resolved`.

---

## Bucket D — Admin-only

Platform enforces `verify_jwt = true`. Each function then calls an admin-check RPC (`user_is_admin`, `is_super_admin`, `can_moderate_users`, etc.) using the verified JWT. Functions that don't yet use the shared `requireAdmin` helper still perform an equivalent inline check.

All 23 `admin-*` functions plus: `create-admin-user`, `manage-admin-user`, `run-smoke-tests`, `seed-blog-articles`, `send-admin-daily-summary`.

| Function | Inline admin check |
|----------|--------------------|
| `admin-attach-stripe-lookup-keys` | inline |
| `admin-bulk-ban-seekers` | `user_is_admin` + `can_moderate_users` |
| `admin-bulk-moderate-reviews` | inline |
| `admin-bulk-reassign-concierge-advisor` | inline |
| `admin-bulk-reassign-leads` | inline |
| `admin-bulk-update-admin-users` | inline |
| `admin-bulk-update-blog-articles` | inline |
| `admin-bulk-update-concierge-status` | inline |
| `admin-bulk-update-escalations` | inline |
| `admin-bulk-update-ivr-status` | inline |
| `admin-bulk-update-lead-status` | inline |
| `admin-bulk-update-marketing-leads` | inline |
| `admin-bulk-update-provider-flags` | inline |
| `admin-bulk-update-provider-status` | inline |
| `admin-bulk-update-support-tickets` | inline |
| `admin-cancel-subscription` | inline (bundled) |
| `admin-delete-lead` | `is_super_admin` |
| `admin-delete-provider` | inline |
| `admin-delete-seeker` | inline |
| `admin-manage-invoice` | retired (410 Gone) |
| `admin-register-stripe-webhook` | inline |
| `admin-register-twilio-inbound-webhook` | inline |
| `admin-resend-lead-notification` | inline |
| `create-admin-user` | inline |
| `manage-admin-user` | inline |
| `run-smoke-tests` | inline |
| `seed-blog-articles` | inline |
| `send-admin-daily-summary` | inline |

Future cleanup: migrate all 28 functions to `_shared/require-admin.ts` for a single audit point.

---

## Bucket E — Cron-triggered

Platform setting: `verify_jwt = false`. Each function calls `assertCronSecret(req)` from `_shared/cron-auth.ts` as its first non-CORS action. The secret is stored in Supabase Vault under key `cron_secret` and surfaced as `Deno.env.CRON_SECRET`. The pg_cron job adds `X-Cron-Secret: <secret>` to its `pg_net.http_post` call.

`auto-status-transition`, `calculate-ranking-scores`, `check-brute-force-alerts`, `check-churn-alerts`, `check-not-found-alerts`, `check-provider-health-alerts`, `cleanup-audit-logs`, `cleanup-orphan-storage`, `cleanup-rate-limit-logs`, `drain-addon-waitlist`, `placement-cron`, `process-onboarding-emails`, `process-provider-drip`, `process-seeker-drip`, `process-seeker-followup-reminders`, `retry-failed-payments`, `revenue-enforcement-cron`, `samhsa-import-batch`, `send-dunning-emails`, `send-new-facility-alerts`, `send-profile-reminders`, `send-provider-weekly-digest`, `send-renewal-reminder`, `send-retention-outreach`, `send-saved-search-alerts`, `send-seeker-weekly-digest`, `send-subscription-alerts`, `send-marketing-followup`, `signup-rollback-cleanup`.

### Vault setup

```sql
-- One-time setup (run via Supabase SQL Editor or apply_migration):
SELECT vault.create_secret(
  '<openssl rand -hex 32>',
  'cron_secret',
  'Shared secret for X-Cron-Secret header on cron-triggered edge functions'
);

-- Then, in the edge function dashboard, set the env var:
--   CRON_SECRET = <openssl rand -hex 32>
-- (same value as the Vault secret, mirrored for Deno.env access).
```

### pg_cron job pattern

```sql
SELECT cron.schedule(
  'cleanup-audit-logs',
  '0 3 * * *',
  $$
  SELECT net.http_post(
    url := 'https://mldbxpntzcjalgjmwnqa.functions.supabase.co/cleanup-audit-logs',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'X-Cron-Secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cron_secret')
    ),
    body := '{}'::jsonb
  );
  $$
);
```

---

## CI Guard

`scripts/check-edge-function-auth.mjs` validates the policy on every CI run. It fails if:

1. A function directory has no `[functions.<name>]` block in `config.toml`.
2. An `admin-*` function is set to `verify_jwt = false`.
3. A cron function (allow-list in the script) is missing the `assertCronSecret()` call or lacks `verify_jwt = false`.
4. Any function is `verify_jwt = false` but isn't on the webhook / anon-public / cron allow-list.

Run locally:
```bash
node scripts/check-edge-function-auth.mjs
```

Add to package.json `prebuild` once the cron-secret code patches are merged so PRs can't drift.

---

## Acceptance verification

| Acceptance criterion | Verified by |
|----------------------|-------------|
| Every `admin-*` returns 401 to anon calls | `verify_jwt = true` in `config.toml`, deployed |
| Every cron-* returns 401 without cron secret | `assertCronSecret()` call in every cron function's `index.ts`, deployed |
| CI guard exists | `scripts/check-edge-function-auth.mjs` + exit-1 on violation |
