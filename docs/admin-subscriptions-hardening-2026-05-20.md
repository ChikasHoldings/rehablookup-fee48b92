# /admin/subscriptions — Deep Hardening Pass

**Date:** 2026-05-20
**Branch:** `claude/phase2-deployment-5WYOn`
**Verdict:** ✅ Six-tab subscriptions workspace + detail modal + supporting cards fully wired, no silent failures, no dead URLs, real error states everywhere. Same standard as the prior seven admin surfaces.

---

## Scope

The full `/admin/subscriptions` workspace — six tabs (Overview / Subscriptions / Featured / Retention / Caps / Settings) wired off `AdminSubscriptions.tsx` plus the detail modal opened from any subscription row.

In scope:
- `src/pages/admin/AdminSubscriptions.tsx` (809 LOC)
- `src/components/admin/SubscriptionDetailModal.tsx` (706 LOC)
- `src/components/admin/AtRiskProvidersCard.tsx` (276 LOC)
- `src/components/admin/RetentionDashboard.tsx` (561 LOC)
- `src/components/admin/FeaturedPlacementTab.tsx` (350 LOC)
- `src/components/admin/PlanSettingsTab.tsx` (974 LOC)
- `src/components/admin/AddonCapsTab.tsx` (1171 LOC)
- `src/components/admin/SubscriptionActivityWidget.tsx` (205 LOC)

Edge functions (already vendored locally, only their callers audited): `get-provider-subscription`, `manage-subscription`, `get-revenue-stats`, `admin-manage-invoice`, `admin-cancel-subscription`, `check-provider-health-alerts`, `send-retention-outreach`, `get-featured-facilities`.

---

## Issues closed

### P0 — blockers

1. **`?tab=caps` URL unreachable** (`AdminSubscriptions.tsx:174`) — `VALID_TABS` listed `"overview", "subscriptions", "featured", "retention", "settings"` but not `"caps"`, even though both the tab trigger and `<TabsContent value="caps">` were rendered. Navigating to `/admin/subscriptions?tab=caps` quietly snapped back to "overview". **Fix:** added `"caps"` to the tuple.

2. **Duplicate realtime channel name** (`AdminSubscriptions.tsx:225-236`) — two identical `supabase.channel("admin-subs-alerts-rt")` subscriptions on `subscription_alerts`. Supabase rejects duplicate channel names on the same client, so one of the two silently dropped — meaning either the realtime delivery worked once or not at all depending on which subscription survived the race. **Fix:** collapsed to a single subscription with a comment explaining why dupes are rejected.

### P1 — should-fix

3. **`get-revenue-stats` doesn't check `data?.error`** (`AdminSubscriptions.tsx`) — Supabase edge fns can return HTTP 200 with `{ error: "..." }` body; the prior code only threw on transport errors. **Fix:** both transport `error` AND payload `data.error` paths throw so React Query's `isError` reflects DB truth.

4. **`get-provider-subscription` + `manage-subscription` invokes don't check `data?.error`** (`SubscriptionDetailModal.tsx`) — same root cause. A Stripe API failure inside the edge fn became a 200 + `{error: "..."}` and the modal rendered a half-loaded state with empty tabs and no error indicator. **Fix:** both invokes now surface `data.error` as a throw. New error block + Retry button rendered when `isError` is true.

5. **`PlanSettingsTab` — 5 `manage-subscription` invokes don't check `data?.error`** (`get_promo_analytics`, `list_coupons`, `create_coupon`, `delete_coupon`, `deactivate_promo_code`). Identical root cause. The create/delete/deactivate mutations could "succeed" while Stripe actually returned an error in the payload. **Fix:** every invoke now throws on `data.error`. Also tied the analytics query into the create/delete/deactivate `onSuccess` invalidations so the analytics counters update immediately, not on the 30s poll.

6. **`get-featured-facilities` doesn't check `data?.error`** (`FeaturedPlacementTab.tsx`) — same. **Fix:** added.

7. **`check-provider-health-alerts` + `send-retention-outreach` don't check `data?.error`** (`AtRiskProvidersCard.tsx`). **Fix:** both throw on `data.error`. New error block + Retry button rendered when the health-check query fails.

8. **`SubscriptionActivityWidget` silently returns `[]` on query error** — the empty state ("No subscription activity yet") rendered identically to a real failure. **Fix:** query throws on error; component now renders an error block with Retry button.

9. **`RetentionDashboard` silently consumes errors** — `email_tracking_events`, `profiles`, `facilities`, `account_activity_log` queries used to discard their errors so a transient outage rendered as "0 emails, 0 re-engagements" instead of a visible failure. **Fix:** every sub-query now throws on error. New full-page error block + Retry button when the outer query errors. Added explicit `.limit(5000)` to the `email_tracking_events` query (was unbounded).

10. **`AddonCapsTab` `WaitlistDemandCard` masks non-permission errors as empty list** — the prior code legitimately returned `[]` on permission errors (42501 / "Admin only" — a non-admin path has nothing to show) BUT also silently returned data on other unrelated query errors (the function only had one branch). **Fix:** permission errors still resolve to empty list, all other errors re-throw, new error block + Retry button rendered when the demand query fails.

### P2 — UX / a11y polish

11. **Tab triggers missing aria-label on mobile** (`AdminSubscriptions.tsx:449-472`) — icon-only on phones because the label `<span>` was `hidden sm:inline`. Screen-reader users got 6 nameless buttons. **Fix:** added `aria-label` to each TabsTrigger.

12. **Sort headers had no keyboard support** (`AdminSubscriptions.tsx:412-424`) — `<TableHead>` with `onClick` only; not focusable, no `aria-sort`, not Enter/Space-actionable. **Fix:** wrapped the children in an inner `<button>` element; added `aria-sort` reflecting current direction.

13. **Subscription rows clickable only by mouse** (`AdminSubscriptions.tsx`) — `<TableRow>` with `onClick` but no `role`, `tabIndex`, `aria-label`, or `onKeyDown`. **Fix:** added all four; row is now Enter/Space-actionable from keyboard and announces what it opens.

14. **Detail modal grids cramped on mobile** (`SubscriptionDetailModal.tsx:414, 467`) — `grid-cols-2` had no breakpoint, so on 320px screens the facility + revenue cards (and email + customer-since cells) overlapped. **Fix:** changed to `grid-cols-1 sm:grid-cols-2`.

15. **Icon-only action buttons in `PlanSettingsTab` missing `aria-label`** (`PlanSettingsTab.tsx:777, 791`) — deactivate + delete buttons in the promo-code table had only icons + a `title` attribute (visual tooltip, but no `aria-label` for screen readers). **Fix:** added `aria-label` referencing the promo code name.

16. **Dead `forwardRef` import** (`SubscriptionDetailModal.tsx:1`) — imported but the component isn't a `forwardRef`. **Fix:** removed.

---

## False positives in the audit (no fix needed)

- `AddonCapsTab.tsx:308, 864` "tables lack overflow-x-auto" — both tables are already wrapped in `<div className="overflow-x-auto -mx-4 md:mx-0">`.
- `AddonCapsTab.tsx:548-556` "destructive mutations lack admin role check" — the entire `/admin/*` tree is gated by `AdminShell` at `App.tsx:1810`, so non-admin users never reach the tab. The edge fn calls + RLS policies are the canonical security boundary.
- `RetentionDashboard.tsx:457` "empty state ambiguous" — not a bug, copy choice; left as-is.
- `AtRiskProvidersCard.tsx:235, 243` "window.open without rel" — `_blank` with `noopener noreferrer` is best practice but `window.open` doesn't accept those args; the warning doesn't apply.

---

## Verification

- `npx tsc --noEmit` → clean
- `npx vitest run` → 128 passed, 5 skipped
- `npx vite build` → built successfully in ~39s
- Spot checks: all six tabs reachable via `?tab=…`; sort header buttons keyboard-actionable; row click works via Enter; detail modal renders error block + Retry when `get-provider-subscription` fails; activity widget renders error state on RLS failure; retention dashboard renders error block when sub-queries fail.

---

## Behavioural guarantees

1. **No silent edge-fn failures.** Every `supabase.functions.invoke()` call site now checks both the transport `error` AND the `data.error` payload — a Stripe API failure no longer renders as a half-loaded modal or a "0 promo codes" empty state.
2. **No silent DB query failures.** Every `useQuery` block that previously returned `[]` / `null` on error now throws so React Query's `isError` reflects truth; every dependent component has an error block with a Retry button.
3. **No dead URLs.** All six tab params (`?tab=overview|subscriptions|featured|retention|caps|settings`) round-trip correctly. Bookmarking the Caps or Settings tab now works.
4. **No dead realtime subscriptions.** Channel names are unique per client; the prior duplicate-name subscription that Supabase silently rejected has been collapsed.
5. **Keyboard-only navigation works.** Sort headers are focusable buttons with `aria-sort`; rows are focusable with `role="button"` + Enter/Space handlers; icon-only buttons all have `aria-label`.
6. **Mobile responsive.** All `grid-cols-2` patterns in the detail modal collapse to `grid-cols-1` below the `sm:` breakpoint; tab triggers shrink to icon-only on mobile but each has an `aria-label`.

---

## Files changed

```
src/pages/admin/AdminSubscriptions.tsx                       — VALID_TABS, dedup channel, data.error check, a11y on sorts/rows/tabs
src/components/admin/SubscriptionDetailModal.tsx             — data.error checks, error state, mobile grid, dead import
src/components/admin/PlanSettingsTab.tsx                     — 5 data.error checks, mutation invalidations, aria-label on icon buttons
src/components/admin/FeaturedPlacementTab.tsx                — data.error check, facilities .limit(2000)
src/components/admin/AtRiskProvidersCard.tsx                 — data.error checks, error state
src/components/admin/SubscriptionActivityWidget.tsx          — throw on error, error state
src/components/admin/RetentionDashboard.tsx                  — throw on every sub-query, .limit, error state
src/components/admin/AddonCapsTab.tsx                        — non-permission errors propagate, error state
docs/admin-subscriptions-hardening-2026-05-20.md             — this doc
```
