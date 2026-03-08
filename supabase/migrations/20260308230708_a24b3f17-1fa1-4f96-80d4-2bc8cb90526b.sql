-- FIX 1: PRIVILEGE ESCALATION - Restrict admin self-update to safe preference fields only
DROP POLICY IF EXISTS "Users can update their own admin profile" ON public.admin_user_profiles;

CREATE POLICY "Users can update their own admin profile" ON public.admin_user_profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND status IS NOT DISTINCT FROM (SELECT aup.status FROM public.admin_user_profiles aup WHERE aup.user_id = auth.uid())
    AND admin_role IS NOT DISTINCT FROM (SELECT aup.admin_role FROM public.admin_user_profiles aup WHERE aup.user_id = auth.uid())
    AND mfa_skip IS NOT DISTINCT FROM (SELECT aup.mfa_skip FROM public.admin_user_profiles aup WHERE aup.user_id = auth.uid())
    AND mfa_enabled IS NOT DISTINCT FROM (SELECT aup.mfa_enabled FROM public.admin_user_profiles aup WHERE aup.user_id = auth.uid())
    AND force_password_change IS NOT DISTINCT FROM (SELECT aup.force_password_change FROM public.admin_user_profiles aup WHERE aup.user_id = auth.uid())
    AND temp_password_hash IS NOT DISTINCT FROM (SELECT aup.temp_password_hash FROM public.admin_user_profiles aup WHERE aup.user_id = auth.uid())
    AND temp_password_expires_at IS NOT DISTINCT FROM (SELECT aup.temp_password_expires_at FROM public.admin_user_profiles aup WHERE aup.user_id = auth.uid())
  );

-- FIX 2: EXPOSED SENSITIVE DATA - Split public facilities policy by role
DROP POLICY IF EXISTS "Public can view approved facilities" ON public.facilities;
DROP POLICY IF EXISTS "Admins can view all facilities" ON public.facilities;

CREATE POLICY "Anon can view approved facilities" ON public.facilities
  FOR SELECT TO anon
  USING (status = 'approved');

CREATE POLICY "Authenticated can view approved or own facilities" ON public.facilities
  FOR SELECT TO authenticated
  USING (
    status = 'approved' 
    OR auth.uid() = user_id 
    OR has_role(auth.uid(), 'admin'::app_role)
  );

-- FIX 3: placement_fee_events - Use has_role() instead of admin_user_profiles status check
DROP POLICY IF EXISTS "Admins can view all fee events" ON public.placement_fee_events;

CREATE POLICY "Admins can view all fee events" ON public.placement_fee_events
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));