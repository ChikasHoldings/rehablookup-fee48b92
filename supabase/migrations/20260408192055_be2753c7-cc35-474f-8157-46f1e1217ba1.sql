CREATE OR REPLACE FUNCTION public.complete_admin_mfa_setup(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE public.admin_user_profiles
  SET mfa_enabled = true, updated_at = now()
  WHERE user_id = p_user_id;

  RETURN true;
END;
$$;