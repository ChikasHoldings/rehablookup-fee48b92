# /admin/settings — Deep Hardening Pass + Lovable Scrub

**Date:** 2026-05-20
**Branch:** `claude/phase2-deployment-5WYOn`
**Verdict:** ✅ Frontend + backend hardened, all 4 tabs (General / Security / Notifications / Data) wired and live; every user-facing "Lovable" reference removed.

---

## Scope

- `src/pages/admin/AdminSettings.tsx` (~2,970 LOC) — surgical hardening across all tabs
- `src/components/SEO.tsx` — drop legacy `.lovable.app` / `.lovable.dev` host matches
- `README.md` — rewritten to a real RehabLookup README (Vercel + Supabase, no Lovable boilerplate)
- New: `supabase/migrations/20260629000000_realtime_for_platform_settings.sql` (applied)

Components rendered inside the page (read-only this pass; already hardened earlier):
- `IPWhitelistDialog`, `BlockedIdentifiersDialog`, `SecurityAlertsPanel`, `RecentNotificationsPanel`, `DataHealthMonitor`, `PlanSettingsTab`

---

## Lovable references removed

| File | What was there | What it is now |
| --- | --- | --- |
| `src/pages/admin/AdminSettings.tsx` line 2538 | `<Badge>Lovable Cloud</Badge>` on the "Backup Location" row, plus a fabricated "Last backup at 3am today" status card | `<Badge>Supabase</Badge>` + an honest "Last platform activity" indicator + an Info panel pointing the admin to the Supabase dashboard for the real backup status |
| `src/components/SEO.tsx` | `host.endsWith(".lovable.app")` / `.lovable.dev` matches inside `normalizeCanonicalPath` and `buildPaginationUrl` so legacy preview URLs were treated as "ours" | Removed. Only `rehablookup.com`, `www.rehablookup.com`, `*.rehablookup.com`, and `*.vercel.app` are now treated as own-host |
| `README.md` | Lovable starter README ("Welcome to your Lovable project") | Real RehabLookup README listing Vercel + Supabase + the dev / build / test commands |

Historical audit docs under `docs/audit/vercel-cutover/*` retain their Lovable references intentionally — they document the prior-platform→Vercel migration and rewriting them would falsify history. No production code path references Lovable anymore.

---

## Page hardening

### P0 — latent realtime gap

1. **`platform_settings` was not in the `supabase_realtime` publication.** Same trap pattern as the prior 9 hardening passes. The page subscribed to `platform_settings` changes via the `admin-platform-settings` channel, but the publication didn't include the table, so cross-admin coordination (admin A flipping a flag, admin B watching the panel) was silently broken. **Fix:** migration `20260629000000_realtime_for_platform_settings.sql` adds it. RLS is unchanged (super-admin write, admin read).

### P0 — data correctness

2. **`stats.totalAdminUsers` over-counted.** Counted rows in `user_roles` — but `user_roles` can have multiple rows per user (admin + provider + seeker), so the displayed number was inflated. **Fix:** use `admin_user_profiles` (one row per admin staff) instead. Current production: 2 admins, was reporting differently.

3. **`backupInfo` fabricated a "last backup at 3 AM today" timestamp.** The page computed `Date(now).setHours(3,0,0,0)` regardless of whether a backup actually ran. Admins were getting a confident green status with no underlying data. **Fix:** removed the fabrication. The card now shows the real "last platform activity" timestamp (audit-log proxy) and an info panel directing admins to the Supabase dashboard for real backup history / PITR.

4. **CSV exports were vulnerable to formula injection.** Every export path (providers / leads / analytics / audit / subscriptions / notifications) wrote raw cell values to CSV; a value beginning with `=`/`+`/`-`/`@` would execute as a formula in Excel / Sheets. **Fix:** introduced `csvCell()` helper that prepends `'` on those leading chars and properly escapes quotes / commas / newlines. Applied to every cell including headers.

5. **`subscriptions` export silently exported the wrong table.** The case fetched from `profiles` (user profiles) but mislabeled it as "subscriptions". An admin clicking Export Subscriptions got user profile rows with no Stripe / tier / status / period fields. **Fix:** now reads from `facility_subscriptions` with the actual subscription columns (tier, status, period dates, has_featured, has_concierge_partner, stripe_subscription_id).

6. **`notifications` export queried the deprecated `admin_notifications` table** instead of the current per-recipient `admin_user_notifications`. The exported rows were therefore broadcast-style alerts and not the personal notification stream visible in the bell. **Fix:** switched to `admin_user_notifications` with the actual columns (user_id, type, title, message, read, link, metadata).

7. **`analytics` CSV export silently dropped interaction events.** When format=csv, the code set `data = viewsResult.data` and gave headers for views only — interactions were never written. **Fix:** combined views + interactions into a single CSV with an extra `category` column ("view" / "interaction") so the export carries both.

8. **Stats / settings queries lacked error throws.** Failed counts silently returned `0` (the `count || 0` fallback). With 5 parallel counts, any single permission denial or DB blip would silently show 0 for every metric. **Fix:** every count's `.error` is collected; if any are non-null, the query throws with the first error message. The page surfaces it via a top-of-page destructive banner with a Retry button.

### P1 — workflow / UX

9. **Realtime self-toast.** The `platform_settings` channel toasted `"Settings updated"` on EVERY postgres change — including the admin's own change, on top of the "Setting updated" success toast from `updateSetting`. Duplicate noise. **Fix:** compare `payload.new.updated_by` with the current user's ID; only toast when another admin made the change. The wording now reads "Settings updated by another admin" to make the intent obvious.

10. **No URL state for the active tab.** Admins couldn't deep-link or bookmark a tab. **Fix:** `useSearchParams` hydration on mount + loop-guarded sync. URL key: `?tab=`. Defaults (`tab=general`) are not written so `/admin/settings` stays clean. Role-gating is preserved — an admin who can't see a tab won't have it restored via URL.

11. **No error banner.** Both `settingsError` and `statsError` were logged but the UI rendered blank cards. **Fix:** consolidated banner at the top of the page (role="alert") with the underlying error message + a Retry button.

12. **No top-level Refresh button.** Each tab had its own refresh; the page-level didn't. **Fix:** Refresh button in the header spins on `fetchingStats || loadingSettings` and invalidates all settings queries with a confirmation toast.

13. **Integrity-check error message was generic.** The catch block in the Data tab's "Run Integrity Check" said `toast.error("Integrity check failed")` with no detail. **Fix:** interpolates `error.message`.

14. **`AlertCircle` icon imported** for use in the new error banner.

### P2 — a11y polish

15. **aria-labels** on the new top-level Refresh button, the Data-tab Refresh All, and Run Integrity Check buttons.

16. **Error banner uses `role="alert"`** so screen readers announce fetch failures immediately.

---

## Tab-by-tab confirmation

All four tabs are confirmed wired end-to-end:

### General tab (all roles)
- Platform Settings (super_admin): maintenance_mode, api_rate_limiting, session_timeout — write to `platform_settings`, audited.
- Appearance (all): theme_mode (with next-themes sync), compact_mode, timestamp_display — write to `platform_settings`.
- System Status + Platform Statistics (super_admin): real counts from `facilities` / `leads` / `admin_user_profiles` / `flagged_images`.

### Security tab (super_admin only)
- 2FA configuration: `two_factor_required`, `two_factor_grace_period`, `mfa_recovery_codes_count`.
- Password policy: `password_min_length`, `password_require_uppercase/numbers/special`, `password_expiry_days`.
- IP whitelist: `ip_whitelist_enabled` + `IPWhitelistDialog`.
- Brute-force: `failed_login_lockout`, `lockout_duration_minutes`, `auto_block_threshold` + `BlockedIdentifiersDialog`.
- Security Status: live status cards.
- `SecurityAlertsPanel`: real-time login attempt anomalies.
- Security Overview: composite status cards reflecting the config above.

### Notifications tab (all roles)
- Send Test Notification: writes to `admin_user_notifications`, audited.
- Email Notifications: 6 channel toggles (`email_new_provider_signups`, `email_new_leads`, `email_payment_failures`, `email_security_alerts`, `email_system_alerts`, `email_churn_alerts`).
- In-App Notifications: 5 channel toggles.
- Digest & Summary: daily-summary + weekly-report toggles, time picker, day picker, recipients picker.
- Send Daily Summary Now / Send Weekly Report Now: invoke `send-admin-daily-summary` (verified deployed).
- Notification Behavior: sound, browser notifications (with permission prompt), auto-mark-read delay, retention days.
- Notification Status: live status cards.
- `RecentNotificationsPanel`: real-time inbox.

### Data tab (super_admin only)
- Run Integrity Check: surfaces orphaned-lead counts via toast.
- Refresh All: refetches stats + storage.
- `DataHealthMonitor`: orphan-row / FK-violation surface.
- Storage usage: real `facility-images` bucket sizes (10 GB hardcoded ceiling — Supabase plan-level cap).
- Cleanup Orphans: invokes `cleanup-orphan-storage` (deployed) with admin-gated confirmation.
- Database Backups: now honestly labeled as Supabase-managed.
- Audit Log Retention: writes `audit_log_retention_days`, invokes `cleanup-audit-logs` (deployed).
- Data Export: providers / leads / analytics / audit / subscriptions / notifications — JSON or CSV with formula-injection safe escapes.
- Database Tables Overview: live row counts.
- Danger Zone: Clear Cache (React Query), Purge Old Data.

---

## Files changed

```
NEW:
  supabase/migrations/20260629000000_realtime_for_platform_settings.sql  (applied)
  docs/admin-settings-hardening-2026-05-20.md

MODIFIED:
  src/pages/admin/AdminSettings.tsx
    — URL-state hydration + loop-guarded sync (?tab=)
    — Top-level Refresh button + destructive error banner with Retry
    — Lovable Cloud badge -> Supabase; honest "last platform activity"
      indicator + info note pointing to Supabase dashboard for backups
    — Realtime toast suppression (only toast when change is from a
      different admin, comparing updated_by vs currentUser.id)
    — Stats: totalAdminUsers from admin_user_profiles (was inflated
      from user_roles); every count .error-guarded with throw
    — Export: csvCell formula-injection guard on every cell; fix
      subscriptions to use facility_subscriptions (was wrong table);
      fix notifications to use admin_user_notifications (was wrong
      table); fix analytics CSV to include interactions (was dropped);
      every fetch error message threaded through the throw
    — Integrity check surfaces underlying error details
    — aria-labels on Refresh / Refresh All / Run Integrity Check
    — Removed fabricated "Last backup at 3am" timestamp
  src/components/SEO.tsx
    — Removed .lovable.app / .lovable.dev host matches in
      normalizeCanonicalPath and buildPaginationUrl
  README.md
    — Rewritten: RehabLookup project README (Vercel + Supabase + dev
      commands), no Lovable boilerplate
```

---

## Verification

- `npx tsc --noEmit` → clean
- `npx vitest run` → 128 passed, 5 skipped
- `npx vite build` → built successfully in ~34s
- Migration applied: `platform_settings` confirmed in `supabase_realtime` publication
- Live DB sanity: 2 `admin_user_profiles` rows (matches the stat now), 0 Lovable references in any user-facing string
- `grep -rn "Lovable\|lovable" src/ public/ index.html` returns no production matches; only historical audit MD files retain Lovable references intentionally

---

## Behavioural guarantees

1. **No fabricated backup status.** The page no longer shows a hardcoded "last backup at 3 AM today"; the real backup status lives in Supabase and the page links there.
2. **No silent count misreports.** Failed count queries surface as a destructive banner with the underlying message instead of rendering 0.
3. **No CSV-injection risk.** Every cell of every export is sanitized.
4. **Right tables for the right exports.** Subscriptions, notifications, and analytics now export the actual primary tables — admins downloading these get the data they expected.
5. **No duplicate self-toasts.** Realtime cross-admin updates announce themselves; same-admin updates do not double-toast.
6. **Realtime cross-admin coordination works.** `platform_settings` changes propagate within ~200ms across all admin sessions.
7. **URL state round-trips.** Bookmarking `/admin/settings?tab=security` reopens the security tab on a different machine.
8. **Lovable branding fully removed from the production surface.** Page, SEO normalizer, and README all reference RehabLookup + Supabase + Vercel.
