
CREATE POLICY "Admins can view all activity logs"
  ON public.account_activity_log
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
