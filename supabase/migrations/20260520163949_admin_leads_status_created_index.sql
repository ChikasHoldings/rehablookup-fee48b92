-- 2026-05-20 admin-leads enhancement pass
-- Adds a composite index for the most common admin-leads query
-- shape (status filter + created_at DESC order). The existing
-- idx_leads_facility_created_desc and idx_leads_facility_status
-- both lead with facility_id, which is optimal for provider-side
-- queries but not for the admin sees-all view that filters on
-- status without scoping to a facility.

CREATE INDEX IF NOT EXISTS idx_leads_status_created_desc
  ON public.leads (status, created_at DESC);

-- Also add an index for the response-time / SLA query the
-- admin dashboard now uses (lead with no response, sorted by
-- assigned_at). Partial so it stays tiny.

CREATE INDEX IF NOT EXISTS idx_leads_unresponded_assigned
  ON public.leads (assigned_at DESC, facility_id)
  WHERE provider_response_status IS NULL
    AND status NOT IN ('closed', 'expired', 'converted');
