# Unified Concierge Workspace — Deep Hardening Pass

**Date:** 2026-05-20
**Branch:** `claude/phase2-deployment-5WYOn`
**Verdict:** ✅ Detail sheet + 10 tabs + 2 sub-pages fully wired, no silent failures, no dead buttons. Same standard as the prior six admin surfaces.

---

## Scope

This pass covered the **detail-level** unified concierge workspace — the 10-tab `ConciergeDetailSheet` plus the two sub-pages (`/admin/concierge/metrics`, `/admin/concierge/audit-review`). The list-level surface (`/admin/concierge`) was hardened in the prior pass (URL-state, realtime, bulk dialogs, CSV export, SLA badges, detail-sheet wiring).

In scope:
- `src/components/admin/ConciergeDetailSheet.tsx`
- `src/components/admin/concierge/ConciergeActionsTab.tsx`
- `src/components/admin/concierge/ConciergeIntroductionsTab.tsx`
- `src/components/admin/concierge/MessagesTab.tsx` (was orphaned — now wired)
- `src/components/admin/concierge/AdmissionCoordinationCard.tsx`
- `src/components/admin/concierge/AdvisorAssignmentCard.tsx`
- `src/components/admin/concierge/ToursTab.tsx`
- `src/pages/admin/AdminConciergeMetrics.tsx`
- `src/pages/admin/AdminConciergeAuditReview.tsx`

Not in scope (already hardened or out of scope): `AdminConcierge.tsx` list view (prior pass), `NetworkProvidersTab.tsx` (separate tab, no actions), `AdvisorReminder.tsx` (trivial banner), `BulkConciergeStatusDialog`/`BulkReassignAdvisorDialog` (just shipped), seeker-facing `/concierge/:inquiryId`, `/admin/inbox`.

---

## Issues closed

### P0 — blockers

1. **Dead "Billing" tab trigger** (`ConciergeDetailSheet.tsx:127`) — a non-advisor user clicking the "Bill" tab landed on a blank pane because `placement_invoices` was dropped with the international product retirement (2026-05-20) and the corresponding `<TabsContent value="billing">` was removed but the trigger was not. **Fix:** trigger removed from the tabs config.

2. **`MessagesTab.tsx` orphaned** (597 LOC, fully built, never imported by any consumer) — admins had no in-sheet way to start or continue case-scoped facility/seeker threads, and were forced to bounce to `/admin/inbox` which is a global cross-case view. The case-scoped flow already existed end-to-end (`concierge_threads`, `concierge_messages`, `send-message-notifications`, realtime subscription, attachment upload, mark-as-read sync) — just unwired. **Fix:** added as a new "Msgs" tab between Intros and Decision in `ConciergeDetailSheet`.

3. **Auto-status transition silent failure** (`ConciergeDetailSheet.tsx:86-98`) — opening a "new" or "intake_submitted" case auto-fires `auto-status-transition` to advance it to "reviewing". The `.catch()` only logged. If the edge fn failed (RLS, network, server error), the case stayed in the original status while the admin assumed the transition succeeded, and the timeline tab would show no event. **Fix:** awaited; both transport error and `data.error` are checked and surface a toast. Promise tracks a `cancelled` flag for unmount safety.

4. **Self-assign "advisor_claimed" notification silent failure** (`ConciergeActionsTab.tsx:206`) — `try { ... } catch (e) { console.error("Notification error:", e); }` swallowed any failure of the team-notify edge fn. The other advisors never knew the case was claimed → race risk on simultaneous claim attempts. **Fix:** error and `data.error` surfaced via `toast.warning`. The claim itself remains a success; only the team-notification step is the soft warning.

5. **Failed file upload silently sends text-only message** (`MessagesTab.tsx:163-168`) — `uploadFile()` swallowed any upload failure and returned `null`; the calling code then inserted a text-only `concierge_messages` row with no attachment. The admin saw a "message sent" success toast and assumed their PDF/screenshot went through. **Fix:** removed the swallowing catch; the upload error now propagates to `sendMessageMutation.onError` which renders the actual failure message.

### P1 — should-fix

6. **Close-case seeker notification silent failure** (`ConciergeActionsTab.tsx:168`) — closing a case fired `case_closed_by_admin` to the seeker; failure was only logged. **Fix:** failure path surfaces a `toast.warning` so the admin can manually follow up with the seeker.

7. **Audit review query returns `[]` on error** (`AdminConciergeAuditReview.tsx:71`) — fetch failure was swallowed and rendered the "No flagged rows waiting" empty state. EKRA-defensive audit rows risked going unreviewed during a transient outage. **Fix:** throw on error so React Query exposes `isError`; component now renders a red error block with a Retry button.

8. **Metrics query returns `null` on error** (`AdminConciergeMetrics.tsx:85-87`) — same pattern. `isError` was declared but never `true` because the query never threw. **Fix:** throw on error + `data.error`; component error path now has a Retry button.

9. **Introductions-sent seeker notification silent failure** (`ConciergeIntroductionsTab.tsx:176-182`) — batch action sent intros to facilities, then the seeker confirmation email was fired-and-forgotten. **Fix:** failure surfaces as a warning toast.

10. **Admission coordination notification silent failure** (`AdmissionCoordinationCard.tsx:148`) — admission status changes fired contextual notifications (`moved_in` / `move_in_scheduled` / `tour_completed` / `admission_updated`); failures were only logged. **Fix:** warning toast with the failing notification type.

11. **Advisor assignment notification silent failure** (`AdvisorAssignmentCard.tsx:110`) — assigning a case to a specific advisor fired the team-notify edge fn; failures were only logged. **Fix:** warning toast surfaced.

12. **Tour-requested facility notification silent failure** (`ToursTab.tsx:174`) — creating a tour fired the facility notification; failures were logged silently AND the success toast falsely claimed "facility notified". **Fix:** notification success tracked in the mutation return value; the `onSuccess` toast tells the truth (`toast.warning` with the failure message when the notification didn't go out).

13. **Message-send notification silent failure** (`MessagesTab.tsx:269-271`) — message itself was persisted, but the email/push delivery edge fn could fail silently. **Fix:** warning toast.

### P2 — UX polish

14. **Provider-response Select fires duplicate mutations** (`ConciergeIntroductionsTab.tsx:420-427`) — rapid clicks could fire multiple `updateResponseMutation.mutate` calls. **Fix:** `disabled={updateResponseMutation.isPending}` on the Select; no-op guard when the new value equals current; inline spinner; aria-label added.

15. **Dead imports / variables** (`ConciergeDetailSheet.tsx`) — `useMutation`, `useQueryClient`, `toast` (unused at the time), `DollarSign` icon (only the dead billing tab needed it), `isSuperAdmin`, `user`, `canManageBilling`, `canManageActions`, `advanceStatus`/`handleAdvanceStatus` (declared but never rendered), `ref` (forwardRef plumbing not used by any consumer). **Fix:** stripped. `toast` re-imported because the auto-transition fix uses it.

---

## False positives in the audit (no fix needed)

- `ToursTab.tsx` dialogs DO have `DialogDescription` (lines 454-456 and 550-552) — agent's initial scan missed them.
- `AdminConciergeMetrics.tsx` table IS already wrapped in `overflow-x-auto` (line 218 / now 222).
- `AdminConciergeAuditReview.tsx` table IS already wrapped in `overflow-x-auto` (line 151).
- `SendIntroductionsBatchAction.tsx:181` catch IS surfaced — `toast.error(err instanceof Error ? err.message : ...)` is right there.
- `PlacementNextSteps.tsx` SecondaryActionRow buttons have visible text content (`{step.label}`), not icon-only, so a11y is fine.

---

## Verification

- `npx tsc --noEmit` → clean
- `npx vitest run` → 128 passed, 5 skipped
- `npx vite build` → built successfully in ~40s
- Spot checks: all 10 tabs render and contain content; auto-transition error toast surfaces; MessagesTab loads thread list inside the sheet; intro response Select disables during mutation; audit review error block + Retry button work; metrics error block + Retry button work.

---

## Behavioural guarantees (after this pass)

1. **No silent notification failures.** Every send-concierge-notifications / send-message-notifications invocation has its error path surfaced via `toast.warning` (since the primary action — close case / claim case / send intros / create tour / assign advisor / update admission / send message — already succeeded). The admin always knows whether the corresponding email/push went out.
2. **No dead UI affordances.** The billing tab trigger is gone. The Messages tab now has working content. Every button has either a handler that does work or has been removed.
3. **Error states are real.** Both sub-page queries throw on error so React Query's `isError` is meaningful; both surfaces show a red error block with a Retry button instead of falsely rendering an empty state.
4. **Failed file uploads no longer degrade to text-only messages.** A failed attachment upload aborts the message-send mutation with the underlying error rather than silently dropping the file.
5. **Auto-transition failures are visible.** If the case can't be advanced from `intake_submitted` → `reviewing` on open, the admin sees a toast explaining why; the badge / stepper continues to reflect DB truth.

---

## Files changed

```
src/components/admin/ConciergeDetailSheet.tsx                       — dead tabs + imports stripped, Messages tab wired, auto-transition error surfaced
src/components/admin/concierge/ConciergeActionsTab.tsx              — self-assign + close-case notification errors surfaced
src/components/admin/concierge/ConciergeIntroductionsTab.tsx        — batch notif error surfaced, Select dedup guard
src/components/admin/concierge/MessagesTab.tsx                      — upload error propagates, send-notify error surfaced
src/components/admin/concierge/AdmissionCoordinationCard.tsx        — admission notification error surfaced
src/components/admin/concierge/AdvisorAssignmentCard.tsx            — assignment notification error surfaced
src/components/admin/concierge/ToursTab.tsx                         — tour notification status tracked + truthful toast
src/pages/admin/AdminConciergeAuditReview.tsx                       — query throws on error, error block + Retry
src/pages/admin/AdminConciergeMetrics.tsx                           — query throws on error, error block + Retry
docs/admin-concierge-unified-hardening-2026-05-20.md                — this doc
```
