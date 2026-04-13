-- =====================================================
-- 1. Profile data validation trigger
-- =====================================================
CREATE OR REPLACE FUNCTION public.validate_profile_data()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Strip HTML tags from text fields (XSS prevention)
  IF NEW.first_name IS NOT NULL THEN
    NEW.first_name := regexp_replace(NEW.first_name, '<[^>]*>', '', 'g');
    NEW.first_name := regexp_replace(NEW.first_name, 'javascript:', '', 'gi');
    NEW.first_name := trim(NEW.first_name);
    IF length(NEW.first_name) > 50 THEN
      RAISE EXCEPTION 'First name must be 50 characters or less';
    END IF;
  END IF;

  IF NEW.last_name IS NOT NULL THEN
    NEW.last_name := regexp_replace(NEW.last_name, '<[^>]*>', '', 'g');
    NEW.last_name := regexp_replace(NEW.last_name, 'javascript:', '', 'gi');
    NEW.last_name := trim(NEW.last_name);
    IF length(NEW.last_name) > 50 THEN
      RAISE EXCEPTION 'Last name must be 50 characters or less';
    END IF;
  END IF;

  IF NEW.job_title IS NOT NULL THEN
    NEW.job_title := regexp_replace(NEW.job_title, '<[^>]*>', '', 'g');
    NEW.job_title := regexp_replace(NEW.job_title, 'javascript:', '', 'gi');
    NEW.job_title := trim(NEW.job_title);
    IF length(NEW.job_title) > 100 THEN
      RAISE EXCEPTION 'Job title must be 100 characters or less';
    END IF;
  END IF;

  IF NEW.email IS NOT NULL AND NEW.email != '' THEN
    NEW.email := trim(NEW.email);
    IF length(NEW.email) > 255 THEN
      RAISE EXCEPTION 'Email must be 255 characters or less';
    END IF;
    IF NEW.email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
      RAISE EXCEPTION 'Invalid email format';
    END IF;
  END IF;

  IF NEW.phone IS NOT NULL THEN
    NEW.phone := regexp_replace(NEW.phone, '<[^>]*>', '', 'g');
    NEW.phone := trim(NEW.phone);
    IF length(NEW.phone) > 30 THEN
      RAISE EXCEPTION 'Phone must be 30 characters or less';
    END IF;
  END IF;

  -- On INSERT, require first and last name
  IF TG_OP = 'INSERT' THEN
    IF NEW.first_name IS NULL OR trim(NEW.first_name) = '' THEN
      RAISE EXCEPTION 'First name is required';
    END IF;
    IF NEW.last_name IS NULL OR trim(NEW.last_name) = '' THEN
      RAISE EXCEPTION 'Last name is required';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_profile_data_trigger
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_profile_data();

-- =====================================================
-- 2. Add year_established validation to facility trigger
-- =====================================================
CREATE OR REPLACE FUNCTION public.validate_facility_data()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_allowed_types text[] := ARRAY[
    'Residential Treatment Center',
    'Outpatient Program',
    'Detox Center',
    'Intensive Outpatient (IOP)',
    'Partial Hospitalization (PHP)',
    'Sober Living',
    'Dual Diagnosis',
    'Luxury Rehab',
    'Telehealth/Virtual'
  ];
BEGIN
  -- Validate facility_type against whitelist
  IF NOT (NEW.facility_type = ANY(v_allowed_types)) THEN
    RAISE EXCEPTION 'Invalid facility type: %. Must be one of: %', 
      NEW.facility_type, array_to_string(v_allowed_types, ', ');
  END IF;

  -- Strip HTML tags from text fields (XSS prevention)
  NEW.name := regexp_replace(NEW.name, '<[^>]*>', '', 'g');
  NEW.address := regexp_replace(NEW.address, '<[^>]*>', '', 'g');
  NEW.city := regexp_replace(NEW.city, '<[^>]*>', '', 'g');
  IF NEW.description IS NOT NULL THEN
    NEW.description := regexp_replace(NEW.description, '<[^>]*>', '', 'g');
  END IF;

  -- Strip dangerous protocols
  NEW.name := regexp_replace(NEW.name, 'javascript:', '', 'gi');
  NEW.address := regexp_replace(NEW.address, 'javascript:', '', 'gi');

  -- Enforce field length limits
  IF length(NEW.name) < 2 OR length(NEW.name) > 100 THEN
    RAISE EXCEPTION 'Facility name must be between 2 and 100 characters';
  END IF;

  IF length(NEW.address) > 200 THEN
    RAISE EXCEPTION 'Address must be 200 characters or less';
  END IF;

  IF length(NEW.city) > 100 THEN
    RAISE EXCEPTION 'City must be 100 characters or less';
  END IF;

  IF length(NEW.phone) > 30 THEN
    RAISE EXCEPTION 'Phone must be 30 characters or less';
  END IF;

  -- Validate ZIP code format
  IF NEW.zip_code !~ '^\d{5}(-\d{4})?$' THEN
    RAISE EXCEPTION 'ZIP code must be in format 12345 or 12345-6789';
  END IF;

  -- Validate email format if provided
  IF NEW.email IS NOT NULL AND NEW.email != '' AND NEW.email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RAISE EXCEPTION 'Invalid email format';
  END IF;

  -- Validate website - block dangerous protocols
  IF NEW.website IS NOT NULL THEN
    IF NEW.website ~* '^(javascript|data):' THEN
      NEW.website := NULL;
    END IF;
    IF length(NEW.website) > 500 THEN
      RAISE EXCEPTION 'Website URL must be 500 characters or less';
    END IF;
  END IF;

  -- Validate description length if provided
  IF NEW.description IS NOT NULL AND length(NEW.description) > 2000 THEN
    RAISE EXCEPTION 'Description must be 2000 characters or less';
  END IF;

  -- Validate state is not empty
  IF NEW.state IS NULL OR trim(NEW.state) = '' THEN
    RAISE EXCEPTION 'State is required';
  END IF;

  -- Validate year_established if provided
  IF NEW.year_established IS NOT NULL THEN
    IF NEW.year_established < 1900 OR NEW.year_established > EXTRACT(YEAR FROM now())::int THEN
      RAISE EXCEPTION 'Year established must be between 1900 and the current year';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;