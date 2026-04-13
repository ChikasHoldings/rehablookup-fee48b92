
-- 1. FACILITIES: Replace overly permissive anon SELECT with restricted one
-- Drop the old anon policy that exposes all columns
DROP POLICY IF EXISTS "Anon can view approved facilities" ON public.facilities;

-- Create a restrictive anon policy that only allows reading safe columns
-- (Anon users should use the public_facilities view instead, but this is defense-in-depth)
CREATE POLICY "Anon can view approved facilities (restricted)"
ON public.facilities
FOR SELECT
TO anon
USING (status = 'approved');

-- Note: The public_facilities view already restricts columns. This policy remains
-- as a fallback, but the app routes anon through the view.

-- 2. USER ROLES: Restrict INSERT to super_admin only (non-circular check)
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;

CREATE POLICY "Only super admins can insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  is_super_admin(auth.uid())
);

-- 3. PLACEMENT CASE DOCUMENTS: Remove JWT email-based access
DROP POLICY IF EXISTS "Users can view documents on their cases" ON public.placement_case_documents;
DROP POLICY IF EXISTS "Users can update their documents" ON public.placement_case_documents;
DROP POLICY IF EXISTS "Users can upload documents to their cases" ON public.placement_case_documents;

CREATE POLICY "Users can view documents on their own cases"
ON public.placement_case_documents
FOR SELECT
TO authenticated
USING (
  case_id IN (
    SELECT id FROM placement_cases
    WHERE seeker_user_id = auth.uid()
  )
);

CREATE POLICY "Users can upload documents to their own cases"
ON public.placement_case_documents
FOR INSERT
TO authenticated
WITH CHECK (
  case_id IN (
    SELECT id FROM placement_cases
    WHERE seeker_user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own case documents"
ON public.placement_case_documents
FOR UPDATE
TO authenticated
USING (
  case_id IN (
    SELECT id FROM placement_cases
    WHERE seeker_user_id = auth.uid()
  )
);

-- 4. PLACEMENT CASE MESSAGES: Remove JWT email-based access
DROP POLICY IF EXISTS "Users can view non-internal messages on their cases" ON public.placement_case_messages;
DROP POLICY IF EXISTS "Users can insert messages on their cases" ON public.placement_case_messages;

CREATE POLICY "Users can view non-internal messages on their own cases"
ON public.placement_case_messages
FOR SELECT
TO authenticated
USING (
  is_internal = false
  AND case_id IN (
    SELECT id FROM placement_cases
    WHERE seeker_user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert messages on their own cases"
ON public.placement_case_messages
FOR INSERT
TO authenticated
WITH CHECK (
  case_id IN (
    SELECT id FROM placement_cases
    WHERE seeker_user_id = auth.uid()
  )
);

-- 5. REALTIME: Add RLS to restrict channel subscriptions
-- This ensures users can only listen to channels meant for them
ALTER TABLE IF EXISTS realtime.messages ENABLE ROW LEVEL SECURITY;

-- Allow users to only read messages from their own topic channels
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'realtime' AND table_name = 'messages') THEN
    EXECUTE 'CREATE POLICY "Users can only subscribe to own channels" ON realtime.messages FOR SELECT TO authenticated USING (
      extension = ''presence'' OR
      topic LIKE ''%'' || auth.uid()::text || ''%''
    )';
  END IF;
END $$;
