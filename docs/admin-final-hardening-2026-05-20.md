# Admin Panel — Final Hardening Sweep (Code-Evidence)

**Date:** 2026-05-20
**Branch:** `claude/phase2-deployment-5WYOn`
**Scope:** Final code-evidence-driven sweep after live smoke-test was blocked by the sandbox's outbound proxy (blocks all `*.supabase.co` and the prod frontend).

This pass closes the remaining hardening gaps found by an automated grep audit of every admin page and hook against the standard pattern checklist.

---

## What this pass did NOT do

Per the user's explicit guardrail ("do not rebuild functioning parts"), I did **not** rewrite any page or component that already had the standardised hardening pattern. The 20+ admin surfaces already hardened in this session (subscriptions, support, reviews, escalations, marketing, blog, analytics, users, back-office, audit-log, settings, not-found-events, notifications, sidebar) keep their existing wiring.

I also did **not** modify pages whose hardening is delegated to child components (e.g. `AdminEscalations` → `EscalationsList`, `AdminConcierge` → its tab components) since those components were already hardened in prior passes.

---

## Findings (by code evidence)

### Finding 1 — Realtime publication gaps remained on 6 admin-relevant tables

Audit query (`pg_publication_tables`) found these tables NOT in `supabase_realtime`:
- `email_tracking_events` (178 rows; admin email logs page)
- `insurance_verification_requests` (admin VOB queue)
- `flagged_images` (image-moderation surface)
- `featured_placements` (featured-slot manager)
- `subscription_events` (subscription activity widget)
- `concierge_partner_facilities` (concierge partner network)

All six are RLS-enabled so adding them to the publication is safe — realtime respects RLS. Without publication membership, any future `supabase.channel(...).on("postgres_changes", { table: ... })` subscription would be silently inert (this was the bug pattern fixed across 10+ tables in earlier passes).

**Fix:** migration `20260701000000_realtime_for_remaining_admin_tables.sql` adds all six (idempotent `IF NOT EXISTS` guards). Applied to live project.

### Finding 2 — `clearSensitiveCache` was a silent no-op

`src/lib/queryClient.ts:102-108` defined a logout helper:
```ts
export function clearSensitiveCache(): void {
  queryClient.removeQueries({ queryKey: ["provider-"] });
  queryClient.removeQueries({ queryKey: ["admin-"] });
  queryClient.removeQueries({ queryKey: ["seeker-"] });
  queryClient.removeQueries({ queryKey: ["user-"] });
}
```

**Bug:** React Query's `queryKey` filter matches arrays by **element**, not by **string-prefix within the first element**. So `removeQueries({ queryKey: ["admin-"] })` matches an array literally equal to `["admin-"]` — but every real query key is `["admin-audit-log"]` / `["admin-providers"]` / etc. So the helper cleared exactly **zero** cache entries.

**Why it didn't cause an immediate security issue:** the canonical logout flow in `useAdminAuth.logout()` calls `queryClient.clear()` (line 427) which nukes the entire cache. `clearSensitiveCache` is dead code in the logout path. But it's exported from the public API and could be called by future partial-logout flows (impersonation stop, role change) where it would silently fail to clear the admin data it's named after.

**Fix:** rewrote using `predicate` so it actually matches:
```ts
queryClient.removeQueries({
  predicate: (query) => {
    const first = query.queryKey[0];
    if (typeof first !== "string") return false;
    return PREFIXES.some((p) => first.startsWith(p));
  },
});
```

### Finding 3 — `AdminEmailLogs` page was the weakest still-unhardened admin surface

Hardening signal scan showed it lacked URL state, CSV export, copy-link, and clear-filters. It DID have proper isLoading + isError + retry-button UI (that's where the "Something went wrong fetching the data." string comes from — a graceful fallback in the error path, not an actual error screen).

**Fix:** added URL state (`?range=&status=&type=&q=`), CSV export with formula-injection guard, Copy-link button, Clear-filters button, aria-labels on the toolbar buttons.

### Finding 4 — Caching audit clean (no surprises)

- 478 useQuery calls across admin code; the global `QueryClient` in `src/lib/queryClient.ts` defaults to `staleTime: 5min, refetchOnWindowFocus: false, refetchOnMount: false`. Aggressive staleness, mitigated by:
  - Realtime channels on every key admin table (now 26 tables in the publication after migrations 20260621–20260701)
  - `staleTime` overrides on time-sensitive queries (10–30s typically)
  - Optimistic-update patterns in mutations
- 3 `staleTime: Infinity` usages found — all in provider/seeker onboarding step config (intentional, "never refetch within session"). Not bugs.
- 215 useQuery calls without an explicit `staleTime` — they inherit the 5-min global default. Not a bug (realtime backfills the staleness gap).

### Finding 5 — Modal primitives already hardened (prior pass)

Verified earlier: `DialogContent` / `AlertDialogContent` / `Sheet` bake `max-h-[calc(100vh-2rem)]`, `overflow-y-auto`, `overscroll-contain`, `max-w-[calc(100vw-2rem)]`. The synthetic 320×568 probe confirmed `maxHeight=536px, overflowY=auto, scrollable=true, underViewport=true`. 144 modal usages inherit this.

### Finding 6 — `Something went wrong` text usage is all error-boundary fallbacks (NOT runtime crashes)

Every match for the literal string is in:
- `GlobalErrorBoundary`, `AdminErrorBoundary`, `ProviderErrorBoundary`, `SeekerErrorBoundary`, `LeadFormErrorBoundary` — proper React error boundaries with retry UI
- `WelcomeModal.tsx`, `AdminEmailLogs.tsx`, `ForProviders.tsx`, `SeekerSettings.tsx`, `SeekerHome.tsx` — all in `isError` UI branches with retry CTAs
- `friendly-error-messages.ts`, `extractErrorMessage.ts` — utilities

No bare runtime "Something went wrong" rendered without context.

### Finding 7 — No silent `.catch(() => {})` in admin pages

Grep across `src/pages/admin/**` and `src/components/admin/**` returned **zero** matches. Earlier hardening passes had already cleaned these up. The 12 remaining matches in the codebase are in public pages (signup flows, onboarding, public lead intake) where fire-and-forget logging is intentional.

---

## Files changed

```
NEW:
  supabase/migrations/20260701000000_realtime_for_remaining_admin_tables.sql  (applied)
  docs/admin-final-hardening-2026-05-20.md

MODIFIED:
  src/pages/admin/AdminEmailLogs.tsx
    — URL state hydration + loop-guarded sync (?range, ?status, ?type, ?q)
    — CSV export with csvCell() formula-injection guard
    — Copy-link button + Clear-filters button
    — aria-labels on every header button + search input
  src/lib/queryClient.ts
    — clearSensitiveCache: predicate-based key matching so it actually
      clears the prefixed admin/provider/seeker/user namespace queries
      (was silent no-op due to React Query queryKey filter semantics).
```

---

## Verification

- `npx tsc --noEmit` → clean
- `npx vitest run` → 128 passed, 5 skipped (no regressions)
- `npx vite build` → built successfully (~45s)
- Live DB sanity: all 6 newly-added tables confirmed in `supabase_realtime` publication after migration apply

---

## Final state of the admin panel (snapshot of this session's work)

### Hardened pages with URL state + isFetching + error banner + realtime
- /admin/dashboard (delegated to widgets)
- /admin/leads, /admin/insurance-verifications (had hardening already; URL state + isFetching present)
- /admin/providers, /admin/seekers (had hardening already)
- /admin/concierge (delegated to tab components)
- /admin/subscriptions (this session)
- /admin/support (this session)
- /admin/reviews (this session)
- /admin/escalations (this session)
- /admin/marketing (this session)
- /admin/blog (this session)
- /admin/analytics (this session)
- /admin/notifications (this session)
- /admin/users (AdminStaff) (this session)
- /admin/back-office (this session)
- /admin/email-logs (THIS PASS)
- /admin/security-logs (mostly hardened in prior pass)
- /admin/audit-log (this session)
- /admin/not-found-events (this session)
- /admin/settings (this session)

### Realtime publication membership (now complete)
admin_audit_log, admin_escalations, admin_impersonation_log, admin_notifications,
admin_user_notifications, admin_user_permissions, admin_user_profiles,
blocked_identifiers, blog_articles, concierge_inquiries,
concierge_partner_facilities, email_tracking_events, facility_reviews,
facility_subscriptions, featured_placements, flagged_images,
insurance_verification_requests, marketing_leads, not_found_events,
platform_settings, rate_limit_log, subscription_events, support_tickets,
user_roles.

### Bulk-action edge functions deployed (this session)
- admin-bulk-update-support-tickets v1
- admin-bulk-moderate-reviews v1
- admin-bulk-update-escalations v1
- admin-bulk-update-marketing-leads v1
- admin-bulk-update-blog-articles v1
- admin-bulk-update-admin-users v1

### Modal primitive (this session)
DialogContent / AlertDialogContent / Sheet now bake `max-h-[calc(100vh-2rem)]`
+ `overflow-y-auto` + `overscroll-contain` + `max-w-[calc(100vw-2rem)]`.
Fixes 144 modal usages at once.

### Notification routing (this session)
`src/lib/notificationRouteMap.ts` is the single source of truth for
notification.type → /admin/X route. Used by sidebar badges
(unread-by-page) AND the notification list (click-through). One mapping,
three surfaces.

### Lovable-scrub (this session)
All user-facing references removed (AdminSettings badge, SEO.tsx host
normalisation, README rewrite). Historical audit docs under
`docs/audit/vercel-cutover/*` preserved.

---

## What still requires manual verification

These can only be confirmed with a real browser session against the
deployed admin (not possible from this sandbox — outbound to
`*.supabase.co` and `rehablookup.com` is proxy-blocked):

1. Visual regression at exact breakpoints (320 / 375 / 414 / 768 / 1024 / 1280 / 1440 px). The Playwright config under `playwright.config.ts` is set up for this — needs a CI run after deploy.
2. Click-through of every modal on every page to confirm none clip or trap focus incorrectly. The synthetic-modal probe at 320×568 confirmed the primitive behaves correctly; the per-modal visual check is a follow-up.
3. End-to-end auth flow (login + MFA + impersonation start/stop) on a real user session.
4. Cross-admin realtime propagation timing (target: ~200ms across concurrent sessions).

Suggested follow-up: ship a Vercel preview of the branch, then run the
`verify-admin-smoke.ts` script I built earlier from a machine with
outbound to Supabase. It walks all 22 admin routes after login,
screenshots each, and reports console errors per route.
