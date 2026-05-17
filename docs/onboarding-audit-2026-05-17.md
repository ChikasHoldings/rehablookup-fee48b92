# Provider Onboarding Wizard — Audit Report

**Date:** 2026-05-17
**Scope:** `/provider/onboarding` wizard (PRs #31–#38), the edge functions it depends on, the migrations it adds, and the hand-off targets (`ClaimWizard`, `NewListingForm`).
**Branch:** `claude/phase2-deployment-5WYOn` (tipped at PR #38 — `d2f59357` — so every prior consolidated commit is preserved).
**Method:** Static read of every file in scope, plus a remote read of any deployed-only edge function via the Supabase MCP. Severity tags: **CRITICAL** (block ship), **HIGH** (block ship for security / data-integrity sections), **MEDIUM** (fix before public launch), **LOW** (polish), **PASS** (no action).

---

## PART A — Unification audit

### A1. Single entry route — **PASS**
- `/provider/onboarding` mounts `ProviderOnboarding` (`src/App.tsx:1272`).
- Legacy `/provider-signup` is a `<Navigate to="/provider/onboarding" replace>` (`src/App.tsx:1270`).
- `/provider/signup` is a `<Navigate to="/provider-signup" replace>` (`src/App.tsx:1286`) → double-hop to `/provider/onboarding`. Works but inefficient.

### A2. AuthSignup parallel-path — **MEDIUM (A2)**
- `/auth/signup` (`src/App.tsx:1271` → `src/pages/AuthSignup.tsx`) is a separate signup screen, used by `ClaimWizard`, `NewListingForm`, and `provider/Claims` as an auth gate when a signed-out user lands directly on a claim or new-listing URL.
- Functionally identical to `AccountStep` (calls same `register-provider-account` edge fn, same OTP flow).
- Not strictly a duplicate of the wizard, but it is a second screen with sign-up semantics. Recommend: keep, but document; or rewrite the three callers to bounce to `/provider/onboarding?intent=...` instead.

### A3. Hand-off targets — **PASS**
- `mode='list'` → `/provider/onboarding/new-listing` (`BuildStep.tsx:106`) → `NewListingForm.tsx` → wraps `ProviderSignup` with `initialStep={3}`. `ProviderSignup.tsx:909-916` writes `current_step='completed'` and `onboarding_completed_at`. ✓
- `mode='claim'` → `/provider/claim/<slug>` (`BuildStep.tsx:103`) → `ClaimWizard.tsx`. See **C9** for the completion-gap.

### A4. Stepper canonical order — **PASS**
- `ONBOARDING_STEPS = ['account','verify_email','verify_phone','find_or_list','plan','build','completed']` (`useProviderOnboardingState.ts:16`).
- `VISIBLE_STEPS` collapses `verify_email + verify_phone` into one "Verify" tile (`useProviderOnboardingState.ts:45`). ✓
- DB check constraint matches the seven values (`20260525000000_provider_onboarding_foundation.sql:91`). ✓

---

## PART B — State-machine integrity

### B1. Resume from server cursor — **PASS**
- `Onboarding.tsx:89` reads `provider_onboarding_state.current_step`. `?step=` is honored only when `canReach(target, serverCurrent)` (`Onboarding.tsx:96`); otherwise stripped with a toast (`Onboarding.tsx:103-110`).

### B2. Already-onboarded redirect — **PASS**
- `Onboarding.tsx:128` reads `profiles.onboarding_completed_at`; non-null → `<Navigate to="/provider/dashboard" replace>`. ✓

### B3. Reachability gate — **PASS**
- `canReach()` (`useProviderOnboardingState.ts:63`) compares indices in `ONBOARDING_STEPS`. Future steps blocked; past steps reachable for back-nav. ✓

### B4. Client-side advance trust boundary — **HIGH (B4)**
- The `advance()` hook (`useProviderOnboardingState.ts:96`) upserts arbitrary fields including `plan`, `current_step`, and `mode` from the client. RLS on `provider_onboarding_state` allows `INSERT/UPDATE` where `user_id = auth.uid()` (`20260525000000_provider_onboarding_foundation.sql:127-153`).
- An authenticated user can `upsert({current_step:'completed', plan:'pro'})` directly via PostgREST/DevTools and skip every step. They cannot trip the welcome modal or the photo-cap trigger (those read `profiles.plan` + `profiles.onboarding_completed_at`, not the onboarding-state row), but they can pollute funnel analytics and skip the verification gates.
- See **C1**, **C5** for the related `profiles.plan` and `profiles.onboarding_completed_at` write boundaries — those have real consequences.

### B5. Pre-seed claim intent → state row — **PASS**
- `?intent=claim&facility_id=` on signed-out entry: `AccountStep.tsx:107-112` seeds `selected_facility_id + mode='claim'` on the row.
- Seeded facility renders highlighted (`FindOrListStep.tsx:346-360`).

### B6. Step refresh resumes mid-verification — **PASS**
- Refresh on `verify_email` → wizard reads `current_step='verify_email'` → re-renders `VerifyEmailStep` → `autoSentRef` re-sends a fresh OTP (`VerifyEmailStep.tsx:49-72`).

### B7. List vs Claim mode bleed — **PASS**
- `handleListNew` explicitly clears `selected_facility_id` (`FindOrListStep.tsx:262`) so a stale claim pre-seed doesn't carry into list mode.

---

## PART C — Auth, security, and data-integrity boundaries

### C1. `profiles` UPDATE allows authenticated user to set `plan='pro'` without paying — **CRITICAL (C1)**
- Live RLS on `profiles`: `UPDATE` policy `(auth.uid() = user_id)` with **no `WITH CHECK` and no column restriction** (verified via `pg_policy` query on the live DB).
- Consequence: a signed-in provider can `update({plan:'pro'})` via PostgREST. The `enforce_facility_plan_photo_cap()` trigger reads `profiles.plan` for the photo limit (`20260526000000_provider_plan_photo_cap.sql:37-41`), so the user instantly gets the 10-photo cap without a Stripe payment. PlanGate-protected UI (video tile, etc.) also unlocks client-side.
- Spec hard rule: "Stripe Checkout success_url cannot be trusted to authorize plan='pro'. The plan flip must come from the verified webhook OR a server-side session lookup."
- **Fix:** F1 (DB trigger blocks `plan='pro'` writes from authenticated role + F2 webhook mirror).

### C2. `stripe-webhook` does NOT mirror `plan='pro'` onto `profiles` — **HIGH (C2)**
- `stripe-webhook/index.ts` writes `facility_subscriptions.tier='pro'` on `checkout.session.completed` (lines 870-908) but never touches `profiles.plan`. Search across the file for `update.*profiles` returns zero hits in the subscription path.
- Today the only writer of `profiles.plan='pro'` is the wizard's client-side mirror (`PlanStep.tsx:86-89`). If the user closes the tab before that runs, `profiles.plan` stays `free` even though Stripe charged them, and the photo cap holds them to 5 photos for the rest of their subscription.
- **Fix:** F2 (add server-side mirror inside the webhook's subscription-active branch).

### C3. `verify-sms-code` writes `phone_verified_at` to caller-supplied `userId` without authenticating the JWT — **CRITICAL (C3)**
- `verify-sms-code/index.ts:148-211` reads `userId` and `userType` from the request body and writes `phone`, `phone_verified`, `phone_verified_at` to `profiles` (or `seeker_profiles`) keyed on that body-supplied `userId`. There is no `Authorization`-header check, no JWT decode, and no `auth.uid()` cross-check.
- Attack: attacker requests an SMS code on their own phone, gets the 6-digit code, then calls `verify-sms-code` with `userId={victim_uuid}, phone={attacker_phone}, code={attacker_code}`. The duplicate-phone guard (`verify-sms-code/index.ts:150-167`) only blocks if the same phone is already verified on a different account — it does NOT block attaching a new attacker-controlled phone to a victim with no verified phone yet. Victim's profile now has `phone_verified_at=now()` and `phone={attacker_phone}`. Future password resets or SMS callbacks route to the attacker.
- **Fix:** F3 (require Authorization header; decode JWT; ignore body userId in favor of `auth.uid()`).

### C4. `send-sms-verification-code` uses `Math.random` for OTP — **HIGH (C4)**
- `send-sms-verification-code/index.ts:103`: `const code = Math.floor(100000 + Math.random() * 900000).toString();`
- `Math.random` is not a CSPRNG; given the 10-min lifetime and 3-codes-per-10-min rate cap the practical brute-force window is small but the value is still predictable in principle. The email-OTP path was fixed in PR #32 (`send-verification-code/index.ts:14-20` uses `crypto.getRandomValues`); the SMS path was missed.
- **Fix:** F4 (port the `crypto.getRandomValues` helper into `send-sms-verification-code`).

### C5. `profiles.onboarding_completed_at` writable by client — **MEDIUM (C5)**
- Same `profiles` UPDATE policy as C1 (no column restriction). An authenticated user can flip `onboarding_completed_at=now()` and bypass the entire wizard. Cosmetic: they end up on the dashboard with no facility row and no plan. Real impact: skewed funnel analytics and a missing welcome-email enqueue.
- **Fix:** F1 trigger also restricts `onboarding_completed_at` writes to service-role.

### C6. `profiles.email_verified_at` writable by client — **MEDIUM (C6)**
- `VerifyEmailStep.tsx:151-155` writes `email_verified_at=now()` from the client after `verify-code` returns success. The write itself is gated by `verify-code` having matched the OTP, but the RLS policy is permissive enough that an authenticated user could in theory `update({email_verified_at: now()})` directly without going through OTP.
- Practical impact: the user is already authenticated; they've already proven they hold the password. Flipping `email_verified_at` unlocks the drip-email enqueue (Section 9) and the welcome email. Low real-world risk.
- **Fix:** F1 trigger also restricts to service-role. The client-side write in `VerifyEmailStep.tsx` is removed and replaced with a server-side write inside `verify-code` (it has the OTP context).

### C7. Stripe webhook signature verification — **PASS**
- `stripe-webhook/index.ts:157-185`: requires `stripe-signature` header, requires `STRIPE_WEBHOOK_SECRET` env, calls `stripe.webhooks.constructEventAsync(body, signature, secret)`. Rejects 400/401 on any failure. ✓

### C8. `create-checkout` open-redirect guard — **PASS**
- `create-checkout/index.ts:13-22, 182-187`: `isSameOrigin(candidate, origin)` constructs both URLs and compares `.origin`. Falls back to a hardcoded `/provider/billing` if the override isn't same-origin. ✓

### C9. ClaimWizard never advances `provider_onboarding_state` or `profiles.onboarding_completed_at` — **CRITICAL (C9)**
- `grep -nE "provider_onboarding|onboarding_completed" src/pages/provider/ClaimWizard.tsx src/pages/provider/ClaimSubmitted.tsx` → zero matches.
- A user who completed the wizard with `mode='claim'`, then submits the claim, never has their wizard-state cursor advanced. Refreshing `/provider/onboarding` indefinitely loads `BuildStep` instead of bouncing them to the dashboard. The drip-email enqueue trigger (`enqueue_onboarding_email_sequence`) is gated on `onboarding_completed_at` flipping → claim path never enqueues either.
- **Fix:** F5 (write `current_step='completed'` + `profiles.onboarding_completed_at` on successful claim submission inside `ClaimWizard` / `ClaimSubmitted`).

### C10. `register-provider-account` deployed but not in repo — **HIGH (C10)**
- `supabase/functions/register-provider-account/` does not exist. The deployed function (`v1.1.0`, fetched via Supabase MCP) is the canonical source of truth for the wizard's signup write path.
- Risk: an unauthorized redeploy from a stale local checkout would silently revert this function (most likely outcome: it would fail to redeploy and the live one would persist, but anyone editing the function via the dashboard has no source-control trail).
- **Fix:** F6 (vendor the deployed source into `supabase/functions/register-provider-account/index.ts`).

### C11. `AuthSignup` `returnTo` open-redirect potential — **MEDIUM (C11)**
- `AuthSignup.tsx:43, 56, 191`: `returnTo` is read from search params and passed straight to `useNavigate()`. React-Router v6 treats absolute or protocol-relative URLs as in-app paths but will set `window.location` if a full URL with a different origin is provided in some edge cases.
- Today's callers (`ClaimWizard`, `NewListingForm`, `Claims`) all pass relative `/provider/...` paths, so practical exploitability is low. But a future link from email/SMS could carry a malicious `returnTo=//evil.example`.
- **Fix:** F7 (validate `returnTo` is a relative path starting with `/` and not `//`).

### C12. OTP enumeration resistance on `verify-code` — **PASS**
- `verify-code/index.ts:99-110`: returns the same generic "Invalid or expired verification code" string whether or not the email exists. ✓
- `send-verification-code/index.ts` returns 429 on rate-limit, 200 otherwise — does NOT differentiate between known and unknown emails. ✓

### C13. Constant-time OTP compare — **LOW (C13)**
- `verify-code/index.ts:128`: `verificationRecord.code !== normalizedCode` — string comparison, not constant-time. A timing-side-channel attacker would need to recover individual digit positions across millions of attempts; the 5-attempt + 10-per-15-min cap + 10-min code TTL make this effectively unexploitable. Document but do not block.

### C14. Plaintext OTP storage — **LOW (C14)**
- `email_verification_codes.code` and `phone_verification_codes.code` columns store the 6-digit code as plaintext. Industry best practice is bcrypt/argon2. Practical attack surface is small because of the 10-min TTL + 5-attempt cap, and the DB is protected by Supabase's at-rest encryption. Document; revisit before SOC2.

### C15. Secrets in client bundle — **PASS**
- Verified via `grep -rn "STRIPE_SECRET\|RESEND_API_KEY\|TWILIO_AUTH_TOKEN\|SERVICE_ROLE_KEY" src/` — zero hits. All secrets live in edge-function env vars or `_shared/`. ✓

### C16. `provider_onboarding_state` RLS — **PASS**
- Owner-only `SELECT/INSERT/UPDATE` policies, no `DELETE` policy (`20260525000000_provider_onboarding_foundation.sql:127-153`). Service role bypasses RLS for the cron / webhook paths.

### C17. `emails_outbox` RLS — **PASS**
- `USING (false) WITH CHECK (false)` (`20260527000000_provider_emails_outbox.sql:67-78`) — no client access at all. Service role for the drain. ✓

### C18. `claim_owner_id` foreign-key cascade — **PASS**
- `facilities.claim_owner_id` → `auth.users(id) ON DELETE SET NULL` (`20260525000000_provider_onboarding_foundation.sql:48-51`). Deleting a provider auth row leaves the facility orphaned (unclaimed) rather than cascading. ✓ for data preservation.

---

## PART D — Payments & subscription state

### D1. PRO price ID hardcoded — **LOW (D1)**
- `create-checkout/index.ts:11`: `const PRO_PRICE_ID = "price_1Sel1C9fxdThyiakWLfgbl9K";`
- Should be an env var. Acceptable today because there's exactly one Pro SKU. Revisit when introducing annual / discounted variants.

### D2. PlanStep client-side mirror — **HIGH (linked to C1, C2)**
- `PlanStep.tsx:86-89` writes `plan='pro'` to `profiles` after polling `facility_subscriptions`. This compensates for **C2** (missing webhook mirror) but creates the **C1** abuse surface (allows the client to write `plan='pro'`).
- **Fix:** Once F2 (webhook mirror) and F1 (trigger blocks client elevation) land, remove `PlanStep.tsx:86-89` — the webhook becomes the sole writer.

### D3. Free-tier write also goes through the same client path — **MEDIUM (D3)**
- `PlanStep.tsx:127-129` writes `plan='free'`. Under F1's trigger, `plan='free'` writes from an authenticated user are allowed (free is the default; no payment to bypass). ✓ keep.

### D4. Stripe Checkout cancellation handled — **PASS**
- `?checkout=cancel` → toast + strip param + stay on plan step (`PlanStep.tsx:45-52`). ✓

### D5. Subscription confirmation timeout — **PASS**
- 10s deadline polling at 750ms intervals (`PlanStep.tsx:69-117`). On timeout: surface a contact-support toast. Webhook may still land — next reload shows the active sub. ✓

---

## PART E — Drip email outbox

### E1. Idempotent enqueue — **PASS**
- `UNIQUE (user_id, sequence, step)` (`20260527000000_provider_emails_outbox.sql:42-45`) + `ON CONFLICT DO NOTHING` in the trigger (`20260527000000_provider_emails_outbox.sql:112, 120`).

### E2. State re-read per send — **PASS**
- `process-onboarding-emails/index.ts` (verified via prior read in summary): re-reads `profiles.plan`, `unsubscribed_provider_emails_at`, `email_verified_at`, and `facility_subscriptions.has_featured` for every row before sending; marks `status='skipped'` with a `skipped_reason` when the state changed.

### E3. Trigger guard on completion flip — **PASS**
- `enqueue_onboarding_email_sequence()` only fires when `OLD.onboarding_completed_at IS NULL AND NEW IS NOT NULL` (`20260527000000_provider_emails_outbox.sql:95-100`). Cannot re-enqueue on subsequent profile updates.

### E4. Unsubscribe — **PASS**
- One-click unsubscribe link in every drip; `provider-emails-unsubscribe` flips `unsubscribed_provider_emails_at`. (`verify_jwt: false` to allow link clicks without auth.)

---

## PART F — UX & funnel hygiene

### F1. CTAs across site point to `/provider/onboarding` — **PASS**
- `Header.tsx:445, 624`, `Footer.tsx:102`, `ProvidersCTA.tsx:151`, `FacilityCard.tsx:289-291` (with `?intent=claim&facility_id=` propagation), `ProviderMegaMenu.tsx:108, 166`, `ProviderStickyCTA.tsx:44`, `ProviderSEOPageLayout.tsx:184, 289, 392` — all unified.

### F2. Legacy `/provider-signup` deep-links inside the app — **LOW (F2)**
- `Login.tsx:640, 812`, `ProviderForgotPassword.tsx:131`, `SeekerSignup.tsx:785`, `ProviderFAQ.tsx:288`, `ForgotPassword.tsx:232, 377`, `provider/ListingEditor.tsx:1160`, `providers/ProviderResourceArticle.tsx:147, 207`, `ProviderROICalculator.tsx:625`, `providers/ProviderResourceHub.tsx:111, 253` all link to `/provider-signup`. The redirect at `App.tsx:1270` handles it but adds a hop. Polish task.

### F3. Wizard step view analytics — **PASS**
- `Onboarding.tsx:115-125` fires `provider_onboarding_step_view` on every `resolved` change. ✓
- Per-step `provider_onboarding_step_submit` fired in `AccountStep.tsx:113-117`, `VerifyEmailStep.tsx:158-162`, `FindOrListStep.tsx:237-242 / 265-270`, `PlanStep.tsx:91-95 / 132-136`.

### F4. Welcome modal idempotent — **PASS**
- `WelcomeModal.tsx:68-79`: writes `welcomed_at=now()` synchronously when first rendering. Refresh / re-route does not re-show.

### F5. Trial/seeker copy purged — **PASS**
- `grep -rn "trial\|seekers\?\b\|limited launch" src/pages/ForProviders.tsx` returns no marketing-copy hits after PR #38. The wizard pages themselves never had trial copy.
- `WELCOME_COPY.freeOffer.title = "Upgrade to Pro — $99/month"` (`onboardingWelcomeCopy.ts:25`). ✓
- `WELCOME_COPY.proOffer.cta = "Add Featured"` (`onboardingWelcomeCopy.ts:36`). ✓

---

## PART G — Migration hygiene

### G1. Idempotency — **PASS**
- Every `ADD COLUMN` is `IF NOT EXISTS`. Every constraint addition is wrapped in a `pg_constraint` existence check. Every trigger creation is wrapped in a `pg_trigger` existence check. Re-runnable. ✓

### G2. Foreign-key cascade behaviour — **PASS**
- `provider_onboarding_state.user_id REFERENCES auth.users(id) ON DELETE CASCADE` (`20260525000000_provider_onboarding_foundation.sql:73`).
- `emails_outbox.user_id REFERENCES auth.users(id) ON DELETE CASCADE` (`20260527000000_provider_emails_outbox.sql:12`).
- `facilities.claim_owner_id REFERENCES auth.users(id) ON DELETE SET NULL` (preserves facility row).

### G3. Trigger `search_path` — **PASS**
- All new SECURITY DEFINER functions explicitly `SET search_path = public` (photo-cap, enqueue-email). ✓

### G4. RLS enabled on every new table — **PASS**
- `provider_onboarding_state` (`20260525000000_provider_onboarding_foundation.sql:125`).
- `emails_outbox` (`20260527000000_provider_emails_outbox.sql:65`). ✓

---

## PART H — End-to-end verification walks

A screenshot-driven walkthrough was attempted but **could not be completed** in this audit pass: this environment does not have a running dev server with a routable browser (no Playwright session, no Vercel preview URL pinned for headless capture). The wizard's behaviour is verified statically via code reading in PARTS A–G above. Manual screenshot capture is owed to the ship-readiness checklist before launch.

What a manual walk should cover (carry-forward):
- **H1.** Fresh signed-out visit to `/provider/onboarding` → AccountStep renders.
- **H2.** Submit AccountStep → VerifyEmailStep auto-sends OTP, 6 boxes accept paste.
- **H3.** Successful OTP → FindOrListStep, phone-verify card shown.
- **H4.** Phone verify → search activates → select existing facility → PlanStep.
- **H5a (Free).** Continue with Free → BuildStep with "Up to 5 photos" banner → Continue to claim editor.
- **H5b (Pro).** Continue with Pro → Stripe Checkout (test card 4242…) → returns to `?checkout=success` → "Confirming your subscription…" → BuildStep with Pro banner.
- **H6 (Claim).** From BuildStep with `mode='claim'` → ClaimWizard → submit claim → **today, the wizard cursor does NOT advance (see C9).**
- **H7 (List).** From BuildStep with `mode='list'` → NewListingForm (ProviderSignup at step 3) → publish → cursor advances to `completed`, `onboarding_completed_at` flipped, drip enqueued. (Verified via `ProviderSignup.tsx:909-916`.)
- **H8.** First dashboard visit after completion → WelcomeModal opens once, writes `welcomed_at`. Refresh — modal does not reappear.

Until manual screenshots land, treat PARTS A–G + the fixes in `onboarding-fixes-2026-05-17.md` as the de-facto ship-readiness evidence.

---

## PART I — Severity summary

| Severity | Count | Findings |
|---|---|---|
| CRITICAL | 3 | C1, C3, C9 |
| HIGH | 4 | B4, C2, C4, C10 |
| MEDIUM | 4 | A2, C5, C11, D3, F2 (F2 is LOW on rereview — see below; final count 4) |
| LOW | 4 | C13, C14, D1, F2 |
| PASS | 31 | A1, A3, A4, B1, B2, B3, B5, B6, B7, C7, C8, C12, C15, C16, C17, C18, D4, D5, E1–E4, F1, F3, F4, F5, G1–G4 |

**Ship-readiness gate:**
- Zero critical findings remain: **FAIL → fixed in onboarding-fixes-2026-05-17.md** (C1, C3, C9 addressed)
- Zero high findings in security or data-integrity sections: **FAIL → fixed** (C2, C4, C10 addressed; B4 partially addressed by F1 trigger + retained as a known-acceptable client-side write surface for non-paid columns)
- Free + Pro end-to-end walks pass with screenshots: **PENDING** — manual walk required before launch
- Claim path completes correctly: **FAIL → fixed in F5**

Once the fixes in `onboarding-fixes-2026-05-17.md` are applied AND manual walks are captured, ship-readiness becomes **GO**.
