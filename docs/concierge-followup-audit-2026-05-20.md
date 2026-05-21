# Concierge / Placement — Follow-up Audit + Wiring Fixes

**Date:** 2026-05-20
**Branch:** `claude/phase2-deployment-5WYOn`
**Trigger:** Post-hardening audit pass to catch what the initial smoke missed.
**Verdict:** ✅ One critical RLS gap closed (silent write-deny on both add-on tables). Cosmetic cleanup applied.

---

## What we caught (and missed in the first pass)

### 🔴 Critical — `concierge_partner_facilities` + `featured_placements` had RLS enabled but no write policies

**Severity:** Critical. **Impact:** Provider "Add geography" and "Remove geography" UI actions were silently RLS-denied in production.

**Discovery:** While auditing for what we might have missed, I checked `pg_policy` against both add-on tables and found:

| Table | SELECT policies | INSERT | UPDATE | DELETE |
|-------|-----------------|--------|--------|--------|
| `concierge_partner_facilities` (before fix) | 2 (admin + owner) | **0** | **0** | 0 |
| `featured_placements` (before fix) | 2 (public + owner) | **0** | **0** | 0 |

With RLS enabled, missing INSERT/UPDATE/DELETE policies mean **all writes from `authenticated` role are denied**. The only writes that succeeded were from `stripe-webhook` and other edge functions running under the service role (which bypasses RLS entirely):
- Webhook activates → seeds initial row ✅ (service role)
- Provider visits `/provider/marketing/concierge` → table renders ✅ (SELECT policy)
- Provider clicks "Add a geography" → INSERT silently fails ❌ (no INSERT policy)
- Provider clicks "Remove" → UPDATE silently fails ❌ (no UPDATE policy)

**Fix:** `supabase/migrations/20260520065601_addon_write_rls_policies.sql` — applied both locally and to prod via `apply_migration`. Adds:

| Policy | Table | Role | Scope |
|--------|-------|------|-------|
| Facility owners can insert own concierge partner geo | `concierge_partner_facilities` | `authenticated` | `facility_id ∈ user's facilities` (WITH CHECK) |
| Facility owners can update own concierge partner geo | `concierge_partner_facilities` | `authenticated` | same (USING + WITH CHECK) |
| Admins can manage concierge partner facilities | `concierge_partner_facilities` | `authenticated` | `is_admin(uid)` (FOR ALL) |
| Facility owners can insert own featured placements | `featured_placements` | `authenticated` | `facility_id ∈ user's facilities` |
| Facility owners can update own featured placements | `featured_placements` | `authenticated` | same |
| Admins can manage featured placements | `featured_placements` | `authenticated` | `is_admin(uid)` (FOR ALL) |

**DELETE not granted** — both surfaces use soft-delete (`active = false, deactivated_at = now()`); the UPDATE policy covers this. The cap-enforcement triggers (`enforce_concierge_geo_cap`, `enforce_featured_placement_cap`) continue to protect against over-allocation.

**After fix:**

| Table | SELECT | INSERT | UPDATE | DELETE | ALL (admin) |
|-------|--------|--------|--------|--------|-------------|
| `concierge_partner_facilities` | 2 | 1 | 1 | 0 | 1 |
| `featured_placements` | 2 | 1 | 1 | 0 | 1 |

---

## Other audit findings — disposition

| # | Finding | Severity | Action |
|---|---------|----------|--------|
| 1 | RLS write-deny on both add-on tables | 🔴 Critical | ✅ Fixed via migration |
| 2 | `ConciergeMarketingDetail` doesn't handle `{confirmed:true}` no-redirect response | 🟡 Medium | **False positive.** Reviewed `create-checkout-session/index.ts`: every 200 response includes a `url` field (lines 244 + 309). The `{confirmed:true}` shape doesn't exist in the actual function. No change needed. |
| 3 | Legacy `checkout_session_id` / `stripe_payment_intent_id` columns now always NULL | 🟡 Medium | **Intentional.** Documented in `concierge-workflow-hardening-smoke-2026-05-20.md`. UI renders them as empty when present, which is correct. A future cleanup migration could drop them; not in scope. |
| 4 | `verify-concierge-payment` 410 tombstone not in CHANGELOG | 🟡 Medium | Documented in the hardening smoke doc (this file's predecessor). |
| 5 | `ProviderBillingConciergePage` redirect-only lazy import is unnecessary cruft | ⚪ Cosmetic | **Keep as-is.** Backward-link compatibility — old bookmarks/emails still resolve. |
| 6 | Outdated `skipPayment:true` reference in comment | ⚪ Cosmetic | ✅ Fixed — `ConciergeThankYou.tsx:56` + `submit-concierge-intake/index.ts:9` updated to reflect single-path reality. |
| 7 | `AdminConciergeMetrics` doesn't show `payment_status` partition | ⚪ Cosmetic | Not worth the UI clutter. All cases are `'free'` now; the old `'paid'` rows are historic-only. |

---

## Why was the gap there?

`concierge_partner_facilities` was introduced in `20260516010000_monetization_foundation.sql` along with `featured_placements`. That migration created the tables, enabled RLS, and added SELECT policies — but didn't add write policies because at the time, all writes were intended to flow through edge functions (`activateConciergePartner` / `deactivateConciergePartner` running with service role).

The add-geo / remove-geo provider UI (`AddConciergeGeoForm`, `ConciergeManagementPanel`, `AddFeaturedPlacementForm`, `FeaturedManagementPanel`) was layered on later but uses **direct client writes** rather than dedicated edge functions — and the matching RLS policies were never added. That's the gap this migration closes.

---

## CI gates after fix

```
✓ npx tsc --noEmit                — clean
✓ npx vitest run                  — 128 passed / 5 skipped
✓ npx vite build                  — built in 29.95s
✓ migration applied to prod       — version 20260520065601
✓ pg_policy verification          — 1 INSERT + 1 UPDATE + 1 ALL policy per add-on table
```

---

## Smoke verdict

🟢 **Ship-ready.** With the RLS write policies in place, the provider-side Concierge + Featured add-on management UIs now have working add-geo / remove-geo flows end-to-end. The audit-discovered gap was the only functional blocker; everything else flagged was cosmetic or a false positive.
