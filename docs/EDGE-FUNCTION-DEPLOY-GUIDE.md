# Edge Function Deploy Guide — Pending Deploys

**Date:** 2026-05-21
**Project ref:** `mldbxpntzcjalgjmwnqa`
**Branch:** `claude/phase2-deployment-5WYOn`

This guide walks you through deploying the 4 edge functions that have
modified or new source in the repo but stale or missing copies in
production. One function (#5) is included as a verification step
because it appears to already be deployed.

## Deployed-vs-local audit summary

| # | Function | Deployed state | Local source | Action |
| --- | --- | --- | --- | --- |
| 1 | `send-seeker-emails` | v6, deployed **2026-05-08** | modified 2026-05-21 | **DEPLOY** (G1+G2+G4+G5 bundled) |
| 2 | `send-seeker-weekly-digest` | NOT DEPLOYED | new file | **DEPLOY** (first time) |
| 3 | `process-seeker-followup-reminders` | NOT DEPLOYED | new file | **DEPLOY** (first time) |
| 4 | `twilio-sms-inbound` | v1, deployed **2026-05-17** | modified 2026-05-21 | **DEPLOY** (v1.2.0 — seeker STOP/START) |
| 5 | `send-review-notification` | v7, deployed **2026-05-21 01:56** | modified 2026-05-21 01:40 | VERIFY (deployed timestamp is AFTER local edits — likely already in sync, but re-deploy is a safe no-op) |

---

# Pre-flight: install + login (one-time, ~2 min)

You only need to do this once per machine.

```bash
# Install Supabase CLI
# macOS:
brew install supabase/tap/supabase

# Linux / WSL / Windows:
npm install -g supabase

# Verify
supabase --version
```

```bash
# Log in (opens a browser to authenticate)
supabase login
```

After login, the CLI stores a token at `~/.supabase/`. You can skip
this step on subsequent deploys.

```bash
# Confirm you can see the project
supabase projects list
# Look for: mldbxpntzcjalgjmwnqa
```

```bash
# Navigate into the repo
cd /home/user/rehablookup-fee48b92
# (Or wherever you've cloned the branch claude/phase2-deployment-5WYOn)
```

Pull the latest before deploying:
```bash
git pull origin claude/phase2-deployment-5WYOn
```

---

# Function 1 — `send-seeker-emails`

## Why this deploy

Bundles four changes from this session:
- **G1 cleanup** — removed orphan `request_confirmation` branch (the live confirmation email goes out via `submit-qualified-lead` directly)
- **G2 leadId support** — `facility_contacted_you` invocations now key by `leadId` so each inquiry gets its own email (was keyed by seeker, dedup'd everything after the first)
- **G4 password_changed** — new `type=password_changed` security email fired from SeekerSettings after a successful password rotation
- **G5 security_alert** — new `type=security_alert` email fired from Login.tsx when a seeker signs in from a new device fingerprint

Without this deploy, the client invokes:
- `send-seeker-emails` with `type: "password_changed"` → returns 400 "Unknown email type" (silently swallowed; no email sent)
- `send-seeker-emails` with `type: "security_alert"` → same
- `send-seeker-emails` with `type: "facility_contacted_you", leadId: <uuid>` → old function ignores leadId, uses seeker-keyed idempotency (over-dedups)

## Method A — Supabase CLI (RECOMMENDED, takes ~30s)

```bash
supabase functions deploy send-seeker-emails \
  --project-ref mldbxpntzcjalgjmwnqa \
  --no-verify-jwt
```

`--no-verify-jwt` is correct — this function is called by the client
with the anon key + serializes its own auth check internally. Other
deployed functions in this project use the same flag for the same
reason.

Expected output:
```
Deploying function send-seeker-emails (project ref: mldbxpntzcjalgjmwnqa)...
Deployed Function send-seeker-emails on project mldbxpntzcjalgjmwnqa.
You can inspect your deployment in the Dashboard: https://supabase.com/dashboard/project/mldbxpntzcjalgjmwnqa/functions
```

## Method B — Dashboard (no CLI)

1. Open https://supabase.com/dashboard/project/mldbxpntzcjalgjmwnqa/functions/send-seeker-emails/code
2. The editor loads with the **deployed** version. Click the "Code" tab if you don't see the file tree.
3. In the file tree, click `index.ts` (or `functions/send-seeker-emails/index.ts`).
4. **Select all content in the editor and delete it.**
5. **Paste the full local file contents** from
   `/home/user/rehablookup-fee48b92/supabase/functions/send-seeker-emails/index.ts`
   (1,367 lines / 73 KB — open it in your editor, ⌘A / Ctrl+A, ⌘C, ⌘V into the dashboard).
6. Click **"Deploy"** button (top-right of the editor).
7. Wait for the green "Deployment successful" toast (~15-30s).

Note: this function imports `../_shared/resilient-email-sender.ts`. The
dashboard preserves the shared file from the existing deployment — you
don't need to re-upload it. If the dashboard shows an import error,
the shared file is already there; that's normal.

## Verify

```bash
# After deploy, smoke-test by sending a welcome to your own seeker user.
# Replace <your-anon-key> with the anon key from:
# https://supabase.com/dashboard/project/mldbxpntzcjalgjmwnqa/settings/api
# Replace <your-seeker-user-id> with your auth.users.id from the dashboard
# Authentication → Users tab.

curl -X POST \
  "https://mldbxpntzcjalgjmwnqa.supabase.co/functions/v1/send-seeker-emails" \
  -H "Authorization: Bearer <your-anon-key>" \
  -H "Content-Type: application/json" \
  -d '{"type":"password_changed","seekerId":"<your-seeker-user-id>","email":"<your-email>"}'
```

Expected: `{"success":true,"messageId":"<resend-id>"}` and a "🔐 Your
RehabLookup password was changed" email in your inbox within ~30s.

---

# Function 2 — `send-seeker-weekly-digest` (NEW)

## Why this deploy

This is a **new** edge function that doesn't exist in production yet.
Closes Gap G3 from the seeker email audit — seekers had no weekly
digest while providers did. The cron schedule
(`send_seeker_weekly_digest` Sundays 13:30 UTC) is already live in
`pg_cron`; it will invoke this function the moment it exists.

## Method A — Supabase CLI (RECOMMENDED, takes ~30s)

```bash
supabase functions deploy send-seeker-weekly-digest \
  --project-ref mldbxpntzcjalgjmwnqa \
  --no-verify-jwt
```

`--no-verify-jwt` is correct — the function does its own service-role
JWT-role-claim check (stricter than Supabase's generic JWT verify; it
requires the role claim to be exactly `service_role`).

## Method B — Dashboard

1. Open https://supabase.com/dashboard/project/mldbxpntzcjalgjmwnqa/functions
2. Click **"Create a new function"** (top-right green button).
3. Name: `send-seeker-weekly-digest`
4. In the file editor, **delete the placeholder content** and **paste
   the full local file contents** from
   `/home/user/rehablookup-fee48b92/supabase/functions/send-seeker-weekly-digest/index.ts`
   (384 lines / 17 KB).
5. **Uncheck** the "Verify JWT" checkbox if visible (function does its own gate).
6. Click **"Deploy function"**.

This function is self-contained (no `_shared/*` imports), so no
additional files needed.

## Verify

```bash
# Dry-run against a single user — no email sent, just stats.
# Replace <your-service-role-key> from
# https://supabase.com/dashboard/project/mldbxpntzcjalgjmwnqa/settings/api
# Replace <some-seeker-userId> with an active seeker's auth.users.id

curl -X POST \
  "https://mldbxpntzcjalgjmwnqa.supabase.co/functions/v1/send-seeker-weekly-digest" \
  -H "Authorization: Bearer <your-service-role-key>" \
  -H "Content-Type: application/json" \
  -d '{"dryRun":true,"onlyUserId":"<some-seeker-userId>"}'
```

Expected:
```json
{
  "scanned": 1,
  "sent": 1,                 // or 0 if user has inactiveSkipped/suppressed/skipped
  "skipped": 0,
  "suppressed": 0,
  "inactiveSkipped": 0,      // 1 if user had no activity in past 7d
  "failed": 0,
  "failures": [],
  "isoWeek": "2026-W21",
  "dryRun": true,
  "_version": "1.0.0"
}
```

Drop `dryRun` from the body to actually send the email.

---

# Function 3 — `process-seeker-followup-reminders` (NEW)

## Why this deploy

New edge function that doesn't exist in production yet. Closes Gap G6.
Daily cron (`process_seeker_followup_reminders` 16:30 UTC) is already
live and will invoke this function once deployed. Sends the
"Have you heard back?" reminder to seekers whose inquiries are 3+ days
old without a provider response.

## Method A — Supabase CLI (RECOMMENDED, takes ~30s)

```bash
supabase functions deploy process-seeker-followup-reminders \
  --project-ref mldbxpntzcjalgjmwnqa \
  --no-verify-jwt
```

## Method B — Dashboard

1. Open https://supabase.com/dashboard/project/mldbxpntzcjalgjmwnqa/functions
2. Click **"Create a new function"**.
3. Name: `process-seeker-followup-reminders`
4. **Paste the full local file contents** from
   `/home/user/rehablookup-fee48b92/supabase/functions/process-seeker-followup-reminders/index.ts`
   (166 lines / 6 KB).
5. **Uncheck** "Verify JWT" (function does its own service-role gate).
6. Click **"Deploy function"**.

## Verify

```bash
# Dry-run — no emails sent, just counts how many leads would be reminded.
curl -X POST \
  "https://mldbxpntzcjalgjmwnqa.supabase.co/functions/v1/process-seeker-followup-reminders" \
  -H "Authorization: Bearer <your-service-role-key>" \
  -H "Content-Type: application/json" \
  -d '{"dryRun":true}'
```

Expected:
```json
{
  "scanned": <N>,            // # of leads 3-30 days old with no provider response
  "sent": <N>,               // == scanned in dryRun mode
  "alreadySent": <M>,        // # already deduped via email_tracking_events
  "failed": 0,
  "failures": [],
  "dryRun": true,
  "_version": "1.0.0"
}
```

---

# Function 4 — `twilio-sms-inbound` (UPDATE to v1.2.0)

## Why this deploy

Bumps from v1.1.0 → v1.2.0. **Adds seeker_profiles support to the
STOP/START keyword handler.** Pre-deploy, a seeker replying STOP from
their phone got the TwiML confirmation back but no DB state changed
for them (`seeker_profiles.sms_opted_out_at` was never written). This
would have been a TCPA violation the moment any seeker SMS marketing
launched.

## Method A — Supabase CLI (RECOMMENDED, takes ~30s)

```bash
supabase functions deploy twilio-sms-inbound \
  --project-ref mldbxpntzcjalgjmwnqa \
  --no-verify-jwt
```

`--no-verify-jwt` is REQUIRED for this function — Twilio calls it with
its own X-Twilio-Signature HMAC instead of a Supabase JWT. The
function verifies the Twilio signature internally before accepting any
inbound. Do not change this flag.

## Method B — Dashboard

1. Open https://supabase.com/dashboard/project/mldbxpntzcjalgjmwnqa/functions/twilio-sms-inbound/code
2. The editor loads with the v1.1.0 deployed version.
3. **Select all + delete + paste** the full local file contents from
   `/home/user/rehablookup-fee48b92/supabase/functions/twilio-sms-inbound/index.ts`
   (275 lines / 11 KB).
4. Click **"Deploy"**.

## Verify

This function only responds to authenticated Twilio webhooks (HMAC
signature verification fails for direct curl calls). Verify via Twilio
dashboard instead:

1. Open https://supabase.com/dashboard/project/mldbxpntzcjalgjmwnqa/functions/twilio-sms-inbound
2. Check the "Logs" tab — the deploy event should appear at the top.
3. From a phone that has a `seeker_profiles.phone` E.164 entry, text **STOP** to your RehabLookup Twilio number.
4. Within ~5s, you should receive: "You're unsubscribed from RehabLookup SMS alerts..."
5. Query the DB to confirm the opt-out landed in seeker_profiles:
   ```sql
   -- In https://supabase.com/dashboard/project/mldbxpntzcjalgjmwnqa/sql/new
   SELECT user_id, phone, sms_opted_out_at, sms_opted_in_at
   FROM seeker_profiles
   WHERE phone = '+1<your-10-digit-phone>'
   LIMIT 1;
   ```
   `sms_opted_out_at` should be populated; `sms_opted_in_at` should be NULL.
6. Text **START** back. Re-query — now `sms_opted_in_at` is populated; `sms_opted_out_at` is NULL.

---

# Function 5 — `send-review-notification` (VERIFY — likely already deployed)

## Status: likely already in sync

The deployed version's `updated_at` (2026-05-21 01:56 UTC) is AFTER
the local file's last commit (2026-05-21 01:40 UTC). This suggests
the G2 change (`shouldSendSeekerInApp` helper that gates seeker in-
app notifications on `browser_notifications` preference) was deployed
during an earlier session attempt.

A redeploy is a safe no-op if the content matches; otherwise it
ensures the latest source is live.

## Method A — Supabase CLI (RECOMMENDED)

```bash
supabase functions deploy send-review-notification \
  --project-ref mldbxpntzcjalgjmwnqa \
  --no-verify-jwt
```

## Method B — Dashboard

1. Open https://supabase.com/dashboard/project/mldbxpntzcjalgjmwnqa/functions/send-review-notification/code
2. **Select all + delete + paste** local content from
   `/home/user/rehablookup-fee48b92/supabase/functions/send-review-notification/index.ts`
   (602 lines / 23 KB).
3. Click **"Deploy"**.

## Verify

```bash
# In the SQL Editor, find a seeker user_id who has email_lead_alerts=false:
# https://supabase.com/dashboard/project/mldbxpntzcjalgjmwnqa/sql/new
SELECT user_id FROM notification_preferences
WHERE browser_notifications = false LIMIT 1;
```

If that user submits a review and an admin approves it, the seeker
should NOT receive an in-app notification (the `shouldSendSeekerInApp`
gate checks `browser_notifications`). Pre-deploy, the seeker WOULD
have received the in-app notification.

---

# Post-deploy: final smoke tests

After all 5 deploys, run the seeker-panel smoke checklist from
`docs/SEEKER-PANEL-SHIP-READINESS-2026-05-21.md`:

```bash
# 1. Fresh signup → OTP → auto-login → welcome email
# 2. /account/facility/<any-id> → all 3 action buttons open modals
# 3. STOP/START via SMS → seeker_profiles.sms_opted_*_at updates
# 4. Sign up with "(415) 555-2671" → seeker_profiles.phone = "+14155552671"
```

## Useful dashboard links

- **Functions list**: https://supabase.com/dashboard/project/mldbxpntzcjalgjmwnqa/functions
- **API keys**: https://supabase.com/dashboard/project/mldbxpntzcjalgjmwnqa/settings/api
- **SQL editor**: https://supabase.com/dashboard/project/mldbxpntzcjalgjmwnqa/sql/new
- **Auth → Users**: https://supabase.com/dashboard/project/mldbxpntzcjalgjmwnqa/auth/users
- **Cron jobs**: https://supabase.com/dashboard/project/mldbxpntzcjalgjmwnqa/integrations/cron
- **Edge function logs**: https://supabase.com/dashboard/project/mldbxpntzcjalgjmwnqa/functions/{function-slug}/logs

## If a deploy fails

- **"Function not found"** when running CLI deploy → check you're in
  the repo root (`cd /home/user/rehablookup-fee48b92`) and the file
  exists at `supabase/functions/<name>/index.ts`.
- **"Permission denied"** → re-run `supabase login`.
- **TypeScript/import errors during deploy** → the function imports
  `../_shared/resilient-email-sender.ts`. Both
  `send-seeker-emails` and `send-review-notification` use it. If the
  CLI rebuilds the bundle and the shared file is missing locally,
  pull again: `git pull origin claude/phase2-deployment-5WYOn`.
- **Deploy succeeds but smoke test fails** → check the function's
  Logs tab in the dashboard (link above). Look for the function's
  version prefix (e.g. `[SEND-SEEKER-EMAILS]`, `[SEEKER-FOLLOWUP]`)
  to filter to the relevant lifecycle events.

## Rollback

Supabase keeps version history. If a deploy breaks something:

1. Open the function in the dashboard.
2. Click the **"Versions"** tab.
3. Click the previous version → **"Restore"**.

This is one-click and immediate. No commits or git rollback needed
to get back to the prior live state.
