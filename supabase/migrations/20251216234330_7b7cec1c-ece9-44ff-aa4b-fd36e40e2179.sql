-- Add mfa_skip column to admin_user_profiles
ALTER TABLE public.admin_user_profiles 
ADD COLUMN IF NOT EXISTS mfa_skip boolean DEFAULT false;

-- Add comment
COMMENT ON COLUMN public.admin_user_profiles.mfa_skip IS 'When true, 2FA enforcement is skipped for this admin user';