-- ==============================================
-- PLACEMENT SYSTEM SECURITY HARDENING
-- Removes provider bypass capabilities
-- ==============================================

-- 1. DROP provider access to concierge_threads (providers should not see seeker threads)
DROP POLICY IF EXISTS "Providers can view facility threads" ON concierge_threads;
DROP POLICY IF EXISTS "Providers can update facility threads" ON concierge_threads;

-- 2. DROP provider access to concierge_messages (no direct messaging)
DROP POLICY IF EXISTS "Providers can view messages in facility threads" ON concierge_messages;
DROP POLICY IF EXISTS "Providers can create messages in facility threads" ON concierge_messages;

-- 3. RESTRICT provider access to concierge_tour_requests (view only, no update)
DROP POLICY IF EXISTS "Providers can update tours for their facilities" ON concierge_tour_requests;
-- Keep SELECT policy for providers to see pending tour requests (admin manages)

-- 4. Add assigned_advisor_id to domestic cases (concierge_inquiries)
-- This brings domestic cases in line with international cases
ALTER TABLE concierge_inquiries 
ADD COLUMN IF NOT EXISTS assigned_advisor_id UUID REFERENCES admin_user_profiles(user_id);

-- 5. Create index for efficient advisor lookups
CREATE INDEX IF NOT EXISTS idx_concierge_inquiries_advisor 
ON concierge_inquiries(assigned_advisor_id);

-- 6. Add comment documenting the security change
COMMENT ON TABLE concierge_threads IS 'Placement coordination threads - PROVIDER ACCESS BLOCKED to protect brokerage model';
COMMENT ON TABLE concierge_messages IS 'Placement coordination messages - PROVIDER ACCESS BLOCKED to protect brokerage model';
COMMENT ON TABLE concierge_tour_requests IS 'Tour requests - PROVIDER READ-ONLY (admin manages confirmations)';