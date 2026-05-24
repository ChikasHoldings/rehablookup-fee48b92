-- Refinements layered on top of the re-verification engine:
--
-- 1) Expiry-driven soft events should map to state='expiring_soon'
--    (the spec's distinct lifecycle state), not the generic 'review_due'.
--    The original record_re_verification_event() mapped every soft
--    signal to review_due; this version branches on event_type.
--
-- 2) unclaim_abandoned_facility(facility_id) — the spec's
--    "On final suspension of an abandoned account, revert the listing
--    to an UNCLAIMED state rather than deleting it" path. The escalation
--    timeline (which determines WHEN this is called) is CONFIG per spec
--    and lives in the admin queue UI, but the primitive itself belongs
--    here so the wiring is the same regardless of who triggers it.
--
-- 3) Suspension via record_re_verification_event (hard signal with
--    config OFF) also stops here; it's the only auto-suspend path.

BEGIN;

CREATE OR REPLACE FUNCTION public.record_re_verification_event(
  p_facility_id uuid,
  p_event_type text,
  p_severity text DEFAULT NULL,
  p_payload jsonb DEFAULT '{}'::jsonb,
  p_dedup_key text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_id uuid;
  v_severity text;
  v_config record;
  v_existing_dup uuid;
  v_new_state text;
  v_badge_visible boolean;
  v_remediation_deadline timestamptz;
BEGIN
  IF p_facility_id IS NULL OR p_event_type IS NULL THEN
    RAISE EXCEPTION 'facility_id and event_type are required';
  END IF;

  SELECT * INTO v_config FROM public.re_verification_config WHERE id=1;

  v_severity := COALESCE(p_severity, CASE p_event_type
    WHEN 'samhsa_dropout'            THEN 'soft'
    WHEN 'license_expiring_60d'      THEN 'soft'
    WHEN 'license_expiring_30d'      THEN 'soft'
    WHEN 'license_expired'           THEN 'medium'
    WHEN 'accreditation_lapsed'      THEN 'medium'
    WHEN 'backstop_sweep_due'        THEN 'soft'
    WHEN 'competing_claim'           THEN 'soft'
    WHEN 'provider_field_edit'       THEN 'soft'
    WHEN 'user_report'               THEN 'soft'
    WHEN 'google_permanently_closed' THEN 'hard'
    WHEN 'address_change'            THEN 'soft'
    ELSE 'soft'
  END);

  IF p_dedup_key IS NOT NULL AND v_severity = 'soft' THEN
    SELECT id INTO v_existing_dup
    FROM public.re_verification_events
    WHERE facility_id = p_facility_id
      AND event_type = p_event_type
      AND dedup_key = p_dedup_key
      AND created_at >= now() - (v_config.soft_dedup_days || ' days')::interval
    ORDER BY created_at DESC LIMIT 1;
    IF v_existing_dup IS NOT NULL THEN
      RETURN v_existing_dup;
    END IF;
  END IF;

  INSERT INTO public.re_verification_events (
    facility_id, event_type, severity, payload, dedup_key
  ) VALUES (
    p_facility_id, p_event_type, v_severity, COALESCE(p_payload,'{}'::jsonb), p_dedup_key
  )
  RETURNING id INTO v_event_id;

  -- State mapping. Soft expiry warnings get their own state per spec.
  IF v_severity = 'soft' THEN
    IF p_event_type IN ('license_expiring_60d','license_expiring_30d') THEN
      v_new_state := 'expiring_soon';
    ELSE
      v_new_state := 'review_due';
    END IF;
    v_badge_visible := true;
    v_remediation_deadline := now() + (v_config.soft_grace_days || ' days')::interval;
  ELSIF v_severity = 'medium' THEN
    v_new_state := 'lapsed';
    v_badge_visible := false;
    v_remediation_deadline := now() + (v_config.medium_remediation_days || ' days')::interval;
  ELSIF v_severity = 'hard' THEN
    IF v_config.hard_signal_requires_human_confirmation THEN
      v_new_state := 'lapsed';
      v_badge_visible := false;
      v_remediation_deadline := now() + (v_config.medium_remediation_days || ' days')::interval;
      UPDATE public.re_verification_events
        SET resolution = 'pending_review'
        WHERE id = v_event_id;
    ELSE
      v_new_state := 'suspended';
      v_badge_visible := false;
      v_remediation_deadline := NULL;
      UPDATE public.facilities
        SET suspended = true, updated_at = now()
        WHERE id = p_facility_id;
      UPDATE public.re_verification_events
        SET resolution = 'suspended', resolved_at = now()
        WHERE id = v_event_id;
    END IF;
  END IF;

  -- State-machine monotonicity: never downgrade from a stricter state.
  -- Order from strictest to loosest:
  --   suspended > lapsed > expiring_soon > review_due > verified
  INSERT INTO public.facility_verification_state (
    facility_id, state, badge_visible, last_trigger,
    last_checked_at, remediation_deadline, reason
  )
  VALUES (
    p_facility_id, v_new_state, v_badge_visible, p_event_type,
    now(), v_remediation_deadline,
    jsonb_build_array(jsonb_build_object(
      'event_type', p_event_type, 'severity', v_severity, 'at', now()
    ))
  )
  ON CONFLICT (facility_id) DO UPDATE
  SET
    state = CASE
      WHEN public.facility_verification_state.state = 'suspended' THEN public.facility_verification_state.state
      WHEN public.facility_verification_state.state = 'lapsed'
        AND EXCLUDED.state IN ('review_due','expiring_soon')        THEN public.facility_verification_state.state
      WHEN public.facility_verification_state.state = 'expiring_soon'
        AND EXCLUDED.state = 'review_due'                           THEN public.facility_verification_state.state
      ELSE EXCLUDED.state
    END,
    badge_visible = CASE
      WHEN public.facility_verification_state.state = 'suspended' THEN public.facility_verification_state.badge_visible
      WHEN public.facility_verification_state.state = 'lapsed'
        AND EXCLUDED.state IN ('review_due','expiring_soon')        THEN public.facility_verification_state.badge_visible
      ELSE EXCLUDED.badge_visible
    END,
    last_trigger = EXCLUDED.last_trigger,
    last_checked_at = EXCLUDED.last_checked_at,
    remediation_deadline = COALESCE(EXCLUDED.remediation_deadline, public.facility_verification_state.remediation_deadline),
    reason = public.facility_verification_state.reason || EXCLUDED.reason,
    updated_at = now();

  IF p_event_type != 'backstop_sweep_due' THEN
    PERFORM public._re_verify_notify_provider(
      p_facility_id, p_event_type, v_severity, p_payload
    );
  END IF;

  IF v_severity = 'soft' OR v_severity = 'medium' THEN
    UPDATE public.re_verification_events
      SET resolution = CASE WHEN v_severity = 'medium' THEN 'lapsed' ELSE 'notified' END
      WHERE id = v_event_id;
  END IF;

  RETURN v_event_id;
END;
$$;


-- Final step of the abandoned-account escalation timeline. Spec:
--   "On final suspension of an abandoned account, revert the listing
--    to an UNCLAIMED state rather than deleting it, so a real facility
--    is not erased and can be re-claimed later."
-- Distinct from a hard-signal suspension (which UNPUBLISHES). Here we
-- KEEP the listing published but strip ownership + the verified flag,
-- so the facility re-enters the unclaimed pool.
CREATE OR REPLACE FUNCTION public.unclaim_abandoned_facility(
  p_facility_id uuid,
  p_reason text DEFAULT 'Abandoned account: unresponsive after final escalation.'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_facility record;
BEGIN
  IF v_user IS NULL OR NOT has_role(v_user, 'admin'::app_role) THEN
    RAISE EXCEPTION 'Admin role required' USING ERRCODE='42501';
  END IF;
  SELECT * INTO v_facility FROM public.facilities WHERE id = p_facility_id;
  IF v_facility.id IS NULL THEN
    RAISE EXCEPTION 'Facility not found';
  END IF;

  UPDATE public.facilities
  SET user_id = NULL,
      claimed_at = NULL,
      verified = false,
      updated_at = now()
  WHERE id = p_facility_id;

  UPDATE public.facility_verification_state
  SET state = 'review_due',
      badge_visible = false,
      last_trigger = 'admin_unclaimed_abandoned',
      remediation_deadline = NULL,
      reason = reason || jsonb_build_array(jsonb_build_object(
        'event_type', 'unclaim_abandoned', 'at', now(), 'admin', v_user, 'reason', p_reason
      )),
      updated_at = now()
  WHERE facility_id = p_facility_id;

  INSERT INTO public.admin_notifications (type, title, message, metadata)
  VALUES (
    'facility_unclaimed_abandoned',
    'Facility reverted to unclaimed (abandoned)',
    format('Facility %s (%s) was reverted to unclaimed after final escalation. Listing remains published.',
           v_facility.name, p_facility_id),
    jsonb_build_object(
      'facility_id', p_facility_id,
      'previous_owner', v_facility.user_id,
      'reason', p_reason
    )
  );

  RETURN jsonb_build_object(
    'facility_id', p_facility_id,
    'previous_owner', v_facility.user_id,
    'now_unclaimed', true
  );
END;
$$;

REVOKE ALL ON FUNCTION public.unclaim_abandoned_facility(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.unclaim_abandoned_facility(uuid, text) TO authenticated;

COMMIT;
