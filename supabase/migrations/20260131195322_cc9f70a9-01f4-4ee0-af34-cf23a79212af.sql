-- Create enum for admin role types
CREATE TYPE public.admin_role_type AS ENUM ('super_admin', 'manager', 'customer_rep', 'advisor');

-- Add admin_role column to admin_user_profiles
ALTER TABLE public.admin_user_profiles 
ADD COLUMN admin_role admin_role_type DEFAULT 'customer_rep';

-- Update existing admin users based on their current role
-- Users with 'admin' role in user_roles become 'super_admin'
UPDATE public.admin_user_profiles aup
SET admin_role = 'super_admin'
WHERE EXISTS (
  SELECT 1 FROM public.user_roles ur 
  WHERE ur.user_id = aup.user_id AND ur.role = 'admin'
);

-- Users with only 'moderator' role become 'customer_rep'
UPDATE public.admin_user_profiles aup
SET admin_role = 'customer_rep'
WHERE admin_role IS NULL OR admin_role = 'customer_rep'
AND NOT EXISTS (
  SELECT 1 FROM public.user_roles ur 
  WHERE ur.user_id = aup.user_id AND ur.role = 'admin'
);

-- Create function to check admin role
CREATE OR REPLACE FUNCTION public.get_admin_role(_user_id uuid)
RETURNS admin_role_type
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT admin_role FROM public.admin_user_profiles WHERE user_id = _user_id;
$$;

-- Create function to check if user has specific admin role
CREATE OR REPLACE FUNCTION public.has_admin_role(_user_id uuid, _admin_role admin_role_type)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_user_profiles 
    WHERE user_id = _user_id AND admin_role = _admin_role
  )
$$;

-- Add index for admin_role lookups
CREATE INDEX IF NOT EXISTS idx_admin_user_profiles_admin_role ON public.admin_user_profiles(admin_role);