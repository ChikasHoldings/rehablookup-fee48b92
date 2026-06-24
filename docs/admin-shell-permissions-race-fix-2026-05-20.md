# AdminShell — fix the "flashing access denied" race on cold load

**Date:** 2026-05-20
**Branch:** `claude/phase2-deployment-5WYOn`
**Symptom:** `/admin/subscriptions` (and any permission-gated admin page) briefly flashes "Access Denied" on cold load, occasionally followed by "Something went wrong" if a child component's render races the permission hydration.

---

> ## ⚠️ SUPERSEDED — read this first (updated 2026-06-24)
>
> The original fix below used an **optimistic (fail-open) render**: while
> permissions hydrate, `hasRouteAccess` defaulted to `true` and the page
> mounted. That is **no longer how the code works.** `AdminShell` now **fails
> closed** during hydration — it holds a loading state until permissions are
> ready, then renders `<Outlet/>` or `<AccessDenied/>`:
>
> ```ts
> const hasRouteAccess = permissionsReady && effectiveCanAccessRoute(location.pathname);
> // …render…
> {!permissionsReady ? <AdminPageLoading /> : hasRouteAccess ? <Outlet /> : <AccessDenied />}
> ```
>
> This still fixes the flash (a loading skeleton shows instead of AccessDenied),
> but never renders a permission-gated page before the guard has resolved.
>
> Relatedly, `useAdminAuth.canAccessRoute` is now **fail-closed for unmapped
> routes**: a route with no `routePermissionMap` entry is denied for non-super
> tiers (it previously fell through to "allow"). Every mounted `/admin` route
> must be mapped — enforced by `adminNavConfig.test.ts`.
>
> The "Fix" / "Why this is safe" sections below are kept for history but
> describe the older optimistic approach; treat them as superseded.

---

## Root cause

`useAdminAuth` does two things on mount:

1. **Restores `isAdmin: true` from localStorage** instantly (`getCachedAdminState` at lines 26-37) so the shell doesn't flash an auth-wall.
2. **Fires the network fetch** for the role + permissions + profile in parallel (`performAdminChecks`). Takes ~1s.

Per M7, **only the `isAdmin` boolean is cached** — role and super-admin flags are intentionally NOT cached because they leak the menu structure to a tampering user.

Between (1) and (2):

- `isAdmin = true` (cached)
- `permissions = {}` (empty initial state)
- `isInitialized = true` (because we have a cache hit)
- `isSuperAdmin = false` (always starts false; populates on network)

When `AdminShell` evaluates `canAccessRoute("/admin/subscriptions")`:

```ts
if (isSuperAdmin) return true;          // false during boot
let permissionKey = "subscriptions";    // resolved from routePermissionMap
if (!permissionKey || permissionKey === "dashboard" || ...) return true;
return permissions[permissionKey] === true;   // permissions["subscriptions"] === undefined → false
```

→ `hasRouteAccess = false` → **`<AccessDenied />` renders** for ~1s until permissions load → then `hasRouteAccess` flips to true → `<Outlet />` mounts the page.

If anything in the AccessDenied / Outlet transition triggers an uncaught error (e.g. a child component's lazy lifecycle interacts with the brief unmount/remount), the `AdminErrorBoundary` shows "Something went wrong".

---

## Fix

In `AdminShell.tsx`, gate `AccessDenied` on a `permissionsReady` predicate that accounts for the cache-hit / network-load race:

```ts
const permissionsReady =
  effectiveIsSuperAdmin ||
  isImpersonating ||
  (isInitialized && Object.keys(permissions || {}).length > 0);

const hasRouteAccess = permissionsReady
  ? effectiveCanAccessRoute(location.pathname)
  : true; // optimistic — render the page while permissions hydrate;
          // RLS still gates every data fetch server-side.
```

**Behavioural effects:**

- **Super-admins:** unchanged (always pass).
- **Impersonation:** unchanged (impersonation injects its own permissions map; `permissionsReady = true` skips the gate).
- **Cache-hit cold load (the bug):** `permissionsReady = false` while `permissions = {}` → `hasRouteAccess = true` optimistically → page mounts → permissions populate → on the next render the real `canAccessRoute()` runs → if the user actually lacks permission they see `AccessDenied`, otherwise the page stays mounted. No more flash.
- **No cache (fresh login):** `isAdmin = null` initially → `if (!isAdmin) return null` at line 83 short-circuits the entire shell. Once permissions load, `permissionsReady = true` → gate evaluates normally.
- **Actual permission deny:** `isInitialized = true`, `permissions` populated, `canAccessRoute()` returns false → `AccessDenied` renders as before.

**Why this is safe:**

- RLS policies on every data-fetching edge function + Postgres query are the canonical security boundary. Server-side authorization is unchanged.
- The optimistic-render window is bounded by the ~1s network fetch. It only opens for users whose `isAdmin` flag was cached (i.e. they previously logged in successfully).
- The menu structure is still gated by the same `effectiveHasPermission` callback the cached path uses — `AdminSidebar` filters by `permissions` which starts empty, so menu items appear progressively as permissions load (same behavior as before).

---

## Verification

- `npx tsc --noEmit` → clean
- `npx vitest run` → 128 passed, 5 skipped
- Manual: open `/admin/subscriptions` on a returning admin session → no Access Denied flash; page renders directly to skeleton → loaded state.

---

## Files changed

```
src/components/admin/AdminShell.tsx                       — destructure `permissions`, add permissionsReady gate
docs/admin-shell-permissions-race-fix-2026-05-20.md       — this doc
```
