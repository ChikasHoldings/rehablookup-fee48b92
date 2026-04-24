COMMENT ON VIEW public.leads_provider_view IS
$$Provider-facing view over public.leads that masks PII unless the caller has an unlock for the lead.

MASKING CONTRACT (do not weaken without security review):
  - name, email, phone, message are returned ONLY when the calling user (auth.uid()) owns a facility
    that has an entry in lead_unlocks for this lead.
  - For service_role callers and anon callers, auth.uid() is NULL → masked.
  - Any new RPC or edge function that sets request.jwt.claim.sub manually MUST NOT be exposed to
    untrusted callers; spoofing the claim would unmask another provider's data through this view.
  - Negative test: see public.test_leads_provider_view_masks_non_owner() — runs in CI / on demand.
$$;

CREATE OR REPLACE FUNCTION public.test_leads_provider_view_masks_non_owner()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead_id uuid;
  v_other_id uuid := gen_random_uuid();
  v_raw_name text;
  v_raw_email text;
  v_raw_phone text;
  v_raw_message text;
  v_view_name text;
  v_view_email text;
  v_view_phone text;
  v_view_message text;
  v_is_unlocked boolean;
  v_checked int := 0;
BEGIN
  SELECT id, name, email, phone, message
    INTO v_lead_id, v_raw_name, v_raw_email, v_raw_phone, v_raw_message
  FROM public.leads
  WHERE name IS NOT NULL OR email IS NOT NULL OR phone IS NOT NULL
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_lead_id IS NULL THEN
    RETURN jsonb_build_object('status', 'skipped', 'reason', 'no leads with PII present');
  END IF;

  -- Simulate a NON-owner viewer by setting the JWT sub claim that current_auth_uid() reads.
  PERFORM set_config('request.jwt.claim.sub', v_other_id::text, true);
  PERFORM set_config(
    'request.jwt.claims',
    json_build_object('sub', v_other_id::text, 'role', 'authenticated')::text,
    true
  );

  SELECT name, email, phone, message, is_unlocked
    INTO v_view_name, v_view_email, v_view_phone, v_view_message, v_is_unlocked
  FROM public.leads_provider_view
  WHERE id = v_lead_id;

  -- Reset claims
  PERFORM set_config('request.jwt.claim.sub', '', true);
  PERFORM set_config('request.jwt.claims', '', true);

  IF v_is_unlocked IS TRUE THEN
    RAISE EXCEPTION 'MASKING CONTRACT VIOLATION: is_unlocked=true returned to non-owner viewer';
  END IF;

  IF v_raw_email IS NOT NULL THEN
    v_checked := v_checked + 1;
    IF v_view_email = v_raw_email THEN
      RAISE EXCEPTION 'MASKING CONTRACT VIOLATION: email leaked to non-owner';
    END IF;
  END IF;

  IF v_raw_phone IS NOT NULL THEN
    v_checked := v_checked + 1;
    IF v_view_phone = v_raw_phone THEN
      RAISE EXCEPTION 'MASKING CONTRACT VIOLATION: phone leaked to non-owner';
    END IF;
  END IF;

  IF v_raw_name IS NOT NULL AND length(v_raw_name) > 2 THEN
    v_checked := v_checked + 1;
    IF v_view_name = v_raw_name THEN
      RAISE EXCEPTION 'MASKING CONTRACT VIOLATION: full name leaked to non-owner';
    END IF;
  END IF;

  IF v_raw_message IS NOT NULL THEN
    v_checked := v_checked + 1;
    IF v_view_message = v_raw_message THEN
      RAISE EXCEPTION 'MASKING CONTRACT VIOLATION: message leaked to non-owner';
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'status', 'pass',
    'checked_lead_id', v_lead_id,
    'fields_checked', v_checked,
    'simulated_viewer', v_other_id
  );
END;
$$;

DO $$
DECLARE
  v_result jsonb;
BEGIN
  v_result := public.test_leads_provider_view_masks_non_owner();
  RAISE NOTICE 'leads_provider_view masking contract: %', v_result;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.test_leads_provider_view_masks_non_owner() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.test_leads_provider_view_masks_non_owner() TO service_role;