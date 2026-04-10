
-- Fix SECURITY DEFINER view - change to INVOKER
ALTER VIEW public.public_facility_staff SET (security_invoker = on);
