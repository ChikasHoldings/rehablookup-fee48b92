# Provider Panel — Flow Traces (Phase 3)

_Generated: 2026-05-01. Each trace lists files, RPCs, and tables touched, plus observed success/failure paths and unanswered questions._

Legend: ✅ verified in code. ⚠ partial / needs runtime check. ❓ unanswered.

---

## Flow 1 — Signup → onboarding → first dashboard load

**Path:** `/provider-signup` → form submit → `auth.signUp` → `handle_new_user` (or provider-specific) → `notify-admin-provider-signup` → `send-provider-welcome-email` → email link → `/login` → `/provider/dashboard`.

**Files:** `src/pages/auth/ProviderSignup.tsx`, `src/components/provider/EmailVerificationStep.tsx`, edge fns `notify-admin-provider-signup`, `send-provider-welcome-email`, `send-provider-welcome-offer-email`.

**Triggers:** `prevent_seeker_double_account`, `prevent_admin_double_account` ensure single-role identity.

✅ ProviderShell (`src/components/provider/ProviderShell.tsx:46-95`) verifies role + `profiles` row before allowing access.
✅ Welcome modal `ProviderWelcomeModal.tsx` shown once, gated by `profile_completion_celebrated`.
⚠ The post-signup → first-dashboard-load handoff has a brief window where `useUserRole` returns `null` and `ProviderShell` re-checks `profiles`. If the trigger that creates `profiles` lags, user can be bounced to login. Visible in code: shell calls `supabase.from("profiles").select("id")` as a fallback.
❓ Email verification path post-signup: is the user blocked from `/provider/*` until verified, or only at "engagement"? Not asserted in code.

---

## Flow 2 — Login + session expiration + logout

**Path:** `/login?type=provider` → `signInWithPassword` → onAuthStateChange → `ProviderShell` mounts → `assess-login-risk` (risk-based 2FA) → optional `verify-code` → dashboard.

**Files:** `src/pages/auth/Login.tsx`, edge fns `assess-login-risk`, `log-login-attempt`, `lookup-ip-location`, `send-security-block-notification`.

✅ Risk-based 2FA per memory `mem://security/risk-based-2fa-system`.
✅ Logout clears Sentry user (`clearSentryUser`) and routes to `/login?type=provider` (`ProviderShell` lines 110+).
✅ Session cache (`getCachedSession`) used in `useLeadUnlocks` to avoid repeated session fetches.

⚠ Session expiration path: `ProviderShell` listens to `onAuthStateChange`. If a 401 hits a TanStack Query mid-session (e.g. fetching `provider_credits`), the page may show a stale state until the auth listener fires. **Recommend** a global `onError` handler in QueryClient that detects PostgREST 401 and triggers re-auth.

---

## Flow 3 — Add facility → publish → public visibility

**Path:** `/provider/add-location` → `AddLocation.tsx` → `supabase.from("facilities").insert(...)` → `enforce_facility_limit` trigger → `status='pending'` → admin approves → `send-approval-email` → `status='approved'` → `get-public-facilities` returns it.

**Files:** `src/pages/provider/AddLocation.tsx`, `enforce_facility_limit` trigger.

✅ Facility limit enforced server-side (free=1, Pro=5, +purchased slots).
✅ Listing data stripped HTML/JS server-side per `mem://security/onboarding-and-facility-data-integrity`.
⚠ Anti-spam: free-tier providers can attempt to insert N facilities client-side; trigger blocks beyond limit but the UI on `MyListings` should show the cap clearly. Observed: `useFacilityLimits` returns `max_allowed` and the "Add" card disables when at cap. ✅
❓ Email notification on approval: `send-approval-email` exists, not verified end-to-end via runtime test.

---

## Flow 4 — Edit facility (incl. reply_email verification, image upload)

**Files:** `src/pages/provider/ListingEditor.tsx` (~1,400 LOC), `FacilityImageUpload.tsx`, `StaffManagementSection.tsx`, edge fns `send-reply-email-verification`, `verify-reply-email-code`, `report-image`, `notify-flagged-image`.

✅ Reply email verification has `codeSent`/`verificationCode`/`verificationError` states wired (verified in source).
✅ Field-level error states (`fieldErrors`, `touchedFields`) and `cn(... border-destructive)` applied.
⚠ Save flow: ListingEditor uses `ListingFloatingSaveBar.tsx` — confirm dirty-tracking handles concurrent editors (no optimistic lock visible). Low risk in single-user editing.

---

## Flow 5 — Multi-facility switching + facility limits

**Files:** `src/contexts/SelectedFacilityContext.tsx`, `useProviderFacilities`, `useFacilityLimits`.

✅ All hooks key on `selectedFacility?.id`.
✅ When a facility is deleted, the context falls back to first available (verify in `SelectedFacilityContext`).
⚠ Cross-facility data leaks: confirmed via Phase 2 masking scan that hooks scope queries by `facility_id`. The `useLeadUnlocks` query without `facilityId` returns all unlocks for the provider — by design — but the UI always passes `facilityId`. ✅

---

## Flow 6 — Lead arrival → notification → list display (masked)

**Path:** Public lead form → `submit-qualified-lead` (or `submit-exit-intent-lead`/`submit-marketing-lead`) → insert into `leads` → trigger `trigger_calculate_lead_score` → realtime push → provider sees row in `Inquiries.tsx` via `leads_provider_view` (PII masked).

**Files:** `src/pages/provider/Inquiries.tsx`, `src/components/provider/inquiries/InquiryListItem.tsx`, edge fns above + `send-lead-confirmation`, `send-lead-email`, `send-message-notifications`, `send-sms-notification`.

✅ Realtime subscription on `leads` and `lead_unlocks` (per `mem://architecture/realtime-lead-delivery`).
✅ Lead display reads `leads_provider_view` (verified by `check:provider-leads-masking`).
✅ Lead score computed in trigger (`trigger_calculate_lead_score`) — credit cost recalculated on insert.
⚠ Notification channels: email via `send-lead-email`, SMS via `send-sms-notification`, in-app via `provider_notifications`. **Need runtime test** to confirm all three fire on a real lead.
❓ Are duplicate lead-arrival emails suppressed if a provider has both "instant" and "digest" prefs? Not asserted.

---

## Flow 7 — Lead unlock (credits)

**Path:** `UnlockLeadButton.handleClick` → `UnlockConfirmDialog` → `unlockLead.mutateAsync` → edge fn `unlock-lead`.

**Files:** `src/components/provider/UnlockLeadButton.tsx` (638 LOC), `src/hooks/useLeadUnlocks.ts`, `supabase/functions/unlock-lead/index.ts` (731 LOC).

Inside `unlock-lead`:
1. ✅ Validates JWT (`auth.getUser(token)`) — line 99.
2. ✅ POST-only — line 78.
3. ✅ Per-field UUID validation — lines 105-119.
4. ✅ Existing-unlock check — lines 137-146.
5. ✅ Facility ownership check — lines 149-160.
6. ✅ Rate limit: 20 unlocks/facility/hour — lines 163-178.
7. ✅ Redistribution access check via `lead_distributions` — lines 210-223.
8. ✅ Pricing: dynamic from `platform_settings`, Pro discount applied — lines 226-272.
9. ✅ Atomic credit deduction with `gte("balance_cents", unlockPrice)` — lines 296-321.
10. ✅ Rollback path: `increment_provider_credits` RPC + `admin_notifications` if rollback also fails — lines 423-477.
11. ✅ State transition gated: `update leads set status='unlocked' where status in ('new','expired')` — line 486.
12. ✅ Provider in-app notification + email confirmation (idempotency key `unlock-confirm-${leadId}-${facilityId}`).

Front-end side:
13. ✅ `unlockingRef` guards StrictMode double-fire (`UnlockLeadButton.tsx:144`).
14. ✅ Confirmation dialog before charging.
15. ✅ Post-unlock reveal-fetch with exponential backoff retry (300/800/1500ms) and Retry button — newly added per recent change.

**Failure paths covered:**
- Insufficient credits → 400 + redirect to `/provider/billing?purchase_credits=true&amount=N`.
- Race / double-click → second call returns "Lead already unlocked" 400.
- Unlock-record creation fails → credits refunded via atomic RPC; if RPC also fails, an `admin_notifications` row is created (manual reconciliation).
- RLS/replication lag on reveal → backoff retry, then in-dialog Retry CTA + fallback link.

⚠ One gap: between "credits deducted" (line 313) and "lead_unlocks insert" (line 423), if the function crashes (uncaught throw), no rollback runs. The try/catch wraps the whole handler, so an exception falls through to the outer `catch` which returns 500 — but the rollback only runs in the explicit `if (unlockError)` branch, **not** for thrown exceptions. **Recommended fix:** move credit deduction inside a try/catch that always refunds on any subsequent throw before the unlock row is committed.

---

## Flow 8 — Lead unlock (Stripe / direct card)

**Path:** `paymentMethod='stripe'` → `unlock-lead` creates a `checkout.sessions.create` (mode=payment) → user pays → webhook `checkout.session.completed` (metadata.type='lead_unlock') → webhook handler creates the unlock row + deducts nothing (no credits used).

**Files:** `unlock-lead/index.ts:374-414`, `stripe-webhook/index.ts:121+` (checkout.session.completed branch).

⚠ Risk: if the user starts the Stripe checkout but the webhook doesn't fire (e.g. webhook secret rotated), they paid but the unlock never lands. The `success_url` redirects with `unlock_success=true&lead=...` query param but the panel does not appear to call a verify endpoint to reconcile. **Recommended:** on dashboard mount, if `unlock_success=true` is in URL, call `verify-payment` (similar to `verify-concierge-payment`) to reconcile if webhook missed.
❓ Need runtime test: simulate a delayed/missing webhook.

---

## Flow 9 — Credit purchase → balance update → auto-reload

**Path:** Billing page → choose tier (200/500/1000) → `purchase-credits` edge fn → Stripe checkout → webhook → `provider_credits` balance updated.

**Files:** `src/pages/provider/Billing.tsx`, `src/components/provider/AutoReloadSettings.tsx`, edge fns `purchase-credits`, `auto-reload-credits`, `stripe-webhook`.

✅ Fixed tiers enforced server-side (`VALID_AMOUNTS` set).
✅ Idempotency key `credits_${user.id}_${amountCents}_${Math.floor(Date.now()/60000)}` — minute-bucketed (per `mem://monetization/provider-credit-purchase-ledger`).
✅ `try_acquire_auto_reload_lock` advisory lock prevents concurrent off-session charges.
✅ Webhook claims event via `claim_stripe_webhook_event` for true idempotency.

**Auto-reload finding** (from Phase 2):
- `auto-reload-credits` uses `select("*")` on `provider_auto_reload_settings` — violates explicit-columns rule. Real, fixable.

---

## Flow 10 — Pro upgrade → discount → downgrade

**Path:** `/provider/pro-upgrade` → `subscribe-pro` → Stripe subscription checkout → webhook `customer.subscription.created` → `pro_subscriptions` row inserted with `status='active'` and `unlock_discount_percent=20`.

✅ `has_active_pro` RPC checks `current_period_end > now()`.
✅ Lead unlock pricing reads Pro discount (`unlock-lead` lines 240-247).
⚠ Failed-payment downgrade: `invoice.payment_failed` handler exists at `stripe-webhook:1014` and `1880` (international facility invoices). **Need runtime test** to confirm Pro features actually disable on `pro_subscriptions.status` change. Per memory, `+50 ranking boost` is tied to active status — relies on read-time check.

---

## Flow 11 — Concierge / placement inquiries

**Path:** Admin matches inquiry to facility → `concierge_introductions` row created with `facility_id` → provider sees in `/provider/placement-network` via `get_provider_safe_inquiries` RPC (PII masked) → admin discloses PII → provider sees full data via `get_disclosed_inquiry_for_provider` (PII gated by `admin_disclosed_pii_at` OR `seeker_confirmed AND placed_facility_id = facility_id`).

✅ PII gating per `mem://features/placement-network/provider-visibility-and-interaction` and verified in RPC body (returns `split_part(user_name,' ',1)` until disclosed).
✅ Direct provider→seeker contact removed per `mem://business-model/placement-brokerage-deal-desk` (admin/advisor-mediated).

---

## Flow 12 — Settings: sessions, MFA, payment methods, account deletion

**Files:** `src/pages/provider/Settings.tsx`, `src/components/provider/settings/{ActivityLogTab,SessionManagementTab,UnlockHistoryTab}.tsx`, edge fns `delete-provider-account`, `manage-mfa-recovery`, `setup-provider-payment-method`, `save-provider-payment-method`, `get-payment-method`.

✅ `get_user_sessions_safe` RPC scopes to caller.
✅ Account deletion: `delete-provider-account` edge fn (cascade via FK + cleanup).
⚠ MFA recovery flow not traced in this audit (out of provider-leads scope). Mark as "did not test".

---

## Cross-cutting observations

1. **POST-only enforcement** is consistent (`unlock-lead`, `purchase-credits`, `subscribe-pro`, `purchase-listing-slot` all check `req.method !== "POST"`).
2. **CORS** is consistent.
3. **JWT validation in code** is consistent across user-facing functions; cron/internal functions use HMAC or service-role.
4. **Idempotency** is solid for Stripe webhooks (`claim_stripe_webhook_event`).
5. **Realtime** is enabled on `leads` and `lead_unlocks` per memory — required for the masked inbox to update on unlock.
