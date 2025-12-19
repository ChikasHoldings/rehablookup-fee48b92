-- ============================================
-- UNIFIED LEAD SYSTEM: Add exclusivity tracking columns
-- ============================================

-- 1. Add exclusivity column to leads table
-- Values: 'exclusive' (Featured plans) or 'shared' (Professional plans)
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS exclusivity TEXT DEFAULT 'exclusive';

-- 2. Add shared_with column to track all providers who received this lead (for shared leads)
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS shared_with UUID[] DEFAULT '{}';

-- 3. Add routing_order column to track assignment sequence
-- 1 = primary provider, 2 = secondary provider (for shared leads)
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS routing_order INTEGER DEFAULT 1;

-- 4. Update lead_routing_logs table for multi-provider logging
ALTER TABLE public.lead_routing_logs 
ADD COLUMN IF NOT EXISTS exclusivity TEXT;

ALTER TABLE public.lead_routing_logs 
ADD COLUMN IF NOT EXISTS provider_routing_order INTEGER DEFAULT 1;

-- 5. Add comment for documentation
COMMENT ON COLUMN public.leads.exclusivity IS 'Lead exclusivity type: exclusive (Featured) or shared (Professional)';
COMMENT ON COLUMN public.leads.shared_with IS 'Array of facility_ids that received this shared lead';
COMMENT ON COLUMN public.leads.routing_order IS 'Assignment order: 1=primary, 2=secondary for shared leads';
COMMENT ON COLUMN public.lead_routing_logs.exclusivity IS 'Lead exclusivity type at time of routing';
COMMENT ON COLUMN public.lead_routing_logs.provider_routing_order IS 'Order this provider was assigned: 1=primary, 2=secondary';