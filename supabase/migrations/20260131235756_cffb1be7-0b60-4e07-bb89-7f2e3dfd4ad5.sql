-- Fix placement_cases RLS: Remove insecure email-based access
-- Only allow access via seeker_user_id (authenticated user match)

-- Drop the vulnerable policies
DROP POLICY IF EXISTS "Users can view their own cases" ON placement_cases;
DROP POLICY IF EXISTS "Users can update their own pending cases" ON placement_cases;

-- Create secure policy: Users can only view cases linked to their user_id
CREATE POLICY "Users can view their own cases"
ON placement_cases FOR SELECT
TO authenticated
USING (seeker_user_id = auth.uid());

-- Create secure policy: Users can only update their own pending cases by user_id
CREATE POLICY "Users can update their own pending cases"
ON placement_cases FOR UPDATE
TO authenticated
USING (seeker_user_id = auth.uid() AND status = 'new')
WITH CHECK (seeker_user_id = auth.uid() AND status = 'new');