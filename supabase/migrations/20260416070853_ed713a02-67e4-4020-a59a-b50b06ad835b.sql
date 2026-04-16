
-- Fix leads_provider_view: must use security_invoker instead of security_barrier
-- First get the current view definition and recreate with security_invoker
DO $$
DECLARE
  view_def text;
BEGIN
  SELECT pg_get_viewdef('public.leads_provider_view', true) INTO view_def;
  EXECUTE 'DROP VIEW IF EXISTS public.leads_provider_view CASCADE';
  EXECUTE 'CREATE VIEW public.leads_provider_view WITH (security_invoker = on) AS ' || view_def;
  EXECUTE 'GRANT SELECT ON public.leads_provider_view TO authenticated';
  EXECUTE 'GRANT SELECT ON public.leads_provider_view TO service_role';
END $$;
