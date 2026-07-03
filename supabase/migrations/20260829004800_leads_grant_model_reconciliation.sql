-- =============================================================================
-- Reconcile the leads grant model (integrity pass, documentation-only).
--
-- FINDING
--   Historical migrations issued column-level REVOKEs on leads(name, email,
--   phone, message) intending to protect PII. Live inspection shows those
--   REVOKEs are DEAD: a subsequent blanket GRANT restored column SELECT to
--   `authenticated` (and `anon`), so the column ACL is not the control.
--
-- WHY NO GRANT CHANGE IS MADE (and would be unsafe)
--   The real, enforced PII control is ROW-LEVEL SECURITY, verified live:
--     * leads_select_consolidated / leads_team_select scope SELECT to the
--       caller's OWN facilities (or admin) — a provider cannot read another
--       tenant's leads, and anon matches no rows.
--     * leads_update_consolidated / leads_team_update additionally require
--       has_active_pro(facility_id) to modify a lead.
--   Re-applying a column REVOKE on `authenticated` would BREAK the launch-ready
--   lead surface: leads_provider_view is security_invoker (runs with the
--   caller's privileges) and ~15 admin components read the base leads table
--   directly — all require authenticated column access. The lock/unlock PII
--   model is retired (leads deliver full contact to the owning provider by
--   product decision), so there is no per-column paywall to reinstate.
--
-- ACTION
--   Record the decision on the schema so the dead REVOKE is not mistaken for an
--   active control in future audits. No ACL / RLS change. Cross-tenant and anon
--   isolation is proven by rollback-safe probes in the pass report.
--
-- ROLLBACK: COMMENT ON TABLE public.leads IS NULL;
-- =============================================================================

COMMENT ON TABLE public.leads IS
  'Lead PII is protected by ROW-LEVEL SECURITY (own-facility/admin SELECT; '
  'has_active_pro UPDATE), NOT by column-level grants. Legacy column REVOKEs on '
  'name/email/phone/message are dead (superseded by a later blanket GRANT) and '
  'must not be reinstated: leads_provider_view is security_invoker and admin '
  'surfaces read this table directly, so authenticated needs column access. '
  'Lock/unlock PII model is retired. See migration 20260829004800.';
