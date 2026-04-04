-- Fix privilege escalation in is_super_admin function
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = _user_id AND role = 'admin'
  ) AND EXISTS (
    SELECT 1 FROM public.admin_user_permissions 
    WHERE user_id = _user_id AND permission_key = 'super_admin' AND granted = true
  )
$$;