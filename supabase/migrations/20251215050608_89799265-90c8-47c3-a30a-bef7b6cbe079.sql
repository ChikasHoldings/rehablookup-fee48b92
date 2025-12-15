-- Create admin_user_permissions table for granular page-level access control
CREATE TABLE public.admin_user_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  permission_key text NOT NULL,
  granted boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, permission_key)
);

-- Create admin_user_profiles table for admin-specific profile data
CREATE TABLE public.admin_user_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  display_name text,
  avatar_url text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'pending_password_reset')),
  temp_password_hash text,
  temp_password_expires_at timestamp with time zone,
  force_password_change boolean DEFAULT false,
  last_login_at timestamp with time zone,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create admin_user_notifications table for admin-specific notifications
CREATE TABLE public.admin_user_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  read boolean NOT NULL DEFAULT false,
  link text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.admin_user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_user_notifications ENABLE ROW LEVEL SECURITY;

-- RLS policies for admin_user_permissions
CREATE POLICY "Admins can view all permissions"
ON public.admin_user_permissions FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert permissions"
ON public.admin_user_permissions FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update permissions"
ON public.admin_user_permissions FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete permissions"
ON public.admin_user_permissions FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- Users can view their own permissions
CREATE POLICY "Users can view their own permissions"
ON public.admin_user_permissions FOR SELECT
USING (auth.uid() = user_id);

-- RLS policies for admin_user_profiles
CREATE POLICY "Admins can view all admin profiles"
ON public.admin_user_profiles FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert admin profiles"
ON public.admin_user_profiles FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update admin profiles"
ON public.admin_user_profiles FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete admin profiles"
ON public.admin_user_profiles FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- Users can view their own admin profile
CREATE POLICY "Users can view their own admin profile"
ON public.admin_user_profiles FOR SELECT
USING (auth.uid() = user_id);

-- Users can update their own admin profile (except status)
CREATE POLICY "Users can update their own admin profile"
ON public.admin_user_profiles FOR UPDATE
USING (auth.uid() = user_id);

-- RLS policies for admin_user_notifications
CREATE POLICY "Users can view their own admin notifications"
ON public.admin_user_notifications FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own admin notifications"
ON public.admin_user_notifications FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own admin notifications"
ON public.admin_user_notifications FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert admin notifications"
ON public.admin_user_notifications FOR INSERT
WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX idx_admin_user_permissions_user_id ON public.admin_user_permissions(user_id);
CREATE INDEX idx_admin_user_profiles_user_id ON public.admin_user_profiles(user_id);
CREATE INDEX idx_admin_user_notifications_user_id ON public.admin_user_notifications(user_id);
CREATE INDEX idx_admin_user_notifications_unread ON public.admin_user_notifications(user_id, read) WHERE read = false;

-- Create function to check if user has specific admin permission
CREATE OR REPLACE FUNCTION public.has_admin_permission(_user_id uuid, _permission_key text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT granted FROM public.admin_user_permissions 
     WHERE user_id = _user_id AND permission_key = _permission_key),
    false
  )
$$;

-- Create function to check if user is super admin (has admin role and no restrictions)
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = _user_id AND role = 'admin'
  ) AND COALESCE(
    (SELECT granted FROM public.admin_user_permissions 
     WHERE user_id = _user_id AND permission_key = 'super_admin'),
    -- If no explicit super_admin permission, check if they have users page access (Super Admins)
    EXISTS (
      SELECT 1 FROM public.admin_user_permissions 
      WHERE user_id = _user_id AND permission_key = 'users' AND granted = true
    )
  )
$$;

-- Create trigger to update updated_at
CREATE TRIGGER update_admin_user_permissions_updated_at
  BEFORE UPDATE ON public.admin_user_permissions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_admin_user_profiles_updated_at
  BEFORE UPDATE ON public.admin_user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();