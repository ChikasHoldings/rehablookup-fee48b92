-- 1. Remove sensitive tables from realtime publication
ALTER PUBLICATION supabase_realtime DROP TABLE public.concierge_tour_requests;
ALTER PUBLICATION supabase_realtime DROP TABLE public.concierge_threads;

-- 2. Add SELECT policy on user_roles so users can read their own role
CREATE POLICY "Users can read own role" ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- 3. Add SELECT policy on concierge_threads for providers via facility ownership
CREATE POLICY "Providers can view threads for their facilities" ON public.concierge_threads
  FOR SELECT TO authenticated
  USING (
    facility_id IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM public.facilities f WHERE f.id = facility_id AND f.user_id = auth.uid()
    )
  );