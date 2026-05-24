-- Drop the orphaned facility_pending_changes table.
--
-- This table was scaffolded for an admin-mediated "review provider
-- edits before they go live" flow. The provider panel was ultimately
-- built with direct edits to public.facilities (with column-level
-- triggers + a reverification event raised on key-field change via
-- 20260804000000), and the pending-changes flow was abandoned.
--
-- Confirmed before dropping:
--   * 0 rows in the table
--   * 0 inbound FKs (no other table references this one)
--   * 0 references in src/ (only auto-generated supabase/types.ts and
--     the delete-provider-account cleanup function — both updated in
--     this commit / now no-ops on the absent table)
--
-- If a pending-changes review flow is ever needed, the schema can be
-- re-introduced; the re-verification engine already raises a
-- provider_field_edit event for every key-field UPDATE so the
-- monitoring side is unchanged.

BEGIN;

-- Drop dependent policies first (defensive — pg_drop will cascade
-- but listing explicitly makes the intent visible)
DROP POLICY IF EXISTS "facility_pending_changes_select_owner_or_admin" ON public.facility_pending_changes;
DROP POLICY IF EXISTS "facility_pending_changes_insert_provider" ON public.facility_pending_changes;
DROP POLICY IF EXISTS "facility_pending_changes_update_admin" ON public.facility_pending_changes;

DROP TABLE IF EXISTS public.facility_pending_changes CASCADE;

COMMIT;
