# Gap G3 closed — Seeker Weekly Digest

**Date:** 2026-05-21
**Branch:** `claude/phase2-deployment-5WYOn`
**Scope:** New `send-seeker-weekly-digest` edge function + cron schedule
mirroring the provider weekly digest. Closes the parity gap where
seekers had no weekly summary email despite the `weekly_digest`
template being defined in `send-seeker-emails` (orphan branch — no
caller, no cron).

---

## What was broken

The seeker `weekly_digest` template existed at
`supabase/functions/send-seeker-emails/index.ts:228-230` but:
- No edge function or scheduled job invoked it.
- No `cron.job` row existed for it.
- The provider analog (`send_provider_weekly_digest`) was live on the
  same Supabase project, so the asymmetry was the gap, not the
  pattern.

Net result: seekers who toggled "Weekly Summary" ON in
`/account/notification-preferences` got nothing — the toggle wrote to
the DB but the column was never read by any sender.

---

## What was built

### Edge function: `send-seeker-weekly-digest`

Self-contained (single-file) so deploys are simple. Modeled on the
provider digest pattern:

- **Service-role gate.** Verifies the JWT role claim is `service_role`
  (format-agnostic across legacy and `sb_secret_*` keys). The cron's
  `scheduled.call_edge_function` wrapper signs with the service-role
  key from `vault.decrypted_secrets`, so it's the only legitimate
  caller in production.
- **Eligibility:**
  - `notification_preferences.email_weekly_digest = true`
  - `seeker_profiles.deletion_scheduled_at IS NULL` (don't email
    accounts pending purge)
  - Email present on `auth.users` (defensive — impossible in
    normal flow)
  - Not on `suppressed_emails` (hard bounce / complaint / unsubscribe)
- **Per-seeker stats (parallel reads, last 7 days unless otherwise
  noted):**
  - **Requests sent** — `leads` rows with this seeker's email,
    created in the window
  - **Responses received** — leads with `provider_responded_at NOT
    NULL` in the window
  - **Saved facilities** — `user_favorites` total count (not 7-day;
    encourages action on stale saves)
  - **New facilities in your state** — `facilities.status='approved'`
    created in the window, filtered by `seeker_profiles.state`
- **Empty-state suppression.** If `requestsSent === 0 &&
  responsesReceived === 0 && savedFacilities === 0`, skip the send.
  No point shipping a "0 0 0" digest to an inactive user — it erodes
  inbox trust without delivering value. Catches them next week when
  they engage.
- **Idempotency:** `Idempotency-Key:
  seeker-weekly-digest-${user_id}-${iso_week}`. Resend dedups
  server-side, so re-running the cron during the same ISO week is a
  no-op.
- **Headers:**
  - `List-Unsubscribe: <preferences-url>, <mailto:...>` per RFC 8058
  - `List-Unsubscribe-Post: List-Unsubscribe=One-Click`
- **Optional payload** (POST body):
  - `dryRun: true` — render and count without sending; useful for
    manual testing
  - `onlyUserId: "<uuid>"` — process a single seeker; for end-to-end
    smoke tests
- **Response:** structured JSON
  `{ scanned, sent, skipped, suppressed, inactiveSkipped, failed, failures: [...], isoWeek, dryRun, _version }`
  so the cron log surfaces operability stats.

### Cron schedule

`send_seeker_weekly_digest` at `30 13 * * 0` (Sundays 13:30 UTC =
08:30 ET / 05:30 PT). 30-min offset from
`send_provider_weekly_digest` (which fires 13:00 UTC) so the two
batches don't compete for Resend rate limit.

Verified live via `pg_cron`:

```
jobname                    | schedule    | active
send_seeker_weekly_digest  | 30 13 * * 0 | true
```

Migration applied: `20260706000000_schedule_seeker_weekly_digest_cron.sql`.

---

## Design decisions

### Why self-contained rendering instead of delegating to `send-seeker-emails type=weekly_digest`?

Two reasons:
1. **Consistency.** The provider digest is self-contained. Following
   the same pattern keeps the digest pair symmetric and the
   maintenance story simple.
2. **Richer content.** The existing `weekly_digest` branch in
   `send-seeker-emails` only takes `{ requestCount, newFacilities }`
   metadata — too thin to express response counts, state-specific
   new facilities, and contextual nudges (saves > 0 but requests = 0,
   etc.). Rewriting the template inside send-seeker-emails would
   need the same redeploy cost as building it fresh in the digest
   function, with no upside.

The orphan `weekly_digest` branch in `send-seeker-emails` is now
unambiguously dead. Removing it is its own commit (touches the
already-pending send-seeker-emails redeploy from G2); deferred so the
diff stays minimal.

### Why dynamic subject lines?

Three branches:
1. `responsesReceived > 0` → "N facilities have responded to your search"
2. `requestsSent > 0` → "Your weekly treatment search update — N requests sent"
3. Otherwise → "Your weekly treatment search update"

The first variant is a notable inbox-attention upgrade for a seeker
who actually got responses — they're more likely to open. The third
variant only fires when the seeker has saved facilities AND no recent
activity (the empty-state suppression catches the rest).

### Why suppress sends when activity is zero?

A weekly digest with three zeros is noise. Seekers in the discovery
phase (no saves, no requests) need encouragement via the welcome
sequence and onboarding drip — both of which already fire. The
weekly digest's job is to summarize THEIR activity; sending it with
no activity to summarize is a worse signal than skipping it.

The cron stats surface this as `inactiveSkipped` so ops can monitor
the engagement-vs-noise ratio over time.

### Why `state`-scoped new-facilities count instead of global?

A seeker in Texas doesn't care that a new facility opened in Maine.
`seeker_profiles.state` (auto-filled from the zipcode at signup)
gives a useful filter without requiring saved-search infrastructure.
Future enhancement: respect saved-search criteria when present.

---

## Files changed

```
NEW:
  supabase/functions/send-seeker-weekly-digest/index.ts
    - v1.0.0 self-contained digest function
    - Service-role JWT gate
    - Eligibility + suppression + dry-run / single-user modes
    - Idempotency via Resend Idempotency-Key
    - Empty-state suppression for zero-activity seekers

  supabase/migrations/20260706000000_schedule_seeker_weekly_digest_cron.sql
    - pg_cron job 'send_seeker_weekly_digest' Sundays 13:30 UTC
    - Calls via scheduled.call_edge_function (vault service-role key)
    - Applied live (mldbxpntzcjalgjmwnqa); verified in cron.job
```

---

## Verification

- `npx tsc --noEmit` → clean
- `npx vitest run` → 128 passed, 5 skipped
- `npx vite build` → built successfully
- Cron applied live; verified via `pg_cron`:
  - jobname: `send_seeker_weekly_digest`
  - schedule: `30 13 * * 0`
  - active: `true`

---

## Manual deploy required (one-step)

The edge function source is in the repo; deploy it once via Supabase CLI:

```bash
supabase functions deploy send-seeker-weekly-digest \
  --project-ref mldbxpntzcjalgjmwnqa \
  --no-verify-jwt
```

`--no-verify-jwt` is correct — the function does its own service-role
JWT-role-claim check, which is stricter than Supabase's generic JWT
verify (it requires the role claim to be exactly `service_role`).

Once deployed, the next Sunday 13:30 UTC tick will fire the cron. To
smoke-test immediately without waiting for the cron:

```bash
# Dry-run for a single user (no email sent, just stats)
curl -X POST \
  "https://mldbxpntzcjalgjmwnqa.supabase.co/functions/v1/send-seeker-weekly-digest" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"dryRun": true, "onlyUserId": "<some-seeker-uuid>"}'

# Real send to a single user
curl -X POST \
  "https://mldbxpntzcjalgjmwnqa.supabase.co/functions/v1/send-seeker-weekly-digest" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"onlyUserId": "<some-seeker-uuid>"}'
```

Expected response shape:
```json
{
  "scanned": 1,
  "sent": 1,
  "skipped": 0,
  "suppressed": 0,
  "inactiveSkipped": 0,
  "failed": 0,
  "failures": [],
  "isoWeek": "2026-W21",
  "dryRun": false,
  "_version": "1.0.0"
}
```

---

## Acceptance criteria status (across the email-system audit)

| Criterion | Status | Note |
| --- | --- | --- |
| Welcome post-verification only | ✅ | G2 doc |
| Auto-login after verification | ✅ | G2 doc |
| All required emails exist + trigger correctly | ✅ | After G3 deploy lands. Verification, welcome, drip 4×, inquiry confirmation, facility-responded (G2), review notifications, password reset, weekly digest all wired. |
| Zero silent failures | ✅ | resilient-email-sender + Resend Idempotency-Key + structured cron response stats |
| No duplicates / no missing sends | ✅ | Per-type idempotency keys (welcome=seekerId, facility_responded=leadId, weekly_digest=user_id+iso_week, drip=stage) |
| Production-ready, passing tests | ✅ | tsc, vitest, vite build all clean |

---

## Remaining gaps from the original audit

- **G4 (P2)** — "Your password was changed" confirmation email
- **G5 (P2)** — Suspicious-login alert (wire `assess-login-risk` to seeker email)
- **G1 (P3)** — `request_confirmation` orphan branch consolidation
- **G6 (P3)** — `request_followup` template unused

G2 + G3 closed in this session were the highest user-facing impact.
The remaining items are security-hardening or dead-code cleanup;
each is its own focused commit.
