# /admin/back-office — Deep Hardening Pass

**Date:** 2026-05-20
**Branch:** `claude/phase2-deployment-5WYOn`
**Verdict:** ✅ Frontend + backend complete, mobile-responsive, fully hardened. Same standard as the prior 15 admin surfaces.

---

## Scope

- `src/pages/admin/AdminBackOffice.tsx` (full rewire)
- `src/hooks/useImpersonation.ts` (error-propagation hardening)
- `src/components/admin/SmokeTestRunner.tsx` (read-only — already clean)
- `src/components/admin/escalations/EscalationsList.tsx` (read-only — hardened in escalations pass; now scroll-capped here)
- New: `supabase/migrations/20260626000000_realtime_for_back_office_logs.sql` (applied)

The Back Office page is read-mostly + privileged overrides. No bulk edge function is needed because every action is one-row-at-a-time (reassign one case, force-status one case, view-as one staff member). The hardening focuses on **error propagation**, **realtime correctness**, **audit completeness**, and **URL deep-linking**.

---

## Issues closed

### P0 — silent failures

1. **`useImpersonation.startImpersonation` swallowed the audit-insert error.** A `try { ... } catch (err) { console.error(...) }` wrapped the `admin_impersonation_log` insert. If RLS denied the insert (e.g. caller wasn't really a super admin), the function STILL set `sessionStorage` and flipped `setImpersonating(target)` — leaving the UI in impersonation mode with no audit row written. **Fix:** removed the swallow; `startImpersonation` now `throw new Error(error.message)` on insert failure, and `sessionStorage`/state only mutate AFTER the insert succeeds. Combined with #2, this means impersonation simply doesn't begin if the audit row can't be written.

2. **`handleImpersonate` swallowed permissions-fetch errors and ignored `startImpersonation` rejections.** Both the `.error` from `admin_user_permissions` and any throw from `startImpersonation` were dropped. **Fix:** explicit error checks on both; both surface via `toast.error("Failed to start impersonation: <reason>")`.

3. **`reassignMutation` swallowed errors on the 2 follow-up writes.** The mutation updated `concierge_inquiries.assigned_advisor_id` with an optimistic lock, then awaited `concierge_case_events.insert(...)` and `admin_audit_log.insert(...)` WITHOUT checking either `.error`. A half-state outcome (DB updated, but timeline or audit missing) was silently treated as success. **Fix:** both insert errors now throw with the message `"Case reassigned but timeline event failed to write: <reason>"` / `"...but audit log write failed: <reason>"` — so the operator knows exactly what's inconsistent.

4. **`healthStats` query swallowed all 5 count errors.** Pattern was `(openEscalations.count || 0)`, so a permissions denial or DB outage on any single count silently rendered "0" in that stat tile. With 17 pending facilities and 5 active cases currently in production, a silent zero would be indistinguishable from "things are running smoothly." **Fix:** every `.error` is collected; if any non-empty, the entire `healthStats` query throws with the first error. The page now renders an isError banner with a Retry button in that case.

5. **`recentActions` + `impersonationLog` queries swallowed errors.** Same trap. **Fix:** explicit `if (error) throw error`; both panels render an isError state with Retry.

### P0 — latent realtime gap

6. **`admin_audit_log` and `admin_impersonation_log` were NOT in the `supabase_realtime` publication.** Pattern is now the same across 5 prior passes. The Recent Activity feed and Impersonation History panels showed stale data until manual refresh, even though both tables are RLS-gated correctly (admins see audit; super_admins-only see impersonation log). **Fix:** migration `20260626000000_realtime_for_back_office_logs.sql` adds both (idempotent). Page subscribes via a single `admin-back-office-live` channel, with a 30s polling fallback.

### P1 — UX and workflow gaps

7. **URL deep-links missing.** Support reps frequently get a case ID flagged and ask a super admin to reassign or force-status. There was no way to share a deep link to the pre-filled dialog. **Fix:** added `?reassign=<uuid>` and `?force=<uuid>` query-param hydration. Super-admin only. Validates the UUID format on the way in. The params are drained from the URL after consumption (via `replace: true`) so a reload doesn't keep re-opening the dialog.

8. **`forceStatusMutation` discarded the RPC's `p_reason` parameter.** The `admin_force_concierge_status` RPC accepts a reason (`p_reason text DEFAULT NULL`), writes it to both the audit-log entry and the case-event entry. The UI hardcoded `null`. **Fix:** added a 500-char Textarea to the Force Status dialog; the reason flows through to both the audit log and the case timeline. Reason is labeled "(recommended)" — not strictly required, but strongly encouraged for an action that bypasses workflow validation.

9. **Reassign dialog had no reason field.** Same pattern. **Fix:** added a 500-char Textarea; reason flows through `concierge_case_events.event_data.reason` and `admin_audit_log.details.reason`.

10. **Reassign dialog allowed reassigning to the currently-assigned advisor (no-op).** **Fix:** explicit `previousAdvisorId === reassignAdvisorId` check rejects with `"Selected advisor is already assigned to this case"`.

11. **Refresh All button invalidated ALL React Query keys app-wide.** `queryClient.invalidateQueries()` with no key kicks every active query in the cache, including queries for tabs the user isn't on. Performance hit and can interrupt other surfaces' work. **Fix:** narrowed to a `BACK_OFFICE_QUERY_KEYS` allowlist (`back-office-health`, `back-office-recent-actions`, `impersonation-log`, `admin-users-full`, `admin-escalations`).

12. **No tooltip on disabled "View As" buttons.** A non-active staff member's button was disabled with no explanation; admins clicked and got nothing. **Fix:** wrapped disabled buttons in a Tooltip with the specific reason ("Already impersonating — exit first" / "Cannot view as a suspended account").

13. **Impersonation log labeled stale `ended_at IS NULL` rows as "Active".** The 60-min auto-expire trigger closes orphans server-side, but front-end labels lagged behind. **Fix:** added a `IMPERSONATION_STALE_MS = 60min` threshold. Open rows older than that render as "Expired" (secondary badge) instead of "Active" (destructive badge). Only true currently-running rows still show "Active".

14. **No "Active 'View As'" stat tile.** A super admin landing on the back office had no top-of-page indicator of how many concurrent impersonation sessions were live. **Fix:** added a 6th stat tile that counts `admin_impersonation_log` rows where `ended_at IS NULL AND started_at > now() - 60 min`. Renders amber when > 0.

15. **Page had no Super-Admin route-level guard.** `AdminShell` checks `back_office` permission at the route level, but if that ever drifted out of sync with the page assumption, the dialogs (which expect `isSuperAdmin`) would render briefly with broken behavior. **Fix:** if `!isSuperAdmin` the page renders only a destructive `role="alert"` Alert and returns early.

16. **The "current admin" was in the View-As list.** Impersonating yourself is incoherent. **Fix:** filter out `u.user_id === user.id`.

17. **EscalationsList was rendered unbounded inside the Card.** A long list could push the layout. **Fix:** `max-h-[480px] overflow-y-auto` wrapper.

18. **`adminUsers?.find()` was called twice per render row** (once for Recent Activity, once for Impersonation History). On large staff lists this is wasteful. **Fix:** memoized `Map<user_id, AdminUser>` once.

### P1 — input safety

19. **UUID validation missing on the dialog inputs.** A typo in the Case ID got the `.maybeSingle()` route through to a generic PostgrestError. **Fix:** explicit UUID-regex check pre-mutation + an `aria-invalid` inline message in the dialog if the input is malformed. Submit button stays disabled until valid.

20. **Reason fields slice on input.** All textareas slice to 500 chars on input (matching the audit-log surface convention).

21. **`stopImpersonation` could trap the user in impersonation if audit close failed.** Previously the `await update(...)` was inside a try/catch that just logged the error, but if a lookup or update failure happened, the local state didn't always get cleared deterministically (the `try` block also wrapped the lookup before the local state change). **Fix:** restructured so `sessionStorage.removeItem` + `setImpersonating(null)` ALWAYS execute even if both lookup and update fail; the auto-expire trigger eventually closes the row server-side, and the page logs a console warning for the on-call.

### P2 — a11y polish

22. **aria-labels on Refresh All, Reassign Case, Force Status Change, Exit impersonation, every Select trigger, every View As button.** Disabled View As buttons get an `aria-label` describing the specific block reason.

23. **Status / error banners use `role="alert"` or `role="status"` appropriately.** Active-impersonation reminder uses `role="status"` (informational); query-error banners use `role="alert"` (critical).

24. **`aria-invalid` on the Case ID inputs** when the value is non-empty but not a UUID, so screen readers announce the format error.

25. **Dialog `onOpenChange` guarded against close-while-pending** — every dialog ignores close attempts while its mutation is running, preventing accidental dismissal mid-write.

---

## Files changed

```
NEW:
  supabase/migrations/20260626000000_realtime_for_back_office_logs.sql  (applied)
  docs/admin-back-office-hardening-2026-05-20.md

MODIFIED:
  src/pages/admin/AdminBackOffice.tsx
    — full rewire: error-throwing queries, isError + Retry banners,
      realtime channel on audit_log + impersonation_log, URL deep-links
      (?reassign / ?force), reason textareas on both override dialogs,
      UUID-format validation + aria-invalid on Case ID inputs,
      "Active 'View As'" stat tile, scroll-capped panels,
      stale-impersonation labeling, Tooltip-on-disabled View As,
      filtered-out current user from View As list, narrowed Refresh All
      to specific keys, super-admin route guard, aria-labels.
  src/hooks/useImpersonation.ts
    — startImpersonation throws on audit insert failure; sessionStorage
      and state only mutate after success
    — stopImpersonation guarantees local cleanup even if audit close
      lookup or update fails (auto-expire trigger handles server-side
      cleanup; console warning surfaces for on-call)
```

---

## Verification

- `npx tsc --noEmit` → clean
- `npx vitest run` → 128 passed, 5 skipped
- `npx vite build` → built successfully in ~31s
- Migration applied: both `admin_audit_log` and `admin_impersonation_log` confirmed in `supabase_realtime` publication
- Live-DB sanity: 66 audit entries (9 in last 7 days), 1 impersonation log entry (none active), 0 open escalations, 17 pending providers, 5 active cases, 2 total staff — no rows are affected by the migration itself; realtime channels start receiving events on next change
- RLS check: both newly-publishing tables retain row-level security. `admin_audit_log` is admin-readable + admin-self-insertable + service-role-insertable; `admin_impersonation_log` is super_admin-only for SELECT / INSERT / UPDATE. Realtime respects RLS so no info-leak risk.

---

## Behavioural guarantees

1. **No silent impersonation.** A failed `admin_impersonation_log` insert aborts impersonation entirely instead of putting the UI into a phantom impersonated state with no audit row.
2. **No silent half-state.** Reassign and force-status mutations check every write's error and throw with a specific message naming the failed step.
3. **Realtime propagation.** New audit-log entries and new impersonation rows appear across all concurrent super-admin sessions within ~200ms. 30s poll fallback covers channel drops.
4. **URL-deep-linkable overrides.** `/admin/back-office?reassign=<uuid>` and `?force=<uuid>` open the relevant dialog pre-filled and drain the param so a reload doesn't keep re-triggering.
5. **Audit completeness.** Every override now writes a reason (when provided) to both the case timeline and the admin audit log. Force-status reasons flow through the existing `admin_force_concierge_status` RPC; reassign reasons flow through the direct inserts.
6. **No incoherent state from override dialogs.** Bad UUIDs are rejected client-side with `aria-invalid` and a visible message; the submit button stays disabled until inputs validate.
7. **Truthful impersonation history.** Stale `ended_at IS NULL` rows older than 60 min display as "Expired" instead of being mislabeled "Active" (the trigger that auto-expires them runs after the row is read; the UI now matches the server-side state).
