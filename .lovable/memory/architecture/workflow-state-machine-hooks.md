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
  customer_rep / advisor — never collapsed to "admin").
- `useEscalationTransition` (src/hooks/useEscalationTransition.ts) — admin_escalations
  updates (status, priority, assigned_to, resolution_notes). Validates allowed
  transitions, auto-stamps `resolved_at` on resolve and clears it on reopen,
  always writes admin_audit_log row.

**Lead reassignment:** `InquiryDetailModal.reassignMutation` preserves attribution by
stamping `original_facility_id` (only on first move), setting
`redistribution_status='redistributed'`, refreshing `assigned_at`, and writing
admin_audit_log with from→to facility ids.

**Rules:**
- New admin_escalations / leads / concierge mutations MUST use the hook (no direct
  `.update()`).
- Status changes MUST pass `fromStatus` so the client guard can run before the DB
  trigger rejects the write.
- All escalation mutations MUST write admin_audit_log (handled inside the hook).
