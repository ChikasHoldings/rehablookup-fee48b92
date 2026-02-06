
# 🚨 CRITICAL LAUNCH READINESS AUDIT REPORT

## Executive Summary
**Status: LAUNCH BLOCKED - Critical Issues Found**

This comprehensive audit reveals that **~95% of edge functions are NOT deployed**, which will cause immediate failures in core functionality including payments, lead submission, email verification, and SEO. The system is currently unable to support a launch.

---

## Priority 1: CRITICAL - Edge Functions Not Deployed (BLOCKING)

### Summary
Out of ~100+ edge functions in the codebase, only **4 are currently deployed**. All others return 404 errors.

### Working Functions (4 total)
| Function | Status |
|----------|--------|
| `get-public-facilities` | ✅ Deployed |
| `get-featured-facilities` | ✅ Deployed |
| `create-concierge-checkout` | ✅ Deployed |
| `save-placement-draft` | ✅ Deployed |

### Critical Non-Deployed Functions (MUST FIX)

#### Payment System (BROKEN)
- `stripe-webhook` - Stripe payment webhooks will fail
- `create-checkout` - Users cannot initiate payments
- `check-subscription` - Subscription status unavailable
- `verify-concierge-payment` - Payment verification broken
- `purchase-credits` - Credit purchases broken
- `subscribe-pro` - Pro subscriptions broken

#### Lead Submission (BROKEN)
- `submit-qualified-lead` - Lead forms will not work
- `send-lead-confirmation` - No lead confirmations
- `send-lead-email` - Lead emails not sent
- `send-lead-digest` - No lead digests

#### Email/Verification System (BROKEN)
- `send-verification-code` - Email verification broken
- `verify-code` - Code verification broken
- `check-email-verified` - Cannot check verification status
- `send-approval-email` - No approval notifications
- `send-provider-welcome-email` - No welcome emails

#### Contact & Support (BROKEN)
- `send-contact-form` - Contact form submissions fail
- `send-support-request` - Support requests fail
- `send-provider-support` - Provider support broken

#### SEO & Sitemaps (BROKEN)
- `sitemap-facilities` - Sitemap generation broken (affects Google indexing)
- `submit-indexnow` - Index submission broken

#### Analytics & Tracking (BROKEN)
- `track-provider-event` - Provider event tracking broken
- `track-view` - Page view tracking broken
- `track-interaction` - Interaction tracking broken
- `track-featured-analytics` - Featured analytics broken
- `log-activity` - Activity logging broken

#### Concierge System (PARTIALLY BROKEN)
- `submit-concierge-intake` - Intake submission broken
- `verify-concierge-payment` - Payment verification broken
- `send-concierge-notifications` - Notifications broken
- `send-concierge-introduction` - Introductions broken

### Complete List of All Non-Deployed Functions
```text
admin-delete-provider, admin-delete-seeker, admin-manage-invoice,
auto-status-transition, calculate-ranking-scores, charge-placement-fee,
check-brute-force-alerts, check-churn-alerts, check-email-verified,
check-provider-health-alerts, check-subscription, cleanup-audit-logs,
cleanup-orphan-storage, cleanup-rate-limit-logs, confirm-placement,
create-admin-user, create-checkout, create-international-checkout,
customer-portal, delete-provider-account, delete-seeker-account,
detect-and-prerender, get-billing-history, get-facility-plan,
get-payment-method, get-provider-subscription, get-revenue-stats,
log-activity, log-login-attempt, lookup-ip-location, manage-admin-user,
manage-international-case, manage-mfa-recovery, manage-subscription,
match-concierge-intake, notify-admin-provider-signup, notify-flagged-image,
notify-payment-failed, prerender-for-bots, process-lead-redistribution,
purchase-credits, purchase-listing-slot, report-image,
request-facility-from-marketing, resend-webhook, respond-international-case,
retry-failed-payments, save-international-placement-draft,
save-provider-payment-method, send-abandoned-placement-email,
send-admin-daily-summary, send-admin-notification, send-admin-weekly-report,
send-approval-email, send-concierge-introduction, send-concierge-notifications,
send-contact-form, send-credential-notification, send-lead-confirmation,
send-lead-digest, send-lead-email, send-marketing-followup,
send-message-notifications, send-payment-reminder, send-profile-complete-email,
send-profile-reminders, send-provider-support, send-provider-welcome-email,
send-reply-email-verification, send-retention-outreach, send-review-notification,
send-review-request, send-security-block-notification, send-seeker-emails,
send-sms-notification, send-sms-verification-code, send-subscription-alerts,
send-support-request, send-tour-notifications, send-unlock-reminders,
send-verification-code, send-weekly-digest, serve-badge,
setup-provider-payment-method, sitemap-facilities, stripe-webhook,
submit-concierge-intake, submit-indexnow, submit-international-intake,
submit-marketing-lead, submit-placement-case, submit-qualified-lead,
subscribe-pro, track-featured-analytics, track-interaction,
track-provider-event, track-view, unlock-lead, validate-promo-code,
verify-code, verify-concierge-payment, verify-reply-email-code, verify-sms-code
```

---

## Priority 2: Configuration Issues

### Missing config.toml Entries
Two functions exist in code but are NOT in `supabase/config.toml`:
1. `save-placement-draft` - Deployed but no config entry (may cause issues)
2. `save-international-placement-draft` - Not deployed AND no config entry

**Fix Required:** Add these entries to config.toml:
```toml
[functions.save-placement-draft]
verify_jwt = false

[functions.save-international-placement-draft]
verify_jwt = false
```

---

## Priority 3: React Console Warnings (Non-Blocking)

### forwardRef Warnings
Two components receive refs but don't use `forwardRef`:

1. **InternalLinkingSection** (`src/components/seo/InternalLinkingSection.tsx`)
   - Warning: "Function components cannot be given refs"
   - Impact: Low - cosmetic warning only

2. **TreatmentCenterCard** (`src/components/cards/TreatmentCenterCard.tsx`)
   - Uses `memo()` but receives refs
   - Impact: Low - cosmetic warning only

**Fix:** Wrap components with `forwardRef` if refs are needed, or remove ref passing.

---

## Priority 4: Database Linter Issues (34 Warnings)

### Security Warnings Found
| Category | Count | Severity |
|----------|-------|----------|
| RLS Policy Always True | 20+ | WARN |
| Extension in Public Schema | 1 | WARN |
| RLS Enabled No Policy | 1+ | INFO |

### Tables with "Always True" RLS Policies
These tables have INSERT/UPDATE/DELETE policies with `USING (true)` which may be intentional for public forms but should be reviewed:
- Likely includes lead submission tables
- May include public tracking tables

**Recommendation:** Review each policy to confirm intentional public access.

---

## Priority 5: Security Scan Results (Known Issues)

### Findings Reviewed & Acknowledged
- SECURITY DEFINER functions - Reviewed, properly configured
- React version - False positive, 18.3.1 is current and secure
- Public data exposure - Intentional for directory listings

---

## Implementation Plan

### Phase 1: Deploy All Edge Functions (IMMEDIATE)
Deploy all 100+ edge functions to restore core functionality:

```text
Deploy order (critical first):
1. stripe-webhook
2. submit-qualified-lead  
3. send-verification-code
4. verify-code
5. create-checkout
6. check-subscription
7. sitemap-facilities
8. [all remaining functions]
```

### Phase 2: Update config.toml
Add missing function configurations.

### Phase 3: Fix React Warnings (Optional)
Update components with forwardRef if needed.

### Phase 4: Review RLS Policies (Post-Launch)
Audit all "always true" policies for appropriateness.

---

## Technical Implementation Details

### Step 1: Batch Deploy All Functions
Will need to deploy all edge functions using the deployment tool. This includes approximately 100+ functions across:
- Payment processing (Stripe)
- Email notifications (Resend)
- SMS notifications (Twilio)
- Lead management
- Analytics tracking
- SEO/Sitemap generation
- Admin functions
- Concierge system
- International placements

### Step 2: Verify Critical Flows
After deployment, test:
1. Payment flow (Stripe checkout → webhook → confirmation)
2. Lead submission (form → database → email notification)
3. Email verification (send code → verify code)
4. Contact form submission
5. Sitemap generation

---

## Risk Assessment

| Risk | Likelihood | Impact | Status |
|------|------------|--------|--------|
| Payment failures | HIGH | CRITICAL | Currently broken |
| Lead loss | HIGH | CRITICAL | Currently broken |
| Email verification failure | HIGH | HIGH | Currently broken |
| SEO impact | HIGH | MEDIUM | Currently broken |
| Analytics gaps | HIGH | LOW | Currently broken |

---

## Estimated Resolution Time
- Edge function deployment: ~30 minutes
- Verification testing: ~15 minutes
- Total: ~45 minutes to full functionality

**Note:** This is a mass deployment issue - once triggered, all functions will be deployed automatically.
