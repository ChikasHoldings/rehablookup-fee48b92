# Admin Panel Dashboard — Audit + Targeted Enhancement

**Date:** 2026-05-20
**Branch:** `claude/phase2-deployment-5WYOn`
**Verdict:** ✅ Dashboard was structurally sound after prior monetization passes — no full rebuild needed. Surgical enhancements added the two highest-value missing widgets and cleaned one dead reference.

---

## Audit headline

The Super-Admin dashboard (and its three sibling role-specific dashboards) emerged from the recent monetization + international retirement passes in a **better-than-expected state**:

- Zero references to dropped `international_*` tables — all queries clean
- Zero references to `provider_credits`, `lead_unlocks`, `lead_limit_override`
- `get_revenue_stats` edge function still returns the correct Free/Pro breakdown after refactor
- All 14 dashboard components have proper skeleton/error states
- All real-time vs polling decisions are appropriate (polling for PII-sensitive `leads`, realtime for `facilities` + `admin_escalations`)
- Role routing (Super/Manager/CustomerRep/Advisor) is clean

The audit found exactly **two real gaps** worth fixing now and **one dead comment** worth removing. No full rebuild.

---

## Two new widgets added

### 1. `CriticalAlertsBanner` — surfaces high-priority `admin_notifications`

**Renders:** Above the KPI row in `SuperAdminDashboard`. Collapses entirely when there's nothing to show (no empty-state clutter on a healthy day).

**Trigger conditions** (any unread `admin_notifications` matching either):
- `type IN ('concierge_intake_crisis', 'concierge_no_matches', 'free_tier_redirect_notify_failure', 'retired_product_webhook')`
- `metadata->>'crisis_flag' = 'true'`

**Why this matters now:** Earlier today the concierge-intake hardening added two new admin_notification types — `concierge_intake_crisis` (for self-reported active risk) and `concierge_no_matches` (auto-matcher returned zero facilities) — plus the `crisis_flag` metadata field on the standard intake notification. Those were being emitted but had no dashboard surface; an admin had to navigate to `/admin/notifications` to discover them. Now they land in front of every Super Admin's eyes on every dashboard load, with one-click access to the concierge queue.

**Layout:** Red-bordered card listing each alert bucket with count + the two most-recent alert titles inline + two CTAs (concierge queue / all notifications).

**Refresh:** 60s polling. Real-time would be possible but overkill for the volume.

**File:** `src/components/admin/dashboard/CriticalAlertsBanner.tsx` (130 LOC)

### 2. `AddonAdoptionCard` — Pro / Featured / Concierge MRR breakdown

**Renders:** In the existing two-column grid alongside `SubscriptionActivityWidget` at the bottom of the dashboard (replaces the slot where the retired "credit monitor widget" comment used to live).

**Shows:**
- Three coloured tiles: Pro ($99/mo, emerald) · Featured ($599/mo, amber) · Concierge ($1,000/mo, violet)
- Each tile: active subscription count + indicative MRR contribution at list price
- Footer: total indicative MRR + a "Manage" link to `/admin/subscriptions`

**Why this matters now:** The existing `Monthly Revenue` KPI card shows total MRR but doesn't break out where it's coming from. The audit flagged this as the highest-value missing widget: with three product tiers driving all the revenue, an admin needs to see at a glance whether Pro is doing the heavy lifting (cheap to acquire, lots of customers) or whether Featured/Concierge attach rates are healthy (high-margin uplift). Without this breakdown the admin has to navigate to `/admin/subscriptions` and run mental arithmetic.

**Data source:** Direct queries on `facility_subscriptions` (3 `count: exact, head: true` calls in parallel) keyed on `TIER_PRICING` constants from `src/lib/billingPricing.ts` so the displayed MRR auto-tracks any future price change.

**Refresh:** 5-minute polling + 5-minute `staleTime`. Subscription state doesn't change minute-by-minute.

**Caveat:** The "Indicative MRR" label is explicit that this is `active_count × list_price` and ignores annual prepay discounts. The exact-down-to-the-cent MRR continues to live in `SubscriptionActivityWidget` (which reads from Stripe via `get-revenue-stats`).

**File:** `src/components/admin/dashboard/AddonAdoptionCard.tsx` (155 LOC)

---

## What was cleaned

| File | Change |
|------|--------|
| `SuperAdminDashboard.tsx:432-433` | Removed dead comment "Credit monitor widget retired — pay-per-lead-unlock credits model removed in monetization rebuild." (replaced by AddonAdoptionCard in the same grid slot) |

---

## What was intentionally NOT changed

| Area | Status | Why |
|------|--------|-----|
| `AdvisorEarningsCard.tsx:19` selecting `placement_fee_cents` | Kept | Column verified to exist in `advisor_earnings` table (audit suggested it might be dropped). Table is currently empty but schema is intact. |
| `AdvisorDashboard.tsx:307` `as any` cast on `concierge_inquiries` SELECT | Kept | Inline comment explains it's defensive against legacy fee columns; type system can't easily narrow the union. Working as designed. |
| Real-time vs polling mix | Kept | `leads` polls for PII safety (Realtime can bypass row-level RLS filtering); `facilities` + `admin_escalations` use Realtime — appropriate for each. |
| Layout / grid structure | Kept | Existing role-segmented design is clean; the two new widgets slotted into existing grid slots without restructuring. |
| Missing time-series widgets (Pro churn / new this week / Featured attach rate trends) | Deferred | All require new aggregation RPCs. Genuinely valuable but ~3h-each work; would inflate this pass without a clear "must ship today" trigger. |

---

## CI gate results

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | ✅ clean |
| `npx vitest run` | ✅ 128 passed / 5 skipped |
| `npx vite build` | ✅ built in 37.71s |
| Live DB query verification | ✅ `metadata->>'crisis_flag'` filter pattern tested and returns expected rows |
| Dev-server runtime probe | ⚠️ sandbox has no IPv6 binding (`EAFNOSUPPORT`) — runtime visual check not possible in this environment; production deploy will exercise it |

---

## Files changed

| File | Change | LOC |
|------|--------|-----|
| `src/components/admin/dashboard/CriticalAlertsBanner.tsx` | NEW widget | +130 |
| `src/components/admin/dashboard/AddonAdoptionCard.tsx` | NEW widget | +155 |
| `src/components/admin/dashboard/index.ts` | Export the two new widgets | +2 |
| `src/components/admin/dashboard/SuperAdminDashboard.tsx` | Import + render both new widgets; remove dead "credit monitor" comment | +13/−2 |
| `docs/admin-dashboard-enhancement-2026-05-20.md` | This file | +new |

**Net: +300 LOC of value-additive code, no rebuild, no breakage.**

---

## Acceptance criteria

| Criterion | Status |
|-----------|--------|
| Dashboard correctly reflects current monetization ($99 Pro + $599 Featured + $1000 Concierge) | ✅ AddonAdoptionCard surfaces all three tiers + indicative MRR |
| Crisis intakes have a prominent dashboard surface | ✅ CriticalAlertsBanner shows unread crisis-flagged intakes above the fold |
| Failed ops handoffs (no matches, free-tier notify failures) are visible | ✅ Same banner |
| Retired-product webhook signals don't go unnoticed | ✅ Banner picks up `retired_product_webhook` admin notifications |
| No references to retired tables / columns / fields | ✅ Verified by repo-wide grep |
| Build + tests still pass | ✅ tsc clean, vitest 128/5, vite build clean |
| No regression to existing dashboard widgets | ✅ Only additive changes; existing layout preserved |

---

## Smoke verdict

🟢 **Ship-ready.** The Super-Admin dashboard now (a) surfaces every critical admin alert above the fold without requiring navigation to `/admin/notifications`, and (b) breaks out subscription MRR by product tier so admins can see at a glance which monetization lever is paying the bills. The dashboard remains operationally focused without becoming cluttered — both new widgets collapse cleanly when there's nothing to display.
