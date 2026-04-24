---
name: Workflow State Machine Hooks
description: Centralized hooks enforce client-side state-machine validation, optimistic locking, and audit logging for all admin workflows
type: feature
---
All admin-workflow status mutations route through dedicated hooks that mirror the
DB triggers (`validate_concierge_status_transition`, `validate_lead_status_transition`,
`validate_invoice_status_transition`).

**Hooks:**
- `useCaseTransition` (src/hooks/useCaseTransition.ts) — `concierge_inquiries.status`
  transitions. Optimistic-lock on previous status, auto-stamps timestamps
  (matched_at, introductions_sent_at, placement_confirmed_at, closed_at), logs
  to `concierge_case_events` with actor_id + actor_type (super_admin / manager /
  customer_rep / advisor — never collapsed to "admin"). Admin-only (uses
  `useAdminAuth`); seeker / public flows must call `validateTransition` from
  `src/lib/statusTransitions.ts` directly and write their own case events with
  `actor_type: "seeker"`.
- `useEscalationTransition` (src/hooks/useEscalationTransition.ts) — admin_escalations
  updates. `fromStatus` is typed as `EscalationStatus` (not `string`) and is
  REQUIRED whenever `updates.status` is set; the hook hard-throws otherwise.
  Validates allowed transitions, auto-stamps `resolved_at` on resolve and clears
  it on reopen, always writes admin_audit_log row.

**Lead / advisor reassignment hardening:** Direct `assigned_advisor_id` rewrites
on `concierge_inquiries` MUST: (1) snapshot the prior advisor for an
optimistic-lock guard (`.eq("assigned_advisor_id", previous)` or `.is(..., null)`),
(2) write a `concierge_case_events` row with `previous_advisor_id` + new id, and
(3) write an `admin_audit_log` entry with `from_advisor_id` / `to_advisor_id`.
Pattern applied in `InquiryDetailModal.reassignMutation` and
`AdminBackOffice.reassignMutation`. PlacementDetailModal’s inline assign delegates
to `useCaseTransition` (with `extraFields: { assigned_advisor_id }`) when the case
is at `intake_reviewed`, and uses the locked-rebind pattern above otherwise — it
must NEVER pre-write `assigned_advisor_id` outside the transition hook (would be
a wasted, unlocked second write).

**Seeker self-cancel (SeekerConcierge):** Cancellation runs `validateTransition`
client-side BEFORE the update, applies an optimistic-lock on `status`
(`.eq("status", fromStatus)`), and writes a `concierge_case_events` row with
`actor_type: "seeker"`. Do not invoke `useCaseTransition` from non-admin
surfaces — it requires admin auth context.

**Rules:**
- New admin_escalations / leads / concierge mutations MUST use the hook (no direct
  `.update()` on `status`).
- Status changes MUST pass `fromStatus` so the client guard can run before the DB
  trigger rejects the write.
- All escalation mutations MUST write admin_audit_log (handled inside the hook).
- All advisor reassignments MUST snapshot the prior advisor + write the audit log.
- All admin-side `concierge_case_events` writes MUST set `actor_type` via
  `getCaseEventActorType(adminRole)` from `src/lib/caseEventActor.ts` — never the
  literal `"admin"`. The helper resolves to the granular role
  (`super_admin` / `manager` / `customer_rep` / `advisor`) so timeline filtering and
  audit reviews can distinguish a super-admin override from a routine rep action.
  Falls back to `"system"` (not `"admin"`) when the role is unknown. Seeker and
  provider flows write their own literals (`"seeker"`, `"provider"`) and must NOT
  use the helper.

**`auto-status-transition` edge function (v3.1):** Walks `FORWARD_PATH` one step at
a time so the per-row DB trigger accepts each hop. Hardening rules:
- The `actorType` body field is typed to the same granular taxonomy as the client
  helper (`super_admin | manager | customer_rep | advisor | provider | seeker | system`).
  Callers MUST pass `getCaseEventActorType(adminRole)` (or `"provider"` /
  `"seeker"`) — never the literal `"admin"`. `"system"` is reserved for cron /
  background jobs without a real human actor.
- A mid-walk DB rejection now returns `partial: true` plus `error` / `lockConflictAt`
  in the JSON response and stamps `partial: true` + `last_error` / `lock_miss_at`
  on the summary `concierge_case_events` row, so silent half-walks are visible to
  reviewers. The response also includes `targetStatus` and `reachedTarget`.
- `introductions_sent_count` increments are race-safe: callers (PlacementDetailModal
  `sendIntro`, ConciergeIntroductionsTab `sendIntroMutation`) apply an optimistic
  lock on the prior count and re-read + retry once on miss. NEVER do a blind
  `count + 1` write.
