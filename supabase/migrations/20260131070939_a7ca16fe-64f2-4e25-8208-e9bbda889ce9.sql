-- ============================================================
-- Migration: Prevent Double Account Creation
-- This migration adds database-level constraints to prevent
-- users from having profiles in multiple role tables.
-- ============================================================

-- 1. Create function to check if user has a provider profile
CREATE OR REPLACE FUNCTION public.user_has_provider_profile(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE user_id = p_user_id
  )
$$;

-- 2. Create function to check if user has a seeker profile
CREATE OR REPLACE FUNCTION public.user_has_seeker_profile(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.seeker_profiles WHERE user_id = p_user_id
  )
$$;

-- 3. Create function to check if user has admin role
CREATE OR REPLACE FUNCTION public.user_is_admin(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = p_user_id AND role = 'admin'
  )
$$;

-- 4. Create trigger function to prevent seeker profile creation for providers/admins
CREATE OR REPLACE FUNCTION public.prevent_seeker_double_account()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user already has a provider profile
  IF public.user_has_provider_profile(NEW.user_id) THEN
    RAISE EXCEPTION 'Cannot create seeker profile: user already has a provider account';
  END IF;
  
  -- Check if user is an admin
  IF public.user_is_admin(NEW.user_id) THEN
    RAISE EXCEPTION 'Cannot create seeker profile: user is an admin';
  END IF;
  
  RETURN NEW;
END;
$$;

-- 5. Create trigger function to prevent provider profile creation for seekers/admins
CREATE OR REPLACE FUNCTION public.prevent_provider_double_account()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user already has a seeker profile
  IF public.user_has_seeker_profile(NEW.user_id) THEN
    RAISE EXCEPTION 'Cannot create provider profile: user already has a seeker account';
  END IF;
  
  -- Check if user is an admin
  IF public.user_is_admin(NEW.user_id) THEN
    RAISE EXCEPTION 'Cannot create provider profile: user is an admin';
  END IF;
  
  RETURN NEW;
END;
$$;

-- 6. Create trigger function to prevent admin role for users with seeker/provider profiles
CREATE OR REPLACE FUNCTION public.prevent_admin_double_account()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only check for admin role insertions
  IF NEW.role = 'admin' THEN
    -- Check if user has a seeker profile
    IF public.user_has_seeker_profile(NEW.user_id) THEN
      RAISE EXCEPTION 'Cannot grant admin role: user already has a seeker account';
    END IF;
    
    -- Check if user has a provider profile
    IF public.user_has_provider_profile(NEW.user_id) THEN
      RAISE EXCEPTION 'Cannot grant admin role: user already has a provider account';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 7. Drop existing triggers if they exist (safe to run multiple times)
DROP TRIGGER IF EXISTS prevent_seeker_double_account_trigger ON public.seeker_profiles;
DROP TRIGGER IF EXISTS prevent_provider_double_account_trigger ON public.profiles;
DROP TRIGGER IF EXISTS prevent_admin_double_account_trigger ON public.user_roles;

-- 8. Create triggers on the profile tables
CREATE TRIGGER prevent_seeker_double_account_trigger
  BEFORE INSERT ON public.seeker_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_seeker_double_account();

CREATE TRIGGER prevent_provider_double_account_trigger
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_provider_double_account();

CREATE TRIGGER prevent_admin_double_account_trigger
  BEFORE INSERT ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_admin_double_account();

-- 9. Add unique constraint on user_id in seeker_profiles if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'seeker_profiles_user_id_key' 
    AND conrelid = 'public.seeker_profiles'::regclass
  ) THEN
    ALTER TABLE public.seeker_profiles ADD CONSTRAINT seeker_profiles_user_id_key UNIQUE (user_id);
  END IF;
END $$;

-- 10. Add unique constraint on user_id in profiles if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'profiles_user_id_key' 
    AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_user_id_key UNIQUE (user_id);
  END IF;
END $$;