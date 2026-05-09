# RehabLookup Email System Audit Report

**Audit Date:** 2026-05-09  
**Auditor:** Manus AI  
**Scope:** All Supabase Edge Functions that send email via Resend

---

## 1. Infrastructure Overview

All email sending is centralised through `supabase/functions/_shared/resilient-email-sender.ts`, which provides:

- **Automatic retries** with exponential back-off (up to 3 attempts)
- **Dead-letter queue (DLQ)** for permanently failed emails (`email_send_failures` table)
- **Event tracking** (`email_tracking_events` table)
- **Automatic plain-text fallback** generation from HTML
- **Idempotency key** support to prevent duplicate sends
- **Suppression list** enforcement (bounces, unsubscribes)

The `sendEmailWithRetry(supabase, resend, emailPayload, options)` function signature requires:
1. `supabase` — service-role client for DLQ and tracking writes
2. `resend` — Resend SDK instance
3. `emailPayload` — `{ from, to, subject, html, ... }`
4. `options` — `{ emailType, idempotencyKey }` (both required for tracking)

---

## 2. Email Coverage Matrix

### 2.1 Seeker Emails

| Workflow Event | Edge Function | emailType | Status |
|---|---|---|---|
| Exit-intent capture confirmation | `submit-exit-intent-lead` | `exit_intent_confirmation` | Fixed v4 |
| Marketing lead confirmation | `submit-marketing-lead` | `marketing_lead_confirmation` | OK |
| Inquiry / lead confirmation | `submit-qualified-lead` | `seeker_inquiry_confirmation` | OK |
| Placement case confirmation | `submit-placement-case` | `placement_case_seeker_confirmation` | OK |
| Concierge intake received | `send-concierge-notifications` | `concierge_intake_received` | OK |
| Concierge matches found | `send-concierge-notifications` | `concierge_matches_found` | OK |
| Concierge introductions sent | `send-concierge-notifications` | `concierge_introductions_sent` | OK |
| Concierge provider interested | `send-concierge-notifications` | `concierge_provider_interested` | Fixed |
| Concierge signup prompt | `send-concierge-notifications` | `concierge_signup_prompt` | Fixed |
| Concierge seeker confirmed | `send-concierge-notifications` | `concierge_seeker_confirmed` | OK |
| Concierge placement complete | `send-concierge-notifications` | `concierge_placement_complete_*` | OK |
| Seeker review reminder (48h) | `placement-cron` | `seeker_reminder` | Fixed |
| Seeker verification (72h post-PII) | `revenue-enforcement-cron` | `seeker_verification` | Fixed |
| Abandoned placement nudge | `send-abandoned-placement-email` | `abandoned_placement` | OK |
| New facility alert | `send-new-facility-alerts` | `new_facility_alert` | OK |
| Seeker drip sequence | `process-seeker-drip` via `send-seeker-emails` | `seeker_*` | OK |
| Email verification code | `send-verification-code` | `verification_code` | OK |
| Reply email verification | `send-reply-email-verification` | `reply_email_verification` | OK |
| Password reset | `send-password-reset` | `password_reset` | OK |
| Review submitted confirmation | `send-review-notification` | `review_submitted` | OK |
| Review approved notification | `send-review-notification` | `review_approved` | OK |
| Review rejected notification | `send-review-notification` | `review_rejected` | OK |
| Review response notification | `send-review-notification` | `review_response` | OK |
| Tour proposed to user | `send-tour-notifications` | `tour_proposed_user` | OK |
| Tour confirmed to seeker | `send-tour-notifications` | `tour_confirmed_seeker` | OK |
| Tour cancelled to user | `send-tour-notifications` | `tour_cancelled_user` | OK |
| Security block notification | `send-security-block-notification` | `security_block` | OK |
| Unlock lead confirmation | `stripe-webhook` | `lead_unlock_confirmation` | OK |

### 2.2 Provider Emails

| Workflow Event | Edge Function | emailType | Status |
|---|---|---|---|
| Exit-intent admin notification | `submit-exit-intent-lead` | `exit_intent_admin` | Fixed v4 |
| Marketing lead facility notification | `request-facility-from-marketing` | `marketing_lead_facility_notification` | Fixed |
| New lead notification | `submit-qualified-lead` | `facility_new_lead` | OK |
| Lead redistributed | `process-lead-redistribution` | `lead_redistributed` | OK |
| Lead unlock reminder | `send-unlock-reminders` | `unlock_reminder` | OK |
| Lead email (direct outreach) | `send-lead-email` | `lead_email` | OK |
| Lead confirmation resend | `resend-lead-confirmation` | `seeker_inquiry_confirmation` | OK |
| Concierge introduction | `send-concierge-introduction` | `concierge_introduction` | OK |
| Concierge provider confirmed | `send-concierge-notifications` | `concierge_provider_confirmed` | OK |
| Concierge invoice issued | `send-concierge-notifications` | `concierge_invoice_issued` | OK |
| Concierge invoice paid | `send-concierge-notifications` | `concierge_invoice_paid` | OK |
| Admission report reminder (48h) | `revenue-enforcement-cron` | `admission_reminder` | Fixed |
| Billing reminder | `revenue-enforcement-cron` | `billing_reminder` | Fixed |
| Facility approval | `send-approval-email` | `facility_approval` | OK |
| Provider welcome | `send-provider-welcome-email` | `provider_welcome` | OK |
| Provider welcome offer | `send-provider-welcome-offer-email` | `provider_welcome_offer` | OK |
| Provider onboarding drip | `process-provider-drip` | `provider_onboarding_drip` | OK |
| Provider support ticket | `send-provider-support` | `provider_support` | OK |
| Profile complete | `send-profile-complete-email` | `profile_complete` | OK |
| Profile reminder | `send-profile-reminders` | `profile_reminder` | OK |
| Subscription alert | `send-subscription-alerts` | `subscription_alert` | OK |
| Subscription management | `manage-subscription` | `subscription_${action}` | OK |
| Retention outreach | `send-retention-outreach` | `retention_outreach` | OK |
| Payment reminder | `send-payment-reminder` | `payment_reminder` | OK |
| Invoice reminder (admin-triggered) | `admin-manage-invoice` | `admin_invoice_reminder` | Fixed |
| Payment failed (provider) | `notify-payment-failed` | `payment_failed_provider` | OK |
| Stripe payment failed | `stripe-webhook` | `stripe_payment_failed` | OK |
| Stripe payment success | `stripe-webhook` | `stripe_payment_success` | OK |
| Stripe cancel notification | `stripe-webhook` | `stripe_cancel_provider` | OK |
| Credit purchase receipt | `stripe-webhook` | `credit_purchase_receipt` | OK |
| Featured facility notification | `get-featured-facilities` | `featured_facility_provider` | Fixed |
| Tour requested (facility) | `send-tour-notifications` | `tour_requested_facility` | OK |
| Tour confirmed (facility) | `send-tour-notifications` | `tour_confirmed_facility` | OK |
| Tour cancelled (facility) | `send-tour-notifications` | `tour_cancelled_facility` | OK |
| Credential notification | `send-credential-notification` | `credential_notification` | OK |

### 2.3 Admin Emails

| Workflow Event | Edge Function | emailType | Status |
|---|---|---|---|
| Exit-intent admin copy | `submit-exit-intent-lead` | `exit_intent_admin` | Fixed v4 |
| New provider signup | `notify-admin-provider-signup` | `admin_provider_signup` | OK |
| Placement case admin notification | `submit-placement-case` | `placement_case_admin_notification` | OK |
| SLA breach alert | `placement-cron` | `sla_alert` | Fixed |
| Brute force attack alert | `check-brute-force-alerts` | `admin_brute_force_alert` | OK |
| Churn risk alert | `check-churn-alerts` | `admin_churn_alert` | OK |
| Not-found search alert | `check-not-found-alerts` | `admin_not_found_alert` | OK |
| Provider health alert | `check-provider-health-alerts` | `admin_provider_health_alert` | OK |
| Payment failed (admin) | `notify-payment-failed` | `payment_failed_admin` | OK |
| Stripe new subscription | `stripe-webhook` | `stripe_new_subscription_admin` | OK |
| Stripe cancellation | `stripe-webhook` | `stripe_cancel_admin` | OK |
| Daily digest | `send-admin-daily-summary` | `admin_digest` | OK |
| Admin notification | `send-admin-notification` | `admin_notification` | OK |
| Flagged image | `notify-flagged-image` | `flagged_image` | OK |
| Featured facility admin copy | `get-featured-facilities` | `featured_facility_admin` | Fixed |
| Tour requested (admin) | `send-tour-notifications` | `tour_requested_admin` | OK |
| Tour confirmed (admin) | `send-tour-notifications` | `tour_confirmed_admin` | OK |
| Tour cancelled (admin) | `send-tour-notifications` | `tour_cancelled_admin` | OK |
| Admin user welcome | `create-admin-user` | `admin_user_welcome` | OK |
| Admin password reset | `manage-admin-user` | `admin_password_reset` | OK |
| Admin invitation resent | `manage-admin-user` | `admin_invitation_resent` | OK |
| Support request | `send-support-request` | `support_request` | OK |
| Contact form | `send-contact-form` | `contact_form` | OK |

---

## 3. Bugs Found and Fixed

### Bug 1 — `placement-cron`: Wrong `sendEmailWithRetry` signature (Critical)

**File:** `supabase/functions/placement-cron/index.ts`  
**Severity:** Critical — SLA alert emails and seeker reminder emails were silently failing  
**Root cause:** Called `sendEmailWithRetry(resend, {...})` with the old 2-argument signature. The current implementation requires `sendEmailWithRetry(supabase, resend, {...}, options)`.  
**Fix:** Updated all calls to the 3-argument form and added `emailType` options.

### Bug 2 — `revenue-enforcement-cron`: Direct `fetch` to Resend API (High)

**File:** `supabase/functions/revenue-enforcement-cron/index.ts`  
**Severity:** High — bypassed DLQ, retry logic, and email tracking  
**Root cause:** Used raw `fetch("https://api.resend.com/emails", ...)` calls instead of `sendEmailWithRetry`.  
**Fix:** Migrated all 3 email sends to `sendEmailWithRetry` with appropriate `emailType` and `idempotencyKey` values.

### Bug 3 — `submit-exit-intent-lead`: Lovable gateway dependency (High)

**File:** `supabase/functions/submit-exit-intent-lead/index.ts`  
**Severity:** High — used deprecated `connector-gateway.lovable.dev/resend` gateway requiring `LOVABLE_API_KEY`; bypassed all resilience infrastructure  
**Fix:** Rewrote email sending to use `sendEmailWithRetry` with `exit_intent_admin` and `exit_intent_confirmation` email types. Bumped to v4.0.0.

### Bug 4 — `get-featured-facilities`: Missing `emailType` options (Medium)

**File:** `supabase/functions/get-featured-facilities/index.ts`  
**Severity:** Medium — emails sent without tracking or idempotency  
**Fix:** Added `emailType` and `idempotencyKey` to both the provider and admin email sends.

### Bug 5 — `admin-manage-invoice`: Missing `emailType` options (Medium)

**File:** `supabase/functions/admin-manage-invoice/index.ts`  
**Severity:** Medium — payment reminder emails sent without tracking  
**Fix:** Added `emailType: "admin_invoice_reminder"` and idempotency key.

### Bug 6 — `request-facility-from-marketing`: Missing `emailType` options (Medium)

**File:** `supabase/functions/request-facility-from-marketing/index.ts`  
**Severity:** Medium — facility notification emails sent without tracking  
**Fix:** Added `emailType: "marketing_lead_facility_notification"` and idempotency key.

### Bug 7 — `send-concierge-notifications`: Two handlers missing `emailType` (Medium)

**File:** `supabase/functions/send-concierge-notifications/index.ts`  
**Handlers:** `sendProviderInterestedNotification` (seeker progress update) and `sendSignupPromptEmail`  
**Severity:** Medium — emails sent without tracking or idempotency  
**Fix:** Added `emailType: "concierge_provider_interested"` and `emailType: "concierge_signup_prompt"` with idempotency keys.

---

## 4. Remaining Observations

### 4.1 Non-standard From Addresses

Three functions use sub-addresses other than `no-reply@rehablookup.com`:

| Function | From Address | Purpose |
|---|---|---|
| `placement-cron` | `alerts@rehablookup.com` | SLA alert emails to admins |
| `placement-cron` | `concierge@rehablookup.com` | Seeker reminder emails |
| `revenue-enforcement-cron` | `placements@rehablookup.com` | Admission reminder emails |

These are intentional for routing/filtering purposes. All three sub-addresses must be verified in the Resend dashboard under the `rehablookup.com` domain.

### 4.2 Admin Email Address

The admin notification email `chikasholdings@gmail.com` is hardcoded in several functions. This should be moved to an environment variable (`ADMIN_EMAIL`) or a database settings table for easier management.

### 4.3 No Post-Discharge Review Request Email

The audit found no automated email requesting a review from seekers after a confirmed placement/discharge. The `placement-cron` handles seeker reminders for pending options, but there is no post-placement review solicitation email. This is a potential gap for the reviews workflow.

---

## 5. Conclusion

The email system architecture is solid. All 7 bugs found during this audit have been fixed. Every `sendEmailWithRetry` call now includes `emailType` and `idempotencyKey` options, ensuring full tracking, deduplication, and DLQ coverage across all 60+ email notification types in the platform.
