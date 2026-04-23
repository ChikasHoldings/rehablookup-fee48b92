-- The public_facilities view is defined with security_invoker=on, so anonymous PostgREST
-- requests need SELECT on the underlying facilities table as well. Row Level Security still
-- restricts anon to approved, non-suspended rows via the existing
-- "Anon can read approved facilities for public view" policy.
GRANT SELECT ON public.facilities TO anon, authenticated;

-- Same situation for the joined detail tables that CenterProfile.tsx fetches in parallel.
-- Each table already has anon-read RLS policies; only the table-level grant was missing.
GRANT SELECT ON public.facility_services TO anon, authenticated;
GRANT SELECT ON public.facility_insurance TO anon, authenticated;
GRANT SELECT ON public.facility_age_groups TO anon, authenticated;
GRANT SELECT ON public.facility_credentials TO anon, authenticated;
GRANT SELECT ON public.facility_accreditations TO anon, authenticated;