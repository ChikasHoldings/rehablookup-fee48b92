-- Restore SELECT grants on public_facilities view that were dropped by recent hardening migrations.
-- Without these grants, anonymous and authenticated PostgREST queries return HTTP 401, breaking
-- the public facility profile page (CenterProfile.tsx) and any other client that reads via the
-- anon Supabase client.
GRANT SELECT ON public.public_facilities TO anon, authenticated;