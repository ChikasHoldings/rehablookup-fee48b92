-- Create a security-definer function to complete password setup
-- This bypasses the RLS WITH CHECK that prevents users from changing security fields
CREATE OR REPLACE FUNCTION public.complete_admin_password_setup(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow users to complete their own password setup
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- Verify the user actually has force_password_change = true
  IF NOT EXISTS (
    SELECT 1 FROM public.admin_user_profiles 
    WHERE user_id = p_user_id AND force_password_change = true
  ) THEN
    -- Already completed, return true (idempotent)
    RETURN true;
  END IF;

  UPDATE public.admin_user_profiles
  SET 
    force_password_change = false,
    temp_password_hash = NULL,
    temp_password_expires_at = NULL,
    status = CASE WHEN status = 'pending_password_reset' THEN 'active' ELSE status END,
    updated_at = now()
  WHERE user_id = p_user_id;

  RETURN true;
END;
$$;