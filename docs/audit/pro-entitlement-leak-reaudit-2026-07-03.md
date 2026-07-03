# Pro-Entitlement Leak — Re-Audit / Verification (2026-07-03)

Independent re-verification that the Free-provider Pro-entitlement leak
(original root-cause audit: `pro-entitlement-leak-2026-07-02.md`, closed in
PR #67 and hardened through PR #75) is **fully closed end-to-end**.

Method: every layer was checked twice — (1) the merged code/migrations at
`main`, and (2) **live production introspection** of project
`mldbxpntzcjalgjmwnqa` (the original leak was fundamentally a repo-vs-prod
drift, so the live DB is the source of truth). Live checks were read-only.

## Verdict

**The entitlement leak is closed. No path was found by which a Free provider
can obtain Pro entitlements.** All seven fixes are present *and live in
production* (verified by reading the actual deployed function bodies,
triggers, policies, and tables — not just the repo).

The remaining open items are **operational / deploy-integrity**, not
entitlement leaks. They are listed under "Gaps" below.

## Layer-by-layer verification (live production)

| # | Control | Live status |
|---|---------|-------------|
| 1 | **Facility cap** `enforce_facility_limit()` — BEFORE INSERT trigger, Free=1/Pro=5, `GREATEST(plan, active grace grant)`; reads `facility_subscriptions` (tier='pro' + active-in-period or past_due), never `profiles.plan`; admin/service/empty-JWT exempt; import rows (`user_id IS NULL`) skipped | ✅ `enforce_facility_limit_trigger` enabled; body correct |
| 2 | **Webhook payment guards** (`stripe-webhook`): checkout activates only on `payment_status='paid'`/active/trialing else `incomplete`; `subscription.created` grants only for active/trialing; `updated` maps incomplete→incomplete; `payment_failed` never promotes an incomplete row to past_due | ✅ verified in merged code |
| 3 | **Verified gate** `enforce_facility_verified_gate()` — actor check rejects a provider self-setting `verified=true` regardless of `data_source` | ✅ `enforce_facility_verified_gate_trg` enabled; actor gate present |
| 4 | **Embed RPCs** `get_embed_badge` / `get_embed_reviews` / `get_embed_gallery` + `serve-badge` server-gated on `has_active_pro`; review responses gated for non-admins | ✅ all three RPCs contain the `has_active_pro` gate |
| 5 | **Storage cap** — RESTRICTIVE INSERT policy `facility_images_plan_object_cap` on `storage.objects`; `validate-and-upload` mirrors it | ✅ policy live (INSERT, WITH CHECK) |
| 6 | **Admin badge queries** filter `tier='pro'` + `has_active_pro` period semantics via shared `isActiveProRow`; `get-facility-plan` honors past_due grace | ✅ verified in merged code |
| 7 | **`plan_change_audit`** table + `log_plan_change_trg` on `facility_subscriptions` (insert/update/delete), admin-read-only RLS | ✅ table + trigger live |

Additional confirmations:

- **`has_active_pro(facility_id)`** live body matches the cap semantics exactly
  (`tier='pro' AND (active-in-period OR past_due)`) — no divergence between the
  gate functions.
- **Anon-insert bypass is not reachable.** The cap and verified-gate both exempt
  no-JWT/anon contexts (intended for SQL/service pipelines), but the only
  `facilities` INSERT policy is `WITH CHECK (auth.uid() = user_id)`; an anon
  actor has `auth.uid() = NULL`, so the row-level check fails before any trigger
  runs. RLS is enabled on `facilities`.
- **Real provider** (`282c00a0-…`, `teenacademynexus`) still holds 3 approved
  facilities, but this is a **documented, time-boxed grandfather**: an active,
  non-revoked `facility_cap_grace` grant for 3 listings expiring
  **2026-07-31**. New inserts are blocked by the restored cap. Not a leak.
- **Security advisors**: no new findings. The one ERROR
  (`security_definer_view` on `public_facilities`) and the leaked-password WARN
  are both pre-existing, documented, accepted items.

## Gaps (not entitlement leaks — operational / deploy)

1. **Stripe webhook is still not registered.** `stripe_webhook_events` is
   **empty all-time** and `facility_subscriptions` has **0 rows** in
   production. This is *fail-closed* for the leak (no false Pro grants), but it
   means **no provider can activate Pro by paying** — the paid tier is
   non-functional. Action (owner, cannot be done from the repo): run
   `admin-register-stripe-webhook`, set `STRIPE_WEBHOOK_SECRET`, send a Stripe
   test event, and confirm a row lands in `stripe_webhook_events`.

2. **Migration ledger drift — RESOLVED 2026-07-03 (see Remediation below).**
   `supabase_migrations.schema_migrations` max version was **`20260829000500`**
   with **0 rows recorded after it**, yet every later migration's objects (the
   cap trigger, verified gate, embed RPCs, storage cap, `plan_change_audit`,
   `provider_plan_grants`, etc.) were **live** — applied out-of-band via direct
   SQL rather than through the migration runner. Safe *today*, but a
   `supabase db push` / `db reset` would have replayed `20260829000600` →
   `20260829005500` against a DB that already had those objects, and any
   non-idempotent statement would have errored mid-deploy. Reconciling the
   ledger uncovered one genuinely **un-applied** migration (see Remediation §1).

3. **Minor / low-severity** (from the code re-read, no live exposure):
   - `get-facility-plan` retains a legacy Stripe-by-email fallback that can
     *display* "pro" from an unsynced Stripe sub; display-only, bypasses the
     canonical `facility_subscriptions` model.
   - Stale comment in `validate-and-upload` ("Free=10/Pro=60") vs the real RPC
     caps (20/150); code is correct, comment is wrong.
   - HIBP leaked-password protection is still disabled (owner-only Auth
     dashboard toggle; already tracked in the prelaunch config doc).

## Remediation performed (2026-07-03, live)

Both non-leak gaps were driven to closure where possible. All DB checks were
verified before and after.

### 1. Un-applied migration `20260829002400` — found and applied
Reconciling the ledger required verifying each post-`000500` migration's
objects actually exist live (so we mark applied only what is real). A per-
migration signature probe over all 43 came back **42 applied, 1 not**:
`20260829002400_concierge_messages_sender_type_guard` (MSG-7). The live
`concierge_messages_insert_consolidated` INSERT policy was the *pre-2400*
version — its seeker branch scoped `thread_type='advisor'` + `sender_id` but
**did not pin `sender_type='seeker'`**, so a seeker could insert an in-thread
message spoofing `sender_type='advisor'`/`'facility'` (visible to
advisor/admin). This was a real, if low-severity, RLS gap the merged migration
was meant to close but that never reached production.

- **Fix:** applied the `002400` guard **in place via `ALTER POLICY`** (atomic;
  no drop window; identical end state to the migration's DROP+CREATE). The
  seeker branch now requires `sender_type = 'seeker'::text`.
- **Verified safe first:** the seeker UI (`AdvisorMessaging.tsx`) already
  inserts `sender_type: "seeker"`; providers use `"provider"`, advisors
  `"advisor"`; no app path posts a seeker message with any other type and no
  path inserts `sender_type='facility'`. So the tighter check blocks only the
  spoof, not legitimate messaging. Post-change readback confirms the seeker
  branch now carries the `sender_type='seeker'` pin.

### 2. Migration ledger reconciled
Backfilled `supabase_migrations.schema_migrations` with all **43**
post-`000500` versions (`20260829000600` … `20260829005500`), idempotently
(`WHERE NOT EXISTS`). Post-state:
- ledger max version = `20260829005500` (was `20260829000500`);
- row count `826 → 869` (+43, exactly the 43 backfilled);
- **all 546 repo migration files** now have a matching ledger row (an `EXCEPT`
  of every repo version against the ledger returns **empty**) — so a future
  `supabase db push` against production replays nothing and cannot error.

### 3. Stripe webhook — still owner-only (cannot be done from here)
Registration needs three things not available to an automated agent by design:
a **service-role JWT** to invoke `admin-register-stripe-webhook` (it hard-
rejects non-`service_role` callers), a live **`STRIPE_SECRET_KEY`** on the
function, and the ability to store the returned signing secret as the
**`STRIPE_WEBHOOK_SECRET`** function secret (dashboard-only). Runbook:
1. From a service-role context, `POST` to
   `…/functions/v1/admin-register-stripe-webhook` (empty body → prod URL). It
   returns `{ endpointId, url, events, secret }`.
2. Paste `secret` into Supabase → Edge Functions → secrets as
   `STRIPE_WEBHOOK_SECRET` (confirm `STRIPE_SECRET_KEY` is also set).
3. Send a Stripe test event; confirm a row lands in `stripe_webhook_events`.
Until then the paid tier is non-functional (fail-closed — no false Pro grants).

## Bottom line

The Free→Pro entitlement leak is closed at every layer and confirmed live in
production. Reconciling the migration ledger additionally **uncovered and
closed** a never-applied RLS guard (`002400`, seeker `sender_type` spoofing)
and eliminated the deploy-replay hazard (ledger now matches all 546 repo
migrations). The one remaining item is **registering the Stripe webhook** — an
owner-only operational step that does not reopen the leak.
