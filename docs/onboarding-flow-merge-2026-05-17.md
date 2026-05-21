# Provider onboarding flow merge — round 30

**Date:** 2026-05-17
**Goal:** Collapse the three-flow signup/listing mess (`/auth/signup`,
`/provider/onboarding`, `/provider/claim/:slug` + legacy
`ProviderSignup`/`ClaimWizard`) into a single low-friction wizard.

## Before

Three separate flows tangled together:

| Entry point | Flow |
|---|---|
| `/auth/signup` | Standalone form (firstName/lastName/email/password + OTP). Then bounce to `/provider/onboarding`. |
| `/provider/onboarding` | 5-step wizard: Account → Verify Email → Find or List → **Plan** → Build (wrapper). Build "Continue" navigates AWAY to one of the legacy pages. |
| `/provider/onboarding/new-listing` | `ProviderSignup.tsx` mounted at step 3. 6 sub-steps inside (Facility, Branding, Services, Insurance, Review, **Plan duplicate**). |
| `/provider/claim/:slug` | `ClaimWizard.tsx` 5 steps (Confirm, Role/Name, **Verification picker**, Listing Details, Review). Gated by "have you picked a plan yet?" check. |

Friction points:
1. Plan asked BEFORE the user sees their listing (twice — once in wizard, again in ProviderSignup step 8).
2. The wizard's BuildStep was an interstitial screen with "Continue to builder" CTA, then the user got dumped onto a different page that lost the wizard chrome.
3. ClaimWizard had its own plan-selection gate that bounced users back to the wizard mid-claim if `profiles.plan IS NULL`.
4. `/auth/signup` and the wizard's AccountStep had identical UIs for collecting the same data.

## After

One canonical entry: `/provider/onboarding`. Step sequence reordered so plan happens AT THE END:

```
account → verify_email → find_or_list → build → plan → completed
```

Detailed flow:

| Step | What the user does | Tech |
|---|---|---|
| 1. Account | First/last name, email, password | `AccountStep.tsx` → `register-provider-account` edge fn |
| 2. Verify Email | 6-digit OTP | `VerifyEmailStep.tsx` → `verify-code` |
| 3. Find or List | Search existing facility OR enter new name | `FindOrListStep.tsx` |
| 4. Build | Build (for new) or claim (for existing) — auto-redirects to the builder, no interstitial CTA | `BuildStep.tsx` → `NewListingForm`/`ClaimWizard` |
| 5. Plan | Free vs Pro picker (final step) | `PlanStep.tsx` — Free → mark complete; Pro → Stripe Checkout |
| ⇒ | Dashboard | `/provider/dashboard` |

## Changes

### Step ordering

| File | Change |
|---|---|
| `src/hooks/useProviderOnboardingState.ts` | `ONBOARDING_STEPS` and `VISIBLE_STEPS` reordered so `build` comes before `plan`. |
| `src/components/provider/onboarding/FindOrListStep.tsx` | Both `handleSelectExisting` and `handleListNew` now advance to `current_step='build'` (was `'plan'`). |
| `src/components/provider/onboarding/PlanStep.tsx` | Final step now. Free → `complete_provider_onboarding` RPC + dashboard. Pro → Stripe Checkout → on success: complete + dashboard. Pro-already-active fast-track for users mid-migration. |
| `src/components/provider/onboarding/BuildStep.tsx` | Collapsed from a 270-line interstitial-CTA screen to a 60-line auto-redirect. As soon as the wizard reaches `build`, it routes the user straight to the actual builder. |

### Builder hand-offs

| File | Change |
|---|---|
| `src/pages/ProviderSignup.tsx` | Step 8 (subscription picker) removed entirely. Step 7's Continue → "Publish listing" → publishes facility → advances onboarding state to `'plan'` → redirects to `/provider/onboarding?step=plan`. `SubscriptionChoiceStep` import + state removed. `subscriptionChoice` / `setSubscriptionChoice` deleted. `steps` array trimmed to 7. |
| `src/pages/provider/ClaimWizard.tsx` | `onSubmitted` advances onboarding state to `'plan'` instead of marking onboarding complete. The plan-selection gate that bounced planless claimers back to the wizard was removed. |
| `src/pages/provider/ClaimSubmitted.tsx` | "Go to dashboard" → "Pick your plan" (`/provider/onboarding?step=plan`). |
| `src/pages/provider/NewListingForm.tsx` | Pre-plan gate removed. Anon redirect now goes to `/provider/onboarding` instead of `/auth/signup`. |

### Legacy entry redirects

| File | Change |
|---|---|
| `src/pages/AuthSignup.tsx` | Was a 331-line standalone signup form. Replaced with a 35-line redirect to `/provider/onboarding`, preserving `returnTo`, `intent`, `facility_id` query params. |
| `src/pages/provider/Onboarding.tsx` | New `returnTo` handler: once `profiles.email_verified_at` is set, bounce the user to `?returnTo=...` if present. Lets anon visitors of `/provider/claim/:slug` resume the claim flow after wizard onboarding. `safeReturnTo` filter prevents off-origin redirects. |
| `src/pages/provider/ClaimWizard.tsx` | Anon redirect now goes to `/provider/onboarding?returnTo=/provider/claim/<slug>&intent=claim` instead of `/auth/signup`. Plan-selection gate dropped. |
| `src/pages/provider/Claims.tsx` | Anon redirect re-pointed at the wizard. |
| `src/pages/provider/ClaimSubmitted.tsx` | Same. |
| `src/pages/ProviderSignup.tsx` | Session-expired toast redirect re-pointed at the wizard. |

### Server-side

| File | Change |
|---|---|
| `supabase/migrations/20260517070000_reorder_onboarding_plan_after_build.sql` | Idempotent DO-block. Any in-flight rows at `current_step='plan'` are advanced to `'build'` since under the old ordering plan was BEFORE build. Their `plan` column is preserved so `PlanStep` knows their prior pick. **Applied to live DB this round.** |

## Step count reduction

| Path | Before | After |
|---|---|---|
| New listing (signed-out start) | `/auth/signup` (form + OTP) → `/provider/onboarding` (5 steps incl. plan) → `/provider/onboarding/new-listing` (6 sub-steps incl. plan duplicate) = **~13 visible screens** | 5 wizard steps: account, verify, find/list, build (6 sub-steps inline), plan = **~10 screens** |
| Claim listing (signed-out start) | `/auth/signup` (form + OTP) → `/provider/onboarding` (5 steps incl. plan) → `/provider/claim/:slug` (5 sub-steps) = **~12 visible screens** | 5 wizard steps + 4 claim sub-steps (verification rigor preserved, friction reduced) = **~9 screens** |

Net reduction: 3-4 screens per flow. Plan duplication eliminated. Interstitial wrapper screen eliminated.

## Verification

- `npx tsc --noEmit` → clean (no errors).
- All in-flight rows migrated via live SQL.
- No remaining references to a 'plan' step before build in src/.

## Deferred (not launch-blocking)

- Claim-verification auto-method (email-domain → SMS → admin) — the current 3-way picker is still in ClaimWizard Step 3. Auto-method was the user's choice but it touches the 3110-line claim editor; deferred to its own PR.
- Welcome modal copy refresh for the new plan-after-build order.
- Replacing the in-page "Sign in" link inside the now-replaced `/auth/signup` page (the redirect is one render — no link displayed).

## Files changed (round 30)

| File | Change |
|---|---|
| `src/hooks/useProviderOnboardingState.ts` | Step order: build before plan |
| `src/components/provider/onboarding/FindOrListStep.tsx` | Advances to 'build' |
| `src/components/provider/onboarding/PlanStep.tsx` | Final step + Pro-active fast-track + dashboard redirect |
| `src/components/provider/onboarding/BuildStep.tsx` | Auto-redirect (no interstitial UI) |
| `src/components/provider/onboarding/OnboardingStepper.tsx` | Docstring updated |
| `src/pages/AuthSignup.tsx` | Standalone form → unified-wizard redirect |
| `src/pages/ProviderSignup.tsx` | Step 8 removed; Step 7 = publish + route to plan |
| `src/pages/provider/Onboarding.tsx` | returnTo handler |
| `src/pages/provider/ClaimWizard.tsx` | Anon redirect + plan-gate dropped + advance-to-plan on submit |
| `src/pages/provider/ClaimSubmitted.tsx` | Anon redirect + final CTA |
| `src/pages/provider/Claims.tsx` | Anon redirect |
| `src/pages/provider/NewListingForm.tsx` | Anon redirect + pre-plan gate dropped |
| `supabase/migrations/20260517070000_reorder_onboarding_plan_after_build.sql` | NEW migration |
| `docs/onboarding-flow-merge-2026-05-17.md` | NEW — this report |
