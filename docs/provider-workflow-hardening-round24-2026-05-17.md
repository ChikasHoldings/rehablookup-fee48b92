# Provider workflow — round 24 hardening

**Date:** 2026-05-17
**Scope:** Final pass on every provider workflow the user cited: signup, claim, list new facility, plan selection, Pro payment + benefits, edit facility details, upload logo/images, onboard. Builds on rounds 19-23.

## TL;DR

Two more bugs caught + fixed; one feature gap closed.

| Issue | Severity | Fix |
|---|---|---|
| ListingEditor gallery cap hardcoded to 10 for all plans, regardless of Free vs Pro | UX bug — Free users see 10 slots and get a server `check_violation` on the 6th upload | Now reads `PLAN_LIMITS[isPro ? "pro" : "free"].photos` (5 / 10), matching the `enforce_facility_plan_photo_cap` trigger exactly |
| Storage bucket `facility-images` file_size_limit was 5 MB while client validates 10 MB | UX bug — provider uploads 6 MB photo, passes client validation, gets confusing 413 from storage | Migration bumps bucket to 10 MB to align ceilings |
| No inline phone verification on the facility-phone field in the listing editor (or post-listing-creation in the wizard) | Feature gap (carried over from round 23) — user asked verification to auto-trigger "if a provider adds a phone number in the listing details" | New `FacilityPhoneVerifySection` component co-located under `src/components/provider/listing/`; wired into ListingEditor contact tab; writes `facilities.{verified_phone, verified_phone_set_at, has_facility_verified_contact}` on success so public Center Profile displays the "Verified contact" badge |

## Provider workflow status (post-round 24)

| Workflow | Status | Verified via |
|---|---|---|
| Sign-up + auto-login | ✓ green | round-19/20 live E2E (register → token → OTP) |
| Claim listing | ✓ green | round-20 live test (`submit-facility-claim` returns 200, claim row inserted; round-20 fix removed dead `provider_credits` INSERT from `handle_claim_request_approval` trigger so admin approval also works) |
| List new facility | ✓ green | round-20 live INSERT after fixing `enforce_facility_limit` + dropping legacy `provider_credits` triggers |
| Plan selection (Free) | ✓ green | wizard state upsert advances current_step='build' |
| Plan selection (Pro, Stripe Checkout) | ✓ green | `create-checkout` returns live `cs_live_…` URL; 10-second poll + graceful timeout in PlanStep |
| Pay for Pro + receive benefits | ✓ green | `stripe-webhook` → `activateProBenefits` → `profiles.plan='pro'`, `facilities.featured=true`, `+50 ranking_score`. Smoke-replayed locally: all three flags flipped correctly |
| Photo cap re-enforces on downgrade | ✓ green | live test: Pro=10 OK; downgrade to Free → INSERT 6th photo → 23514 cap error |
| Edit facility details (ListingEditor) | ✓ green | RLS allows owner UPDATE; 3-sec debounced auto-save; 10 tabs all wired; gallery cap now plan-aware |
| Upload logo + gallery images | ✓ green | `facility-images` bucket public; RLS keys on user_id folder prefix; bucket cap now 10 MB matches client; per-plan cap enforced on `gallery_urls` write |
| Facility phone verification | ✓ NEW (round 24) | auto-prompts in listing editor; writes facility verified-phone columns under RLS so Center Profile shows the verified-contact badge |
| Onboarding → provider panel handoff | ✓ green | `complete_provider_onboarding()` RPC sets `profiles.onboarding_completed_at`; WelcomeModal one-shots on first dashboard load |

## Files changed (round 24)

| File | Change |
|---|---|
| `src/pages/provider/ListingEditor.tsx` | gallery cap now `PLAN_LIMITS[plan].photos`; contact tab phone field replaced with `FacilityPhoneVerifySection`; Facility interface + facility-load select extended with `verified_phone`, `verified_phone_set_at`, `has_facility_verified_contact` |
| `src/components/provider/listing/FacilityPhoneVerifySection.tsx` | NEW — reusable inline phone-verification widget. Auto-presents Verify button at 10 digits, sends SMS via `send-sms-verification-code`, inline 6-digit OTP entry, on success writes facility verified-phone columns + fires `onVerified` callback. Gracefully degrades when Twilio is not configured (returns `{sent:false}`). |
| `supabase/migrations/20260517030000_bump_facility_images_bucket_size_limit.sql` | NEW — bump `storage.buckets.file_size_limit` for `facility-images` from 5 MB → 10 MB |
| `docs/provider-workflow-hardening-round24-2026-05-17.md` | NEW — this report |

## Remaining out-of-code

- **Stripe price configuration**: `rl_featured_{monthly,annual}_v1` + `rl_concierge_{monthly,annual}_v1` lookup keys still need to be created in Stripe Dashboard so `create-checkout-session` can resolve Featured / Concierge purchases. Pro itself is hardcoded to a working `price_id` so the Pro upgrade flow works today.
- **Stripe webhook URL**: confirm `https://mldbxpntzcjalgjmwnqa.supabase.co/functions/v1/stripe-webhook` is registered in the Stripe Dashboard with the required events.
- **Twilio config**: `send-sms-verification-code` falls back to `{sent: false}` if `TWILIO_*` secrets are missing. The Facility Phone verification UI now surfaces a non-blocking toast in that case so the provider can still save their listing without the verified badge.

## Cumulative provider hardening (rounds 19-24)

| Round | Date | Headline |
|---|---|---|
| 19 | 2026-05-17 | register-provider-account v1.2.0 unlocks auto-login by setting `email_confirm:true` upfront; 4 stuck accounts unblocked |
| 20 | 2026-05-17 | 5 EKRA-legacy showstoppers fixed (enforce_facility_limit, provider_credits triggers, claim-approval trigger, purge_provider_data, lead_unlocks RLS) |
| 21 | 2026-05-17 | `leads_provider_view` restored, `leads.provider_response_notes` column added, `$399`/credit/unlock UI copy purged |
| 22 | 2026-05-17 | Public link audit: 3 broken navigation targets fixed |
| 23 | 2026-05-17 | Phone verification moved out of wizard Step 3; auto-triggers in listing details |
| 24 | 2026-05-17 | Gallery cap is now plan-aware, storage bucket size matches client, facility-phone inline verification component |

## Status

| Item | Status |
|---|---|
| Round 24 fixes deployed to migration + repo | ✓ |
| Typecheck clean | ✓ |
| Live E2E re-verified (register → facility insert → Pro activation → verified-phone write under RLS → Free downgrade enforces cap) | ✓ |
| Test artifacts cleaned | ✓ |

All 23 prior audit/harden rounds remain reachable from HEAD.
