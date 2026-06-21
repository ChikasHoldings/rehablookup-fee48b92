-- MSG-7: constrain the seeker INSERT branch of concierge_messages so a seeker
-- cannot post a message as sender_type='advisor'/'facility' in their own thread
-- (the provider branch already pins sender_type='provider'; the seeker branch
-- previously left sender_type unconstrained → spoofable in-thread, visible to admin).
DROP POLICY IF EXISTS concierge_messages_insert_consolidated ON public.concierge_messages;
CREATE POLICY concierge_messages_insert_consolidated ON public.concierge_messages
  FOR INSERT TO public
  WITH CHECK (
    has_role((SELECT auth.uid()), 'admin'::app_role)
    OR (
      (sender_id = (SELECT auth.uid()))
      AND (sender_type = 'provider'::text)
      AND (thread_id IN (
        SELECT ct.id FROM concierge_threads ct
        JOIN facilities f ON ct.facility_id = f.id
        WHERE f.user_id = (SELECT auth.uid())
      ))
    )
    OR (
      (sender_id = (SELECT auth.uid()))
      AND (sender_type = 'seeker'::text)
      AND (thread_id IN (
        SELECT ct.id FROM concierge_threads ct
        WHERE ct.user_id = (SELECT auth.uid()) AND ct.thread_type = 'advisor'::text
      ))
    )
  );
