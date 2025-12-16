-- Drop the security definer function that was causing the warning
DROP FUNCTION IF EXISTS public.get_public_facility_by_slug(text);