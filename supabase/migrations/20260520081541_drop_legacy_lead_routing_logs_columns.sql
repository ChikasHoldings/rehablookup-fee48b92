-- 2026-05-20 admin cleanup pass — drop three vestigial columns on
-- lead_routing_logs that were created for the retired unlock-credit
-- model. No code path reads them; verified via repo-wide grep before
-- this migration was applied.
--
-- The columns dropped:
--   • lead_limit         — per-provider monthly cap under the legacy
--                          pay-per-unlock model. Flat-fee Pro has no
--                          per-month cap.
--   • used_leads         — running count consumed under the legacy
--                          cap. Replaced by leads_this_month read
--                          directly from public.leads at query time.
--   • lead_deducted_at   — timestamp of the credit-side deduction.
--                          No credits to deduct under the current
--                          flat-fee model.

ALTER TABLE public.lead_routing_logs DROP COLUMN IF EXISTS lead_limit;
ALTER TABLE public.lead_routing_logs DROP COLUMN IF EXISTS used_leads;
ALTER TABLE public.lead_routing_logs DROP COLUMN IF EXISTS lead_deducted_at;
