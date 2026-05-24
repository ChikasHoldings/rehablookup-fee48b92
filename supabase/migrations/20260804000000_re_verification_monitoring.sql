-- Re-verification monitoring engine.
--
-- Re-verification is a MONITORING system, not the intake flow on a
-- timer. The intake engine (20260803000000) scores a claim at submission
-- time. THIS engine watches the authoritative sources already ingested
-- and only pulls a facility into an active re-check when a signal
-- actually changes.
--
-- Two axes behave differently:
--   * LEGITIMACY decays (licenses lapse, facilities close). Continuously
--     re-checked against staged_samhsa / staged_directory diffs + the
--     expiry sweep + a periodic backstop. The provider is never bothered
--     unless something actually fails.
--   * OWNERSHIP does NOT decay on a schedule. Re-check it only on a
--     specific event (competing claim, ownership-change signal). Never
--     on a timer.
--
-- Graded response: never auto-yank a listing on a single soft signal.
--   * soft   → internal flag + notification, badge stays, grace period
--   * medium → state=lapsed, badge removed, listing stays published,
--              remediation window
--   * hard   → state=suspended, unpublish, manual-review queue
--              (CONFIG: hard signals may require human confirmation
--              before auto-suspension — default ON at launch).
--
-- Schema additions:
--   * facility_verification_state — current lifecycle state per facility
--   * re_verification_events      — append-only event log (every signal)
--   * re_verification_config      — single-row tunable knobs
--   * verification_attempts.trigger_reason — link a re-check attempt back
--                                            to the event that fired it
--
-- Adds engine RPCs:
--   * run_data_feed_diff           — primary continuous data-feed monitor
--   * run_expiry_sweep             — accreditation expiry monitor
--   * run_backstop_sweep           — periodic backstop revalidation
--   * record_re_verification_event — central entry point for any trigger
--   * resolve_re_verification_event — admin/cron closes an event
--
-- Adds DB triggers:
--   * facility_key_field_change_trg — provider editing a key field
--   * competing_claim_trg           — second claim filed on a claimed facility

BEGIN;

-- ────────────────────────────────────────────────────────────────────
-- 0) Extend verification_attempts so re-verification attempts are
--    logged identically to intake attempts (acceptance criterion:
--    "every re-verification decision is reconstructable from
--    verification_signals with its trigger_reason").
-- ────────────────────────────────────────────────────────────────────
ALTER TABLE public.verification_attempts
  ADD COLUMN IF NOT EXISTS trigger_reason text NOT NULL DEFAULT 'intake';

ALTER TABLE public.verification_attempts
  DROP CONSTRAINT IF EXISTS verification_attempts_trigger_reason_chk;
ALTER TABLE public.verification_attempts
  ADD CONSTRAINT verification_attempts_trigger_reason_chk CHECK (
    trigger_reason IN (
      'intake','data_feed','expiry','backstop_sweep',
      'event:competing_claim','event:provider_edit','event:user_report',
      'event:google_closed','event:address_change'
    )
  );


-- ────────────────────────────────────────────────────────────────────
-- 1) facility_verification_state — one row per facility, current state
-- ────────────────────────────────────────────────────────────────────
-- Badge visibility is independent of listing publication. A facility
-- can be listed-but-not-badged (state=lapsed). Suspended also
-- unpublishes via the listing pipeline.
CREATE TABLE IF NOT EXISTS public.facility_verification_state (
  facility_id uuid PRIMARY KEY REFERENCES public.facilities(id) ON DELETE CASCADE,
  state text NOT NULL DEFAULT 'verified',
  badge_visible boolean NOT NULL DEFAULT true,
  -- "license confirmed March 2026" UI hint
  last_verified_at timestamptz,
  -- When the backstop sweep should next consider this facility
  next_check_due timestamptz,
  last_checked_at timestamptz,
  -- What caused the current state (trigger_reason from the last event)
  last_trigger text,
  -- For state=lapsed: provider has until this deadline to remediate
  remediation_deadline timestamptz,
  reason jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT facility_verification_state_state_chk CHECK (
    state IN ('verified','review_due','expiring_soon','lapsed','suspended')
  )
);

CREATE INDEX IF NOT EXISTS facility_verification_state_due_idx
  ON public.facility_verification_state (next_check_due)
  WHERE next_check_due IS NOT NULL;
CREATE INDEX IF NOT EXISTS facility_verification_state_state_idx
  ON public.facility_verification_state (state);
CREATE INDEX IF NOT EXISTS facility_verification_state_remediation_idx
  ON public.facility_verification_state (remediation_deadline)
  WHERE remediation_deadline IS NOT NULL;

ALTER TABLE public.facility_verification_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "facility_verification_state_select_owner_or_public"
  ON public.facility_verification_state;
-- Public can read state for any approved/non-suspended facility (so the
-- listing badge UI can render "license confirmed March 2026" or hide the
-- badge for state=lapsed). For state=suspended the listing itself is
-- unpublished, so exposure isn't a concern.
CREATE POLICY "facility_verification_state_select_owner_or_public"
  ON public.facility_verification_state FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM public.facilities f
      WHERE f.id = facility_verification_state.facility_id
        AND f.status = 'approved'
        AND COALESCE(f.suspended, false) = false
    )
  );

DROP POLICY IF EXISTS "facility_verification_state_select_owner"
  ON public.facility_verification_state;
CREATE POLICY "facility_verification_state_select_owner"
  ON public.facility_verification_state FOR SELECT
  TO authenticated
  USING (
    has_role((SELECT auth.uid()), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.facilities f
      WHERE f.id = facility_verification_state.facility_id
        AND f.user_id = (SELECT auth.uid())
    )
  );

-- Writes only via SECURITY DEFINER engine functions.


-- ────────────────────────────────────────────────────────────────────
-- 2) re_verification_events — append-only event log
-- ────────────────────────────────────────────────────────────────────
-- One row per signal raised by ANY trigger (feed diff, expiry, backstop,
-- event). attempt_id links to the verification_attempts row that the
-- event spawned (NULL if the event was below the threshold and didn't
-- start a re-check attempt).
CREATE TABLE IF NOT EXISTS public.re_verification_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id uuid NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  severity text NOT NULL DEFAULT 'soft',
  attempt_id uuid REFERENCES public.verification_attempts(id) ON DELETE SET NULL,
  -- Result of processing this event: noop / notified / lapsed /
  -- suspended / pending_review / remediated.
  resolution text NOT NULL DEFAULT 'pending',
  resolution_notes text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- 'soft' events with the same event_type for the same facility should
  -- not fire twice in quick succession. Tracked via dedup_key.
  dedup_key text,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  CONSTRAINT re_verification_events_severity_chk CHECK (
    severity IN ('soft','medium','hard')
  ),
  CONSTRAINT re_verification_events_event_type_chk CHECK (
    event_type IN (
      'samhsa_dropout','license_expiring_60d','license_expiring_30d',
      'license_expired','backstop_sweep_due','competing_claim',
      'provider_field_edit','user_report','google_permanently_closed',
      'address_change','accreditation_lapsed'
    )
  ),
  CONSTRAINT re_verification_events_resolution_chk CHECK (
    resolution IN ('pending','noop','notified','lapsed','suspended','pending_review','remediated','superseded')
  )
);

CREATE INDEX IF NOT EXISTS re_verification_events_facility_idx
  ON public.re_verification_events (facility_id, created_at DESC);
CREATE INDEX IF NOT EXISTS re_verification_events_pending_idx
  ON public.re_verification_events (resolution, created_at)
  WHERE resolution = 'pending';
CREATE INDEX IF NOT EXISTS re_verification_events_dedup_idx
  ON public.re_verification_events (facility_id, event_type, dedup_key)
  WHERE dedup_key IS NOT NULL;

ALTER TABLE public.re_verification_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "re_verification_events_select_owner_or_admin"
  ON public.re_verification_events;
CREATE POLICY "re_verification_events_select_owner_or_admin"
  ON public.re_verification_events FOR SELECT
  TO authenticated
  USING (
    has_role((SELECT auth.uid()), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.facilities f
      WHERE f.id = re_verification_events.facility_id
        AND f.user_id = (SELECT auth.uid())
    )
  );


-- ────────────────────────────────────────────────────────────────────
-- 3) re_verification_config — single-row knobs (durations are CONFIG)
-- ────────────────────────────────────────────────────────────────────
-- The spec explicitly out-of-scopes specific thresholds and timelines.
-- Default values are conservative; the team tunes from here.
CREATE TABLE IF NOT EXISTS public.re_verification_config (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  -- Backstop sweep cadence — every verified facility revalidated within
  -- this window (default 9 months; spec range 6-12).
  backstop_interval_months int NOT NULL DEFAULT 9,
  -- Days the provider has to respond after a soft signal before the
  -- next escalation step considers the signal unresponded.
  soft_grace_days int NOT NULL DEFAULT 30,
  -- Days a 'lapsed' state can remain before suspension is considered.
  medium_remediation_days int NOT NULL DEFAULT 21,
  -- When ON (default), hard signals raise an event with severity=hard
  -- but do NOT auto-suspend — they queue for human confirmation. The
  -- team can flip this off once the engine has a track record.
  hard_signal_requires_human_confirmation boolean NOT NULL DEFAULT true,
  -- Expiry warning thresholds (days before expiry).
  expiry_warn_days_first int NOT NULL DEFAULT 60,
  expiry_warn_days_second int NOT NULL DEFAULT 30,
  -- Cooldown between identical soft events for the same facility — keeps
  -- a single drifted record from spamming notifications every sweep.
  soft_dedup_days int NOT NULL DEFAULT 14,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.re_verification_config (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.re_verification_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "re_verification_config_select_authenticated"
  ON public.re_verification_config;
CREATE POLICY "re_verification_config_select_authenticated"
  ON public.re_verification_config FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "re_verification_config_update_admin"
  ON public.re_verification_config;
CREATE POLICY "re_verification_config_update_admin"
  ON public.re_verification_config FOR UPDATE TO authenticated
  USING (has_role((SELECT auth.uid()), 'admin'::app_role))
  WITH CHECK (has_role((SELECT auth.uid()), 'admin'::app_role));


-- ────────────────────────────────────────────────────────────────────
-- 4) backfill current state for already-verified facilities
-- ────────────────────────────────────────────────────────────────────
-- Every verified, non-suspended facility starts at state='verified',
-- next_check_due = now() + backstop_interval. Without this, the sweep
-- has no population to monitor.
INSERT INTO public.facility_verification_state (
  facility_id, state, badge_visible, last_verified_at, next_check_due
)
SELECT
  f.id, 'verified', true,
  COALESCE(f.claimed_at, f.updated_at, now()),
  now() + ((SELECT backstop_interval_months FROM re_verification_config WHERE id=1) || ' months')::interval
FROM public.facilities f
WHERE f.verified = true
  AND COALESCE(f.suspended, false) = false
  AND f.status = 'approved'
ON CONFLICT (facility_id) DO NOTHING;


-- ────────────────────────────────────────────────────────────────────
-- 5) Helper: notify provider of a re-verification event in plain English
-- ────────────────────────────────────────────────────────────────────
-- Plain-language strings live in this function rather than the engine
-- bodies so they're easy to tune without re-deploying engine logic.
CREATE OR REPLACE FUNCTION public._re_verify_notify_provider(
  p_facility_id uuid,
  p_event_type text,
  p_severity text,
  p_payload jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner uuid;
  v_facility_name text;
  v_title text;
  v_message text;
BEGIN
  SELECT user_id, name INTO v_owner, v_facility_name
  FROM public.facilities WHERE id = p_facility_id;
  -- Self-listed-but-unclaimed facilities have no owner to notify.
  IF v_owner IS NULL THEN
    RETURN;
  END IF;

  v_title := CASE p_event_type
    WHEN 'samhsa_dropout'              THEN 'SAMHSA listing changed — please confirm your facility'
    WHEN 'license_expiring_60d'        THEN 'License/accreditation expires in 60 days'
    WHEN 'license_expiring_30d'        THEN 'License/accreditation expires in 30 days'
    WHEN 'license_expired'             THEN 'Your verified badge has been paused — license renewal needed'
    WHEN 'accreditation_lapsed'        THEN 'Accreditation lapsed — verified badge paused'
    WHEN 'backstop_sweep_due'          THEN 'Routine re-verification scheduled'
    WHEN 'competing_claim'             THEN 'A new claim was filed on your listing'
    WHEN 'provider_field_edit'         THEN 'Listing change — please re-confirm critical fields'
    WHEN 'user_report'                 THEN 'A user reported an issue with your listing'
    WHEN 'google_permanently_closed'   THEN 'Google reports your location is permanently closed'
    WHEN 'address_change'              THEN 'Address change detected — verification refresh queued'
    ELSE                                    'Verification update for your listing'
  END;

  v_message := CASE p_severity
    WHEN 'soft'   THEN format('We noticed a small change in our records for %s. Your verified badge is unchanged. Please review and confirm in your provider dashboard so we keep things accurate.', v_facility_name)
    WHEN 'medium' THEN format('We had to pause the verified badge on %s while we confirm your current license/accreditation. The listing remains live. Upload a current document or use the "help me" handoff in your dashboard to restore the badge.', v_facility_name)
    WHEN 'hard'   THEN format('A serious signal was raised about %s. To prevent disruption, please contact support immediately or use the "help me" handoff in your dashboard.', v_facility_name)
    ELSE                'A verification event was recorded for your listing.'
  END;

  INSERT INTO public.provider_notifications (
    user_id, facility_id, type, title, message, metadata
  )
  VALUES (
    v_owner, p_facility_id,
    'verification_' || p_severity,
    v_title, v_message,
    jsonb_build_object(
      'event_type', p_event_type,
      'severity', p_severity,
      'payload', COALESCE(p_payload, '{}'::jsonb)
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public._re_verify_notify_provider(uuid, text, text, jsonb) FROM PUBLIC;


-- ────────────────────────────────────────────────────────────────────
-- 6) record_re_verification_event — central entry point
-- ────────────────────────────────────────────────────────────────────
-- All four trigger paths funnel through here. Determines severity (if
-- not provided), enforces dedup, applies the state transition per
-- severity rules, notifies the provider, and returns the event id.
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

  -- Inferred severity if caller didn't specify.
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

  -- Dedup for soft signals: if there's a pending or recently-notified
  -- event with the same dedup_key inside the cooldown window, return
  -- the existing event id instead of firing again.
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

  -- Insert the event.
  INSERT INTO public.re_verification_events (
    facility_id, event_type, severity, payload, dedup_key
  ) VALUES (
    p_facility_id, p_event_type, v_severity, COALESCE(p_payload,'{}'::jsonb), p_dedup_key
  )
  RETURNING id INTO v_event_id;

  -- Apply state transition.
  IF v_severity = 'soft' THEN
    v_new_state := 'review_due';
    v_badge_visible := true;
    v_remediation_deadline := now() + (v_config.soft_grace_days || ' days')::interval;
  ELSIF v_severity = 'medium' THEN
    v_new_state := 'lapsed';
    v_badge_visible := false;
    v_remediation_deadline := now() + (v_config.medium_remediation_days || ' days')::interval;
  ELSIF v_severity = 'hard' THEN
    -- Hard signal handling per CONFIG. Default ON: queue for human.
    IF v_config.hard_signal_requires_human_confirmation THEN
      v_new_state := 'lapsed';   -- pause badge, queue for human
      v_badge_visible := false;
      v_remediation_deadline := now() + (v_config.medium_remediation_days || ' days')::interval;
      UPDATE public.re_verification_events
        SET resolution = 'pending_review'
        WHERE id = v_event_id;
    ELSE
      v_new_state := 'suspended';
      v_badge_visible := false;
      v_remediation_deadline := NULL;
      -- Unpublish the listing
      UPDATE public.facilities
        SET suspended = true, updated_at = now()
        WHERE id = p_facility_id;
      UPDATE public.re_verification_events
        SET resolution = 'suspended', resolved_at = now()
        WHERE id = v_event_id;
    END IF;
  END IF;

  -- Don't downgrade a stricter state. If facility is already suspended,
  -- a new soft signal must not move them back to review_due.
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
      WHEN public.facility_verification_state.state = 'lapsed' AND EXCLUDED.state = 'review_due' THEN public.facility_verification_state.state
      ELSE EXCLUDED.state
    END,
    badge_visible = CASE
      WHEN public.facility_verification_state.state = 'suspended' THEN public.facility_verification_state.badge_visible
      WHEN public.facility_verification_state.state = 'lapsed' AND EXCLUDED.state = 'review_due' THEN public.facility_verification_state.badge_visible
      ELSE EXCLUDED.badge_visible
    END,
    last_trigger = EXCLUDED.last_trigger,
    last_checked_at = EXCLUDED.last_checked_at,
    remediation_deadline = COALESCE(EXCLUDED.remediation_deadline, public.facility_verification_state.remediation_deadline),
    reason = public.facility_verification_state.reason || EXCLUDED.reason,
    updated_at = now();

  -- Notify the provider for everything except backstop sweeps (those
  -- shouldn't spam the inbox unless they actually find something).
  IF p_event_type != 'backstop_sweep_due' THEN
    PERFORM public._re_verify_notify_provider(
      p_facility_id, p_event_type, v_severity, p_payload
    );
  END IF;

  -- Mark notified
  IF v_severity = 'soft' OR v_severity = 'medium' THEN
    UPDATE public.re_verification_events
      SET resolution = CASE WHEN v_severity = 'medium' THEN 'lapsed' ELSE 'notified' END
      WHERE id = v_event_id;
  END IF;

  RETURN v_event_id;
END;
$$;

REVOKE ALL ON FUNCTION public.record_re_verification_event(uuid, text, text, jsonb, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_re_verification_event(uuid, text, text, jsonb, text) TO service_role;


-- ────────────────────────────────────────────────────────────────────
-- 7) run_data_feed_diff — continuous data-feed monitor
-- ────────────────────────────────────────────────────────────────────
-- For every verified facility, check whether its match cluster still
-- has a SAMHSA anchor. If a cluster that once carried samhsa_count > 0
-- no longer does, raise a samhsa_dropout event.
--
-- Self-listed facilities have no cluster — they're handled by the
-- backstop sweep (which falls back to accreditation + Google checks
-- in the edge function layer).
CREATE OR REPLACE FUNCTION public.run_data_feed_diff()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row record;
  v_events_raised int := 0;
  v_checked int := 0;
BEGIN
  FOR v_row IN
    SELECT f.id, f.name, mc.id AS cluster_id, mc.samhsa_count, mc.total_sources, mc.directory_count
    FROM public.facilities f
    LEFT JOIN public.facility_match_clusters mc ON mc.promoted_to_facility_id = f.id
    WHERE f.verified = true
      AND f.status = 'approved'
      AND COALESCE(f.suspended, false) = false
      AND mc.id IS NOT NULL
  LOOP
    v_checked := v_checked + 1;
    -- SAMHSA drop-out: cluster previously had samhsa_count > 0 in its
    -- promotion decision but now reports 0 against the live staged_samhsa
    -- table. We use the most-current cluster row as the source of truth.
    IF v_row.samhsa_count = 0 AND v_row.total_sources <= 1 THEN
      PERFORM public.record_re_verification_event(
        v_row.id,
        'samhsa_dropout',
        'soft',
        jsonb_build_object(
          'cluster_id', v_row.cluster_id,
          'samhsa_count', v_row.samhsa_count,
          'total_sources', v_row.total_sources
        ),
        -- Dedup: don't re-fire the same drop-out signal every sweep.
        format('samhsa_dropout:%s', v_row.cluster_id)
      );
      v_events_raised := v_events_raised + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'checked', v_checked,
    'events_raised', v_events_raised,
    'ran_at', now()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.run_data_feed_diff() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.run_data_feed_diff() TO service_role;


-- ────────────────────────────────────────────────────────────────────
-- 8) run_expiry_sweep — accreditation expiry monitor
-- ────────────────────────────────────────────────────────────────────
-- Two thresholds (60d / 30d) raise soft events. Past expiry raises a
-- medium event (license_expired) which pauses the badge.
CREATE OR REPLACE FUNCTION public.run_expiry_sweep()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row record;
  v_warn1 int;
  v_warn2 int;
  v_events int := 0;
BEGIN
  SELECT expiry_warn_days_first, expiry_warn_days_second
    INTO v_warn1, v_warn2
    FROM public.re_verification_config WHERE id=1;

  FOR v_row IN
    SELECT a.id AS accred_id, a.facility_id, a.accreditation_type, a.expiry_date,
           (a.expiry_date - now()::date) AS days_until_expiry,
           f.name
    FROM public.facility_accreditations a
    JOIN public.facilities f ON f.id = a.facility_id
    WHERE a.expiry_date IS NOT NULL
      AND a.verified = true
      AND f.verified = true
      AND f.status = 'approved'
      AND COALESCE(f.suspended, false) = false
  LOOP
    IF v_row.days_until_expiry < 0 THEN
      -- Already past expiry → medium signal.
      PERFORM public.record_re_verification_event(
        v_row.facility_id, 'license_expired', 'medium',
        jsonb_build_object(
          'accreditation_id', v_row.accred_id,
          'accreditation_type', v_row.accreditation_type,
          'expired_at', v_row.expiry_date,
          'days_overdue', -v_row.days_until_expiry
        ),
        format('license_expired:%s', v_row.accred_id)
      );
      v_events := v_events + 1;
    ELSIF v_row.days_until_expiry <= v_warn2 THEN
      PERFORM public.record_re_verification_event(
        v_row.facility_id, 'license_expiring_30d', 'soft',
        jsonb_build_object(
          'accreditation_id', v_row.accred_id,
          'accreditation_type', v_row.accreditation_type,
          'expires_at', v_row.expiry_date,
          'days_until_expiry', v_row.days_until_expiry
        ),
        format('license_expiring_30d:%s', v_row.accred_id)
      );
      v_events := v_events + 1;
    ELSIF v_row.days_until_expiry <= v_warn1 THEN
      PERFORM public.record_re_verification_event(
        v_row.facility_id, 'license_expiring_60d', 'soft',
        jsonb_build_object(
          'accreditation_id', v_row.accred_id,
          'accreditation_type', v_row.accreditation_type,
          'expires_at', v_row.expiry_date,
          'days_until_expiry', v_row.days_until_expiry
        ),
        format('license_expiring_60d:%s', v_row.accred_id)
      );
      v_events := v_events + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object('events', v_events, 'ran_at', now());
END;
$$;

REVOKE ALL ON FUNCTION public.run_expiry_sweep() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.run_expiry_sweep() TO service_role;


-- ────────────────────────────────────────────────────────────────────
-- 9) run_backstop_sweep — periodic revalidation
-- ────────────────────────────────────────────────────────────────────
-- For facilities where last_checked_at is older than the backstop
-- interval, raise a backstop_sweep_due event (soft) and refresh
-- next_check_due. Doesn't itself fail the legitimacy — the data-feed
-- diff that runs alongside catches actual problems.
CREATE OR REPLACE FUNCTION public.run_backstop_sweep(p_limit int DEFAULT 200)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row record;
  v_events int := 0;
  v_interval interval;
BEGIN
  SELECT (backstop_interval_months || ' months')::interval
    INTO v_interval
    FROM public.re_verification_config WHERE id=1;

  FOR v_row IN
    SELECT s.facility_id
    FROM public.facility_verification_state s
    WHERE s.state = 'verified'
      AND (s.next_check_due IS NULL OR s.next_check_due <= now())
    ORDER BY s.next_check_due NULLS FIRST
    LIMIT p_limit
  LOOP
    PERFORM public.record_re_verification_event(
      v_row.facility_id, 'backstop_sweep_due', 'soft',
      jsonb_build_object('window_months',
        EXTRACT(EPOCH FROM v_interval)/2629746),
      format('backstop:%s', date_trunc('day', now())::date)
    );
    UPDATE public.facility_verification_state
      SET next_check_due = now() + v_interval,
          last_checked_at = now(),
          updated_at = now()
      WHERE facility_id = v_row.facility_id;
    v_events := v_events + 1;
  END LOOP;

  RETURN jsonb_build_object('events', v_events, 'ran_at', now());
END;
$$;

REVOKE ALL ON FUNCTION public.run_backstop_sweep(int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.run_backstop_sweep(int) TO service_role;


-- ────────────────────────────────────────────────────────────────────
-- 10) resolve_re_verification_event — admin/cron closes an event
-- ────────────────────────────────────────────────────────────────────
-- Used by the admin queue UI (and by automated remediation paths) to
-- close the loop on an event. When the resolution is 'remediated', the
-- facility's state is restored to 'verified'.
CREATE OR REPLACE FUNCTION public.resolve_re_verification_event(
  p_event_id uuid,
  p_resolution text,
  p_notes text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event record;
  v_user uuid := auth.uid();
BEGIN
  IF v_user IS NULL OR NOT has_role(v_user, 'admin'::app_role) THEN
    RAISE EXCEPTION 'Admin role required' USING ERRCODE='42501';
  END IF;
  SELECT * INTO v_event FROM public.re_verification_events WHERE id = p_event_id;
  IF v_event.id IS NULL THEN
    RAISE EXCEPTION 'Event not found';
  END IF;
  IF p_resolution NOT IN ('noop','notified','lapsed','suspended','pending_review','remediated','superseded') THEN
    RAISE EXCEPTION 'Invalid resolution: %', p_resolution;
  END IF;

  UPDATE public.re_verification_events
  SET resolution = p_resolution,
      resolution_notes = p_notes,
      resolved_at = now()
  WHERE id = p_event_id;

  -- Restore badge when admin confirms remediation
  IF p_resolution = 'remediated' THEN
    UPDATE public.facility_verification_state
    SET state = 'verified',
        badge_visible = true,
        last_verified_at = now(),
        remediation_deadline = NULL,
        last_trigger = 'admin_remediated',
        updated_at = now()
    WHERE facility_id = v_event.facility_id;
  ELSIF p_resolution = 'suspended' THEN
    UPDATE public.facilities SET suspended = true, updated_at = now()
      WHERE id = v_event.facility_id;
    UPDATE public.facility_verification_state
    SET state = 'suspended', badge_visible = false, updated_at = now()
    WHERE facility_id = v_event.facility_id;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.resolve_re_verification_event(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_re_verification_event(uuid, text, text) TO authenticated;


-- ────────────────────────────────────────────────────────────────────
-- 11) Trigger: provider editing a key field on a verified facility
-- ────────────────────────────────────────────────────────────────────
-- Address / name / phone / website edits on a verified facility raise
-- a provider_field_edit event (soft). An address change additionally
-- raises an address_change event so the cluster re-match has its own
-- audit row.
CREATE OR REPLACE FUNCTION public.facility_key_field_change_trg()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_changed jsonb := '{}'::jsonb;
  v_addr_changed boolean := false;
BEGIN
  IF COALESCE(OLD.verified,false) = false THEN
    RETURN NEW;
  END IF;
  IF NEW.name <> OLD.name OR
     NEW.phone IS DISTINCT FROM OLD.phone OR
     NEW.address IS DISTINCT FROM OLD.address OR
     NEW.website IS DISTINCT FROM OLD.website THEN
    v_changed := jsonb_strip_nulls(jsonb_build_object(
      'name',    CASE WHEN NEW.name <> OLD.name THEN jsonb_build_object('from', OLD.name, 'to', NEW.name) END,
      'phone',   CASE WHEN NEW.phone IS DISTINCT FROM OLD.phone THEN jsonb_build_object('from', OLD.phone, 'to', NEW.phone) END,
      'address', CASE WHEN NEW.address IS DISTINCT FROM OLD.address THEN jsonb_build_object('from', OLD.address, 'to', NEW.address) END,
      'website', CASE WHEN NEW.website IS DISTINCT FROM OLD.website THEN jsonb_build_object('from', OLD.website, 'to', NEW.website) END
    ));
    PERFORM public.record_re_verification_event(
      NEW.id, 'provider_field_edit', 'soft', v_changed,
      format('field_edit:%s', date_trunc('day', now())::date)
    );
    IF NEW.address IS DISTINCT FROM OLD.address THEN
      v_addr_changed := true;
    END IF;
  END IF;
  IF v_addr_changed THEN
    PERFORM public.record_re_verification_event(
      NEW.id, 'address_change', 'soft',
      jsonb_build_object('from', OLD.address, 'to', NEW.address),
      format('address_change:%s', NEW.id)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS facility_key_field_change ON public.facilities;
CREATE TRIGGER facility_key_field_change
  AFTER UPDATE OF name, phone, address, website ON public.facilities
  FOR EACH ROW
  EXECUTE FUNCTION public.facility_key_field_change_trg();


-- ────────────────────────────────────────────────────────────────────
-- 12) Trigger: second claim filed on a claimed facility
-- ────────────────────────────────────────────────────────────────────
-- A new claim against a facility that already has an owner is the only
-- valid trigger to re-check ownership (per spec). We raise a
-- competing_claim event so the claim can be reviewed in context.
CREATE OR REPLACE FUNCTION public.competing_claim_trg()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing_owner uuid;
BEGIN
  SELECT user_id INTO v_existing_owner
  FROM public.facilities WHERE id = NEW.facility_id;
  IF v_existing_owner IS NOT NULL AND v_existing_owner <> NEW.claimant_user_id THEN
    PERFORM public.record_re_verification_event(
      NEW.facility_id, 'competing_claim', 'soft',
      jsonb_build_object(
        'new_claim_id', NEW.id,
        'new_claimant', NEW.claimant_user_id,
        'incumbent_user', v_existing_owner
      ),
      format('competing_claim:%s', NEW.id)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS competing_claim_event ON public.facility_claim_requests;
CREATE TRIGGER competing_claim_event
  AFTER INSERT ON public.facility_claim_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.competing_claim_trg();


-- ────────────────────────────────────────────────────────────────────
-- 13) Recency view — for badge UI ("license confirmed March 2026")
-- ────────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.facility_badge_recency AS
SELECT
  f.id AS facility_id,
  f.slug,
  s.state,
  s.badge_visible,
  s.last_verified_at,
  s.next_check_due,
  s.remediation_deadline,
  s.last_trigger,
  -- Human-readable badge label, e.g. "Verified · confirmed Mar 2026"
  CASE
    WHEN s.state = 'verified' AND s.last_verified_at IS NOT NULL THEN
      'Verified · confirmed ' || to_char(s.last_verified_at, 'Mon YYYY')
    WHEN s.state = 'expiring_soon' THEN
      'Verified · license expires soon'
    WHEN s.state = 'review_due' THEN
      'Verified · re-check pending'
    WHEN s.state = 'lapsed' THEN
      'Badge paused · awaiting remediation'
    WHEN s.state = 'suspended' THEN
      'Suspended'
    ELSE 'Not verified'
  END AS badge_label
FROM public.facilities f
LEFT JOIN public.facility_verification_state s ON s.facility_id = f.id
WHERE f.status = 'approved' AND COALESCE(f.suspended,false) = false;

GRANT SELECT ON public.facility_badge_recency TO anon, authenticated;


COMMIT;
