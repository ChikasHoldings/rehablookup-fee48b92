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

2. **Migration ledger drift.** `supabase_migrations.schema_migrations` max
   version is **`20260829000500`** with **0 rows recorded after it**, yet every
   later migration's objects (the cap trigger, verified gate, embed RPCs,
   storage cap, `plan_change_audit`, `provider_plan_grants`, etc.) **are live**
   — they were applied out-of-band via direct SQL rather than through the
   migration runner. The protections are safe *today*, but a `supabase db push`
   or `db reset` would replay `20260829000600` → `20260829005500` against a DB
   that already has those objects; any non-idempotent statement would error and
   could abort the deploy. Recommended remediation: reconcile the ledger
   (backfill the applied versions into `schema_migrations`) so the recorded
   history matches reality — this is a production-state write and should be done
   deliberately, not silently.

3. **Minor / low-severity** (from the code re-read, no live exposure):
   - `get-facility-plan` retains a legacy Stripe-by-email fallback that can
     *display* "pro" from an unsynced Stripe sub; display-only, bypasses the
     canonical `facility_subscriptions` model.
   - Stale comment in `validate-and-upload` ("Free=10/Pro=60") vs the real RPC
     caps (20/150); code is correct, comment is wrong.
   - HIBP leaked-password protection is still disabled (owner-only Auth
     dashboard toggle; already tracked in the prelaunch config doc).

## Bottom line

The Free→Pro entitlement leak is closed at every layer, and the fixes are
confirmed live in production. The two items that still need attention are
**registering the Stripe webhook** (so paying customers actually get Pro) and
**reconciling the migration ledger** (so a future deploy doesn't diverge) —
neither reopens the leak.
