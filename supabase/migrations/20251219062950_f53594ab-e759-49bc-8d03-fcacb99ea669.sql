-- Add column to track when leads were last reset (leads created after this time are counted)
ALTER TABLE public.facilities 
ADD COLUMN IF NOT EXISTS leads_reset_at timestamp with time zone DEFAULT NULL;

-- Add column for bonus leads (extra leads on top of plan limit)
ALTER TABLE public.facilities 
ADD COLUMN IF NOT EXISTS bonus_leads integer DEFAULT 0;

-- Add comment for clarity
COMMENT ON COLUMN public.facilities.leads_reset_at IS 'When set, only leads created after this timestamp are counted towards the monthly cap';
COMMENT ON COLUMN public.facilities.bonus_leads IS 'Extra leads granted on top of the plan limit for the current billing period';