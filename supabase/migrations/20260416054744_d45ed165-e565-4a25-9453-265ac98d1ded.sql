CREATE POLICY "Users can view their own support tickets"
ON public.support_tickets
FOR SELECT
TO authenticated
USING (sender_user_id = auth.uid());