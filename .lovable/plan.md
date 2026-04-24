

# Platform End-to-End Audit — Findings & Remediation Plan

A deep audit was performed across all 3 panels (Public, Provider, Admin), all critical workflows (provider signup/onboarding, Pro upgrade, credit unlock + PII gating, concierge intake, leads lifecycle), 105 edge functions, RLS policies, and the live database state. Findings below are grouped by severity. No code has been changed yet — this is the proposed remediation plan.

## Summary of issues found

| Severity | Count | Categories |
|---|---|---|
| 🔴 Critical | 3 | Public PII leak, broken Stripe unlock path, RLS confused deputy |
| 🟠 High | 5 | Race conditions, drip/billing drift, missing column gating, monetization gaps |
| 🟡 Medium | 8 | UX dead-ends, silent failures, stale caches, role mismatches |
| 🔵 Low | 6 | Console noise, copy/text, dead code |

---

## 🔴 Critical findings (fix in next pass)

### C1. Anonymous users can read facility owner email + reply_email
- DB confirmed: `anon` role has `SELECT` privilege on `facilities.email`, `facilities.reply_email` (and `phone`, `website`).
- Public RLS policy `Anon can read approved facilities for public view` has **no column filter**, so any visitor can run `select email,reply_email from facilities` against approved rows.
- Open finding `facilities_email_exposed_publicly` in the security scan — this one is **not** marked ignored.
- **Fix:** Migration to (a) `REVOKE SELECT (email, reply_email) ON public.facilities FROM anon, authenticated`, (b) keep these columns readable by `service_role` and the owner via separate grants used in provider-side queries, (c) audit all public-facing `select(...)` strings to ensure nothing depended on these columns being publicly readable.

### C2. `unlock-lead` Stripe path returns checkout URL but skips the unlock record creation flow
- In `supabase/functions/unlock-lead/index.ts` lines 366–420, when `paymentMethod === 'stripe'`, the function **returns the checkout URL early** and never reaches the unlock-record / lead-status update / reminder-suppression / auto-reload trigger block. The webhook (`stripe-webhook` lines 386–445) is supposed to back-fill the unlock, but:
  - It writes the unlock record but does **not** update `leads.status` to `unlocked` or stamp the reminder columns.
  - This means a Stripe-paid unlock will keep firing the 1h/2h/8h/12h/20h/24h unlock reminder emails to the buyer.
- **Fix:** Mirror the post-unlock side effects in `stripe-webhook.checkout.session.completed → lead_unlock` block: update `leads.status`, set all `reminder_*_sent_at` timestamps, insert the `provider_notifications` row, send the unlock-confirmation email, insert the `notification_events` row.

### C3. Realtime publication includes `provider_notifications` but `realtime.messages` has no RLS
- Open security finding `realtime_messages_no_policies` was marked ignored on the rationale that "table-level RLS is respected", but `provider_notifications` itself has user-scoped RLS — verify no broadcast channels expose other providers' notifications.
- **Fix:** Audit the realtime channel subscription strings to confirm each includes a `user_id=eq.<auth.uid>` filter. (Already done in some hooks; need to confirm `useProviderNotifications` and `useSeekerNotifications` both apply the filter at subscribe-time.)

---

## 🟠 High findings

### H1. `select("*")` in `provider/PlacementNetwork.tsx` line 136
- Violates the project's "no select(*) — explicit columns only" Core memory.
- Pulls every introduction column including any future PII additions.
- **Fix:** Replace with explicit column list (`id, inquiry_id, facility_id, created_at, status, ...`).

### H2. `useLeadIntakeForm` saves PII to localStorage for 30 minutes
- Line 9–17 + line 167: full lead form state (first name, last name, phone digits, email, ZIP, insurance) persisted to `localStorage` under `lead_intake_form_data`. Any other JS on the page (or a malicious extension) can read it.
- **Fix:** Strip PII before write — keep only `currentStep` and non-PII context (selected care type, urgency). Re-prompt for name/email/phone on resume, or move the draft into `sessionStorage` only and clear on tab close.

### H3. `provider_credits` rollback path race
- `unlock-lead` line 442–462: on unlock-record insert failure, calls `increment_provider_credits` RPC to refund. If the RPC fails, the credits are silently lost — only a `logStep` line is emitted with severity WARN. No admin notification, no `credit_transactions` "stuck" row.
- **Fix:** When rollback fails, insert an `admin_notifications` row of type `unlock_rollback_failed` so the team can manually reconcile.

### H4. `notification_preferences` insert in `ProviderSignup` is unconditional and unawaited at the same time
- Line 588–591: `await supabase.from("notification_preferences").insert({ user_id: userId })` runs without an `onConflict` clause. If a row already exists for the same user (e.g., user retried signup after a partial failure), this throws a unique violation that is **not caught**, killing the signup before welcome emails are queued.
- **Fix:** Use `.upsert({ user_id: userId }, { onConflict: 'user_id', ignoreDuplicates: true })`.

### H5. Auto-reload trigger uses service-role key from the browser-callable edge function
- `unlock-lead` line 624–648 forwards the service-role key in an outbound `fetch` to `auto-reload-credits`. Service-role key never leaves the function process, so this is technically safe, but the `Authorization: Bearer <service_role>` header bypasses every RLS policy in the receiving function — and the receiving function has no caller validation beyond "trust the bearer."
- **Fix:** Have `auto-reload-credits` reject all callers that aren't either (a) a Supabase cron job (HMAC header) or (b) have a custom shared secret header `X-Internal-Trigger: <secret>`. Stop forwarding the service-role key.

---

## 🟡 Medium findings

| # | File / Area | Issue | Fix |
|---|---|---|---|
| M1 | `useLeadUnlocks.ts` | `discountSaved` is computed client-side and trusted in the success toast — server returns its own value but client overwrites. | Use `data.discountAmount` from server, drop the client-passed `discountSaved` arg. |
| M2 | `useCaseTransition.ts` line 100 | Optimistic-locking check uses `.maybeSingle()`; on conflict it returns null and throws "Status conflict" — but it ALSO swallows real DB errors that returned 0 rows (e.g., trigger blocked update). | Distinguish "no row matched" (lock conflict) from `error` (trigger rejection) and surface the trigger reason. |
| M3 | `SmartCatchAll.tsx` | `list-your-facility-in-` parser uses `slug.split('-').length > 2` as the "is city" heuristic. Multi-word states like "rhode-island" / "new-jersey" misroute to City instead of State. | Use the explicit `STATE_SLUGS` Set first, fall back to City only if not a known state. |
| M4 | `seeker/SeekerShell.tsx` | Three sequential queries (profile, email-verified, role-check) block the shell from rendering for the user during refetch. | Already parallel — confirmed OK. (No change.) |
| M5 | `ProviderSignup.tsx` clearProviderCaches | Wipes `selectedFacilityId` *before* the new facility ID is written. If signup fails between line 60 and line 573, user is left with no selected facility on next login. | Defer cache write until step 8 succeeds; remove `localStorage.removeItem("selectedFacilityId")` from the pre-clear. |
| M6 | `lead_unlocks` `Only service role can insert unlocks` policy | Confirmed correct — but corresponding `INSERT` from `submit-qualified-lead` uses anon JWT. This works because `service_role` bypasses RLS. Confirm the function is using service-role client (it does). No change. |
| M7 | `useAdminAuth.ts` `getCachedAdminState` | Reads cached `isSuperAdmin` from localStorage and uses it for **first-paint UI gating**. A user could set `localStorage.rl_admin_super = "true"` to briefly see Super-Admin UI before the DB check kicks in (≤1s). They can't perform actions (RLS blocks), but it leaks the menu structure. | Don't initialize `isSuperAdmin` from localStorage; only initialize `isAdmin` for skeleton render, fetch role from DB before showing role-gated UI. |
| M8 | Concierge intake | `STORAGE_KEY = "concierge_intake_draft"` persists full intake (incl. substance use, suicide history, medications) in localStorage indefinitely. Same issue as H2 but more sensitive. | Move to `sessionStorage` and clear on submit/abandon; or store only an opaque `draft_id` and keep the full data server-side via `save-placement-draft`. |

---

## 🔵 Low findings

| # | Item | Action |
|---|---|---|
| L1 | `SEOLandingTemplate.tsx` & `StateFacilitiesSection.tsx` show "Treatment Centers Coming Soon" — surfaces on state pages with zero inventory. | Replace with a "Talk to a placement advisor" CTA + nearby-state list to avoid Soft-404 perception. |
| L2 | `providerLicensingConfigs.ts` line 67 still mentions "pre-listing your facility on RehabLookup as 'coming soon'" — conflicts with the no-unclaimed-listings policy. | Rewrite copy to remove "coming soon" pre-listing claim. |
| L3 | `useCaseTransition.ts` writes `actor_type: "advisor"` only when `adminRole === "advisor"`, otherwise "admin" — `super_admin`/`manager`/`customer_rep` all collapse to `"admin"` in the timeline, losing audit granularity. | Persist the actual `adminRole` value. |
| L4 | `process-seeker-drip` and `send-unlock-reminders` log "found 0 candidates" every run (visible in logs) — fine, but consider quieting to DEBUG. | Lower log level or add a `if (count===0) return early` short-circuit. |
| L5 | `useAdminAuth` `try { ... } catch {}` empty catches at lines 42, 48, 217 — silent failure. | Log via Sentry breadcrumb at minimum. |
| L6 | `track-request-help` no-op stub kept in `useLeadIntakeForm.ts` line 199 — dead code. | Remove the stub function and its call sites. |

---

## Workflows audited (clean / no findings)

- ✅ Stripe webhook deduplication via `claim_stripe_webhook_event` (correct)
- ✅ Stripe webhook signature verification (mandatory, returns 400/500 if missing)
- ✅ Concierge intake idempotency (3-way: draft_id → checkout_session_id → safety-net insert)
- ✅ Lead PII masking via `is_lead_unlocked()` in RLS — confirmed in DB policies
- ✅ Provider Pro upgrade polling on success (3s × 10 = 30s timeout, correct)
- ✅ Lead intake honeypot field
- ✅ Email verification flow with 3-resend cap and 60s cooldown
- ✅ Robots/sitemap/static HTML coverage (already addressed in prior session)
- ✅ All 105 edge functions enforce CORS preflight + service-role isolation

---

## Implementation plan (proposed order)

1. **Critical security migration** — revoke anon SELECT on `facilities.email, reply_email`, audit dependent code (C1).
2. **Stripe unlock parity** — make `stripe-webhook` apply all post-unlock side effects (C2).
3. **Realtime channel filter audit** — confirm subscriptions filter by `auth.uid()` (C3).
4. **High fixes** — H1 (select *), H2/M8 (PII in localStorage), H3 (rollback alert), H4 (upsert), H5 (auto-reload auth).
5. **Medium fixes** — M1, M2, M3, M5, M7 in one batch.
6. **Low fixes / cleanups** — L1–L6 in a final cleanup pass.

Each step ships its own commit with a short verification note. Total estimated work: 6 focused passes.

