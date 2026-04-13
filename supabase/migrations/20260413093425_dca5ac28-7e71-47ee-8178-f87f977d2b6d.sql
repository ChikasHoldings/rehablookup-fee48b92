
-- Add idempotency_key column to leads table
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS idempotency_key text;

-- Create unique index (partial - only for non-null keys) to enforce idempotency
CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_idempotency_key 
ON public.leads (idempotency_key) 
WHERE idempotency_key IS NOT NULL;

-- Fix overly permissive RLS: Drop INSERT policies with WITH CHECK (true)
-- lead_unlocks
DROP POLICY IF EXISTS "Service role can insert unlocks" ON public.lead_unlocks;

-- credit_transactions
DROP POLICY IF EXISTS "Service role can insert transactions" ON public.credit_transactions;

-- provider_credits
DROP POLICY IF EXISTS "Service role can manage credits" ON public.provider_credits;

-- Re-create with proper service_role restriction (these tables should only be written by edge functions using service_role)
-- For lead_unlocks: only service_role can insert (edge functions handle unlock logic)
CREATE POLICY "Only service role can insert unlocks" ON public.lead_unlocks
FOR INSERT TO service_role WITH CHECK (true);

-- For credit_transactions: only service_role can insert
CREATE POLICY "Only service role can insert transactions" ON public.credit_transactions
FOR INSERT TO service_role WITH CHECK (true);

-- For provider_credits: only service_role can manage
CREATE POLICY "Only service role can manage credits" ON public.provider_credits
FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Add index for IP-based rate limiting lookups
CREATE INDEX IF NOT EXISTS idx_leads_ip_hash_created 
ON public.leads (ip_hash, created_at) 
WHERE ip_hash IS NOT NULL;

-- Add index for email-based rate limiting
CREATE INDEX IF NOT EXISTS idx_leads_email_created 
ON public.leads (email, created_at);

-- Add index for duplicate checks
CREATE INDEX IF NOT EXISTS idx_leads_facility_email_created 
ON public.leads (facility_id, email, created_at);
