-- Create profiles table for provider accounts
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  job_title TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create facilities table
CREATE TABLE public.facilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  facility_type TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  website TEXT,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  zip_code TEXT NOT NULL,
  description TEXT,
  bed_count TEXT,
  gender_served TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create facility_services table for treatment types
CREATE TABLE public.facility_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id UUID REFERENCES public.facilities(id) ON DELETE CASCADE NOT NULL,
  service_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create facility_age_groups table
CREATE TABLE public.facility_age_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id UUID REFERENCES public.facilities(id) ON DELETE CASCADE NOT NULL,
  age_group TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create facility_insurance table
CREATE TABLE public.facility_insurance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id UUID REFERENCES public.facilities(id) ON DELETE CASCADE NOT NULL,
  insurance_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create facility_credentials table
CREATE TABLE public.facility_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id UUID REFERENCES public.facilities(id) ON DELETE CASCADE NOT NULL,
  licensing_info TEXT,
  accreditations TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.facilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.facility_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.facility_age_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.facility_insurance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.facility_credentials ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = user_id);

-- Facilities policies
CREATE POLICY "Users can view their own facilities"
ON public.facilities FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own facilities"
ON public.facilities FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own facilities"
ON public.facilities FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own facilities"
ON public.facilities FOR DELETE
USING (auth.uid() = user_id);

-- Facility services policies (based on facility ownership)
CREATE POLICY "Users can view services of their facilities"
ON public.facility_services FOR SELECT
USING (facility_id IN (SELECT id FROM public.facilities WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert services for their facilities"
ON public.facility_services FOR INSERT
WITH CHECK (facility_id IN (SELECT id FROM public.facilities WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete services from their facilities"
ON public.facility_services FOR DELETE
USING (facility_id IN (SELECT id FROM public.facilities WHERE user_id = auth.uid()));

-- Facility age groups policies
CREATE POLICY "Users can view age groups of their facilities"
ON public.facility_age_groups FOR SELECT
USING (facility_id IN (SELECT id FROM public.facilities WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert age groups for their facilities"
ON public.facility_age_groups FOR INSERT
WITH CHECK (facility_id IN (SELECT id FROM public.facilities WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete age groups from their facilities"
ON public.facility_age_groups FOR DELETE
USING (facility_id IN (SELECT id FROM public.facilities WHERE user_id = auth.uid()));

-- Facility insurance policies
CREATE POLICY "Users can view insurance of their facilities"
ON public.facility_insurance FOR SELECT
USING (facility_id IN (SELECT id FROM public.facilities WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert insurance for their facilities"
ON public.facility_insurance FOR INSERT
WITH CHECK (facility_id IN (SELECT id FROM public.facilities WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete insurance from their facilities"
ON public.facility_insurance FOR DELETE
USING (facility_id IN (SELECT id FROM public.facilities WHERE user_id = auth.uid()));

-- Facility credentials policies
CREATE POLICY "Users can view credentials of their facilities"
ON public.facility_credentials FOR SELECT
USING (facility_id IN (SELECT id FROM public.facilities WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert credentials for their facilities"
ON public.facility_credentials FOR INSERT
WITH CHECK (facility_id IN (SELECT id FROM public.facilities WHERE user_id = auth.uid()));

CREATE POLICY "Users can update credentials of their facilities"
ON public.facility_credentials FOR UPDATE
USING (facility_id IN (SELECT id FROM public.facilities WHERE user_id = auth.uid()));

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_facilities_updated_at
BEFORE UPDATE ON public.facilities
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();