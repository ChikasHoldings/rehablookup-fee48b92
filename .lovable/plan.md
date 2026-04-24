

# RehabLookup — Production-Readiness Audit

Deep audit across all 3 panels, 117 edge functions, RLS, views, and live data. The codebase is in **strong shape** — `select(*)` is gone, `window.confirm` is fully replaced, no dead-end buttons, no `href="#"`, and no empty silent catches in product code. Critical fixes from prior passes (Stripe parity, anon PII revoke, HMAC auto-reload, lead view masking) are confirmed live in DB and code.

What remains are **a small number of real issues** plus **systemic hardening polish**. Findings below.

## Severity summary

| Sev | Count | Theme |
|---|---|---|
| 🔴 Critical | 1 | Concierge intake stores full PII (suicide history, medications, insurance ID) in localStorage indefinitely |
| 🟠 High | 4 | DB orphan rows, view trust assumption, abandoned-cart timing edge, anon column grants residue |
| 🟡 Medium | 6 | UX gaps in error/empty states, polling overlap, idempotency edges, copy drift |
| 🔵 Low | 5 | Console noise in prod build, dead env-conditional logs, minor a11y, doc drift |

---

## 🔴 Critical

### CR1. Concierge intake persists full clinical PII to localStorage (`src/pages/concierge/ConciergeIntake.tsx`)
- Line 260–267: `useEffect` writes the **entire** `formData` to `localStorage[STORAGE_KEY]` on every keystroke.
- That object contains: `firstName`, `lastName`, `phone`, `email`, `insuranceMemberId`, `insuranceGroupNumber`, `currentMedications`, `priorTreatmentNotes`, **`suicideHistory`**, `coOccurringConcerns`, `decisionMakerName`, `emergencyContactName/Phone`, etc.
- No expiry, no PII whitelist (the same `PERSISTABLE_FIELDS` pattern was applied to lead intake but **not to concierge intake**).
- **Risk:** Browser extensions, shared devices, or any other JS on the page can read this. This is HIPAA-adjacent data.
- **Fix:** Mirror the lead-intake fix — define `CONCIERGE_PERSISTABLE_FIELDS` (only step progress + non-PII selections like `paymentType`, `levelOfCare`, `desiredState`), strip everything else before write. Keep PII server-side via the existing `save-placement-draft` edge function (already wired). Add a 30-min TTL, clear on submit, clear on `unload`.

---

## 🟠 High

### H1. 2 orphan leads with non-existent `facility_id`
- DB query: `SELECT COUNT(*) FROM leads WHERE NOT EXISTS (SELECT 1 FROM facilities WHERE id = leads.facility_id)` → **2 rows**.
- Cause: A facility was deleted without `ON DELETE CASCADE` on `leads.facility_id` (or hard delete bypassed FK).
- **Effect:** These leads will silently fail RLS, never appear in any panel, never trigger reminders/redistribution. They exist as ledger ghosts.
- **Fix:** (a) one-shot migration to mark them `status='closed'` with note `orphaned_facility`; (b) verify FK is `ON DELETE CASCADE` (or `ON DELETE SET NULL` + status update trigger); (c) audit-log the 2 IDs to admin_notifications for review.

### H2. `leads_provider_view` trusts `current_auth_uid()` for masking — verify when accessed without auth
- View definition (confirmed live) gates unmasking on `current_auth_uid()`. If a service-role caller queries the view, `auth.uid()` returns NULL → falls through to the `ELSE` branches → returns masked values. ✅ Safe.
- **However:** any new edge function or RPC that sets `request.jwt.claim.sub` manually could be tricked into unmasking another user's data if they spoof the claim. No such path exists today, but there's no negative test.
- **Fix:** Add a `pg_test` (or simple SQL test in a migration) that asserts the view returns masked rows for a non-owner user. Document the contract above the view.

### H3. Stripe lead-unlock webhook handler still uses `session.metadata.user_id` as authoritative
- `stripe-webhook` line ~410: inserts into `lead_unlocks` with `provider_id = userId` from session metadata. Stripe metadata is mutable from the dashboard. If a malicious admin (or a leaked Stripe key) edits a session's metadata before the webhook fires, the unlock could be assigned to the wrong provider.
- **Fix:** Cross-check `userId` against the Stripe customer's stored `metadata.user_id`, OR require the lead/facility ownership to match before insert: `SELECT user_id FROM facilities WHERE id = facilityId` and assert equals `userId`.

### H4. Anonymous role still has table-level SELECT on `facilities` — column revoke wasn't applied
- DB query for column_privileges on `facilities.email/reply_email/phone/website` returned **0 rows** — meaning Supabase is still relying on table-level SELECT from the prior remediation, not column-level revokes.
- The `public_facilities` view is correctly used by all public-facing code, so the **practical exposure is zero** today, but a future query that hits `facilities` directly with the anon key will leak email again.
- **Fix:** Apply the explicit `REVOKE SELECT (email, reply_email) ON public.facilities FROM anon, authenticated` migration and add a CI check that grep-bans `from("facilities").select(` in `src/pages/**` (force routing through `public_facilities`).

---

## 🟡 Medium

| # | Area | Issue | Fix |
|---|---|---|---|
| M1 | `pg_net`, `pg_trgm` extensions in `public` schema | Linter warns; both are needed for the email-queue + review similarity, but living in `public` makes them schema-shadowable. | Move to dedicated `extensions` schema, update function `search_path` references. |
| M2 | `useProviderCredits` polling + realtime subscription overlap | Both run simultaneously (2-min staleTime + postgres_changes channel). Each unlock fires 2 invalidations → 2 refetches. | Disable `refetchOnWindowFocus` when the realtime channel is connected; add a connection-status flag. |
| M3 | `AdminSubscriptions` MRR/Churn cards render `null` value during load | Causes layout shift (skeleton → number is a different height). | Use a fixed-height skeleton instead of `null`. |
| M4 | `useLeadIntakeForm` line 199 — `track-request-help` no-op stub | Was tagged as L6 in prior audit but still present. Dead code, slight bundle bloat. | Remove the stub function and its 2 call sites. |
| M5 | `concierge-checkout` cancel path returns to step 7 (review) but doesn't re-validate phone/email — user can re-submit a stale form whose verification expired. | Re-run `validateStep(5)` and `validateStep(6)` on cancel return; force re-verify if >24h. |
| M6 | `ProviderSignup` sanitizes name/address but NOT `formData.facilityName` in the welcome-email payload (line ~629). XSS in subject line is impossible (Resend escapes), but it propagates raw HTML into provider notifications. | Run `sanitizePersonName` / `stripHtml` on `facilityName` before passing to email payloads. |

---

## 🔵 Low

| # | Item | Action |
|---|---|---|
| L1 | 510 `console.log/error/warn` calls in product code (35 files). Several log at `info` in production (e.g., `ProUpgrade`, `Settings`, `ConciergeIntake`). | Wrap in `if (import.meta.env.DEV)` or route through `logger.ts` — already exists in `src/lib/`. |
| L2 | `cleanup-audit-logs` edge function uses literal `00000000-...` UUID for system-actor — appears in audit log as "deleted user". | Add a real `system` admin user row, or use a constant that joins back to a `system_actors` table. |
| L3 | `seekers/SeekerReviews` line 263 uses lowercase `'Error fetching reviews:'` whereas the rest of the codebase uses `[useXyz]` prefix. | Standardize log prefixes — minor. |
| L4 | `consoleLogIfNotInList` pattern not used in `Inquiries.tsx`; instead inline `console.log("[ProviderSignup] ...")` etc. | Use `import.meta.env.DEV` guard everywhere. |
| L5 | `realtime_messages_no_policies` security finding marked ignored — accepted, but realtime channels in `useProviderNotifications` and `useSeekerNotifications` should be re-verified to filter on `user_id=eq.${auth.uid}`. (Done in prior pass; needs negative test.) | Add Playwright test: connect as user A, attempt to subscribe to user B's channel → expect zero events. |

---

## Workflows audited (clean / no issues)

- ✅ Lead unlock (credits) — atomic `update ... gte balance_cents` race-proof
- ✅ Auto-reload — HMAC-signed, advisory-lock + 5-min idempotency dual layer
- ✅ Stripe webhook signature + dedup via `claim_stripe_webhook_event`
- ✅ Concierge intake idempotency (3-way: draft → checkout session → safety-net)
- ✅ Provider-side lead PII masking via `leads_provider_view` (verified at DB level)
- ✅ `validate_lead_status_transition` trigger enforces the state machine
- ✅ `enforce_facility_limit` trigger blocks > 5 listings unless Pro + slot
- ✅ `prevent_provider_double_account` / `prevent_seeker_double_account` triggers prevent role conflicts
- ✅ `prevent_lead_facility_reassignment` trigger blocks lead hijacking
- ✅ All 117 edge functions enforce CORS + service-role isolation
- ✅ `validate_facility_data` strips HTML + dangerous protocols on every facility write
- ✅ `review_anti_spam_check` enforces 3/day + similarity + URL-spam rules
- ✅ Public + admin routes correctly decoupled (admins can browse public site)
- ✅ All 31,995 sitemap URLs serve self-canonicalised pre-rendered HTML

---

## Implementation plan (proposed order)

1. **CR1 — Concierge intake PII strip** (most urgent, single file change + small refactor)
2. **H1 — Orphan leads cleanup migration + FK hardening**
3. **H4 — Apply column-level REVOKE on facilities.email/reply_email + CI grep guard**
4. **H3 — Stripe webhook ownership cross-check before unlock insert**
5. **H2 — Add masking contract test + comment in `leads_provider_view`**
6. **M1–M6 — Polish batch** (extensions schema move, polling overlap, skeleton heights, dead stub removal, cancel-path re-verify, facilityName sanitize)
7. **L1–L5 — Cleanup batch** (DEV-guard console logs, system actor, log prefix consistency, negative realtime test)

Total: ~7 focused passes. After landing all of these, RehabLookup is launch-ready with no known critical, high, or medium-severity production issues.

