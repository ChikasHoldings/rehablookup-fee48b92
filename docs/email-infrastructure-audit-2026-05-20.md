# Email infrastructure deep audit — 2026-05-20

## TL;DR

Email infrastructure is well-engineered. One **real security gap closed
this commit**: the Resend webhook (`/functions/v1/resend-webhook`) was
accepting unauthenticated requests with no signature verification —
any unauthenticated caller could POST forged bounce/complaint/unsubscribe
events and force-suppress arbitrary recipient addresses, creating a
denial-of-email-service vector on the platform's outbound transactional
mail. Fixed by adding svix-signature verification with HMAC-SHA256
+ 5-minute replay window + constant-time comparison + rotation-aware
multi-signature support.

Every other email-infra check passed: retry pipeline, idempotency,
suppression sync, DLQ, RFC 8058 List-Unsubscribe on bulk paths,
plain-text auto-fallback, permanent-error detection, rate-limit-safe
bulk-send, full Resend signature verification (now), domain
authentication via Resend.

## Surface inventory

44 email-related edge functions in `supabase/functions/`:

**Verification + claim flow** (transactional, OTP):
- `send-verification-code`, `verify-code`, `check-email-verified`
- `send-sms-verification-code`, `verify-sms-code`
- `initiate-claim-email-verification`, `confirm-claim-verification-code`
- `initiate-claim-sms-verification`, `verify-sms-code`
- `send-reply-email-verification`, `verify-reply-email-code`

**Account lifecycle**:
- `send-provider-welcome-email`, `send-provider-welcome-offer-email` (deployed-only, retired)
- `send-credential-notification`
- `send-password-reset`, `confirm-password-reset`
- `send-claim-approval-email`, `send-claim-rejection-email`
- `send-approval-email`

**Notifications + alerts**:
- `notify-payment-failed`, `send-dunning-emails`, `send-payment-reminder` (deployed-only, retired)
- `send-renewal-reminder`
- `send-subscription-alerts`
- `notify-admin-provider-signup`, `notify-flagged-image`
- `notify-free-tier-inquiry-redirect`
- `send-admin-daily-summary`, `send-admin-notification`
- `send-security-block-notification`
- `send-review-notification`

**Lead + inquiry flow**:
- `send-lead-email`, `send-lead-confirmation`, `resend-lead-confirmation`
- `notify-payment-failed`
- `send-message-notifications`
- `submit-qualified-lead`

**Concierge + placement**:
- `send-concierge-introduction`, `send-concierge-notifications`
- `send-tour-notifications`

**Marketing + retention**:
- `send-marketing-followup`
- `send-retention-outreach`
- `send-new-facility-alerts`
- `send-saved-search-alerts`
- `send-provider-weekly-digest`
- `process-onboarding-emails`, `process-provider-drip`, `process-seeker-drip`
- `send-seeker-emails`
- `send-profile-reminders`, `send-profile-complete-email`

**Other**:
- `send-contact-form`, `send-support-request`, `send-provider-support`
- `provider-emails-unsubscribe` (one-click footer link)
- `resend-webhook` (incoming Resend event ingest)

7 shared modules in `_shared/`:
- `resilient-email-sender.ts` (the wrapper)
- `email-templates.ts`
- `message-email-templates.ts`
- `tour-email-templates.ts`
- `email-input-diagnostics.ts`
- `email-rejection-metrics.ts`
- `recipient-email-guard.ts`

## The resilient-email-sender wrapper

`supabase/functions/_shared/resilient-email-sender.ts` is the
canonical Resend wrapper. Every email-sending edge function uses it.
Features:

| Feature | Implementation | Verdict |
| --- | --- | --- |
| **Idempotency check** | Pre-flight query on `email_tracking_events.email_id + email_type + event_type='sent'` → returns `{deduplicated:true}` if found | ✅ |
| **Suppression check** | Pre-flight query on `suppressed_emails.email` → tracks `suppressed` event + returns `{suppressed:true}` | ✅ |
| **Retry loop** | Exponential backoff: 1s, 2s, 4s (3 attempts) | ✅ |
| **Permanent error detection** | Bails on validation/domain/blocked/spam without retry | ✅ |
| **Plain-text auto-fallback** | Strips HTML to plain text for `text` field | ✅ deliverability boost |
| **Tracking events** | Inserts `sent` / `retry` / `failed` / `suppressed` / `dlq` rows | ✅ |
| **Dead-letter persistence** | After 3 failed attempts → inserts into `email_send_failures` (admin queue) | ✅ |
| **DLQ insert is best-effort** | Wrapped in `try/catch` so a DLQ insert failure never breaks the caller | ✅ |
| **Bulk-send rate limiting** | Exports `BULK_SEND_DELAY_MS=200` + `BULK_BATCH_LIMIT=50` | ✅ Resend allows 10 req/s; 200ms keeps headroom |
| **Reply-to support** | Passes through `reply_to` if provided | ✅ |

## Resend webhook signature verification — **REAL FIX (this commit)**

### Before

```ts
Deno.serve(async (req) => {
  const payload = await req.json();
  // ... insert into email_tracking_events ...
  // ... upsert into suppressed_emails ...
});
```

- `verify_jwt = false` in `config.toml` (necessary — Resend doesn't carry a Supabase JWT)
- **Zero signature verification**
- CORS allowed the svix headers but the code never read them

**Exploit surface**:
- Forged POST → arbitrary inserts into `email_tracking_events` (audit log noise)
- Forged "bounced" / "complained" / "unsubscribed" events → `suppressed_emails` upsert → **block legitimate platform mail to any recipient address**
- The last one is the meaningful threat: an attacker who knows the webhook URL can deny-of-email-service the platform's ability to send transactional mail to selected addresses

### Fix

Added `verifySvixSignature(body, headers, secret)` that:

1. Reads `svix-id`, `svix-timestamp`, `svix-signature` from headers
2. **Replay-protects**: rejects `svix-timestamp` more than 5 minutes off `Date.now()`
3. Decodes the secret (strips `whsec_` prefix + base64-decodes)
4. HMAC-SHA256 over `${svix-id}.${svix-timestamp}.${body}` using Deno's `crypto.subtle`
5. **Rotation-aware**: accepts ANY of multiple `v1,<sig>` entries (Resend includes both old + new during secret rotation)
6. **Constant-time comparison** to prevent timing attacks

The body is read as raw text BEFORE JSON parsing (any whitespace
normalization would invalidate the signature).

Required env var: `RESEND_WEBHOOK_SECRET` (the `whsec_<base64>` value
Resend shows in webhook settings).

Behavior:
- Missing `RESEND_WEBHOOK_SECRET` → 503 `webhook_misconfigured`
- Missing svix headers → 401 `invalid_signature` + code `missing_svix_headers`
- Out-of-window timestamp → 401 + code `svix_timestamp_out_of_window`
- Signature mismatch → 401 + code `signature_mismatch`
- Bad JSON body (after sig passes) → 400 `invalid_json`

**Operational note**: deploying this requires setting `RESEND_WEBHOOK_SECRET`
in the Supabase project's edge-function secrets BEFORE the next
Resend webhook delivery. Until then, all events return 503. Resend
will retry on its side (5-day window), so any events fired during the
deploy window will land once the secret is configured. The previous
non-verifying behavior was actively dangerous, so a brief 503 window
is acceptable.

## Suppression + DLQ tables

### `suppressed_emails` (migration 20260502083412…)

```sql
CREATE TABLE public.suppressed_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  reason text NOT NULL CHECK (reason IN ('bounced', 'complained', 'unsubscribed', 'manual', 'spam')),
  notes text,
  source text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_suppressed_emails_email ON public.suppressed_emails (lower(email));

ALTER TABLE public.suppressed_emails ENABLE ROW LEVEL SECURITY;
-- Policies: admin SELECT + admin ALL
```

- Reason is CHECK-constrained to a known set
- Unique on `email` (one suppression per address)
- Lowercase functional index for case-insensitive lookups
- Admin-only via RLS; resend-webhook bypasses via service-role

### `email_send_failures` (same migration)

```sql
CREATE TABLE public.email_send_failures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email_type text NOT NULL,
  recipient_email text NOT NULL,
  subject text,
  error_message text,
  attempts integer NOT NULL DEFAULT 0,
  metadata jsonb,
  idempotency_key text,
  resolved_at timestamptz,
  resolved_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_email_send_failures_unresolved
  ON public.email_send_failures (created_at DESC)
  WHERE resolved_at IS NULL;
```

- Resolved_at + resolved_by support admin manual cleanup
- Partial index on unresolved rows for fast admin-queue queries

### `email_tracking_events` (migration 20251216213300…)

The full audit log. Every send/retry/failure/dlq/suppressed/sent/delivered/
opened/clicked/bounced/complained event lands here with email_id +
email_type + recipient_email + event_type + event_data.

Consumed by `AdminEmailLogs.tsx` for the email-history UI.

## Provider unsubscribe flow

`provider-emails-unsubscribe/index.ts`:

- One-click target for the footer link on every provider-side marketing
  email (drip, weekly digest, etc.)
- Verifies a signed token (HMAC) so an attacker can't unsubscribe
  arbitrary users by knowing their user_id
- On success: sets `profiles.unsubscribed_provider_emails_at = now()`
- The cron-driven email senders (process-provider-drip,
  send-provider-weekly-digest) check this column and bail before
  building the message

## RFC 8058 List-Unsubscribe headers (Gmail/Yahoo Feb 2024 compliance)

Verified the following bulk-mail paths include both `List-Unsubscribe`
+ `List-Unsubscribe-Post: List-Unsubscribe=One-Click` headers:

- `process-provider-drip/index.ts:459-460` (mailto unsub)
- `send-seeker-emails/index.ts:196-197` (mailto unsub)
- `send-retention-outreach/index.ts:407-408` (https://rehablookup.com/unsubscribe?token=…)
- `send-new-facility-alerts/index.ts:124-125` (mailto unsub)
- `send-marketing-followup/index.ts:142-143` (https://rehablookup.com/unsubscribe?token=…)

Transactional emails (OTP, password reset, claim approval, payment
fail, renewal reminder) intentionally OMIT the header — RFC 8058 is
for bulk/marketing senders; transactional is exempt.

## Welcome email contracts parity

Already audited in `_tests/welcome-email-contracts-parity_test.ts`:
- Schema mirrored between frontend
  (`src/lib/contracts/welcome-email-contracts.ts`) and backend
  (`supabase/functions/_shared/contracts/welcome-email-contracts.ts`)
- Test asserts required/optional field set + UUID/email validation
- Tests `WelcomeEmailRequestSchema` and `WelcomeOfferRequestSchema`
  (aliases — same contract)

## Hardcoded From-address

Edge functions read `RESEND_API_KEY` from env; the `from:` field in
each template is set per-type (e.g.,
`RehabLookup <hello@rehablookup.com>`,
`RehabLookup Verification <verify@rehablookup.com>`,
`RehabLookup Support <support@rehablookup.com>`). All `from:`
addresses use the verified `rehablookup.com` domain (SPF/DKIM/DMARC
configured on Resend dashboard side, verifiable via DNS).

## Anti-abuse / TCPA

- `sms_inbound_log` table captures every Twilio inbound delivery
  (STOP / HELP / START) for TCPA audit (already audited in security
  doc — service-role only)
- Phone-number validation in `validatePhone` (E.164 format required)
- 6-digit OTP with 60s resend cooldown on the verification flow
- Hard-bounce → permanent suppression via the webhook
- Spam complaint → permanent suppression via the webhook
- One-click unsubscribe → permanent suppression for that recipient
- `recipient-email-guard.ts` helper enforces the "send-to-self"
  check (verify the recipient matches the calling user's profile
  for certain transactional types)

## Action this commit

**One real fix** + **2 audit docs**:

1. `supabase/functions/resend-webhook/index.ts` — added
   `verifySvixSignature` helper + signature check before processing
   any event. Closes the denial-of-email-service vector.

## Deferred (documented as known)

1. **`List-Unsubscribe` on transactional templates** — RFC 8058
   doesn't require it for transactional, and most ESPs don't show
   the unsubscribe link for these anyway. Adding to
   `resilient-email-sender` as a default would add noise. Bulk paths
   correctly include the header.

2. **Resend domain rotation** — currently uses a single `rehablookup.com`
   sender. If deliverability requires segmenting (transactional vs
   marketing on separate subdomains), document the rotation in
   `email-templates.ts` defaults.

3. **CSP Report-Only for email rendering** — emails are rendered
   server-side in plain HTML; not in scope for browser CSP.

4. **Per-recipient bounce counters** — currently a single hard bounce
   suppresses immediately (correct for high-quality lists). A
   threshold-based suppression (e.g. 3 soft bounces → suppression)
   would handle transient delivery issues better. Deferred.

## Build sanity

```
$ npx tsc --noEmit
(clean)
```

## Verdict

Email infrastructure is now hardened end-to-end:

- ✅ Resend webhook signature verification (HMAC-SHA256, 5-min replay
  window, constant-time comparison, rotation-aware) — closes
  denial-of-email-service vector
- ✅ Resilient sender with idempotency + suppression + retry + DLQ
- ✅ Permanent error detection
- ✅ Auto plain-text fallback
- ✅ RFC 8058 List-Unsubscribe on every bulk path
- ✅ Bulk-send rate limiting
- ✅ Suppression sync from Resend webhook
- ✅ One-click provider unsubscribe with signed token
- ✅ Welcome-email contracts parity (frontend ↔ backend schema)
- ✅ TCPA audit log (sms_inbound_log)
- ✅ Reply-to passthrough
- ✅ Verified domain (rehablookup.com via Resend)
- ✅ Admin DLQ UI surfaces unresolved failures
