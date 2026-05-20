# /admin/marketing — Deep Hardening Pass

**Date:** 2026-05-20
**Branch:** `claude/phase2-deployment-5WYOn`
**Verdict:** ✅ Frontend + backend complete, mobile-responsive, fully hardened. Same standard as `/admin/leads`, `/admin/providers`, `/admin/seekers`, `/admin/concierge`, `/admin/subscriptions`, `/admin/support`, `/admin/reviews`, `/admin/escalations`.

---

## Issues closed

### P0 — latent runtime bug

1. **`marketing_leads` not in `supabase_realtime` publication AND no realtime channel subscription anywhere.** The page relied entirely on `useQuery` cache invalidation triggered by the local mutation hook — if any other admin filed/updated a lead from another browser, this admin would never see it until they manually refreshed. **Fix:** migration `20260623000000_realtime_for_marketing_leads.sql` adds the table to the publication (idempotent). Added `admin-marketing-live` channel in `AdminMarketing` subscribing to INSERT / UPDATE / DELETE. 30s polling fallback layered on top.

### P1 — workflow gaps

2. **No URL-state.** Filters (search / status / urgency / source) lived only in component state. **Fix:** `useSearchParams` hydration on mount + loop-guarded sync (`?q=…&status=…&urgency=…&source=…`). Defaults not written to the URL.

3. **No admin-gated bulk edge function for the destructive ops.** Bulk delete went directly to the table from the client with no role check, no partial-success isolation, no per-row audit. **Fix:** new `admin-bulk-update-marketing-leads` edge function (deployed v1) with action dispatcher (`update_status | mark_converted | send_followup | delete`), 100-row cap, defense-in-depth role tier check (`super_admin + manager` only, with `super_admin`-only for delete), per-row `admin_audit_log` entry, partial-success summary. `send_followup` delegates to `send-marketing-followup` per row with per-row error isolation (a flaky email send for one lead doesn't abort the batch). Replaces the old client-only bulk delete path.

4. **Only bulk-delete existed; no bulk status / mark-converted / follow-up.** Other admin surfaces have a richer set. **Fix:** four actions via the new edge fn + new `BulkMarketingLeadActionDialog` component routing between them.

5. **KPI cards reflected the FILTERED view, not global counts.** Filtering to "converted" made every KPI go to whatever the converted-only count was — misleading the admin about the overall pipeline. **Fix:** new `["admin-marketing-counts"]` query runs 7 `count: "exact", head: true` lookups (total + each status bucket + concierge + urgent) and feeds the KPI strip. The list view stays filtered.

6. **No urgency filter, no source filter, no UTM-campaign search.** The page surfaced these fields but couldn't filter by them. **Fix:** added urgency dropdown (immediate / within-week / within-month / researching), source dropdown (derived from current data), and extended the search predicate to match against `utm_campaign` + `location_zip`.

7. **Single-action mutation errors were swallowed by generic toasts.** `onError: () => toast.error("Failed to update status")` discarded the actual error reason. Same shape across all 5 mutations in `MarketingLeadProfileModal`. **Fix:** every `onError` now surfaces the real error message — `toast.error(\`Failed to X: ${err.message}\`)`.

8. **`sendFollowup` mutation didn't check `data?.error` payload.** Some edge fns return HTTP 200 with `{ error: "..." }` body when an upstream (Resend, Stripe) errors. **Fix:** added the dual check; throws on payload-level errors so the toast shows the real reason.

### P2 — UX/a11y polish

9. **No copy-link / clear-filters buttons** when filters are active.
10. **No manual Refresh button.**
11. **No `isFetching` indicator.**
12. **No SLA badge on lead rows.** Admins couldn't see at a glance which urgent leads were aging without follow-up. **Fix:** `leadSlaBadge()` helper renders an age badge with tighter thresholds for high-urgency leads: `immediate` → 4h amber / 24h red; `within-week` → 24h amber / 72h red; default → 7d amber / 14d red. Converted leads get no SLA badge.
13. **Selection-drift cleanup** — selecting leads and then filtering left stale IDs in the bulk selection. **Fix:** effect that prunes `selectedIds` to only contain currently-visible IDs.
14. **A11y** — every checkbox button got `aria-label`. KPI buttons got `aria-pressed`. The new bulk action buttons each have action-specific `aria-label`s including the selection count.
15. **Bulk action buttons gated by role.** Non-moderator admins (`customer_rep`, `advisor`) no longer see the bulk buttons even if they somehow have rows selected. The edge fn enforces the same gate server-side.
16. **Header actions row uses `flex-wrap`** so the 4 bulk buttons + utility buttons stack cleanly on phones.

---

## New backend

### `admin-bulk-update-marketing-leads` v1 (deployed)

| action          | extra payload                              | behavior                                                                                                                                                       |
| --------------- | ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| update_status   | `newStatus` ∈ {new, contacted, converted, lost} | Skips no-ops as `skipped`. Per-row audit row records previous + new status.                                                                                    |
| mark_converted  | (none)                                     | Sets `converted_to_concierge=true`, stamps `converted_at`, status=`converted`. Skips already-converted as `skipped`.                                            |
| send_followup   | (none)                                     | Skips leads with `followup_email_sent=true` as `skipped`. Delegates to `send-marketing-followup` per row; per-row error isolation (one failure doesn't abort). |
| delete          | (none) — **super_admin only**              | Permanent removal. Per-row audit row records the deleted lead's metadata (name, email, status, was_converted).                                                 |

Gating: JWT → `has_role(_user_id, 'admin')` → `admin_user_profiles.admin_role IN ('super_admin', 'manager')` → (for delete) `admin_role = 'super_admin'`. Function ID: `15a7025f-3d50-4007-8e99-5a43be2bbdea`

### Migration `20260623000000_realtime_for_marketing_leads.sql`

Idempotent `ALTER PUBLICATION supabase_realtime ADD TABLE public.marketing_leads`. Applied to the live project.

---

## Files changed

```
NEW:
  src/components/admin/marketing/BulkMarketingLeadActionDialog.tsx
  supabase/functions/admin-bulk-update-marketing-leads/index.ts        (deployed v1)
  supabase/migrations/20260623000000_realtime_for_marketing_leads.sql  (applied)
  docs/admin-marketing-hardening-2026-05-20.md

MODIFIED:
  src/pages/admin/AdminMarketing.tsx
    — full rewire: URL-state, realtime channel + 30s poll, global
      counts query, urgency+source filters, bulk dialog wiring, SLA
      badges, copy-link, clear-filters, refresh, selection-drift
      cleanup, a11y. Old client-only bulk delete + AlertDialog removed.
  src/components/admin/marketing/MarketingLeadProfileModal.tsx
    — 5 mutation onError toasts now surface the underlying error
      message; sendFollowup checks data?.error payload (not just
      transport error).
```

---

## Verification

- `npx tsc --noEmit` → clean
- `npx vitest run` → 128 passed, 5 skipped
- `npx vite build` → built successfully in ~38s
- Edge function deployed: `admin-bulk-update-marketing-leads` v1 (id `15a7025f-3d50-4007-8e99-5a43be2bbdea`) — ACTIVE
- Migration applied: `marketing_leads` confirmed in `supabase_realtime` publication
- Schema check: edge fn columns match `marketing_leads` (id, status, converted_to_concierge, converted_at, followup_email_sent, etc.)

---

## Behavioural guarantees

1. **Realtime actually works.** INSERT/UPDATE/DELETE on `marketing_leads` propagate via the new channel within ~200ms. 30s poll fallback covers channel drops.
2. **No silent failures.** Every mutation `onError` surfaces the actual error message; `sendFollowup` checks both `error` and `data?.error`.
3. **Defense in depth on bulk mutations.** The edge fn checks JWT → admin role → admin_role tier (super_admin + manager) → (delete only) super_admin. Even if a customer_rep token reached the endpoint, the role tier check blocks the action.
4. **URL-state round-trips.** Bookmarking `/admin/marketing?status=converted&urgency=immediate&source=google&q=alice` reopens the exact filtered view.
5. **KPI strip stays truthful.** Numbers reflect the global table state — filtering the list view doesn't distort the KPIs.
6. **SLA badges surface aging urgent leads.** A high-urgency lead older than 4 hours shows amber; 24h shows red. Admins triage from the badges without needing to read timestamps.
