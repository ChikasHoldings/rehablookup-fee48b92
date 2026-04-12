
-- 1. Add idle timeout tracking to admin profiles
ALTER TABLE public.admin_user_profiles 
ADD COLUMN IF NOT EXISTS last_active_at timestamptz DEFAULT now(),
ADD COLUMN IF NOT EXISTS idle_timeout_minutes integer DEFAULT 30;

-- 2. Create function to update admin activity timestamp
CREATE OR REPLACE FUNCTION public.touch_admin_activity(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  
  UPDATE public.admin_user_profiles
  SET last_active_at = now()
  WHERE user_id = p_user_id;
END;
$$;

-- 3. Create function to check if admin session has timed out
CREATE OR REPLACE FUNCTION public.is_admin_session_active(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_user_profiles
    WHERE user_id = p_user_id
      AND last_active_at > now() - (COALESCE(idle_timeout_minutes, 30) || ' minutes')::interval
  );
$$;

-- 4. Restrict destructive admin actions to super_admin and manager roles only
-- Create a helper function for moderation permission checks
CREATE OR REPLACE FUNCTION public.can_moderate_users(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_user_profiles
    WHERE user_id = p_user_id
      AND admin_role IN ('super_admin', 'manager')
      AND status = 'active'
  ) AND public.has_role(p_user_id, 'admin');
$$;
