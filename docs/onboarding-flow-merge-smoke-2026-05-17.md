# Onboarding flow merge — smoke verification

**Date:** 2026-05-17 (round 30 final)
**Scope:** Verify the merged provider signup/listing/claim flow is sound against the live database and deployed edge functions.

## Database invariants — verified

| # | Check | Result |
|---|---|---|
| 1 | `provider_onboarding_state` CHECK constraint accepts the full step enum (`account, verify_email, verify_phone, find_or_list, plan, build, completed`) | ✓ both old and new orderings valid |
| 2 | Migration `20260517070000_reorder_onboarding_plan_after_build` applied | ✓ no rows stuck at old `current_step='plan'` |
| 3 | In-flight onboarding rows distribution sane | ✓ 1 row at `build` (the test cohort), no orphans |
| 4 | `complete_provider_onboarding()` RPC exists, SECURITY DEFINER, EXECUTE granted to authenticated | ✓ |
| 5 | RPC body still flips `current_step='completed'` + `profiles.onboarding_completed_at=now()` with profile-guard bypass | ✓ unchanged from round 29 |
| 6 | `enforce_profile_sensitive_column_guard` enforces: Pro elevation = webhook-only; `onboarding_completed_at` = RPC-only; `email_verified_at` = server-only | ✓ |

## Edge functions — verified deployed + ACTIVE

| Function | Version | Used by |
|---|---|---|
| `register-provider-account` | v4 | AccountStep (wizard) |
| `send-verification-code` | v7 | VerifyEmailStep auto-send on mount |
| `verify-code` | v9 | VerifyEmailStep code submit; sets both `auth.users.email_confirmed_at` AND `profiles.email_verified_at` |
| `create-checkout` | v8 | PlanStep (Pro path) |
| `send-provider-welcome-email` | v7 | VerifyEmailStep + ProviderSignup post-publish |
| `submit-facility-claim` | v3 | ClaimWizard Step 2 |
| `initiate-claim-email-verification` | v2 | EmailInputView (Step 3) |
| `initiate-claim-sms-verification` | v2 | MethodPicker SMS branch |
| `stripe-webhook` | v7 | Pro activation on `checkout.session.completed` |
| `submit-qualified-lead` | v7 (deploy pending) | Lead notification — round-30 SMS retry patch in repo but not yet deployed |

## Flow walkthroughs — static verification

### New listing (signed-out start)

1. Visit `/provider/onboarding` →  wizard shell mounts, no state row → renders `AccountStep`.
2. Submit name/email/password → `register-provider-account` → `signInWithPassword` → upsert state with `current_step='verify_email'`.
3. `VerifyEmailStep` auto-sends code → user types 6 digits → `verify-code` flips `profiles.email_verified_at` + advances to `find_or_list`.
4. `FindOrListStep` accepts "list new facility {name}" → advances to `'build'`.
5. `BuildStep` mounts, useEffect fires → `navigate('/provider/onboarding/new-listing', { replace: true })`.
6. `NewListingForm` checks session → mounts `ProviderSignup` with `initialStep=3`.
7. Round-30 prefill effect pulls firstName/lastName/email/phone from `profiles` into `formData`.
8. User fills Facility, Branding, Services, Insurance, Review → Step 7 "Publish listing" calls `handleSubmit`.
9. `handleSubmit` creates the facility (+services/photos/etc.) → upserts state to `current_step='plan'` → `navigate('/provider/onboarding?step=plan')`.
10. `PlanStep` mounts. Fast-track check: if user is already Pro, mark complete + dashboard. Otherwise render Free/Pro cards.
11. Free → `profiles.update({plan:'free'})` (client RLS) + `advance({plan:'free', current_step:'completed'})` + `complete_provider_onboarding()` RPC + `navigate('/provider/dashboard')`.
12. Pro → `create-checkout` → Stripe Checkout → on `?checkout=success` → poll `facility_subscriptions` for active Pro → `complete_provider_onboarding()` + dashboard.

### Claim listing (signed-out start)

1. Visit `/provider/claim/foo` (CTA on facility page) → ClaimWizard auth gate detects no session → `navigate('/provider/onboarding?returnTo=/provider/claim/foo&intent=claim')`.
2. Wizard runs Account + VerifyEmail as above.
3. Round-30 returnTo handler: once `profiles.email_verified_at` is set, `<Navigate to={returnTo} replace />` bounces them to `/provider/claim/foo`.
4. ClaimWizard mounts → auth gate sees session → proceeds.
5. Step 1 Confirm Facility → Step 2 Confirm Who You Are (name/email/phone pre-filled from profile, user picks Role) → submit-facility-claim creates `facility_claim_requests` row.
6. Step 3 Auto-routed verification:
   - Email domain match → near-instant via `initiate-claim-email-verification`
   - Else SMS to facility phone (consent dialog) → `initiate-claim-sms-verification`
   - Else document upload → admin review
   - "Verify a different way" disclosure preserves fallback choice.
7. Step 4 Listing Details → Step 5 Review & Submit.
8. `onSubmitted` advances state to `current_step='plan'` → navigate to `/provider/claim/foo/submitted`.
9. `ClaimSubmitted` shows "Pick your plan" CTA → `/provider/onboarding?step=plan`.
10. PlanStep same as above.

### Legacy entry redirects — verified

| Path | Behavior |
|---|---|
| `/auth/signup` | `<Navigate to={`/provider/onboarding${qs}`} />` preserving returnTo / intent / facility_id |
| `/auth/signup?returnTo=/x` | Same, with safeReturnTo filter for off-origin protection |
| `/provider/claim/:slug` (anon) | ClaimWizard auth gate → `/provider/onboarding?returnTo=/provider/claim/<slug>&intent=claim` |
| `/provider/onboarding/new-listing` (anon) | NewListingForm auth gate → `/provider/onboarding?returnTo=/provider/onboarding/new-listing` |
| `/provider/claims` (anon) | Claims.tsx auth gate → `/provider/onboarding?returnTo=/provider/claims` |
| `/provider/claim/:slug/submitted` (anon) | ClaimSubmitted auth gate → `/provider/onboarding` |

## Friction-reduction tally (round 30 + follow-ups)

- 3 entry points → 1 canonical wizard
- New-listing flow ~13 screens → ~10
- Claim flow ~12 screens → ~9
- ClaimWizard Step 2: name/email/phone pre-filled (just confirm + pick role)
- ClaimWizard Step 3: 3-way picker → auto-routed primary CTA with collapsed alternatives disclosure
- ProviderSignup Step 8 (plan duplicate) deleted entirely
- BuildStep interstitial CTA screen → auto-redirect
- `SubscriptionChoiceStep` orphan component + `subscriptionChoiceRef` / `createdFacilityIdRef` dead refs purged
- Plan moved to AFTER build (final step) — defaults to Free, Pro is opt-in
- Plan-active fast-track for users mid-migration

## Deferred (post-launch, not blocking)

- Deploy `submit-qualified-lead` v8 with SMS retry + admin_notifications fallback (round-30 SMS patch). Single CLI command from operator: `supabase functions deploy submit-qualified-lead --use-api`.
- Delete deployed `create-signup-checkout` edge function (no longer called from any client code; left deployed for cached-client safety).
- Apply the same SMS retry pattern to `notify-payment-failed` and `lead-mass-blast` (currently rely on `send-sms-notification`'s graceful skip — non-silent but lossy on hard Twilio outages).

## Verdict

**Merged onboarding flow is launch-ready.** Database invariants pass; edge functions deployed; state machine handles all known transitions including in-flight rows.
