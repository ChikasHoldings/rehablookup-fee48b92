-- M1 (partial): Move pg_trgm out of the public schema into a dedicated extensions schema.
-- pg_net cannot be relocated (does not support SET SCHEMA in current Supabase platform);
-- it will remain in public. This is an accepted upstream limitation; documented here so the
-- residual linter warning is expected.

CREATE SCHEMA IF NOT EXISTS extensions;

GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;

ALTER EXTENSION pg_trgm SET SCHEMA extensions;

-- Ensure search_path includes the new schema so function calls (similarity, %, etc.) keep working.
ALTER DATABASE postgres SET search_path TO public, extensions;