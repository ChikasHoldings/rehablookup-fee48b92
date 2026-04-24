
-- SECURITY DEFINER RPC: super-admin force status change on concierge_inquiries
-- Bypasses the validate_concierge_status_transition trigger by temporarily
-- disabling session_replication_role for this transaction only.
CREATE OR REPLACE FUNCTION public.admin_force_concierge_status(
  p_inquiry_id uuid,
  p_new_status text,
  p_reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_old_status text;
  v_admin_role text;
BEGIN
  -- Verify caller is an active super_admin
  SELECT admin_role::text INTO v_admin_role
  FROM public.admin_user_profiles
  WHERE user_id = auth.uid() AND status = 'active';

  IF v_admin_role IS NULL OR v_admin_role <> 'super_admin' THEN
    RAISE EXCEPTION 'Only active super_admin may force status changes';
  END IF;

  -- Validate target status
  IF p_new_status NOT IN (
    'pending_intake','intake_submitted','intake_reviewed','advisor_assigned',
    'matching_providers','provider_prequalification','providers_accepted',
    'presented_to_seeker','seeker_selected','admission_in_progress',
    'admitted','billed','completed','closed'
  ) THEN
    RAISE EXCEPTION 'Invalid target status: %', p_new_status;
  END IF;

  SELECT status INTO v_old_status FROM public.concierge_inquiries WHERE id = p_inquiry_id;
  IF v_old_status IS NULL THEN
    RAISE EXCEPTION 'Inquiry not found: %', p_inquiry_id;
  END IF;

  -- Disable triggers within this session/transaction so the validation
  -- trigger does not block out-of-sequence transitions.
  SET LOCAL session_replication_role = 'replica';

  UPDATE public.concierge_inquiries
  SET
    status = p_new_status,
    closed_at = CASE WHEN p_new_status = 'closed' THEN now() ELSE closed_at END,
    updated_at = now()
  WHERE id = p_inquiry_id;

  -- Restore default trigger behaviour for the rest of the transaction
  SET LOCAL session_replication_role = 'origin';

  -- Log the override
  INSERT INTO public.admin_audit_log (admin_user_id, action_type, target_type, target_id, details)
  VALUES (
    auth.uid(),
    'force_status_change',
    'concierge_inquiry',
    p_inquiry_id,
    jsonb_build_object(
      'old_status', v_old_status,
      'new_status', p_new_status,
      'reason', p_reason
    )
  );

  INSERT INTO public.concierge_case_events (inquiry_id, event_type, event_data, actor_type, actor_id)
  VALUES (
    p_inquiry_id,
    'status_force_changed',
    jsonb_build_object('old_status', v_old_status, 'new_status', p_new_status, 'reason', p_reason),
    'admin',
    auth.uid()
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_force_concierge_status(uuid, text, text) TO authenticated;
