-- Fix overly permissive RLS policies for critical financial/security tables

-- 1. Fix credit_transactions - only service role should insert
DROP POLICY IF EXISTS "Service role can insert transactions" ON public.credit_transactions;
CREATE POLICY "Service role can insert transactions" ON public.credit_transactions
  FOR INSERT TO service_role WITH CHECK (true);

-- 2. Fix lead_unlocks - only service role should insert (payments go through edge functions)
DROP POLICY IF EXISTS "Service role can insert unlocks" ON public.lead_unlocks;
CREATE POLICY "Service role can insert unlocks" ON public.lead_unlocks
  FOR INSERT TO service_role WITH CHECK (true);

-- 3. Fix admin_notifications - only service role should insert
DROP POLICY IF EXISTS "Service role can insert admin notifications" ON public.admin_notifications;
CREATE POLICY "Service role can insert admin notifications" ON public.admin_notifications
  FOR INSERT TO service_role WITH CHECK (true);

-- 4. Fix admin_user_notifications - only service role should insert
DROP POLICY IF EXISTS "Service role can insert admin notifications" ON public.admin_user_notifications;
CREATE POLICY "Service role can insert admin user notifications" ON public.admin_user_notifications
  FOR INSERT TO service_role WITH CHECK (true);

-- 5. Fix placement_fee_events - only service role should insert
DROP POLICY IF EXISTS "System can insert fee events" ON public.placement_fee_events;
CREATE POLICY "Service role can insert fee events" ON public.placement_fee_events
  FOR INSERT TO service_role WITH CHECK (true);

-- 6. Fix provider_notifications - only service role should insert
DROP POLICY IF EXISTS "Service role can insert notifications" ON public.provider_notifications;
CREATE POLICY "Service role can insert provider notifications" ON public.provider_notifications
  FOR INSERT TO service_role WITH CHECK (true);

-- 7. Fix lead_routing_logs - only service role should insert
DROP POLICY IF EXISTS "Service role can insert routing logs" ON public.lead_routing_logs;
CREATE POLICY "Service role can insert routing logs" ON public.lead_routing_logs
  FOR INSERT TO service_role WITH CHECK (true);

-- 8. Fix account_activity_log - only service role should insert
DROP POLICY IF EXISTS "Service role can insert activity" ON public.account_activity_log;
CREATE POLICY "Service role can insert activity logs" ON public.account_activity_log
  FOR INSERT TO service_role WITH CHECK (true);

-- 9. Fix admin_audit_log - only service role should insert
DROP POLICY IF EXISTS "Service role can insert audit entries" ON public.admin_audit_log;
CREATE POLICY "Service role can insert audit entries" ON public.admin_audit_log
  FOR INSERT TO service_role WITH CHECK (true);

-- 10. Fix provider_events - only service role should insert
DROP POLICY IF EXISTS "Service role can insert events" ON public.provider_events;
CREATE POLICY "Service role can insert provider events" ON public.provider_events
  FOR INSERT TO service_role WITH CHECK (true);

-- 11. Add PII disclosure audit tracking column to concierge_introductions
-- This column was already added (admin_disclosed_pii_at, disclosed_by_admin_id)
-- Create a dedicated audit table for PII disclosures for better tracking
CREATE TABLE IF NOT EXISTS public.pii_disclosure_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  disclosure_type TEXT NOT NULL, -- 'concierge_introduction', 'international_case', etc.
  reference_id UUID NOT NULL, -- ID of the related record (introduction_id, case_id, etc.)
  admin_user_id UUID NOT NULL,
  client_name TEXT,
  client_email TEXT,
  client_phone TEXT,
  facility_id UUID,
  facility_name TEXT,
  disclosed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reason TEXT,
  metadata JSONB DEFAULT '{}'
);

-- Enable RLS on PII disclosure log
ALTER TABLE public.pii_disclosure_log ENABLE ROW LEVEL SECURITY;

-- Only admins can read PII disclosure log
CREATE POLICY "Admins can view PII disclosures" ON public.pii_disclosure_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Only service role can insert PII disclosures
CREATE POLICY "Service role can insert PII disclosures" ON public.pii_disclosure_log
  FOR INSERT TO service_role WITH CHECK (true);

-- Add index for efficient querying
CREATE INDEX IF NOT EXISTS idx_pii_disclosure_log_admin ON public.pii_disclosure_log(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_pii_disclosure_log_facility ON public.pii_disclosure_log(facility_id);
CREATE INDEX IF NOT EXISTS idx_pii_disclosure_log_disclosed_at ON public.pii_disclosure_log(disclosed_at DESC);