# Provider notifications & SMS — full audit + harden

**Date:** 2026-05-17 (round 18)
**Scope:** every provider-facing email + SMS workflow, end-to-end. Triggers, templates, delivery, opt-out, audit trail.

## TL;DR

Three real gaps were found and closed:

1. **Welcome email was broken** — wrong $399 Pro price, deprecated credit-unlock copy, and a strict zod schema that 400'd every `AuthSignup` call. Also the wizard signup path never fired it at all. Fixed: v3.0.0 deployed (flat $99 Pro, plan-aware content, relaxed schema accepting either `firstName` or `providerFirstName`), wired into `VerifyEmailStep` after verify-code succeeds. Live tests for both Free and Pro variants returned 200.
2. **No TCPA inbound SMS handler** — outbound SMS body referenced "Reply STOP to unsubscribe" but nothing received that reply. Fixed: built `twilio-sms-inbound` v1.0.0 with Twilio HMAC signature verification, deployed with `verify_jwt:false`, persisted `sms_opted_out_at`/`sms_opted_in_at` on `profiles`, added `sms_inbound_log` audit table, gated `send-sms-notification` v7 on `sms_opted_out_at IS NULL`.
3. **No weekly digest function existed** — `notification_preferences.email_weekly_digest` was a UI toggle with nothing behind it. Fixed: built `send-provider-weekly-digest` v1.0.0 (plan-agnostic, plan-aware summary stats, suppression-aware, Resend-idempotent per ISO week), scheduled weekly cron `0 13 * * 0`.

Provider notifications & SMS pipeline is now end-to-end functional. Twilio webhook URL configuration in the Twilio console is the only remaining manual step.

## How the audit ran

Each notification surface inventoried via:
1. `grep` of `supabase/functions/` for every `send-*`, `notify-*`, `process-*`, `resend-*` function name (174 deployed functions cross-checked against 150 in repo).
2. `grep` of `src/components/provider/` + `src/pages/provider/` for every `supabase.functions.invoke("send-…")` call site.
3. Live `net.http_post` probes against deployed functions for the critical path.
4. DB inspection of `notification_preferences`, `provider_notifications`, `emails_outbox`, `sms_inbound_log`, `email_verification_codes`, RLS policies, and cron jobs.

## Findings + fixes

### 1. Welcome email — broken pricing, broken schema, broken wiring

| Symptom | File:line | Fix |
|---|---|---|
| Subject line + body sold "$399/mo Pro" | `send-provider-welcome-email/index.ts:119` (old) | v3.0.0 deployed with flat `$99/month` and EKRA-clean benefits list. Featured + Concierge surfaced as separate add-on badges (not Pro variants). |
| Sold deprecated unlock-credit + 20%-off promo | `send-provider-welcome-email/index.ts:76,121-124,137-147` (old) | Removed entirely. No mention of leads/unlocks/credits — the EKRA-compliant model is per-listing flat-fee. |
| Strict zod schema required `facilityId/facilityName/selectedPlan` | `_shared/contracts/welcome-email-contracts.ts:20-27` | v3.0.0 relaxed: facility fields + selectedPlan optional. Accepts both `providerFirstName` and `firstName` for backward-compat. Self-contained (no shared template deps) so MCP single-file deploy fits. |
| `AuthSignup.tsx:167-176` sent `firstName` + omitted required fields → silent 400 | as cited | With the relaxed schema, the existing call now succeeds (backward-compat alias). Defaults to Free copy since `selectedPlan` isn't passed; provider gets the upgrade-to-Pro nudge in the body. |
| Wizard `AccountStep`/`VerifyEmailStep` never invoked the welcome email | `src/components/provider/onboarding/VerifyEmailStep.tsx` | Added invocation after `verify-code` returns `verified=true`, keyed by Idempotency-Key=`welcome-${email}-${plan}` so re-mounting the step never re-sends. Best-effort; never blocks the wizard. |

**Live verification:**

```
POST /send-provider-welcome-email {providerEmail:'audit-welcome-free@example.test', firstName:'AuditFree', selectedPlan:'free'}
  → 200 {"success":true,"plan":"free","_version":"3.0.0"}

POST /send-provider-welcome-email {providerEmail:'audit-welcome-pro@example.test', firstName:'AuditPro', facilityName:'Audit Recovery Center', selectedPlan:'pro'}
  → 200 {"success":true,"plan":"pro","_version":"3.0.0"}
```

### 2. TCPA inbound SMS handler — built from scratch

| Component | Status |
|---|---|
| `twilio-sms-inbound` edge function (v1.0.0) | ✓ Deployed (verify_jwt:false, Twilio HMAC-SHA1 signature verification on URL + sorted form params, returns TwiML) |
| Keyword matcher | STOP/STOPALL/UNSUBSCRIBE/CANCEL/END/QUIT → opt-out + reply; START/YES/UNSTOP → opt-in + reply; HELP/INFO → reply with support contact |
| `profiles.sms_opted_out_at` / `sms_opted_in_at` columns | ✓ Added in migration `20260517000000_sms_tcpa_opt_out_columns.sql` |
| `sms_inbound_log` audit table | ✓ Created (service-role only via RLS without policies), indexed on `received_at`, `from_phone`, `matched_user_id` |
| `notification_preferences.sms_lead_alerts=false` on opt-out | ✓ Inbound function flips this so the Settings UI shows the user-visible state |
| `send-sms-notification` v7 gate | ✓ Refuses to send when `profiles.sms_opted_out_at IS NOT NULL` (returns `{success:true, sent:false, reason:"User opted out via STOP"}`) |
| Multi-profile-same-phone safety | ✓ Opts out *every* matching profile (TCPA defense-in-depth) |

**Manual step still required:** in Twilio console, configure phone number's "A message comes in" webhook to POST to `https://mldbxpntzcjalgjmwnqa.supabase.co/functions/v1/twilio-sms-inbound`. Twilio's signature header `X-Twilio-Signature` will be validated against `TWILIO_AUTH_TOKEN` (already in Supabase secrets — used by outbound function).

### 3. Weekly digest — built from scratch

| Component | Status |
|---|---|
| `send-provider-weekly-digest` edge function (v1.0.0) | ✓ Deployed (verify_jwt:true, service-role gate via JWT role claim) |
| Eligibility | `notification_preferences.email_weekly_digest=true` AND `profiles.unsubscribed_provider_emails_at IS NULL` AND `profiles.email IS NOT NULL` |
| Summary stats per provider | new leads (count + urgent breakdown) • profile views • new reviews (count + avg rating) • profile-completeness nudge when any facility < 75% |
| Per-user-per-week idempotency | Resend `Idempotency-Key=weekly-digest-${user_id}-${iso_week}` — re-runs same week are deduped at Resend, no DB-side state needed |
| Cron schedule | `0 13 * * 0` (Sundays 13:00 UTC = 08:00 ET) — same window as `send_admin_daily_summary` |
| Dry-run mode | `{dryRun:true}` body returns counts without sending |
| Single-user mode | `{onlyUserId:"…"}` body for spot-tests |

**Live dry-run smoke test:**

```
POST /send-provider-weekly-digest {dryRun:true}  → 200 {"scanned":0,"sent":0,"skipped":0,"_version":"1.0.0"}
```

Zero providers currently have `email_weekly_digest=true` — expected for fresh DB; the toggle is opt-in.

## Notification surface inventory (current state)

### Email — every workflow

| Trigger | Function | Template | Suppression | Idempotency |
|---|---|---|---|---|
| Provider signup (AuthSignup OR wizard VerifyEmail) | `send-provider-welcome-email` v3.0.0 | inline (plan-aware, EKRA-clean) | `unsubscribed_provider_emails_at` | `welcome-${email}-${plan}` |
| Email 6-digit OTP | `send-verification-code` v2.0.0 | inline | none (transactional) | per-(email, purpose) invalidate-then-insert + 10min rate limit |
| Claim approved/rejected | `send-claim-approval-email` / `send-claim-rejection-email` | shared `_shared/email-templates.ts` | RLS-gated by provider association | per-claim |
| Pro upgrade welcome | `stripe-webhook` → activation block → existing transactional Pro email | inline | none (transactional) | webhook event-id dedup via `claim_stripe_webhook_event` |
| New lead intake | `submit-qualified-lead` → `notify-new-lead` | shared | `email_lead_alerts` toggle | per-lead |
| New inquiry (free-tier redirect) | `notify-free-tier-inquiry-redirect` | inline | `email_lead_alerts` | per-inquiry |
| Inquiry follow-up reminder | `send-followup-reminder` | shared | `followup_reminders_enabled` | per-lead + snooze |
| New review | `notify-provider-new-review` | shared | `email_lead_alerts` (umbrella) | per-review |
| Subscription renewal reminder | `send-renewal-reminder` (cron `0 9 * * *`) | inline | none (transactional) | renewal-reminder:${sub_id}:${cycle} |
| Dunning (past_due day 1/3/7) | `send-dunning-emails` (cron `0 10 * * *`) | inline | none (transactional) | dunning:${sub}:${milestone} |
| Onboarding drip (free→pro, pro→featured) | `process-onboarding-emails` (cron `0 * * * *`) | shared | `unsubscribed_provider_emails_at` | per-outbox row |
| Provider unsubscribe link target | `provider-emails-unsubscribe` | rendered HTML page | sets `unsubscribed_provider_emails_at` | trivially idempotent (UPDATE) |
| Featured/Concierge add-on welcome | `stripe-webhook` activation branches | inline | none (transactional) | webhook event-id dedup |
| Featured add-on placement abandoned | `send_abandoned_placement_email` (cron `45 15 * * *`) | shared | `unsubscribed_provider_emails_at` | per-(facility, scope) |
| Featured slot waitlist invite | `drain-addon-waitlist` (cron `*/5 * * * *`) | shared | `auto_invite_opt_out` | `addon-waitlist-invite:${row_id}` |
| Marketing follow-up | `send_marketing_followup` (cron `0 18 * * *`) | shared | `email_product_updates` | per-touch tracking |
| Profile-incomplete nudge | `send_profile_reminders` (cron Monday `0 15 * * 1`) | shared | per-facility `profile_reminder_sent_at` cap | per-facility/week |
| Weekly digest **(NEW)** | `send-provider-weekly-digest` (cron `0 13 * * 0`) | inline | `email_weekly_digest=true` AND no unsub | `weekly-digest-${user}-${iso_week}` |

### SMS — every workflow

| Trigger | Function | Gate | TCPA |
|---|---|---|---|
| Phone 6-digit OTP (provider phone-verify step + claim flow) | `send-sms-verification-code` | first-send rate limit | OTPs exempt from STOP per TCPA, but we still flow through send-sms-notification (which checks opt-out) for non-OTP messages |
| New qualified lead → provider | `submit-qualified-lead` → `send-sms-notification` v7 | `sms_lead_alerts=true` AND `phone_verified=true` AND `sms_opted_out_at IS NULL` AND E.164-valid | ✓ Honored |
| Concierge advisor introduction → partner | `send-concierge-notifications` | EKRA-safe + partner-only AND `sms_lead_alerts=true` AND opt-out gate | ✓ Honored (uses send-sms-notification under the hood) |
| Tour-scheduled SMS | `send-tour-notifications` | per-user prefs | ✓ Honored (uses send-sms-notification) |
| Inbound STOP/HELP/START **(NEW)** | `twilio-sms-inbound` v1.0.0 | Twilio HMAC signature | ✓ Sets/clears `sms_opted_out_at`; logs every inbound to `sms_inbound_log` |

### In-app provider_notifications bell

| Concern | Status |
|---|---|
| RLS enabled with user-scoped policies | ✓ 4 policies (SELECT/UPDATE/DELETE on `user_id = auth.uid()`, INSERT service-role) |
| Real-time subscription | ✓ `useProviderNotifications` subscribes to INSERT/UPDATE/DELETE filtered by user_id |
| Unread badge count | ✓ Client-side filter `notifications.filter(n => !n.read).length` over the freshest 100 rows |
| Sound + browser-Notification on new lead | ✓ Plays beep + posts a Notification when `document.hidden` |
| Mark-as-read + delete + bulk-clear | ✓ All wired with optimistic mutation rollback |

## DB/cron surface

| Object | State |
|---|---|
| Cron `send_provider_weekly_digest` `0 13 * * 0` | ✓ NEW |
| Cron `process-onboarding-emails-hourly` | ✓ pre-existing (round 17) |
| Cron `send-dunning-emails` | ✓ pre-existing |
| Cron `drain-addon-waitlist` | ✓ pre-existing |
| Table `sms_inbound_log` | ✓ NEW |
| Columns `profiles.sms_opted_out_at/sms_opted_in_at` | ✓ NEW |
| Column `profiles.unsubscribed_provider_emails_at` | ✓ pre-existing (round 17) |
| Table `email_verification_codes` CHECK (purpose) | ✓ accepts signup/general/claim_verification/password_reset/reply_email (round 16) |

## Files changed

| File | Change |
|---|---|
| `supabase/functions/send-provider-welcome-email/index.ts` | Rewrite as v3.0.0 (synced from deployed; relaxed schema; EKRA-clean copy) |
| `src/components/provider/onboarding/VerifyEmailStep.tsx` | Wire welcome email after verify-code success |
| `supabase/functions/twilio-sms-inbound/index.ts` | NEW — TCPA inbound webhook |
| `supabase/functions/send-sms-notification/index.ts` | Add `sms_opted_out_at` gate |
| `supabase/functions/send-provider-weekly-digest/index.ts` | NEW — weekly digest function |
| `supabase/migrations/20260517000000_sms_tcpa_opt_out_columns.sql` | NEW — TCPA columns + audit table |
| `supabase/migrations/20260517000100_schedule_weekly_digest_cron.sql` | NEW — cron schedule |

## Remaining manual step (out-of-band)

**Twilio console:** Phone Numbers → your number → Messaging → "A message comes in" → Webhook → POST `https://mldbxpntzcjalgjmwnqa.supabase.co/functions/v1/twilio-sms-inbound`. Without this, STOP replies hit Twilio's carrier-aggregator stop list but don't propagate to our DB until Twilio's next status callback.

## Status

| Item | Status |
|---|---|
| Welcome email v3.0.0 deployed + smoke-tested green | ✓ |
| Welcome email wired from wizard VerifyEmailStep | ✓ |
| TCPA inbound webhook deployed with Twilio signature verification | ✓ |
| `sms_opted_out_at` column + gate in send-sms-notification | ✓ |
| Audit table `sms_inbound_log` | ✓ |
| Weekly digest deployed + cron scheduled `0 13 * * 0` | ✓ |
| Repo synced with deployed source | ✓ |
| Migrations in repo | ✓ |
| Typecheck clean | ✓ |
| Provider bell badge unread query verified | ✓ |

All 17 prior audit/harden rounds remain reachable from HEAD.
