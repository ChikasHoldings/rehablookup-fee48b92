-- =============================================================================
-- Durable facility rejection reason (Provider rejection dead-end fix).
--
-- FINDING
--   Admin facility rejection captured a reason only inside admin_audit_log.details
--   (not attached to the listing) and sent the provider no signal. Providers saw
--   a rejected/needs_edits listing labelled generically with no reason or next step.
--
-- FIX (schema half)
--   Add a nullable facilities.rejection_reason. admin-bulk-update-provider-status
--   writes it on reject/needs_edits and clears it on approved/draft/pending_review,
--   and also raises a provider_notifications row. The column is provider-readable
--   via the existing owner SELECT RLS, so the dashboard/editor can surface "why".
--   Not a privileged/gated column — it is admin/service-written only in practice
--   (providers never set status), and carries no entitlement.
--
-- ROLLBACK: ALTER TABLE public.facilities DROP COLUMN IF EXISTS rejection_reason;
-- =============================================================================

ALTER TABLE public.facilities
  ADD COLUMN IF NOT EXISTS rejection_reason text;

COMMENT ON COLUMN public.facilities.rejection_reason IS
  'Admin-provided reason shown to the provider when status is rejected/needs_edits. Set/cleared by admin-bulk-update-provider-status; provider-readable via owner RLS.';
