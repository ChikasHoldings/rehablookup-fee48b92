-- Add first_name and last_name columns to admin_user_profiles
ALTER TABLE public.admin_user_profiles 
ADD COLUMN IF NOT EXISTS first_name text,
ADD COLUMN IF NOT EXISTS last_name text;