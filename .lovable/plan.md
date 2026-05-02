# Transactional Email Hardening — Full Audit & Coverage Sweep

Goal: every admin, provider, and client transactional email is (1) **actually triggered** when its event fires, (2) **rendered correctly** on Gmail / Apple Mail / Outlook, and (3) **never silently dropped** by retries, suppression, or bad recipient data.

## Current footprint (what we found)

- **~40 send-* edge functions** sending mail directly via Resend through `sendEmailWithRetry`.
- **3 shared template modules**: `email-templates.ts` (core builders + plan styling), `tour-email-templates.ts` (7 templates), `message-email-templates.ts` (3 templates).
- **Sender domain**: `no-reply@rehablookup.com` (one stray `system@rehablookup.com` in `send-admin-daily-summary`).
- **Tracking**: `email_tracking_events` (event_type: `sent`, etc.). Last 30d shows only 8 distinct `email_type`s firing — indicating most send paths are **not logging tracking events**, so we can't prove coverage from data alone.
- **No central dispatcher** today — each function builds HTML inline + calls Resend. That's why bugs sneak in per-function.

## Scope — three workstreams

### 1. Coverage audit (find emails that should fire but don't)

Build a single source-of-truth matrix in `docs/email-matrix.md` with one row per event:

```text
Event                          Audience    Function                       Template            Idempotency key            Tracking
-----                          --------    --------                       --------            -------                    --------
Lead created → facility        Provider    send-lead-email                facilityNewLead     lead-new-{leadId}-{fid}    facility_new_lead
Lead unlocked                  Provider    unlock-lead                    leadUnlocked        unlock-{leadId}            lead_unlocked
Lead expiring T-60min          Provider    send-unlock-reminders          leadExpiring        expiring-{leadId}          lead_expiring
Lead redistributed             Provider    process-lead-redistribution    leadRedistributed   redist-{leadId}-{fid}      lead_redistributed
Listing approved/rejected      Provider    send-approval-email            listingApproved     approval-{listingId}       listing_approval
Credit purchase / auto-reload  Provider    stripe-webhook                 creditPurchased     credit-{paymentIntent}     credit_purchased
Subscription renewed/failed    Provider    notify-payment-failed          paymentFailed       pay-fail-{invoiceId}       payment_failed
Profile incomplete reminder    Provider    send-profile-reminders         profileIncomplete   profile-rem-{userId}-{d}   profile_reminder
Provider welcome (claimed)     Provider    send-provider-welcome-email    providerWelcome     welcome-{userId}           provider_welcome
Tour requested/proposed/...    Both        send-tour-notifications        tour*               tour-{phase}-{tourId}      tour_{phase}
Inquiry submitted              Client      send-lead-confirmation         seekerInquiry       inquiry-{inquiryId}        seeker_inquiry
Advisor assigned               Client      send-concierge-notifications   advisorAssigned     concierge-adv-{caseId}     concierge_advisor
Provider interested            Client      send-concierge-notifications   providerInterested  concierge-int-{caseId}-{fid} provider_interested
Tour confirmed (seeker)        Client      send-tour-notifications        tourConfirmedUser   tour-confirmed-seeker-{tid} tour_confirmed_seeker
Admission scheduled            Client      confirm-placement              admissionScheduled  admit-{caseId}             admission_scheduled
Email verification             Client      send-verification-code         verificationCode   verify-{email}-{ts}        verification_code
Password reset                 Client      send-password-reset            passwordReset      pwd-{userId}-{ts}          password_reset
New message (concierge / DM)   Both        send-message-notifications     messageTo*         msg-{messageId}-{role}     message_*
Account / billing security     Both        send-security-block-notification securityBlock    sec-{eventId}              security_block
Daily admin digest             Admin       send-admin-daily-summary       adminDigest        digest-{YYYY-MM-DD}        admin_digest
Provider signup → admin        Admin       notify-admin-provider-signup   adminProviderSignup admin-prov-{userId}       admin_provider_signup
Flagged image → admin          Admin       notify-flagged-image           adminFlaggedImage   flag-{imageId}             admin_flagged_image
Churn / health alerts          Admin       check-churn-alerts / health    adminHealth         hc-{type}-{day}            admin_health
```

For each row I will:
- Open the source function and confirm the trigger fires (DB trigger / cron / inline call).
- Confirm `idempotencyKey` is set (no idempotency = duplicate sends on retry).
- Confirm `emailType` is recorded so it shows in `email_tracking_events`.
- Flag any audience that's missing the email entirely (e.g. provider gets an in-app notif but no email). Log gaps in the matrix as `MISSING` and fix them.

Known suspects from the inventory:
- Inline `from:` strings → standardize to `RehabLookup <no-reply@rehablookup.com>` (one off-domain `system@rehablookup.com` to fix).
- Several functions (e.g. `send-marketing-followup`, `send-retention-outreach`) look like marketing — confirm and **explicitly exclude** from this transactional pass; they belong to the Phase-2 marketing tool.
- `seeker_inquiry_confirmation` only shows 1 event in 30d — likely under-firing or under-tracked. Verify.

### 2. Template rendering audit (no broken HTML in any inbox)

A. **Snapshot test harness** — new `supabase/functions/_tests/email-render_test.ts`:
- For every exported template builder in `_shared/*-email-templates.ts`, render with realistic fixture data.
- Assert: starts with `<!DOCTYPE`, contains exactly one `</html>`, no unresolved `${...}` placeholders, no `undefined`/`null`/`NaN`/`[object Object]` substrings, all `<a href>` are absolute URLs, no `dangerouslySetInnerHTML` analogue (raw template literal with unescaped user input).
- Run via existing Deno test runner.

B. **Visual QA pass** (one-time, not automated):
- Render each template to `/tmp/email-previews/*.html`, screenshot light + dark + Outlook-narrow widths, eyeball for: clipped buttons, missing logo, broken color tokens, double footers, missing unsubscribe context, mobile reflow.
- Fix issues in the shared builders (`emailHeader`, `ctaButton`, `emailFooter`) once — they cascade to all templates.

C. **Inline-HTML cleanup** — ~30 functions hand-roll HTML instead of using the shared builders. We will:
- Replace each with `emailStart() + emailHeader() + emailBodyStart() + ... + emailEnd()` so all emails share one visual system.
- This is the highest-leverage rendering fix; one bad `<table>` breaks Outlook everywhere it's copy-pasted.

### 3. Reliability hardening (no silent drops)

- **Tracking everywhere**: every `sendEmailWithRetry` call must pass `emailType` + `idempotencyKey`. Add a lint test that greps for `sendEmailWithRetry(` and fails CI if either is missing.
- **Recipient guard**: `_shared/recipient-email-guard.ts` already exists — enforce it in `sendEmailWithRetry` itself (single chokepoint) instead of relying on each caller.
- **Suppression check**: short-circuit sends to addresses that previously hard-bounced (Resend webhook → `email_tracking_events` already capturing `bounced`/`complained`; add a `suppressed_emails` table + check in the sender). Required so a single bad address doesn't poison reputation.
- **Resend webhook coverage**: `resend-webhook` exists — confirm it writes `delivered`/`bounced`/`complained`/`opened` rows. Without these we can't measure deliverability.
- **DLQ**: after 3 retry attempts, write to a `email_send_failures` table + post to admin daily digest. Today retried sends just disappear into logs.

## Deliverables

1. `docs/email-matrix.md` — the coverage matrix above, with `OK` / `MISSING` / `FIXED` per row.
2. Patches to every send-* function that is missing a trigger, idempotency key, or tracking event.
3. Refactor of inline-HTML functions onto the shared builders.
4. New `email-render_test.ts` snapshot suite + a lint test for `sendEmailWithRetry` arguments.
5. New `suppressed_emails` table + check in `resilient-email-sender.ts`.
6. New `email_send_failures` table + admin digest entry.
7. Visual QA report (`/tmp/email-previews/REPORT.md`) listing each template with screenshot + pass/fail.

## Out of scope (intentional)

- Marketing emails (newsletter, drips, re-engagement) — separate Phase-2 tool (Customer.io recommendation stands).
- Migration to Lovable's built-in `send-transactional-email` queue — your stack is already deeply integrated with Resend + `sendEmailWithRetry`; rebuilding on the Lovable queue would be a bigger refactor than this audit. Happy to do it as a follow-up if you want pgmq-backed retries instead of in-function retries.

## Sequencing

1. Build the coverage matrix (read-only audit, ~1 pass through every send-* function).
2. Land reliability primitives: suppression table, DLQ table, sender guards, tracking lint.
3. Fix MISSING rows from the matrix (each is a small targeted patch).
4. Refactor inline-HTML functions onto shared builders (mechanical).
5. Add render snapshot tests + run the visual QA pass; fix any rendering bugs found.
6. Deploy all touched functions; smoke-test critical paths via `curl_edge_functions`.

## Open questions before I start

1. **DLQ surfacing** — alert via the existing daily admin digest, or a separate immediate Slack-style admin email on first failure? (recommend: digest for noise control, immediate only for `bounced`/`complained` of admin/provider primary contacts).
2. **Marketing-looking functions** (`send-marketing-followup`, `send-retention-outreach`, `send-provider-welcome-offer-email`) — keep them firing as-is during this pass, or pause them until the Customer.io migration? (recommend: keep firing, just standardize templates so they don't visually drift).
3. **Should I migrate to Lovable's built-in transactional queue** (pgmq + `send-transactional-email`) as part of this, or stay on Resend + `sendEmailWithRetry`? (recommend: stay on current stack for this pass; revisit after the audit lands).

Reply **"ship it"** to proceed with the recommended defaults, or answer any of the three questions to adjust.
