-- Fix admin_audit_log RLS to allow admins to insert their own audit entries
-- First, check and drop existing INSERT policy if it exists
DROP POLICY IF EXISTS "admin_audit_log_insert_service" ON public.admin_audit_log;
DROP POLICY IF EXISTS "Admins can insert audit logs" ON public.admin_audit_log;

-- Create a proper INSERT policy that allows admins to log their own actions
CREATE POLICY "Admins can insert own audit logs"
ON public.admin_audit_log
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = admin_user_id 
  AND public.has_role(auth.uid(), 'admin')
);

-- Ensure SELECT policy exists for admins to view audit logs
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.admin_audit_log;
CREATE POLICY "Admins can view audit logs"
ON public.admin_audit_log
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));