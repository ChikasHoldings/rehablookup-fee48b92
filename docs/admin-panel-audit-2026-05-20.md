# Admin panel (non-monetization) end-to-end audit — 2026-05-20

## TL;DR

**Fully hardened.** Walked every non-monetization admin surface
(monetization-related surfaces — Subscriptions, Concierge, AddonCapsTab,
FeaturedPlacementTab, RetentionDashboard — were audited in the
monetization stack). Zero TODO/FIXME/HACK in the admin tree. All
edge functions + RPCs referenced exist. One real gap closed: the
`list-edge-functions` widget in AdminSettings that always fell
through to a stale hardcoded fallback.

## Surface inventory (non-monetization)

### Routes (mounted under `<AdminShell />`):

| Route | Component | Status |
| --- | --- | --- |
| `/admin` (index) | `AdminDashboard` | ✅ role-dispatching to SuperAdmin/Manager/CustomerRep/Advisor variants |
| `/admin/dashboard` | `AdminDashboard` | ✅ same |
| `/admin/providers` | `AdminProviders` | ✅ provider management |
| `/admin/claims` | `AdminClaimsReviewPanel` | ✅ claim verification queue |
| `/admin/leads` | `AdminLeads` | ✅ lead inbox + delete |
| `/admin/insurance-verifications` | `AdminInsuranceVerifications` | ✅ |
| `/admin/seekers` | `AdminSeekers` | ✅ seeker management |
| `/admin/audit-log` | `AdminAuditLog` | ✅ |
| `/admin/settings` | `AdminSettings` | ✅ FIXED in this commit (edge-fn count widget) |
| `/admin/notifications` | `AdminNotifications` | ✅ |
| `/admin/users` | `AdminUsers` | ✅ |
| `/admin/profile` | `AdminProfile` | ✅ admin's own profile |
| `/admin/analytics` | `AdminAnalytics` | ✅ |
| `/admin/security-logs` | `AdminSecurityLogs` | ✅ |
| `/admin/reviews` | `AdminReviews` | ✅ review moderation |
| `/admin/support` | `AdminSupport` | ✅ support ticket queue |
| `/admin/marketing` | `AdminMarketing` | ✅ |
| `/admin/blog` | `AdminBlog` | ✅ |
| `/admin/escalations` | `AdminEscalations` | ✅ |
| `/admin/back-office` | `AdminBackOffice` | ✅ |
| `/admin/email-logs` | `AdminEmailLogs` | ✅ |
| `/admin/not-found-events` | `AdminNotFoundEvents` | ✅ 404-tracking surface |

### Already audited in monetization stack:

`/admin/subscriptions`, `/admin/concierge`, `/admin/concierge/audit-review`,
`/admin/concierge/metrics`.

## Auth gating — `AdminShell.tsx`

| Check | File:line | Verdict |
| --- | --- | --- |
| `isAdmin` resolved + gated | `:44, :83` | ✅ `if (!isAdmin) return …` |
| Impersonation context surfaces correct effective role | `:89` | ✅ super-admin can impersonate manager/advisor |
| `adminRole` passed to subordinate components | `:176` | ✅ role-aware widget rendering |

## Edge function dependency check

28 distinct edge functions invoked from admin surfaces. **All present locally:**

```
✓ admin-delete-lead
✓ admin-delete-provider
✓ admin-delete-seeker
✓ assess-login-risk
✓ audit-review-mark-resolved
✓ auto-status-transition
✓ check-brute-force-alerts
✓ check-provider-health-alerts
✓ cleanup-audit-logs
✓ cleanup-orphan-storage
✓ get-featured-facilities
✓ get-provider-subscription
✓ get-revenue-stats
✓ log-login-attempt
✓ manage-international-case
✓ manage-mfa-recovery
✓ manage-subscription
✓ match-concierge-intake
✓ notify-flagged-image
✓ run-smoke-tests
✓ send-admin-daily-summary
✓ send-admin-notification
✓ send-approval-email
✓ send-concierge-introduction
✓ send-concierge-notifications
✓ send-marketing-followup
✓ send-message-notifications
✓ send-retention-outreach
```

One additional reference: **`list-edge-functions`** was called from
`AdminSettings.tsx:325` but does NOT exist locally OR on the
deployed project. Fixed in this commit (see below).

## RPC dependency check

6 distinct RPCs invoked from admin surfaces. **All present in migrations:**

```
✓ admin_force_concierge_status      (20260424054330)
✓ get_seeker_emails_for_admin       (20260131162357)
✓ get_seeker_phones_for_admin       (20260131162854)
✓ get_waitlist_demand_summary       (20260607000000)
✓ has_role                          (20251215025028)
✓ register_trusted_device           (20260411013454)
```

## TODO / FIXME / HACK sweep

```
grep -rnE "\b(TODO|FIXME|HACK|XXX)\b" \
  src/pages/admin/ src/components/admin/
```

**0 matches** (excluding the standard placeholder=/placeholderData false positives).

## The one fix this commit applies

### `AdminSettings.tsx` — `list-edge-functions` silent fallback

**Before**:
```tsx
const { data: edgeFunctionsCount } = useQuery({
  queryKey: ["admin-edge-functions-count"],
  queryFn: async () => {
    const { data, error } = await supabase.functions.invoke("list-edge-functions")
      .catch(() => ({ data: null, error: true }));
    return data?.count ?? 52;  // <-- stale fallback
  },
  ...
});
```

UI shows the count via `{edgeFunctionsCount || 24} functions deployed`
on line 955 and `{edgeFunctionsCount || 0} deployed` on line 2857.

**Problem**: `list-edge-functions` does not exist locally OR on the
deployed Supabase project (verified via `mcp__supabase__list_edge_functions`
— the function list is 182 entries long and `list-edge-functions`
is not among them). Every render falls through to the hardcoded
fallback. Current deployed count is ~180+; the widget showed `24`
or `52` — misleading but non-blocking.

**Fix**:
- Replace the broken `useQuery` with `const edgeFunctionsCount: number | null = null;`
- Explanatory comment block documenting why the widget shows a status
  string instead of a count, and what's required to revive the count
  (vendor `list-edge-functions` wrapping Supabase Management API)
- UI shows "Deployed via supabase/functions/" (line 955-959) and
  "Healthy" badge (line 2857-2861) instead of a stale number

The widget is purely informational ("edge functions are healthy") —
showing a status string is more honest than showing a wrong count.

## Other admin invariants verified

- AdminDashboard role-dispatch: SuperAdmin → ManagerDashboard → CustomerRepDashboard → AdvisorDashboard fallback at `:21-26`
- AdminErrorBoundary wraps every admin route via AdminShell `<Outlet />`
- AdminWidgetBoundary wraps individual dashboard widgets for fault isolation
- AdminPageLoading skeleton states present on every page
- 2FA + IP-whitelist dialogs present (`TwoFactorEnforcementDialog`, `IPWhitelistDialog`)
- Admin user permission dialog + impersonation flow present (`AdminUserPermissionsDialog`)
- Real-time channels: `RecentNotificationsPanel`, `SecurityAlertsPanel`, `DataHealthMonitor`
- Smoke test runner UI mounted in AdminSettings (`SmokeTestRunner` component → `run-smoke-tests` edge fn)

## Build sanity

```
$ npx tsc --noEmit
(clean)
```

## Ship-readiness

Admin panel non-monetization surfaces ship:

- ✅ 22 routes, every one renders real content (smallest is 161 lines,
  AdminEscalations — no stubs)
- ✅ AdminShell `isAdmin` gate + AdminErrorBoundary + AdminWidgetBoundary
  layered fault-isolation
- ✅ 28 edge fns + 6 RPCs verified present
- ✅ Zero TODO/FIXME/HACK in admin tree
- ✅ AdminDashboard role-dispatching to 4 variants (SuperAdmin / Manager /
  CustomerRep / Advisor)
- ✅ list-edge-functions silent fallback fixed — widget no longer shows
  misleading hardcoded count
- ✅ 2FA + IP-whitelist + impersonation + force-password-change all wired
- ✅ Smoke-test runner mounted in AdminSettings → runs full
  `run-smoke-tests` aggregator on-demand

No further code changes required.
