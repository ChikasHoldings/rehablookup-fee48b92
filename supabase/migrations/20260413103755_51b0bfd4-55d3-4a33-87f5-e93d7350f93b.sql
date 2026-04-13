
-- Server-side facility data validation trigger
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

  -- Validate website length if provided
  IF NEW.website IS NOT NULL AND length(NEW.website) > 500 THEN
    RAISE EXCEPTION 'Website URL must be 500 characters or less';
  END IF;

  -- Validate description length if provided
  IF NEW.description IS NOT NULL AND length(NEW.description) > 2000 THEN
    RAISE EXCEPTION 'Description must be 2000 characters or less';
  END IF;

  -- Validate state is not empty
  IF NEW.state IS NULL OR trim(NEW.state) = '' THEN
    RAISE EXCEPTION 'State is required';
  END IF;

  RETURN NEW;
END;
$$;

-- Attach trigger to facilities table
DROP TRIGGER IF EXISTS validate_facility_data_trigger ON public.facilities;
CREATE TRIGGER validate_facility_data_trigger
  BEFORE INSERT OR UPDATE ON public.facilities
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_facility_data();
