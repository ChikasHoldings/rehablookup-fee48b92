-- Re-grant SELECT on the public_facilities view to anon and authenticated.
-- The previous grants were lost (likely due to a view recreation elsewhere).
-- We also set default privileges so any future view recreation by postgres
-- automatically preserves these grants.

GRANT SELECT ON public.public_facilities TO anon, authenticated;

-- Ensure schema usage (should already be granted, but make idempotent)
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Set default privileges so future tables/views created by postgres in public
-- schema automatically grant SELECT to anon and authenticated.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT SELECT ON TABLES TO anon, authenticated;

-- Also explicitly re-grant on all existing views/tables in public schema
-- to catch anything else that may have lost grants.
GRANT SELECT ON public.public_facilities TO anon;
GRANT SELECT ON public.public_facilities TO authenticated;