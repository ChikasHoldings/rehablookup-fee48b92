-- Add MFA tracking field to admin_user_profiles
ALTER TABLE public.admin_user_profiles 
ADD COLUMN IF NOT EXISTS mfa_enabled boolean DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN public.admin_user_profiles.mfa_enabled IS 'Tracks whether the admin user has enabled two-factor authentication';