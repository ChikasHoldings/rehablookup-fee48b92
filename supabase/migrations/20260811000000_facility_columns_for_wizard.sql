-- Add three columns the new Add-Location wizard captures but
-- facilities didn't have. These were spec'd explicitly in the
-- "complete profile from day one" requirement and are public-page
-- relevant; they fit naturally on facilities rather than as side
-- tables.
--
--   * dba_name        — Doing-business-as / alternate name. Some
--                       facilities operate under a different public
--                       name than their legal entity.
--   * levels_of_care  — Text array of LOC labels (Detox / IOP / PHP /
--                       Residential / Outpatient / etc.). Distinct
--                       from facility_services which captures specific
--                       services like "Family Therapy".
--   * payment_options — Text array (Insurance / Self-Pay / Sliding
--                       Scale / Financing / Payment Plans /
--                       Scholarship). Distinct from facility_insurance
--                       which lists named carriers.
--
-- The license number captured by the wizard lands in
-- facility_credentials.licensing_info (existing free-text column) —
-- no schema change needed there.

ALTER TABLE public.facilities
  ADD COLUMN IF NOT EXISTS dba_name text,
  ADD COLUMN IF NOT EXISTS levels_of_care text[],
  ADD COLUMN IF NOT EXISTS payment_options text[];
