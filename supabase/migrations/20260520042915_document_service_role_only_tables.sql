-- Document the RLS-enabled-but-zero-policy tables as intentionally
-- service-role-only. The Supabase advisor INFO lint will continue to
-- flag these (it's a structural check on policy count), but a
-- developer reading the schema now sees the intent in pg_class
-- comments without needing to find the originating migration.
COMMENT ON TABLE public.lead_email_resend_attempts IS
  'Rate-limit counters for the resend-lead-confirmation edge function. '
  'Service-role only — anon/authenticated clients have no direct '
  'access by design. RLS is enabled with zero policies (full lockdown); '
  'all reads/writes happen via the SUPABASE_SERVICE_ROLE_KEY from the '
  'edge function.';
