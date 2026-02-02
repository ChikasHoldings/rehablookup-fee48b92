-- Add PII disclosure tracking columns to concierge_introductions
ALTER TABLE public.concierge_introductions 
ADD COLUMN IF NOT EXISTS admin_disclosed_pii_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS disclosed_by_admin_id uuid;

-- Add comment to explain the column purpose
COMMENT ON COLUMN public.concierge_introductions.admin_disclosed_pii_at IS 'Timestamp when admin disclosed seeker PII to this facility';
COMMENT ON COLUMN public.concierge_introductions.disclosed_by_admin_id IS 'Admin user ID who authorized PII disclosure';

-- Update RLS policy on concierge_threads to restrict facility thread creation
-- Seekers can only create advisor threads, not facility threads
DROP POLICY IF EXISTS "Seekers can create advisor threads" ON public.concierge_threads;

CREATE POLICY "Seekers can create advisor threads only"
ON public.concierge_threads
FOR INSERT
TO authenticated
WITH CHECK (
  thread_type = 'advisor' AND user_id = auth.uid()
);

-- Admins can create any thread type
DROP POLICY IF EXISTS "Admins can manage all threads" ON public.concierge_threads;

CREATE POLICY "Admins can manage all threads"
ON public.concierge_threads
FOR ALL
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Restrict tour request creation for placement cases
-- Tours should only be coordinated by admin in placement context
DROP POLICY IF EXISTS "Users can create tour requests" ON public.concierge_tour_requests;

CREATE POLICY "Admins can create tour requests"
ON public.concierge_tour_requests
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  OR user_id = auth.uid()
);