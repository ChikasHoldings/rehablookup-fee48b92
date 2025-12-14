-- Create a function to generate slugs from facility name, city, and state
CREATE OR REPLACE FUNCTION public.generate_facility_slug()
RETURNS TRIGGER AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 0;
BEGIN
  -- Only generate slug if it's null or empty
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    -- Generate base slug from name, city, state
    base_slug := lower(
      regexp_replace(
        regexp_replace(
          NEW.name || '-' || NEW.city || '-' || NEW.state,
          '[^a-zA-Z0-9\s-]', '', 'g'
        ),
        '\s+', '-', 'g'
      )
    );
    
    -- Remove multiple consecutive dashes
    base_slug := regexp_replace(base_slug, '-+', '-', 'g');
    -- Trim dashes from start and end
    base_slug := trim(BOTH '-' FROM base_slug);
    
    final_slug := base_slug;
    
    -- Check for uniqueness and add counter if needed
    WHILE EXISTS (SELECT 1 FROM public.facilities WHERE slug = final_slug AND id != NEW.id) LOOP
      counter := counter + 1;
      final_slug := base_slug || '-' || counter;
    END LOOP;
    
    NEW.slug := final_slug;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger to auto-generate slug before insert or update
DROP TRIGGER IF EXISTS generate_slug_trigger ON public.facilities;
CREATE TRIGGER generate_slug_trigger
BEFORE INSERT OR UPDATE ON public.facilities
FOR EACH ROW
EXECUTE FUNCTION public.generate_facility_slug();

-- Generate slugs for existing facilities that don't have one
UPDATE public.facilities 
SET slug = NULL 
WHERE slug IS NULL;