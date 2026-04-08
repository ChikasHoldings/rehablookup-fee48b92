-- 1. Fix concierge_inquiries update policy: remove email fallback
DROP POLICY IF EXISTS "Seekers can update own inquiry for confirmation" ON public.concierge_inquiries;
CREATE POLICY "Seekers can update own inquiry for confirmation"
  ON public.concierge_inquiries
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 2. Remove admin notification tables from realtime publication
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'admin_notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.admin_notifications;
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'admin_user_notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.admin_user_notifications;
  END IF;
END $$;

-- 3. Fix placement_cases email-based policies
DROP POLICY IF EXISTS "Seekers can view own cases" ON public.placement_cases;
CREATE POLICY "Seekers can view own cases"
  ON public.placement_cases
  FOR SELECT
  TO authenticated
  USING (seeker_user_id = auth.uid());

DROP POLICY IF EXISTS "Seekers can update own cases" ON public.placement_cases;
CREATE POLICY "Seekers can update own cases"
  ON public.placement_cases
  FOR UPDATE
  TO authenticated
  USING (seeker_user_id = auth.uid())
  WITH CHECK (seeker_user_id = auth.uid());

-- 4. Fix placement_case_documents email-based policy
DROP POLICY IF EXISTS "Seekers can view own case documents" ON public.placement_case_documents;
CREATE POLICY "Seekers can view own case documents"
  ON public.placement_case_documents
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.placement_cases pc
      WHERE pc.id = case_id AND pc.seeker_user_id = auth.uid()
    )
  );

-- 5. Fix placement_case_messages email-based policies
DROP POLICY IF EXISTS "Seekers can view own case messages" ON public.placement_case_messages;
CREATE POLICY "Seekers can view own case messages"
  ON public.placement_case_messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.placement_cases pc
      WHERE pc.id = case_id AND pc.seeker_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Seekers can send messages on own cases" ON public.placement_case_messages;
CREATE POLICY "Seekers can send messages on own cases"
  ON public.placement_case_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.placement_cases pc
      WHERE pc.id = case_id AND pc.seeker_user_id = auth.uid()
    )
  );