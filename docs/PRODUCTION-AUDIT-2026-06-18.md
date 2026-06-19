# RehabLookup — Deep Production Audit & Fix Plan

**Audit date:** 2026-06-18
**Scope:** Full stack — frontend (routing, UI, modals, forms), backend (184 edge functions, Postgres/RLS, 33 crons), payments (Stripe), integrations (Twilio/Resend), config/deploy (Vercel, middleware), SEO/build pipeline.
**Method:** Static code audit **plus live verification** against the production Supabase project (`mldbxpntzcjalgjmwnqa`) and Vercel project (`rehablookup-fee48b92`). Every load-bearing finding was confirmed against the running system, not inferred from code alone. **No code was modified** — this is audit + plan only.

---

## 1. Executive summary

The platform is **fundamentally healthy and well-engineered**: production DB is `ACTIVE_HEALTHY`, all 33 cron jobs are succeeding (0 failures in 24h), every edge-function invocation in the last 24h returned 200, the last 20 Vercel deployments are all `READY`, **314/314 unit tests pass**, typecheck and ESLint are clean, **RLS is enabled with policies on every public table**, redirects are loop-free, and all security headers are present. The team also runs ~40 of its own CI validators, most of which pass.

The risk is **latent, not live** — concentrated in three areas:

1. **Billing/cancellation correctness** — the single most serious issue: provider self-cancellation refunds the customer but **never cancels the Stripe subscription**, so billing continues and the cancellation silently reverses. Plus several entitlement state-sync bugs.
2. **Over-broad `SECURITY DEFINER` exposure** — 54 functions are `EXECUTE`-able by anonymous users; a subset are genuinely dangerous (facility-claim auto-approve chain; account-type enumeration oracle), the rest are perf/hygiene noise.
3. **A crash-class of UI null-dereferences** rooted in `strictNullChecks` being disabled.

### Headline counts (verified)

| Severity | Count | Theme |
|---|---|---|
| 🔴 Critical | 3 | Billing continues after cancel; monthly cancel breaks its own contract; unauthenticated blog-content write |
| 🟠 High | 7 | Claim-hijack RPC chain; 2× unauthenticated abuse endpoints; 2× double-billing; past_due grace false-deny; 3× UI crashers |
| 🟡 Medium | 13 | Enumeration oracle; migration-ledger drift; entitlement state-sync; PII export secret reuse; UI-gate flashes; RLS perf |
| 🟢 Low | ~13 clusters | success-on-failure toasts; unused indexes; tsconfig strictness; misc null-safety |

---

## Resolution status — 2026-06-18 (branch `claude/exciting-gates-eh74zw`)

> Added after the fix pass. Everything below this section is the original
> point-in-time audit, unchanged.

**All Critical + all High + 12 of 13 Medium findings are fixed, validated, and
pushed.** DB migrations are applied live; **edge-function and frontend fixes are
inert until deployed** (merge → deploy workflows + Vercel).

| ID | Status | Notes |
|---|---|---|
| C1, C2 | ✅ Fixed | Cancellation now cancels the Stripe subscription; monthly cancel honors its contract. **Live only after edge deploy.** |
| C3 | ✅ Fixed | `seed-blog-articles` requires admin. |
| H1 | ✅ Fixed (DB live) | `anon` EXECUTE revoked on state-mutating SECURITY DEFINER RPCs. |
| H2, H3, M13 | ✅ Fixed | Unauthenticated send/account endpoints rate-limited. |
| H4, H5 | ✅ Fixed | Duplicate annual-subscription + duplicate add-on guards. |
| H6, M7 | ✅ Fixed (DB live) | `past_due` grace keeps Pro benefits; status persisted. |
| H7 | ✅ Fixed | Three admin-UI crash / silent-data-loss bugs. |
| M1 | ✅ Fixed (DB live) | Per-IP, fail-open throttle on the account-existence oracle + RLS on the rate table. Verified end-to-end against prod. |
| M4 | ✅ Fixed | Unsubscribe tokens HMAC-signed; legacy tokens accepted until **2026-07-31** (CAN-SPAM), then remove the legacy branch. |
| M5 | ✅ Fixed | `send-sms-notification` returns 5xx on real send failure. |
| M6 | ✅ Fixed (DB live) | Concierge gate: period guard + `past_due` grace. |
| M8, M9 | ✅ Fixed | Entitlement + admin-permission hydration fail closed. |
| M10 | ✅ Fixed | Dead FacilityCard buttons removed; AdminAnalytics `VALID_TABS` corrected. |
| M3 | ✅ Fixed (deployed + verified live) | `data-export` has no code caller (verified across repo, all 33 cron jobs, every DB function, and 24h of edge logs) — it's a manual admin/ops tool. Now gated by **two factors**: the dedicated secret (prefers `DATA_EXPORT_SECRET`, falls back to `SMOKE_CRON_SECRET`) **and** `requireAdmin` (Authorization Bearer must resolve to an active `admin_user_profiles` row). Exports logged to `admin_audit_log`; 500 body no longer leaks detail. **Deployed via MCP (v3, ACTIVE, `verify_jwt=true`) and smoke-tested live**: anon JWT w/o secret → `401` (my secret gate); no-auth → `401` (platform). Callers must now send an admin access token **and** `x-export-secret`. ⚠️ Deployed from this branch — **merge to `main`** so a later deploy-from-main can't revert it. |
| M2 | ✅ Fixed (ledger live) | Reconciled the prod ledger to the repo on 2026-06-18: de-duped 2 colliding versions, then inserted a row for every file version not present (`274 → 766`) after verifying the 116 future-dated migrations are actually applied (112 by name, 4 by schema/data effect). `supabase db push` is now a no-op, closing the destructive-replay risk (`drop_pay_per_admission_residue`). Backup: `schema_migrations_backup_20260618`; go-forward rule + rollback in `supabase/migrations/README.md`. |
| 🟢 Low cluster | ✅ 9 of 14 fixed | **Fixed (code, pending deploy):** L1 bulk-dialog failure toasts (×14 — warning/error on partial/total failure), L2 SeekerShell render-phase redirect, L5 saved-search `.or()` escaping, L6 track-provider-event body-cap + UUID validation, L7 run-smoke-tests stack-leak, L8 stripe-webhook URL from env, L9 Stripe `data.error` surfacing (×4), L12 timeline null-guard, L13 `.nvmrc`→22. **Remaining:** L3 (impersonation reads unsigned sessionStorage — RLS-safe; needs DB role re-fetch), L4 (146 unused indexes — analyze before dropping, not dropped blindly), L10/L11/L14 (architectural: tsconfig strict rollout, SAMHSA pipeline, SEO SSR). |

**Before launch:** deploy, then dry-run cancel / switch-to-annual / add-on
purchase in Stripe **test mode**. Optionally provision `DATA_EXPORT_SECRET`
(completes the M3 dedicated secret) and `UNSUBSCRIBE_TOKEN_SECRET` (hardens M4).

---

## 2. What was verified live (so the findings can be trusted)

- **Supabase project**: `ACTIVE_HEALTHY`, Postgres 17.6, region us-west-2.
- **Security advisors**: 152 warnings (98 authenticated- + 54 anon-executable `SECURITY DEFINER` functions). **Performance advisors**: 196 (146 unused indexes, 50 multiple-permissive-policy overlaps).
- **RLS**: query for tables with RLS off **or** zero policies returned **empty** — full coverage.
- **Crons**: 33 active jobs; last-24h run history = **all `succeeded`, 0 failures**.
- **Edge logs / Postgres logs / Auth logs (24h)**: no errors; only normal cron + checkpoint activity.
- **Vercel**: 20/20 recent deployments `READY`, 0 ERROR/CANCELED; no production runtime errors in 7 days. (Last prod deploy 2026-05-30.)
- **Build health**: `tsc --noEmit` clean, `vitest run` = 314 passed, `eslint` clean.
- **Function-body / ACL inspection** via `pg_get_functiondef` + `has_function_privilege` for every flagged security item.

### ⚠️ Verified NON-issues (do not chase these)

These look broken but were proven fine — important to avoid wasted effort:

- **Live-site validators returning HTTP 403** (`check:hub-routes`, `bot-routes`, `ua-routing`, `vercel-cutover`): the response header is `x-deny-reason: host_not_allowed` — that is **this audit sandbox's egress policy** blocking `rehablookup.com`, **not** a production outage. The site serves real users 200s right now.
- **"Missing security headers"** (from `vercel-cutover`): false — `vercel.json` defines HSTS, X-Frame-Options, X-Content-Type-Options, CSP, Referrer-Policy, Permissions-Policy, X-XSS-Protection. The check only saw the deny-proxy's headers.
- **"~17 dead/unscheduled crons"** (a sub-agent's code-only inference): false — the live `cron.job` table shows `check_churn_alerts`, `check_not_found_alerts`, `send_saved_search_alerts`, `send_new_facility_alerts`, `send_profile_reminders`, `send_subscription_alerts`, `cleanup_rate_limit_logs` are **all scheduled and succeeding**. Only `samhsa-import-batch` is unscheduled (a manual import tool, by design).
- **Admin-initiated cancellation** (`SubscriptionDetailModal` → `manage-subscription`): correctly calls `stripe.subscriptions.cancel()`. The cancellation bug is specific to the **provider self-service** path.
- **Stripe webhook signature**: correct — uses async `constructEventAsync`, fails closed if the secret is unset.
- **Redirects** (210): 0 self-redirects, 0 cycles, 0 multi-hop chains, 0 duplicate sources.

---

## 3. Findings

### 🔴 CRITICAL

**C1 — Provider self-cancellation never cancels the Stripe subscription; customer keeps being billed and the cancel silently reverses.**
`supabase/functions/_shared/cancel-subscription.ts` (`cancelSubscriptionAndRefund`, ~L586–795) ← `provider-self-cancel-subscription/index.ts` ← `src/pages/provider/BillingCancel.tsx:132`.
The function calls `stripe.refunds.create(...)` and `UPDATE facility_subscriptions SET status='canceled'`, but contains **no** `stripe.subscriptions.cancel()` / `cancel_at_period_end` (verified by grep — only `invoices.list` + `refunds.create` exist). So after a provider cancels: DB says canceled and access is revoked, a refund may be issued (annual), **but the live Stripe subscription stays active and re-bills at renewal**. That renewal fires `invoice.payment_succeeded` + `customer.subscription.updated(active)`, which the webhook writes back as `status:'active'` — resurrecting the "canceled" subscription. Net: customers charged after canceling; annual users refunded now then re-charged the full annual later.
*Impact:* direct revenue/chargeback/trust damage + support load. *Fix:* call `stripe.subscriptions.cancel()` (annual/immediate) or `subscriptions.update({cancel_at_period_end:true})` (monthly) for the primary sub **and** each add-on `*_stripe_subscription_id`, before/with the DB write.

**C2 — Monthly self-cancel revokes access immediately while the UI promises access "until period end" and "no refund."**
`_shared/cancel-subscription.ts` sets `status:'canceled'` immediately for all billing periods; `has_active_pro()` and `useProStatus.ts:60` require `status='active'`, so Pro/featured/ranking drop instantly. Monthly refund is hardcoded 0. Meanwhile `BillingCancel.tsx:154,369` tells the user "You keep access until then. No refund is owed." The promised pending-cancel state never exists.
*Impact:* broken contract; paid-for access taken early. *Fix:* for monthly, set `cancel_at_period_end=true` + keep `status:'active'` until the period-end `subscription.deleted`; reserve immediate `canceled` for the refunded annual path. (Fixed together with C1.)

**C3 — `seed-blog-articles` does a service-role write with no authorization check.**
`supabase/functions/seed-blog-articles/index.ts:826–865`. `config.toml` sets `verify_jwt=true`, so **any** authenticated user (any seeker/provider) is admitted; the handler never verifies admin. The only guard is an `existingCount > 0` no-op short-circuit (L843). If `blog_articles` is ever empty/truncated, any logged-in user can publish blog content (inserted `status:'published'`, then auto-submitted to IndexNow, L881).
*Impact:* content-injection / SEO-poisoning vector; broken bucket-D contract. *Fix:* add `requireAdmin(req)` at the top (matching the other admin tools); consider tombstoning — it's a one-shot seeder.

---

### 🟠 HIGH

**H1 — Facility-claim privilege-escalation chain via anon-executable `SECURITY DEFINER` RPCs.**
`start_claim_verification`, `record_ownership_signal`, `finalize_claim_decision` (and `run_*_sweep`, `record_re_verification_event`) are `SECURITY DEFINER` with `EXECUTE` granted to `anon`+`authenticated` and **no internal auth guard** (verified via `pg_get_functiondef` + `has_function_privilege`). Because they're `SECURITY DEFINER` they **bypass RLS**. `record_ownership_signal(p_attempt_id, p_signal_type, p_passed, p_score…)` accepts an **attacker-controlled** `p_score`/`p_passed=true`, setting `ownership_score` to 100; `finalize_claim_decision` then computes `legitimacy*0.4 + ownership*0.6` and on pass writes `facility_claim_requests.status='approved', verification_status='verified'`. An actor can drive the verification state machine outside the intended edge-function flow.
*Mitigating factors (verified):* requires an existing claim row; `legitimacy_score` still depends on real SAMHSA cluster matching; high-lead facilities are force-routed to manual review. *Impact:* potential unauthorized facility-listing takeover. *Fix:* `REVOKE EXECUTE … FROM anon, authenticated` on the claim/verification/sweep RPCs (they should be service_role-only, called by the edge functions), or add an internal caller-identity/secret guard. (`submit_review_via_token` is correctly token-gated — leave it.)

**H2 — `send-provider-support` is an unauthenticated email relay with no rate limit.**
`supabase/functions/send-provider-support/index.ts:230–236` (bucket-B, `verify_jwt=false`, no `checkRateLimit`). Sends a confirmation email to a fully caller-supplied address; idempotency key embeds `Date.now()` so repeats never dedup. *Impact:* email-bombing arbitrary victims + Resend quota burn. *Fix:* `checkRateLimit` keyed on IP + target email.

**H3 — `register-provider-account` allows unauthenticated account-creation flooding + enumeration.**
`register-provider-account/index.ts:116` calls `auth.admin.createUser(...)` with no rate limit; distinct success vs `EMAIL_EXISTS` (409) responses form an enumeration oracle. *Impact:* mass auth-user creation, verification-email cost, account enumeration. *Fix:* rate-limit by IP before `createUser`; uniform response for existing vs new email.

**H4 — `switch-to-annual` can create two parallel annual subscriptions (double annual billing).**
`switch-to-annual/index.ts` (annual `subscriptions.create`, ~L283) guards on `billing_period==='monthly'` but doesn't flip it; there's **no Stripe idempotency key and no single-flight guard**, and the UI upgrade button (`Billing.tsx:203–234`, `ProUpgradeChoices.tsx`) has **no disabled/in-flight state**. Two clicks before the webhook reconciles → two annual subs (~$1,009.80 each). *Fix:* add a Stripe `idempotencyKey` + "already annual / pending" pre-check; disable the button while in flight.

**H5 — Add-on (Featured/Concierge) double-purchase orphans a live Stripe subscription.**
`create-checkout-session/index.ts:212–226` guards on the post-webhook DB flag (`has_featured`), but the open-session reuse window (30 min) outlives the idempotency bucket (5 min); a second checkout in that gap passes. On activation, `_shared/featured-addon.ts:110–119` / `concierge-addon.ts:109–118` **overwrite** `*_stripe_subscription_id`, orphaning the earlier sub, which keeps billing. No duplicate-detection alert (unlike the Pro path). *Impact:* double add-on billing ($599 or $1,000/mo). *Fix:* detect/cancel an existing active add-on Stripe sub on activation; mirror the Pro-path duplicate alert.

**H6 — `past_due` strips Pro on the first failed retry (grace-period false-deny).**
`stripe-webhook/index.ts:2443` maps Stripe `past_due`→DB `past_due`; `has_active_pro` + `useProStatus.ts:60` require `status='active'`, so benefits vanish on the first retry failure — while the webhook simultaneously emails "update payment to **avoid losing** Pro" (L2569). Stripe keeps `past_due` subs alive through smart-retry/grace, so this denies access during a window meant to be grace. *Fix:* decide the policy — treat `past_due` with `current_period_end > now()` as entitled (grace), or fix the email copy if immediate revocation is intended.

**H7 — Three UI crashers / silent data-loss.**
- `src/pages/admin/AdminBackOffice.tsx:752` renders `<EscalationsList filterStatus="open" />` without its three **required** props (`selectedIds`, `onToggleSelect`, `onSelectAllVisible`); when ≥1 open escalation exists, `EscalationsList.tsx:252` runs `selectedIds.has(...)` on `undefined` → `TypeError`, error-boundary takes down the card. *Crashes exactly when it has content.*
- `src/components/admin/concierge/ConciergeDecisionTab.tsx:122–123`: `RESPONSE_CONFIG[intro.provider_response]` is `undefined` for the persisted values `not_available`/`no_response` (written at `ConciergeIntroductionsTab.tsx:470–471`) → `.icon` throws → white-screen for any Declined/No-Response case.
- `src/components/admin/users/UserProfileModal.tsx:226–238`: the audit-log `.insert()` result is never checked for `error`; `toast.success("Note saved")` fires unconditionally → on RLS/network failure the note is silently lost.
*Root cause:* `strictNullChecks`/`noImplicitAny` disabled (see L10) lets these pass typecheck. *Fix:* pass required props / add safe defaults; add `not_available`+`no_response` to the config (or `?? RESPONSE_CONFIG.pending`); destructure `{ error }` and toast accordingly.

---

### 🟡 MEDIUM

**M1 — Account-type enumeration oracle.** `is_email_admin/provider/seeker/verified(p_email)` are all `SECURITY DEFINER`, `anon_can_exec=true`, return boolean (verified). An unauthenticated caller can learn whether any email is an admin/provider/seeker/verified — aids targeted phishing + enumeration. *Fix:* require auth or rate-limit; never disclose admin status to anon.

**M2 — Migration-ledger drift.** Production `supabase_migrations.schema_migrations` records 269 applied (max version `20260527`), but the repo has 494 files dated through **Aug 2026** (134 after the ledger max, 112 future-dated vs today). Objects from Aug-28 migrations (`platform_settings`, `blog_authors`) **exist in prod**, so migrations are applied **out-of-band** (dashboard / `apply_migration` MCP) without updating the ledger. *Impact:* the ledger is non-authoritative; a future `supabase db push` could mis-apply/skip. *Fix:* reconcile the ledger against the repo; standardize on one application path.

**M3 — `data-export` PII export gated by a reused secret.** `data-export/index.ts:16–37` reads arbitrary `?table=` + `auth.admin.listUsers()` (service role); the gate is `x-export-secret == SMOKE_CRON_SECRET` (the cron-test secret, reused). Returns `String(err)` in the 500 body. *Fix:* dedicated secret, bind to an admin JWT identity, generic error body.

**M4 — `provider-emails-unsubscribe` token is forgeable.** `provider-emails-unsubscribe/index.ts:58,74–77`: token is `base64(user_uuid)` with no HMAC; anyone with a target's UUID can unsubscribe them from provider marketing email. Blast radius limited (marketing only, reversible). *Fix:* sign the token (HMAC).

**M5 — `send-sms-notification` returns HTTP 200 on send failure.** `send-sms-notification/index.ts:69–70, 363–365` return `{success:false}` with status 200 on misconfig and Twilio failure — masks outages from monitoring. *Fix:* return 5xx.

**M6 — `is_active_concierge_partner` omits the period-expiry check.** `migrations/20260827000900…sql:20–33` checks only `has_concierge_partner=true AND status='active'`, unlike `has_active_pro` which also requires a non-lapsed `current_period_end`. A stale-active row keeps a facility an active Concierge Partner without a current paid period. *Fix:* add `AND (concierge_current_period_end IS NULL OR concierge_current_period_end > now())`.

**M7 — `invoice.payment_failed` performs no entitlement state change.** `stripe-webhook/index.ts:2594–2738` only notifies; the `past_due` flip lives solely in `customer.subscription.updated`. If that event is missed/late, the DB stays `active` after a failed payment (transient unpaid access). No reconciliation cron exists (verified). *Fix:* set `past_due` idempotently in the failed-payment handler, or add a Stripe→DB reconciliation job.

**M8 — `useSubscription` trusts a localStorage entitlement cache.** `src/hooks/useSubscription.ts:28–58,80,91,95` seeds + error-falls-back to a `localStorage` blob (5-min TTL) — a just-canceled provider can briefly render as Pro. Display-only (server gates are authoritative). *Fix:* drop the cached-Pro fallback; default to Free on error.

**M9 — AdminShell route gate fails open during permission hydration.** `src/components/admin/AdminShell.tsx:123–130`: while `permissions` hydrates (~1s, intentionally not cached), `hasRouteAccess` is forced `true`, so a lower-tier admin deep-linking to a higher-permission route sees page chrome before `AccessDenied` swaps in. **UI-exposure only — data is RLS-safe.** *Fix:* render a neutral spinner (not `<Outlet/>`) while `!permissionsReady` for permission-gated routes.

**M10 — Dead/incorrect UI controls.** `src/components/cards/FacilityCard.tsx:208–221` "Save facility" / "Add to compare" buttons have **no `onClick`** (silent no-ops on a high-traffic card; the sibling `SearchResultCard` wires them). `src/pages/admin/AdminAnalytics.tsx:100` `VALID_TABS` omits `ctasources`/`churn`/`form-conversion` and includes a phantom `performance`, so 3 of 6 tabs don't deep-link/restore. *Fix:* wire the favorites/compare hooks (or remove); correct `VALID_TABS`.

**M11 — 50 multiple-permissive-policy overlaps (RLS perf).** Worst: `facility_accreditations` (8), `facility_amenities`/`facility_programs`/`facility_staff`/`review_responses` (4 each). Each overlapping permissive policy is evaluated per row per query. *Fix:* consolidate overlapping policies per role/action.

**M12 — CSP weakened by `'unsafe-eval'` + `'unsafe-inline'`** in `script-src` (verified in `vercel.json`; known/deferred per punch list). Materially reduces XSS mitigation. *Fix:* nonce-based inline scripts; identify the dependency needing eval.

**M13 — Other unauthenticated email-send endpoints with no rate limit.** `provider-interest-submit/index.ts`, `request-facility-from-marketing/index.ts` (bucket-B, one Resend email per call). *Fix:* add `checkRateLimit`.

---

### 🟢 LOW (clusters)

- **L1 — Bulk-action dialogs (×14) toast `success` even when the whole batch errored** (e.g. `BulkEscalationActionDialog.tsx:120–121` and siblings); result shape trust-cast. *Fix:* `toast.warning/error` when `errored>0`; default counts.
- **L2 — `SeekerShell` flashes shell chrome to anonymous users** before the effect-based redirect (`SeekerShell.tsx:192–248`). UI-only; no PII loads (data gated on `userId`). *Fix:* render-phase `Navigate` like `ProviderShell`.
- **L3 — Impersonation grant read from unsigned `sessionStorage`** (`useImpersonation.ts` → `AdminShell.tsx:91–107`) — an already-authenticated admin could hand-edit it to surface nav/pass the client gate. Data RLS-safe. *Fix:* re-fetch target role from DB / signed token.
- **L4 — 146 unused indexes** (e.g. `idx_featured_impressions_surface_time`). Write-amplification + storage. *Fix:* drop after confirming no rare-query dependence.
- **L5 — `send-saved-search-alerts/index.ts:155`** builds a PostgREST `.or()` filter from user-influenced `saved_searches.criteria` with insufficient escaping. Bounded (public facilities, self-emailed). *Fix:* allowlist/escape.
- **L6 — `track-provider-event` lacks UUID validation + body-size cap** (inconsistent with `track-view`/`track-interaction`).
- **L7 — `run-smoke-tests/index.ts:243` returns `error.stack`** in the body (super-admin/cron-gated). *Fix:* drop stack.
- **L8 — Hardcoded prod project-ref** in `admin-register-stripe-webhook/index.ts:25` (fallback only; not a secret). Hygiene.
- **L9 — Frontend Stripe errors use raw `err.message`**, not the tested `classifyStripeError` (`FeaturedMarketingDetail.tsx:54`, `ConciergeMarketingDetail.tsx:53`, `SwitchToAnnualBanner.tsx:62`, `BillingCancel.tsx:173`). *Fix:* surface classified `data.error`.
- **L10 — `strictNullChecks`/`noImplicitAny`/`strict` disabled** in `tsconfig.app.json` (root cause of the H7 crash-class; known/deferred). *Fix:* incremental strict rollout, new code first.
- **L11 — SAMHSA pipeline partial** (known/deferred): 5 generators still emit text-only templates; `samhsa-import-batch` unscheduled.
- **L12 — `ProviderActivityTimeline.tsx:116`** derefs `notif.message` with no null guard and no `isError` branch → blank card masks the error.
- **L13 — Node version drift**: `.nvmrc` pins 24 but the toolchain ran on Node 22; align to avoid CI/local divergence.
- **L14 — SEO hydration title-flash** on non-`/` routes (known/deferred; architectural — needs SSR or neutral shell).

---

## 4. Prioritized fix plan

Severity-ordered, grouped into phases. Effort is rough (S < 0.5d, M ~1–2d, L > 2d).

### P0 — Launch-blockers (money + data integrity) — do first
| # | Fix | Files | Effort |
|---|---|---|---|
| C1 | Call Stripe to actually cancel the sub (+ add-on subs) in the self-cancel path | `_shared/cancel-subscription.ts`, `provider-self-cancel-subscription` | M |
| C2 | Monthly → `cancel_at_period_end` + keep `active` until period end | same as C1 | S (with C1) |
| C3 | Add `requireAdmin` to `seed-blog-articles` (or tombstone) | `seed-blog-articles/index.ts` | S |
| H7 | Fix the three UI crashers / silent note-loss | `AdminBackOffice.tsx`, `ConciergeDecisionTab.tsx`, `UserProfileModal.tsx` | S |

### P1 — Security & double-billing — do this week
| # | Fix | Effort |
|---|---|---|
| H1 | `REVOKE EXECUTE` from anon/authenticated on claim/verification/sweep RPCs (keep `submit_review_via_token`) | M |
| H4 | Idempotency key + in-flight guard on `switch-to-annual` upgrade | S |
| H5 | Duplicate-add-on detection/cancel on activation | M |
| H2/H3/M13 | Rate-limit unauthenticated send/account endpoints; uniform enumeration response | M |
| H6/M7 | Decide & implement `past_due` grace policy; set state in `invoice.payment_failed` | M |

### P2 — Correctness & hardening — this sprint
| # | Fix | Effort |
|---|---|---|
| M1 | Gate/rate-limit `is_email_*` enumeration oracle | S |
| M2 | Reconcile migration ledger; standardize apply path | M |
| M3/M4 | Dedicated secret for `data-export`; sign unsubscribe token | S |
| M5 | `send-sms-notification` return 5xx on failure | S |
| M6 | Add period-expiry check to `is_active_concierge_partner` | S |
| M8 | Drop localStorage Pro fallback in `useSubscription` | S |
| M9 | AdminShell fail-closed during permission hydration | S |
| M10 | Wire/remove FacilityCard buttons; fix AdminAnalytics `VALID_TABS` | S |

### P3 — Hygiene & quality — backlog
- L1 bulk-dialog toasts; L4 drop unused indexes; M11 consolidate RLS policies; L5–L9, L12 misc; M12 CSP tightening; **L10 strictNullChecks rollout** (high leverage — prevents the entire H7 bug class); L11 SAMHSA generators; L13 node version; L14 SEO hydration flash.

### Suggested sequencing
1. **Day 1:** C1+C2 (one change), C3, H7 — stop the bleeding (billing + crashes).
2. **Days 2–4:** H1, H4, H5, H2/H3 — close security + double-billing.
3. **Sprint:** P2 batch.
4. **Backlog:** P3, anchored by the `strictNullChecks` rollout to prevent regressions of the crash class.

---

## 5. Appendix — verification artifacts

- Security advisors: 152 (`anon_security_definer_function_executable` ×54, `authenticated_…` ×98).
- Performance advisors: 196 (`unused_index` ×146, `multiple_permissive_policies` ×50).
- Anon-exec `SECURITY DEFINER` no-guard set (verified): `finalize_claim_decision`, `start_claim_verification`, `record_ownership_signal`, `record_re_verification_event`, `run_backstop_sweep`, `run_expiry_sweep`, `run_data_feed_diff`, `mark_review_request_sent`, `_re_verify_notify_provider`, `refresh_facility_metrics_daily`. Enumeration oracle: `is_email_admin/provider/seeker/verified`.
- Cancellation grep: `_shared/cancel-subscription.ts` → only `invoices.list` + `refunds.create`, **no** `subscriptions.cancel`/`cancel_at_period_end`. Contrast: `manage-subscription/index.ts:244` (admin path) does cancel.
- Live crons: 33 active, 0 failures/24h. Tests: 314 passed. Deploys: 20/20 READY.
