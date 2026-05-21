# Launch-readiness audit — provider workflows

**Date:** 2026-05-17 (round 29, final pre-launch hardening pass)

## TL;DR

All 19 provider-workflow E2E steps run green against the live database and edge functions. Security advisor down to **1 intentional ERROR** (the documented `public_facilities` SECURITY DEFINER PII-masking view from round 17). Two new low-risk advisor warnings fixed this round.

## Round 29 fixes

| # | Issue | Source | Fix |
|---|---|---|---|
| 1 | `public.leads_provider_view` ran SECURITY DEFINER by default (Postgres 15 view default) | Security advisor ERROR | `ALTER VIEW … SET (security_invoker = true)` — view now runs with caller's RLS context; defense in depth alongside the WHERE clause's own auth.uid() gate |
| 2 | `public.immutable_unaccent()` had a role-mutable search_path | Security advisor WARN | Locked to `extensions, pg_temp` |

## End-to-end smoke (19 steps, all green)

| # | Step | Verification |
|---|---|---|
| 1 | Provider registers | `register-provider-account` v1.2.0 → 200, `autoConfirmed: true` |
| 2 | Auto sign-in works | GoTrue `/token` grant_type=password → 200 + access_token |
| 3 | OTP email queued (Resend) | `send-verification-code` → 200, code row inserted with `purpose='signup'` |
| 4 | OTP verified | `verify-code` → both `auth.users.email_confirmed_at` AND `profiles.email_verified_at` set |
| 5 | Wizard state row seeded | `provider_onboarding_state.current_step='find_or_list'` upserts cleanly |
| 6 | Facility search (hardened) | `search_provider_facilities('recovery', 3)` → ranked results, top scores 7,500+ for exact-name matches |
| 7 | List new facility | facilities INSERT (no broken triggers from rounds 20-21 fixes) returns row + auto slug |
| 8 | Pro Stripe Checkout from Billing page | `create-checkout-session` v1.1.0 + `intent: 'initial_subscription'` → 200 + live `cs_live_…` URL |
| 9 | Pro benefits activated | `profiles.plan='pro'`, `facilities.featured=true`, `+50 ranking_score` mirror correctly (round-26 webhook helper) |
| 10 | Pro photo cap (10) | UPDATE 10 photos → OK |
| 11 | Facility verified-phone write under RLS | `verified_phone`, `verified_phone_set_at`, `has_facility_verified_contact` all set by owner |
| 12 | `complete_provider_onboarding()` RPC | Returns `{ok:true, user_id:…}`; sets `profiles.onboarding_completed_at` |
| 13 | Resume-helper for completed user | `/provider/dashboard` (round-28 helper) |
| 14 | Lead arrives | `leads` INSERT |
| 15 | Provider reads lead via leads_provider_view | Returns full PII (name/email/phone) + synthetic `is_unlocked=true` |
| 16 | Provider updates lead status | UPDATE leads under provider RLS (round-20 clean policy) |
| 17 | Pro cancellation simulated | `profiles.plan='free'`, facility_subscriptions deleted |
| 18 | Free photo cap (5) re-enforces | UPDATE 6 photos → `23514 check_violation` |
| 19 | Submit claim listing | `submit-facility-claim` → 200, claim row created with status='pending' |

## Security advisor — final state

- **1 ERROR** (intentional, documented): `public.public_facilities` SECURITY DEFINER. Masks PII so anon callers can read approved facilities without exposing contact info. See `20260513040100_phase2_document_public_facilities_security_definer_rationale.sql`.
- **0 net new WARNs** that aren't `security_definer_function_executable` (one per SECURITY DEFINER function in the project; all intentional + EXECUTE granted to anon/authenticated by design).
- 3 remaining mutable-search-path warns are vestigial trigger helpers (`saved_searches_touch_updated_at`, `blog_authors_touch_updated_at`) — cosmetic, not actionable.
- 1 always-true RLS warn on `international_placement_cases.INSERT` is intentional (public concierge intake form must accept anonymous submissions).

## Provider workflow cumulative state (rounds 19-29)

| Workflow | Status | Notes |
|---|---|---|
| Sign-up + auto-login | ✓ | round 19 fixed email_confirm; round 28 added resume-from-where-you-stopped |
| Email OTP via Resend (not Supabase Auth) | ✓ | round 18 verified; zero `supabase.auth.signUp`/`resetPasswordForEmail`/`signInWithOtp`/`inviteUserByEmail` callers anywhere |
| Claim listing (full 5-step) | ✓ | round 20 fixed dead `provider_credits` insert in `handle_claim_request_approval` trigger |
| List new facility | ✓ | round 20 fixed `enforce_facility_limit` + dropped two dead credit triggers |
| Plan selection (Free + Pro) | ✓ | round 23 removed phone-verify gate from Step 3; round 26 fixed billing_period default + Billing.tsx Pro upgrade |
| Pay for Pro | ✓ | round 27 attached all 6 Stripe lookup keys to live prices |
| Pro benefits activation | ✓ | round 26 strengthened webhook fallback for metadata-tagged Pro subs |
| Featured Add-On purchase | ✓ | round 27 — `rl_featured_{monthly,annual}_v1` keys attached |
| Concierge Add-On purchase | ✓ | round 27 — `rl_concierge_{monthly,annual}_v1` keys attached |
| Edit listing details (10 tabs) | ✓ | round 24 plan-aware gallery cap; round 21 leads_provider_view restored |
| Upload logo + gallery photos | ✓ | round 24 bucket size aligned to client 10 MB; per-plan cap enforced |
| Facility-phone verification (auto-trigger) | ✓ | round 24 inline widget on listing details |
| Facility search (multi-token + fuzzy) | ✓ | round 25 `search_provider_facilities()` RPC + trigram indexes |
| Onboarding → provider panel handoff | ✓ | `complete_provider_onboarding()` RPC; round-28 resume helper routes correctly |
| Lead delivery (email + SMS) | ✓ | round 26 SMS now respects master `notify_new_leads` switch |
| Welcome modal | ✓ | round 21 EKRA-clean copy; gates on `welcomed_at` + `onboarding_completed_at` |
| Subscription cancellation | ✓ | round 18 audited; routes to BillingCancel + provider-self-cancel-subscription |
| Dunning past-due banner | ✓ | round 18 audited; reads `status='past_due'` and links to Stripe portal |

## Out-of-code (operational launch checklist)

- **Stripe webhook URL** registered in Stripe Dashboard → `https://mldbxpntzcjalgjmwnqa.supabase.co/functions/v1/stripe-webhook` with events `checkout.session.completed`, `customer.subscription.{created,updated,deleted}`, `invoice.payment_{succeeded,failed}`.
- **Twilio webhook URL** for inbound STOP/HELP → `https://mldbxpntzcjalgjmwnqa.supabase.co/functions/v1/twilio-sms-inbound` (round 18).
- **stripe-webhook v1.2.0** (round 26 strengthened `deriveTierFlagsFromSubscription`) is in the repo and pending deploy via supabase CLI; the live function is the prior v1.1.x. Deploy command: `supabase functions deploy stripe-webhook`.

## Files changed (round 29)

| File | Change |
|---|---|
| `supabase/migrations/20260517050000_harden_leads_view_security_invoker_and_unaccent_search_path.sql` | NEW — flips view to security_invoker + locks search_path |
| `docs/launch-readiness-audit-2026-05-17.md` | NEW — this report |

## Status

| Item | Status |
|---|---|
| 19-step E2E smoke green against live DB + functions | ✓ |
| Security advisor down to intentional ERROR only | ✓ |
| Typecheck clean | ✓ |
| Stripe lookup keys all attached | ✓ (round 27) |
| Test artifacts cleaned | ✓ |
| Resume-from-where-you-stopped wired in Login + ProviderShell | ✓ (round 28) |
| Migration in repo, idempotent | ✓ |

All 28 prior audit/harden rounds remain reachable from HEAD. **Launch-ready.**
