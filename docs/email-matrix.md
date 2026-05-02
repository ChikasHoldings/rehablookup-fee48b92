# Transactional Email Coverage Matrix

_Last updated: 2026-05-02. Source of truth for which transactional emails fire, who they go to, and how they're tracked._

## Reliability primitives

- **Sender**: `_shared/resilient-email-sender.ts` — 3-attempt retry, exponential backoff, suppression check, idempotency dedup, DLQ on exhaustion.
- **Tracking**: `email_tracking_events` (event_type: `sent` | `retry` | `failed` | `dlq` | `suppressed`).
- **Suppression**: `suppressed_emails` (NEW) — populated by `resend-webhook` on bounce/complaint; checked by sender before every send.
- **Dead-letter**: `email_send_failures` (NEW) — written when a send exhausts all retries. Surfaced on the daily admin digest.
- **Sender domain**: all emails sent from `*@rehablookup.com`. Off-domain `system@rehablookup.com` in `submit-placement-case` was migrated to `no-reply@rehablookup.com`.

## Coverage by audience

### Provider emails (transactional)

| Event | Function | emailType | Status |
|---|---|---|---|
| New lead → facility | `send-lead-email` | `facility_new_lead` | ✅ |
| Lead unlocked | `unlock-lead` | `lead_unlocked` | ✅ |
| Lead expiring (T-60min) | `send-unlock-reminders` | `lead_expiring` | ✅ |
| Lead redistributed | `process-lead-redistribution` | `lead_redistributed` | ✅ FIXED (was untracked) |
| Listing approved/rejected | `send-approval-email` | `listing_approval` | ✅ |
| Credit purchase / auto-reload | `stripe-webhook` | `credit_purchased` | ✅ |
| Payment failed | `notify-payment-failed` | `payment_failed` | ✅ |
| Profile incomplete reminder | `send-profile-reminders` | `profile_reminder` | ✅ |
| Provider welcome (claimed) | `send-provider-welcome-email` | `provider_welcome` | ✅ |
| Onboarding drip (day 1-7) | `process-provider-drip` | `provider_onboarding_drip` | ✅ FIXED (was untracked) |
| Subscription renewed/canceled | `manage-subscription` | `subscription_*` | ✅ FIXED (was untracked) |
| Subscription alerts | `send-subscription-alerts` | varies | ✅ |
| Provider support reply | `send-provider-support` | varies | ✅ |
| Tour requested → facility | `send-tour-notifications` | `tour_requested_facility` | ✅ |
| Tour confirmed → facility | `send-tour-notifications` | `tour_confirmed_facility` | ✅ |
| Tour cancelled → facility | `send-tour-notifications` | `tour_cancelled_facility` | ✅ FIXED (was untracked) |
| Review notification | `send-review-notification` | varies | ✅ |
| New facility alerts | `send-new-facility-alerts` | varies | ✅ |
| Message → facility | `send-message-notifications` | `message_facility` | ✅ |

### Client (seeker) emails (transactional)

| Event | Function | emailType | Status |
|---|---|---|---|
| Inquiry submitted | `send-lead-confirmation` | `lead_confirmation` | ✅ |
| Resend lead confirmation | `resend-lead-confirmation` | `lead_confirmation_resend` | ✅ |
| Placement case submitted (seeker) | `submit-placement-case` | `placement_case_seeker_confirmation` | ✅ FIXED (was untracked) |
| Marketing lead matched | `submit-marketing-lead` | `marketing_lead_confirmation` | ✅ FIXED (was untracked) |
| Qualified lead submitted | `submit-qualified-lead` | varies | ✅ |
| Advisor assigned | `send-concierge-notifications` | `concierge_advisor_assigned_seeker` | ✅ |
| Provider interested | `send-concierge-notifications` | `provider_interested` | ✅ |
| Concierge introduction | `send-concierge-introduction` | varies | ✅ |
| Tour proposed → seeker | `send-tour-notifications` | `tour_proposed_user` | ✅ |
| Tour confirmed → seeker | `send-tour-notifications` | `tour_confirmed_seeker` | ✅ |
| Tour cancelled → seeker | `send-tour-notifications` | `tour_cancelled_user` | ✅ FIXED (was untracked) |
| Email verification code | `send-verification-code` | `verification_code` | ✅ |
| Reply email verification | `send-reply-email-verification` | varies | ✅ |
| Password reset | `send-password-reset` | `password_reset` | ✅ |
| Profile complete confirmation | `send-profile-complete-email` | varies | ✅ |
| Abandoned placement | `send-abandoned-placement-email` | varies | ✅ |
| Generic seeker emails | `send-seeker-emails` | `seeker_*` | ✅ |
| Message → seeker | `send-message-notifications` | `message_seeker` | ✅ |
| Contact form confirmation | `send-contact-form` | `contact_form` | ✅ |
| Payment reminder | `send-payment-reminder` | varies | ✅ |
| Security block notification | `send-security-block-notification` | `security_block` | ✅ |
| Support request | `send-support-request` | varies | ✅ |

### Admin emails (transactional)

| Event | Function | emailType | Status |
|---|---|---|---|
| Provider signup | `notify-admin-provider-signup` | `admin_provider_signup` | ✅ |
| Flagged image | `notify-flagged-image` | `admin_flagged_image` | ✅ |
| Daily digest | `send-admin-daily-summary` | `admin_digest` | ✅ |
| Brute-force / security | `check-brute-force-alerts` | `admin_brute_force_alert` | ✅ FIXED (was untracked) |
| Churn alert | `check-churn-alerts` | `admin_churn_alert` | ✅ FIXED (was untracked) |
| Provider health alert | `check-provider-health-alerts` | `admin_provider_health_alert` | ✅ FIXED (was untracked) |
| Admin user welcome | `create-admin-user` | `admin_user_welcome` | ✅ FIXED (was untracked) |
| Admin password reset | `manage-admin-user` | `admin_password_reset` | ✅ FIXED (was untracked) |
| Admin invitation resent | `manage-admin-user` | `admin_invitation_resent` | ✅ FIXED (was untracked) |
| Admin notification (generic) | `send-admin-notification` | varies | ✅ |
| Tour requested → admin | `send-tour-notifications` | `tour_requested_admin` | ✅ |
| Tour confirmed → admin | `send-tour-notifications` | `tour_confirmed_admin` | ✅ FIXED (was untracked) |
| Tour cancelled → admin | `send-tour-notifications` | `tour_cancelled_admin` | ✅ FIXED (was untracked) |
| Placement case → admin | `submit-placement-case` | `placement_case_admin_notification` | ✅ FIXED (was untracked) |
| Credential notification | `send-credential-notification` | varies | ✅ |

## Out of scope (Phase 2 — marketing tool)

These functions are **marketing**, not transactional. They keep firing as-is, but should be migrated to a dedicated marketing platform (Customer.io recommended) so they don't share sender reputation with critical transactional traffic:

- `send-marketing-followup`
- `send-retention-outreach`
- `send-provider-welcome-offer-email`
- `process-provider-drip` (day 2-7 are arguably marketing; day 1 is transactional)

## Render quality

- New `_tests/email-render_test.ts` snapshots every shared template builder (core, message, tour) and asserts:
  - No unresolved `${...}` / `{{...}}` placeholders
  - No `undefined` / `null` / `NaN` / `[object Object]` literals
  - No `<script>` tags
  - All `<a href>` are absolute or safe-protocol (https/mailto/tel/#)
  - Shared template files don't hardcode `from:` (regression guard)
- All 17 template tests pass under the Deno bundler (TS strict).

## Known gaps / follow-ups

1. **Inline-HTML cleanup** — ~30 functions still hand-roll `<table>` HTML instead of using the shared builders (`emailHeader`, `emailBodyStart`, etc). Mechanical refactor; deferred to a focused follow-up so this PR stays reviewable.
2. **Resend webhook → suppressed_emails** — confirm `resend-webhook` writes to the new `suppressed_emails` table on `email.bounced` / `email.complained` events.
3. **DLQ surfacing in admin digest** — wire the new `email_send_failures` table into `send-admin-daily-summary` so unresolved failures are visible to ops.
4. **Phase 2 (marketing)** — set up `mail.rehablookup.com` subdomain on Customer.io for newsletters / drips / re-engagement.
