-- Drop the overly permissive policy that allows seekers to create any thread type
DROP POLICY IF EXISTS "Users can create threads" ON public.concierge_threads;

-- The "Seekers can create advisor threads only" policy already correctly restricts
-- seekers to thread_type = 'advisor' AND user_id = auth.uid()
-- The "Admins can manage all threads" policy already allows admins to create facility threads