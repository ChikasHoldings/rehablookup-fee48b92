-- Verification RPC for leads_provider_view RLS guarantees
CREATE OR REPLACE FUNCTION public.verify_leads_provider_view_rls()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_view_exists boolean;
  v_view_kind   "char";
  v_leads_rls   boolean;
  v_policy_count int;
  v_required_policies text[] := ARRAY[
    'Owners can view their facility leads',
    'Providers can view their redistributed leads'
  ];
  v_missing text[];
  v_view_invoker boolean;
  v_failures jsonb := '[]'::jsonb;
  v_ok boolean := true;
BEGIN
  -- 1. View must exist
  SELECT (c.relkind = 'v'), c.relkind
    INTO v_view_exists, v_view_kind
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname = 'leads_provider_view';

  IF NOT COALESCE(v_view_exists, false) THEN
    v_ok := false;
    v_failures := v_failures || jsonb_build_object(
      'check', 'view_exists',
      'message', 'public.leads_provider_view is missing'
    );
  END IF;

  -- 2. Underlying leads table must have RLS enabled
  SELECT c.relrowsecurity INTO v_leads_rls
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname = 'leads';

  IF NOT COALESCE(v_leads_rls, false) THEN
    v_ok := false;
    v_failures := v_failures || jsonb_build_object(
      'check', 'leads_rls_enabled',
      'message', 'RLS is not enabled on public.leads (view inherits its policies)'
    );
  END IF;

  -- 3. Required SELECT policies on public.leads
  SELECT array_agg(p) FROM unnest(v_required_policies) p
  WHERE NOT EXISTS (
    SELECT 1 FROM pg_policy
    WHERE polrelid = 'public.leads'::regclass
      AND polname = p
      AND polcmd = 'r'
  )
  INTO v_missing;

  IF v_missing IS NOT NULL AND array_length(v_missing, 1) > 0 THEN
    v_ok := false;
    v_failures := v_failures || jsonb_build_object(
      'check', 'required_policies',
      'message', 'Missing required SELECT policies on public.leads',
      'missing', to_jsonb(v_missing)
    );
  END IF;

  -- 4. Total SELECT policy count (sanity floor)
  SELECT count(*) INTO v_policy_count
  FROM pg_policy
  WHERE polrelid = 'public.leads'::regclass AND polcmd = 'r';

  IF v_policy_count < 2 THEN
    v_ok := false;
    v_failures := v_failures || jsonb_build_object(
      'check', 'policy_count_floor',
      'message', format('Expected >=2 SELECT policies on leads, found %s', v_policy_count)
    );
  END IF;

  -- 5. View must run with security_invoker so RLS on leads is enforced
  --    Postgres 15+ stores reloptions including security_invoker=true
  SELECT EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'leads_provider_view'
      AND c.reloptions @> ARRAY['security_invoker=true']
  ) INTO v_view_invoker;

  IF NOT COALESCE(v_view_invoker, false) THEN
    v_ok := false;
    v_failures := v_failures || jsonb_build_object(
      'check', 'view_security_invoker',
      'message', 'leads_provider_view must be created WITH (security_invoker = true) so caller RLS applies'
    );
  END IF;

  RETURN jsonb_build_object(
    'ok', v_ok,
    'view_exists', COALESCE(v_view_exists, false),
    'leads_rls_enabled', COALESCE(v_leads_rls, false),
    'select_policy_count', v_policy_count,
    'security_invoker', COALESCE(v_view_invoker, false),
    'failures', v_failures
  );
END;
$$;

-- Ensure the view runs with security_invoker so the caller's RLS on leads is enforced
ALTER VIEW public.leads_provider_view SET (security_invoker = true);

REVOKE ALL ON FUNCTION public.verify_leads_provider_view_rls() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_leads_provider_view_rls() TO authenticated, service_role;