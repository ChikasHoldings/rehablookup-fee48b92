# Seeker Email System — Full Audit + Trigger Correction + Auto-Login

**Date:** 2026-05-21
**Branch:** `claude/phase2-deployment-5WYOn`
**Scope:** End-to-end audit of every seeker lifecycle email, the
signup/verification flow, and post-verify session establishment. The
two acceptance-criteria bugs (welcome email firing pre-verification +
no auto-login after verification) are fixed in this pass. Inventory
matrix below identifies the remaining gaps with severity + suggested
follow-ups.

---

## Critical findings closed in this pass (P0)

### Bug A — Welcome email fired BEFORE the user verified ownership

**Evidence:** `src/pages/SeekerSignup.tsx:266-271` (pre-fix):

```ts
// Fire-and-forget welcome email (never block signup).
void supabase.functions
  .invoke("send-seeker-emails", {
    body: { type: "welcome", seekerId: newUserId, email: trimmedEmail },
  })
  .catch(() => {});
```

This block fired the instant `register-provider-account` returned the
new user_id — i.e. on form submit, well before
`send-verification-code` (line 297) even completed. Consequences:

1. Anyone who mistyped their email got a welcome message hitting an
   unintended recipient.
2. Anyone who abandoned the signup mid-OTP got a welcome anyway,
   inflating bounce / unsubscribe rates against the sending domain.
3. The "Welcome to RehabLookup!" message claimed account readiness
   while ownership was still unproven — a CAN-SPAM hygiene issue and
   an inbox-trust hit.

**Fix:** the welcome invocation is removed from `handleSignup` and
moved into `handleVerifyCode` AFTER the OTP succeeds AND a session has
been established. Server-side dedup via
`idempotencyKey: seeker-welcome-${seekerId}` (already in
`send-seeker-emails/index.ts:186-202` via the resilient email sender)
ensures a re-verification cycle within the 24-hour window doesn't
double-deliver.

Belt-and-suspenders: `verify-code` returns `alreadyVerified: true`
when the same email was verified within the past 24h (see
`supabase/functions/verify-code/index.ts:98-114`). The frontend now
checks this flag and skips the welcome invocation in that branch.

### Bug B — No auto-login after verification; the user landed unauthenticated

**Evidence:** `src/pages/SeekerSignup.tsx:377-378` (pre-fix):

```ts
toast.success('Email verified successfully!');
navigate('/account', { replace: true });
```

`register-provider-account` (v1.2.0) uses
`supabase.auth.admin.createUser({ email_confirm: true, ... })` which
creates the auth user server-side but does NOT establish a client
session — the function returns over HTTP with just the user id. The
frontend then proceeded to the OTP step, then on OTP success it
navigated to `/account` with no session in the browser. The user
landed on the protected dashboard unauthenticated and bounced to
`/login`. The signup flow effectively required two manual logins.

**Fix:** between the OTP success and the redirect, the frontend now
calls `supabase.auth.signInWithPassword({ email, password })`. The
password is still in the component state (the user typed it minutes
earlier on the same component) and `email_confirm:true` from
register-provider-account makes this a permitted operation. If
`signInWithPassword` fails for any reason (rare; transient Supabase
auth outage or unexpected reject), the user is routed to `/login`
with the underlying error message so they can sign in manually with
the same credentials.

**Idempotency:** `verifyCompletedRef` guard. Once the post-verify
flow has succeeded on this component mount, a second submit is a
no-op. Prevents a fast double-click from firing `signInWithPassword`
twice or the welcome email twice.

---

## Acceptance-criteria status

| Criterion | Status | Notes |
| --- | --- | --- |
| No welcome emails sent before verification | ✅ Pass | Removed from `handleSignup`; moved to post-verify. |
| Seekers automatically logged in immediately after verification — not sent to login | ✅ Pass | `signInWithPassword` called in `handleVerifyCode` between OTP-success and navigate. |
| All required seeker emails exist, trigger correctly, and deliver reliably | ⚠️ Partial | See inventory below. Welcome, drip (4 stages), and inquiry confirmation are wired. Facility-replied-to-you and seeker weekly digest have templates but no triggers. Documented as P1 gaps. |
| Zero silent failures; observability confirms send → deliver lifecycle | ✅ Pass | All sends route through `resilient-email-sender.ts` → `email_tracking_events` (sent/retry/dlq/suppressed). `resend-webhook` updates `suppressed_emails` from bounced/complained/unsubscribed events. |
| No duplicate or missing sends; throttling and idempotency verified | ✅ Pass | `idempotencyKey` per email type (e.g. `seeker-welcome-${userId}`). `verify-code` has 24-hour idempotency window. `send-verification-code` has per-(email,purpose) rate limit. |
| Production-ready with clean logs and passing tests | ✅ Pass | 128 vitest tests passing; tsc clean; build clean. |

---

## Inventory matrix — every seeker lifecycle email

Each row: type → trigger location → preference gate → status.

| Email type | Trigger location | Preference gate | Status |
| --- | --- | --- | --- |
| **Verification OTP** | `send-verification-code` invoked from `SeekerSignup.tsx:297` and `:391` (resend) | None (transactional) | ✅ Live |
| **Welcome** | `SeekerSignup.tsx:handleVerifyCode` after OTP success + session established | None (transactional) | ✅ Fixed in this pass |
| **Admin "new seeker signup"** | `SeekerSignup.tsx:276-292` fire-and-forget on account creation | Admin-side only | ✅ Live |
| **Inquiry confirmation** ("Your inquiry to X has been received") | `submit-qualified-lead/index.ts:1579-1598` direct call to `sendEmailWithRetry` with `emailType: seeker_inquiry_confirmation` | None (transactional) | ✅ Live (NOTE: bypasses `send-seeker-emails type="request_confirmation"` — that branch is orphan code, see Findings G1 below) |
| **Welcome follow-up** (drip step 1, Day 1) | `process-seeker-drip/index.ts:21` → `send-seeker-emails type=welcome_followup` | `email_product_updates` | ✅ Live (`process_seeker_drip` cron, daily 16:15 UTC, verified in `cron.job` table) |
| **Tips finding treatment** (drip step 2, Day 3) | `process-seeker-drip/index.ts:22` | `email_product_updates` | ✅ Live |
| **Placement intro** (drip step 3, Day 7) | `process-seeker-drip/index.ts:23` | `email_product_updates` | ✅ Live |
| **Account reminder** (drip step 4, Day 14, only if no activity) | `process-seeker-drip/index.ts:24` | `email_product_updates` | ✅ Live |
| **Request follow-up** ("Still looking for treatment?") | `send-seeker-emails type=request_followup` — template exists, NO INVOKER found | `followup_reminders_enabled` | ⚠️ Template defined but unused. Either wire up or remove. |
| **Facility responded to your inquiry** | `send-seeker-emails type=facility_contacted_you` — template exists, NO INVOKER found | `email_lead_alerts` | ⚠️ See Gap G2 below — high-priority follow-up. |
| **Weekly digest** (saved facilities + activity) | `send-seeker-emails type=weekly_digest` — template exists, NO cron and NO INVOKER found | `email_weekly_digest` | ⚠️ See Gap G3 below. |
| **Review approved** | `send-review-notification/index.ts:handleReviewApproved` → seeker email branch | Always (transactional) + in-app gated by `browser_notifications` | ✅ Live |
| **Review rejected** | `send-review-notification` `handleReviewRejected` | Always (transactional) | ✅ Live |
| **Review responded to** | `send-review-notification` `handleReviewResponse` | Always (transactional) | ✅ Live |
| **Concierge intake / matches / interest / confirmed / placement / message / tour×3** | `send-concierge-notifications/index.ts` — 9 in-app + email branches | Concierge user implicitly opted-in | ✅ Live |
| **Password reset (forgot password)** | `send-password-reset/index.ts` — Supabase magic-link wrapper | None (security-critical) | ✅ Live |
| **Password CHANGE confirmation** ("Your password was changed") | Not implemented | — | ⚠️ Gap G4 — best-practice security signal missing. |
| **Security alert** (new device / unfamiliar IP) | `assess-login-risk/index.ts` exists for risk scoring but emits no seeker email | — | ⚠️ Gap G5. |
| **Email verification (post-signup email-change flow)** | Supabase native via `updateUser({email})` from `SeekerSettings.tsx:573-595` | None | ✅ Live |
| **Account-scheduled-for-deletion notice** | None — `delete-seeker-account` does immediate hard delete | — | N/A (no soft-delete window exists; covered in seeker-settings hardening pass). |

---

## Pipeline-level verification

### Delivery + retries + dedup
- Every send routes through `resilient-email-sender.ts`:
  - Idempotency check in `email_tracking_events` keyed by
    `(emailId, emailType, event_type='sent')` (lines 106-128).
  - Suppression check against `suppressed_emails` (lines 130-149).
  - Exponential backoff retry (1s, 2s, 4s up to 3 attempts).
  - DLQ on persistent failure → `email_send_failures` insert.
- Permanent-error short-circuit (`isPermanentError` line 280) skips
  retry on validation / domain / blocked / suppressed errors.

### Webhooks
- `resend-webhook/index.ts` ingests `email.bounced`, `email.complained`,
  `email.delivered`, `email.delivery_delayed`, `email.opened`,
  `email.clicked`, `email.unsubscribed` events.
- Svix HMAC-SHA256 signature verification (5-min replay window) at
  lines 31-103.
- Suppression sync at lines 273-298: bounced / complained /
  unsubscribed events insert/update `suppressed_emails` with the
  appropriate reason.
- Event dedup via `(emailId, eventType)` at lines 235-248.

### Verification-code robustness
- `send-verification-code/index.ts` has:
  - Per-(email, purpose) rate limit (verified by test
    `monetization-helpers-smoke_test.ts:197`).
  - Suppression-list check before send (lines 86-99).
  - Returns structured `EMAIL_SUPPRESSED` code so the UI can surface
    the right message.
- `verify-code/index.ts` has:
  - 24-hour idempotency window for "already verified" returning
    `alreadyVerified: true` (lines 98-114).
  - Max-5-attempts lockout on the active code (lines 154-158).
  - On final failure, the code is marked expired so a fresh code is
    required (line 156).
  - Marks BOTH `auth.users.email_confirmed_at` AND
    `profiles.email_verified_at` (the wizard's downstream gate).

### Preferences enforcement
The seeker `/account/notification-preferences` toggles gate:
| Toggle | Email types gated |
| --- | --- |
| `email_lead_alerts` | request_confirmation*, request_followup (via `followup_reminders_enabled`), facility_contacted_you |
| `email_weekly_digest` | weekly_digest |
| `email_product_updates` | welcome_followup, tips_finding_treatment, account_reminder, placement_intro |
| `followup_reminders_enabled` | request_followup |
| `browser_notifications` | in-app inserts (not the email) |
| Welcome | **Intentionally NOT gated** — transactional confirmation of account creation, sent regardless of marketing prefs (CAN-SPAM compliant). |

*Note: `request_confirmation` is gated in send-seeker-emails but the LIVE flow goes through `submit-qualified-lead` direct call, which is correctly NOT preference-gated (the inquiry confirmation IS transactional).

---

## Files changed

```
MODIFIED:
  src/pages/SeekerSignup.tsx
    - Removed pre-verification welcome email send from handleSignup
    - Captured new user_id on newUserIdRef for use in handleVerifyCode
    - handleVerifyCode now:
      * Idempotency guard (verifyCompletedRef) against double-submit
      * Adds `purpose: 'signup'` to verify-code call (explicit, not legacy)
      * Calls supabase.auth.signInWithPassword AFTER verify-code success
      * On signIn failure: falls back to /login with the actual error
      * Fires welcome email AFTER session established
      * Skips welcome on `alreadyVerified` (re-verify within 24h)
      * link-inquiry-to-user runs WITH valid session (correct attribution)
      * Navigates to /account authenticated

NEW:
  docs/seeker-email-system-hardening-2026-05-21.md
```

No edge function changes were required for the two P0 bugs — the
existing `send-seeker-emails` welcome path already has the correct
idempotency key, and `verify-code` already returns `alreadyVerified`.

---

## Verification

- `npx tsc --noEmit` → clean
- `npx vitest run` → 128 passed, 5 skipped
- `npx vite build` → built successfully
- Verified live (Supabase MCP):
  - `cron.job` `process_seeker_drip` active, `15 16 * * *` schedule
  - `send-seeker-emails` v1.x deployed
  - `resend-webhook` deployed
  - `verify-code` v2.2.0 deployed with `alreadyVerified` idempotency

---

## Gaps surfaced (not fixed in this pass — documented for follow-up)

### Gap G1 (P3) — `send-seeker-emails type="request_confirmation"` is dead code

The real inquiry-confirmation email goes through `submit-qualified-lead`'s
direct `sendEmailWithRetry` call. The `case "request_confirmation"` branch
in `send-seeker-emails/index.ts:141` is never invoked.

**Recommendation:** consolidate to one path (likely the
submit-qualified-lead direct path — it's already in production with
real lead-id idempotency keys). Remove the orphan branch from
send-seeker-emails or leave a comment explaining why.

### Gap G2 (P1) — No email when a facility responds to a seeker inquiry

The `facility_contacted_you` template exists in `send-seeker-emails`
but no flow ever invokes it. Today, when a facility provider responds
to a seeker (via SMS, email reply, or the provider dashboard's reply
button), the seeker receives nothing — they have to refresh
`/account/requests` to discover the response.

**Recommendation:** add the `send-seeker-emails type=facility_contacted_you`
invocation to whatever flow processes provider responses. Candidates:
- A provider dashboard "reply" button (if it exists)
- `process-inbound-email` or `twilio-sms-inbound` when a provider replies
- A trigger on `leads.provider_responded_at` change

This is the single highest-impact follow-up. It's blocked on tracing
the live response-detection flow.

### Gap G3 (P2) — Seeker weekly digest has a template but no cron

The provider digest has a dedicated cron + edge function (`send_provider_weekly_digest`,
Sundays 13:00 UTC). The seeker `weekly_digest` template in
`send-seeker-emails` has no `send-seeker-weekly-digest` function and
no cron job.

**Recommendation:** mirror the provider pattern — new
`send-seeker-weekly-digest` edge function + `send_seeker_weekly_digest`
cron entry. Eligibility = `notification_preferences.email_weekly_digest=true`
+ existing saved facilities or recent activity.

### Gap G4 (P2) — No "your password was changed" confirmation

`SeekerSettings.tsx:handleChangePassword` updates the password but
doesn't send a confirmation email. Standard security practice is to
notify the user from a different channel that their password
changed, so a compromised account can be detected.

**Recommendation:** add a `send-seeker-emails type=password_changed`
template + invoke from `handleChangePassword` after
`supabase.auth.updateUser({password})` succeeds. Transactional; not
preference-gated.

### Gap G5 (P2) — `assess-login-risk` doesn't email the seeker on suspicious login

The risk-assessment function exists and scores logins by device /
IP / geo but emits no seeker-facing email. A login from a new
device or unfamiliar IP doesn't notify the legitimate owner.

**Recommendation:** when `assess-login-risk` returns elevated risk,
emit `send-seeker-emails type=security_alert` with the device/IP/time
details and a "wasn't me — secure my account" link that lands on
`/account/settings` with the password-change form open.

### Gap G6 (P3) — `request_followup` template never invoked

Like G1, the template exists in `send-seeker-emails` but no flow
invokes it. The drip campaign uses different templates
(`welcome_followup`, `tips_finding_treatment`, etc.). The
`request_followup` template seems intended for "you submitted an
inquiry to X but they haven't responded in N days — here are some
alternatives."

**Recommendation:** either wire it up (probably a daily cron checking
`leads.provider_responded_at IS NULL` after 48h) or remove the
template + the `followup_reminders_enabled` preference key (which is
no longer gating anything live).

---

## What was NOT changed (and why)

| Area | Decision | Rationale |
| --- | --- | --- |
| Pre-existing welcome template content | Untouched | Template is brand-compliant + accessible. No content issue surfaced. |
| `resilient-email-sender.ts` retry / dedup | Untouched | Already production-grade per audit (3 retries, exp backoff, idempotency check, suppression check, DLQ). |
| `resend-webhook` ingestion | Untouched | Already production-grade — Svix signature verification, dedup, suppression sync. |
| Drip campaign cadence / content | Untouched | The 1/3/7/14-day cadence is reasonable; content is not a blocker. |
| G1-G6 gaps | Documented only | Each is its own well-scoped follow-up. Fixing them all in this pass would require multi-hour audits of provider-reply detection, cron setup, and security alerting — each large enough to deserve its own pass. |
| Marketing vs transactional CAN-SPAM categorization | Verified, no change | Welcome / verification / inquiry-confirmation / password-reset are correctly NOT preference-gated. Drip / digest / product updates ARE preference-gated. List-Unsubscribe header is set on every send-seeker-emails delivery (line 196). |
| Domain authentication (SPF/DKIM/DMARC) | Not in code | Lives at the DNS/Resend dashboard level. Out of scope for code audit. |
