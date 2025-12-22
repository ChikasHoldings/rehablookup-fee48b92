-- Add 'seeker' to the existing app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'seeker';

-- Create seeker_profiles table
CREATE TABLE public.seeker_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  display_name text,
  avatar_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on seeker_profiles
ALTER TABLE public.seeker_profiles ENABLE ROW LEVEL SECURITY;

-- RLS policies for seeker_profiles
CREATE POLICY "Users can view their own seeker profile"
ON public.seeker_profiles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own seeker profile"
ON public.seeker_profiles FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own seeker profile"
ON public.seeker_profiles FOR UPDATE
USING (auth.uid() = user_id);

-- Create user_favorites table
CREATE TABLE public.user_favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  facility_id uuid REFERENCES public.facilities(id) ON DELETE CASCADE NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, facility_id)
);

-- Enable RLS on user_favorites
ALTER TABLE public.user_favorites ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_favorites
CREATE POLICY "Users can view their own favorites"
ON public.user_favorites FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own favorites"
ON public.user_favorites FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own favorites"
ON public.user_favorites FOR DELETE
USING (auth.uid() = user_id);

-- Trigger to update updated_at on seeker_profiles
CREATE TRIGGER update_seeker_profiles_updated_at
BEFORE UPDATE ON public.seeker_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to handle new seeker signup
CREATE OR REPLACE FUNCTION public.handle_new_seeker()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Only create seeker profile if user doesn't have provider or admin role
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = NEW.id AND role IN ('admin')
  ) AND NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE user_id = NEW.id
  ) THEN
    INSERT INTO public.seeker_profiles (user_id, display_name)
    VALUES (NEW.id, NEW.raw_user_meta_data ->> 'display_name');
    
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'seeker');
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger for new seeker signup (runs after user creation)
CREATE TRIGGER on_auth_user_created_seeker
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_seeker();