# /admin/analytics — Deep Hardening Pass

**Date:** 2026-05-20
**Branch:** `claude/phase2-deployment-5WYOn`
**Verdict:** ✅ Frontend complete, type-safe, no silent failures, KPIs no longer silently truncated. Same standard as the prior 13 admin surfaces.

---

## Scope

- `src/pages/admin/AdminAnalytics.tsx` (1814 LOC → ~1830 LOC after edits)
- `src/components/admin/FeaturedAnalyticsDashboard.tsx` (618 LOC)
- `src/components/admin/LeadFormAnalytics.tsx` (490 LOC)

This page is read-only — no destructive mutations — so no admin-gated bulk edge function is needed (the pattern that drove the prior 13 passes). The hardening focuses on data correctness, type safety, error surfacing, and URL-state.

---

## Issues closed

### P0 — data-correctness bugs

1. **`.limit(5000)` silently truncated analytics.** Seven queries in `AdminAnalytics.tsx` capped at 5000 rows. Live DB confirmed **9,769 `provider_events` rows** already — on any 30+ day window the page was silently dropping data and reporting low KPIs. **Fix:** introduced an `ANALYTICS_ROW_CAP = 50000` constant, replaced all 7 limits, and added a **truncation banner** (`role="alert" aria-live="polite"`) that fires when any query returns exactly the cap (so admins know to narrow the range or geo filter instead of trusting clipped counts).

2. **`selectedPlan` filter was dead UI.** State + Select component existed (Free / Pro / All) but NO query used it. Admins thought they were filtering analytics by plan; they got the same data either way. **Fix:** removed the Select + the state + the `PLAN_OPTIONS` constant + the reset-handler reference. If/when plan-segmented analytics is actually needed it should be added server-side via the `get-revenue-stats` edge fn.

3. **7 `as any` casts on `facilities` joins** — `(l.facilities as any)?.state === selectedState` and similar. Lost type safety and would silently pass `undefined` to the comparison if the join shape changed. **Fix:** introduced `FacilityJoin`, `AnalyticsEventRow`, `AnalyticsLeadRow` types at the top of the file. The casts now read `(data as unknown as AnalyticsLeadRow[]).filter((l) => l.facilities?.state === selectedState)` — types check, the optional chain handles `null` joins, and the foreach loops short-circuit when `f?.state` or `f?.city` is missing instead of computing `${undefined}-${undefined}` as a map key.

4. **`get-revenue-stats` invoke didn't check `data?.error`.** Supabase edge fns can return HTTP 200 with `{ error: "..." }` body when an upstream (Stripe) errors. The prior code threw on the transport `error` but consumed the payload error as success data — KPIs silently went to zero across the subscription card. **Fix:** dual-check pattern (throw on `error` OR `data?.error`) matching every other hardened admin surface.

5. **`FeaturedAnalyticsDashboard` swallowed errors from 5 queries.** The destructure dropped `error` on `get-featured-facilities` invoke + 4 table queries. If any failed, the page rendered zeros across the Pro-subscriber KPI strip with no indication. **Fix:** added `if (error) throw error` to every query plus the `data?.error` check on the edge fn invoke, plus an `isError` branch that renders an error Alert with a Retry button.

6. **`FeaturedAnalyticsDashboard` hardcoded `50 impressions/day` estimation distorted KPIs.** If no impression events existed in `featured_placement_analytics` for the window, the page silently filled in `metrics.impressions = Math.round(days * 50)` and computed CTR from that — admins saw fake CTRs as if they were measured. **Fix:** track an `impressionsAreMeasured` flag through the query result; UI surfaces an amber "Impressions are estimated" Alert when the flag is false. The estimate only kicks in when no facility has any measured impression (one measurement is enough to trust the data), and it's now explicitly labeled in the UI.

7. **`LeadFormAnalytics` swallowed query errors.** No `isError` branch. If the query failed, the component rendered the full layout with "0 page views" — admins thought the form wasn't getting traffic when actually the analytics fetch was broken. **Fix:** added `isError` + `error` + `refetch` destructure, rendered a red error Card with a Retry button. Also added a genuinely-empty state ("No form events in this period") when the query returns successfully but with 0 rows — so admins distinguish "broken" from "no traffic".

### P1 — workflow gaps

8. **No URL state for filters or active tab.** Every other admin page round-trips filters through the URL; this one was the last holdout. Admins couldn't bookmark or share a specific analytics view. **Fix:** `useSearchParams` hydration on mount (`preset`, `from`, `to`, `grouping`, `state`, `city`, `compare`, `tab`) + loop-guarded sync with `replace: true`. Defaults are not written to the URL so the bare `/admin/analytics` URL stays clean.

9. **No Copy-link button** when filters are active. **Fix:** added with clipboard + execCommand fallback.

10. **`<Tabs defaultValue="traffic">`** — tab was uncontrolled, ignored URL, couldn't deep-link. **Fix:** controlled via `activeTab` state which round-trips through `?tab=…`.

11. **Refresh button only refetched subscriptions.** The other queries (views, interactions, leads) were stale-but-cached. **Fix:** Refresh now calls `invalidateAnalyticsQueries()` AND `refetchSubscriptions()`, and shows a spinning icon while loading.

### P2 — a11y polish

12. **Reset / Refresh / Compare-toggle / Featured Refresh buttons** all got `aria-label` + (for the toggle) `aria-pressed`.

13. **Truncation banner** uses `role="alert" aria-live="polite"` so screen readers announce the truncation as it appears.

14. **Estimated-impressions banner** uses `role="status"` (informational, not critical).

15. **Error states** on all three components are `role="alert"` Cards / Alerts.

---

## Files changed

```
MODIFIED:
  src/pages/admin/AdminAnalytics.tsx
    — ANALYTICS_ROW_CAP constant + truncation detection + banner
    — typed FacilityJoin / AnalyticsEventRow / AnalyticsLeadRow
      replacing 7 `as any` casts on facility joins
    — URL-state hydration for preset/from/to/grouping/state/city/
      compare/tab + loop-guarded sync
    — Tabs now controlled (URL deep-link)
    — get-revenue-stats invoke checks data?.error
    — Removed dead selectedPlan / PLAN_OPTIONS UI + state
    — Copy-link button + aria-labels + Refresh now invalidates
      every analytics query (was subscriptions-only)
  src/components/admin/FeaturedAnalyticsDashboard.tsx
    — get-featured-facilities + 4 table queries now check errors
    — Estimated impressions disclosure: flag tracked through the
      query result; amber Alert surfaces when CTR is based on the
      50/day fallback instead of measured impression events
    — isError branch with Retry button
    — aria-label on Refresh
  src/components/admin/LeadFormAnalytics.tsx
    — isError branch with red error Card + Retry button
    — Genuinely-empty state ("No form events in this period")

NEW:
  docs/admin-analytics-hardening-2026-05-20.md
```

---

## Verification

- `npx tsc --noEmit` → clean
- `npx vitest run` → 128 passed, 5 skipped
- `npx vite build` → built successfully in ~33s
- Live-DB sanity: `provider_events` has 9,769 rows (well below the new 50,000 cap; previous 5,000 cap was actively truncating). All three tables (`provider_events`, `facilities`, `leads`) confirmed in the `supabase_realtime` publication (no realtime fix needed for this page).

---

## Behavioural guarantees

1. **No silent KPI drift.** Analytics queries now cap at 50,000 rows (~5 months of current traffic). If any query hits the cap, an amber banner explicitly tells the admin to narrow the range — replacing the prior silent truncation.
2. **No fake CTRs.** Featured analytics now distinguishes measured impressions from the 50/day fallback estimate and labels CTR accordingly.
3. **No silent edge-fn failures.** Every edge-fn invoke checks both transport `error` and `data?.error` payload.
4. **URL-state round-trips.** Bookmarking `/admin/analytics?preset=last7&state=California&tab=leads&compare=1` reopens the exact same filtered view on a different machine.
5. **Type-safe joins.** The 7 `as any` casts on `facilities` joins were replaced with typed shapes plus `?.` guards — null joins (orphan leads with no facility) no longer compute `"undefined-undefined"` map keys.
6. **Real error states.** All three analytics components have an isError branch with a Retry button. Admins see "Failed to load X: <reason>" instead of zeros across the KPI strip.
