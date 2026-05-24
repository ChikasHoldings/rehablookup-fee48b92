-- Automated provider-verification engine.
--
-- Two independent axes — LEGITIMACY (is this a real, licensed
-- facility?) and OWNERSHIP (is this claimant authorized to manage
-- it?) — each scored separately. Auto-approve requires BOTH satisfied
-- by configurable thresholds, never a flat count of checks.
--
-- This migration ships the SCHEMA + DECISION ENGINE only. Three
-- supporting layers ship in follow-on commits and call into these
-- RPCs:
--   1. Twilio voice-OTP + SMS-OTP edge functions (start_voice_otp,
--      verify_otp_code, etc.) → call record_ownership_signal().
--   2. Domain-email verification edge function → same.
--   3. Provider claim wizard UI → calls into the public RPCs at the
--      bottom of this file.
--
-- All scoring runs server-side. Provider never sees Stage 1
-- (legitimacy); the wizard shows them only the ladder rung they're
-- currently working through.
--
-- Reuses existing tables:
--   * facility_claim_requests — the claim record (identity + payload)
--   * facility_match_clusters  — SAMHSA / state / CARF reconciliation,
--     match_confidence + match_signals + winning_* fields
--   * facility_credential_documents — document-upload rung
--   * facilities                — alias confirmation writes
--
-- Net-new tables:
--   * verification_attempts  — one row per claim, lifecycle state
--   * verification_signals   — append-only per-signal audit log
--   * facility_name_aliases  — DBA + alternate names per facility
--   * verification_config    — single-row tunable thresholds

BEGIN;

-- ────────────────────────────────────────────────────────────────────
-- 1) Net-new tables
-- ────────────────────────────────────────────────────────────────────

-- attempts: one per claim, advances through legitimacy → ownership →
-- decision. status mirrors a tiny FSM: pending → scoring →
-- ownership_in_progress → decided.
CREATE TABLE IF NOT EXISTS public.verification_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id uuid NOT NULL REFERENCES public.facility_claim_requests(id) ON DELETE CASCADE,
  facility_id uuid REFERENCES public.facilities(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending',
  -- Independent scores per axis — keep them split even after combining
  -- so the audit trail can show why a claim went one way or the other.
  legitimacy_score numeric(5,2),
  ownership_score numeric(5,2),
  confidence_score numeric(5,2),
  final_decision text,                       -- 'auto_approved' | 'manual_review' | 'rejected'
  routed_to_review boolean NOT NULL DEFAULT false,
  review_reasons jsonb NOT NULL DEFAULT '[]'::jsonb,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT verification_attempts_status_chk CHECK (
    status IN ('pending','scoring','ownership_in_progress','decided','cancelled')
  ),
  CONSTRAINT verification_attempts_decision_chk CHECK (
    final_decision IS NULL OR final_decision IN ('auto_approved','manual_review','rejected')
  )
);

CREATE INDEX IF NOT EXISTS verification_attempts_claim_idx
  ON public.verification_attempts (claim_id);
CREATE INDEX IF NOT EXISTS verification_attempts_facility_status_idx
  ON public.verification_attempts (facility_id, status);
CREATE INDEX IF NOT EXISTS verification_attempts_review_queue_idx
  ON public.verification_attempts (routed_to_review, started_at DESC)
  WHERE routed_to_review = true AND final_decision = 'manual_review';

ALTER TABLE public.verification_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "verification_attempts_select_owner_or_admin"
  ON public.verification_attempts;
CREATE POLICY "verification_attempts_select_owner_or_admin"
  ON public.verification_attempts FOR SELECT TO authenticated
  USING (
    has_role((SELECT auth.uid()), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.facility_claim_requests c
      WHERE c.id = verification_attempts.claim_id
        AND c.claimant_user_id = (SELECT auth.uid())
    )
  );
-- No INSERT/UPDATE policy for authenticated — engine RPCs are
-- SECURITY DEFINER and run as service-role.


-- Append-only per-signal audit log. Every legitimacy probe and every
-- ownership rung result gets a row here. A decision can be fully
-- reconstructed by replaying these in created_at order.
CREATE TABLE IF NOT EXISTS public.verification_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id uuid NOT NULL REFERENCES public.verification_attempts(id) ON DELETE CASCADE,
  axis text NOT NULL,
  signal_type text NOT NULL,
  score numeric(5,2),
  passed boolean,
  reasons jsonb NOT NULL DEFAULT '[]'::jsonb,
  raw_payload jsonb,
  -- A hard fraud signal flips the engine to "manual review only" no
  -- matter the score. Tracked so admin queue can prioritize.
  is_hard_fraud_signal boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT verification_signals_axis_chk CHECK (axis IN ('legitimacy','ownership')),
  CONSTRAINT verification_signals_type_chk CHECK (signal_type IN (
    'samhsa_match','google_match','corroboration','license_anchor',
    'voice_otp','sms_otp','domain_email','document','help_request'
  ))
);

CREATE INDEX IF NOT EXISTS verification_signals_attempt_idx
  ON public.verification_signals (attempt_id, created_at);
CREATE INDEX IF NOT EXISTS verification_signals_type_axis_idx
  ON public.verification_signals (signal_type, axis);

ALTER TABLE public.verification_signals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "verification_signals_select_owner_or_admin"
  ON public.verification_signals;
CREATE POLICY "verification_signals_select_owner_or_admin"
  ON public.verification_signals FOR SELECT TO authenticated
  USING (
    has_role((SELECT auth.uid()), 'admin'::app_role)
    OR EXISTS (
      SELECT 1
      FROM public.verification_attempts va
      JOIN public.facility_claim_requests c ON c.id = va.claim_id
      WHERE va.id = verification_signals.attempt_id
        AND c.claimant_user_id = (SELECT auth.uid())
    )
  );


-- DBA + alias names per facility. The legitimacy scorer writes these
-- when it detects a name mismatch but the address matches. The
-- wizard's "Is X the same facility as Y?" confirmation flips
-- confirmed_by from NULL to the claimant's user_id.
CREATE TABLE IF NOT EXISTS public.facility_name_aliases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id uuid NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
  alias_name text NOT NULL,
  -- Where the alias came from. 'samhsa' = SAMHSA listing differs from
  -- the canonical facility name; 'google' = Google Places lookup;
  -- 'provider' = claimant typed it in the wizard. Source feeds into
  -- the score weighting.
  source text NOT NULL,
  confirmed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  confirmed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT facility_name_aliases_source_chk CHECK (
    source IN ('samhsa','google','provider','manual_review')
  ),
  CONSTRAINT facility_name_aliases_name_chk CHECK (length(btrim(alias_name)) > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS facility_name_aliases_uniq
  ON public.facility_name_aliases (facility_id, lower(alias_name), source);

ALTER TABLE public.facility_name_aliases ENABLE ROW LEVEL SECURITY;

-- Aliases are public-safe — same status as the canonical name.
DROP POLICY IF EXISTS "facility_name_aliases_select_public"
  ON public.facility_name_aliases;
CREATE POLICY "facility_name_aliases_select_public"
  ON public.facility_name_aliases FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM public.facilities f
      WHERE f.id = facility_name_aliases.facility_id
        AND f.status = 'approved'
        AND COALESCE(f.suspended, false) = false
    )
  );


-- Single-row config so thresholds can be tuned without a migration.
CREATE TABLE IF NOT EXISTS public.verification_config (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  -- Conservative starts — easy to relax as data accrues. Both axes
  -- must clear their threshold AND the combined score must also clear
  -- the combined threshold for auto-approval. Tightens, doesn't
  -- loosen, the AND-gate.
  auto_approve_threshold numeric(5,2) NOT NULL DEFAULT 85.00,
  legitimacy_min_threshold numeric(5,2) NOT NULL DEFAULT 70.00,
  ownership_min_threshold numeric(5,2) NOT NULL DEFAULT 80.00,
  -- Facilities flagged "high profile" never auto-approve.
  high_profile_review_min_inquiries int NOT NULL DEFAULT 1000,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.verification_config (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.verification_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "verification_config_select_authenticated"
  ON public.verification_config;
CREATE POLICY "verification_config_select_authenticated"
  ON public.verification_config FOR SELECT TO authenticated
  USING (true);
-- Only admins can change thresholds.
DROP POLICY IF EXISTS "verification_config_update_admin"
  ON public.verification_config;
CREATE POLICY "verification_config_update_admin"
  ON public.verification_config FOR UPDATE TO authenticated
  USING (has_role((SELECT auth.uid()), 'admin'::app_role))
  WITH CHECK (has_role((SELECT auth.uid()), 'admin'::app_role));


-- ────────────────────────────────────────────────────────────────────
-- 2) Name normalization helper
-- ────────────────────────────────────────────────────────────────────
-- Strip business suffixes (Inc/LLC/Center/Treatment), lowercase,
-- collapse whitespace, then token-sort so "Aloria Health LLC" and
-- "ALORIA HEALTH" both reduce to "aloria health". pg_trgm's
-- similarity() handles fuzzy comparison after this normalization.
-- The existing function in production uses parameter name `input`;
-- Postgres won't let us change the parameter name with CREATE OR
-- REPLACE, and dependent functions (_staged_*_normalize) call it
-- positionally, so we keep the same name and just extend the body.
CREATE OR REPLACE FUNCTION public.normalize_facility_name(input text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  v text;
BEGIN
  IF input IS NULL OR length(btrim(input)) = 0 THEN
    RETURN '';
  END IF;
  v := lower(btrim(input));
  -- Strip common DBA marker so "ABC DBA: XYZ" → "abc xyz" (caller can
  -- compare both halves if needed; we keep both tokens for the
  -- token-sort below).
  v := regexp_replace(v, '\bdba\b[:\s]*', ' ', 'gi');
  -- Strip business suffixes
  v := regexp_replace(v, '\b(inc\.?|llc\.?|llp\.?|l\.l\.c\.?|ltd\.?|corp\.?|corporation|incorporated)\b', '', 'g');
  -- Strip generic facility nouns that vary across listings (don't
  -- distinguish facilities meaningfully).
  v := regexp_replace(v, '\b(treatment|center|centre|services|service|recovery|behavioral|health|clinic|llp)\b', '', 'g');
  -- Collapse punctuation
  v := regexp_replace(v, '[^a-z0-9 ]', ' ', 'g');
  v := regexp_replace(v, '\s+', ' ', 'g');
  v := btrim(v);
  -- Token-sort so word order doesn't matter
  IF length(v) > 0 THEN
    SELECT string_agg(t, ' ' ORDER BY t)
    INTO v
    FROM unnest(string_to_array(v, ' ')) t;
  END IF;
  RETURN COALESCE(v, '');
END;
$$;

REVOKE ALL ON FUNCTION public.normalize_facility_name(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.normalize_facility_name(text) TO anon, authenticated, service_role;


-- ────────────────────────────────────────────────────────────────────
-- 3) start_claim_verification — kick off legitimacy scoring
-- ────────────────────────────────────────────────────────────────────
-- Called on claim submission. Looks up the matching cluster, scores
-- the legitimacy axis from cluster signals + alias detection, and
-- creates the verification_attempts row in 'ownership_in_progress'.
-- Google-Places lookup is added by the supporting edge function (next
-- commit) which calls record_legitimacy_signal() to add an extra
-- legitimacy row.
CREATE OR REPLACE FUNCTION public.start_claim_verification(p_claim_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_claim record;
  v_facility record;
  v_cluster record;
  v_attempt_id uuid;
  v_norm_claim_name text;
  v_norm_facility_name text;
  v_name_sim numeric;
  v_phone_match boolean;
  v_score numeric := 0;
  v_reasons jsonb := '[]'::jsonb;
  v_alias_offered text;
BEGIN
  -- Load the claim. Only admins or service-role can call this from a
  -- DB session that isn't the claimant's; we still keep the SELECT
  -- consistent so the function works under either context.
  SELECT * INTO v_claim FROM public.facility_claim_requests WHERE id = p_claim_id;
  IF v_claim.id IS NULL THEN
    RAISE EXCEPTION 'Claim not found';
  END IF;

  SELECT id, name, slug, phone, city, state, zip_code, address, website, data_source
  INTO v_facility
  FROM public.facilities WHERE id = v_claim.facility_id;
  IF v_facility.id IS NULL THEN
    RAISE EXCEPTION 'Facility not found';
  END IF;

  -- Idempotency: if a non-cancelled attempt already exists for this
  -- claim, return it instead of creating a duplicate.
  SELECT id INTO v_attempt_id
  FROM public.verification_attempts
  WHERE claim_id = p_claim_id AND status != 'cancelled'
  ORDER BY started_at DESC LIMIT 1;

  IF v_attempt_id IS NOT NULL THEN
    RETURN jsonb_build_object('attempt_id', v_attempt_id, 'duplicate', true);
  END IF;

  -- Insert the attempt in 'scoring' state. The legitimacy work below
  -- runs synchronously; ownership picks up after.
  INSERT INTO public.verification_attempts (claim_id, facility_id, status)
  VALUES (p_claim_id, v_claim.facility_id, 'scoring')
  RETURNING id INTO v_attempt_id;

  -- ─── Legitimacy: SAMHSA / match-cluster signal ───────────────────
  -- ADDRESS + PHONE first; NAME last (per spec). We anchor on the
  -- (zip, phone) pair because that's the strongest signal in
  -- match_clusters today (match_tier='phone_state_zip' covers it).
  SELECT mc.*
  INTO v_cluster
  FROM public.facility_match_clusters mc
  WHERE mc.winning_zip = v_facility.zip_code
    AND mc.winning_phone IS NOT NULL
    AND regexp_replace(mc.winning_phone, '[^0-9]', '', 'g') =
        regexp_replace(COALESCE(v_facility.phone, ''), '[^0-9]', '', 'g')
  ORDER BY mc.match_confidence DESC NULLS LAST
  LIMIT 1;

  IF v_cluster.id IS NOT NULL THEN
    -- Strong cluster match — multiple sources corroborate.
    v_score := v_score + (v_cluster.match_confidence * 70.0);
    v_reasons := v_reasons || jsonb_build_array(
      jsonb_build_object(
        'rule', 'samhsa_phone_zip_match',
        'detail', format('Matched against %s sources (confidence %s)',
          (v_cluster.match_signals->>'distinct_count')::text,
          v_cluster.match_confidence::text)
      )
    );

    -- Detect DBA: cluster name differs from claim's facility name but
    -- the address+phone already matched. Add as alias instead of
    -- failing on name. The wizard will surface a one-tap confirmation.
    v_norm_claim_name := normalize_facility_name(v_facility.name);
    v_norm_facility_name := normalize_facility_name(v_cluster.winning_name);
    IF v_norm_claim_name <> v_norm_facility_name THEN
      v_name_sim := similarity(v_norm_claim_name, v_norm_facility_name);
      IF v_name_sim >= 0.4 THEN
        -- Names are similar enough to be the same DBA variant. Add
        -- alias + +5 confidence; the wizard still asks for
        -- one-tap confirmation.
        INSERT INTO public.facility_name_aliases (facility_id, alias_name, source)
        VALUES (v_facility.id, v_cluster.winning_name, 'samhsa')
        ON CONFLICT (facility_id, lower(alias_name), source) DO NOTHING;

        v_alias_offered := v_cluster.winning_name;
        v_score := v_score + 5;
        v_reasons := v_reasons || jsonb_build_array(
          jsonb_build_object(
            'rule', 'name_variant_detected',
            'detail', format('Cluster name %s differs from facility name %s; address+phone confirmed.',
              v_cluster.winning_name, v_facility.name)
          )
        );
      ELSE
        -- Names are very different despite phone+zip match. Don't
        -- fail — record as a manual-review nudge.
        v_reasons := v_reasons || jsonb_build_array(
          jsonb_build_object(
            'rule', 'name_far_mismatch',
            'detail', format('Cluster name %s diverges from facility name %s (sim=%s)',
              v_cluster.winning_name, v_facility.name, v_name_sim::text)
          )
        );
      END IF;
    ELSE
      -- Exact match (post-normalization) — small additional bump.
      v_score := v_score + 10;
      v_reasons := v_reasons || jsonb_build_array(
        jsonb_build_object('rule', 'name_canonical_match', 'detail', 'Normalized names align.')
      );
    END IF;
  ELSE
    -- No cluster match. Fall back to name+zip fuzzy.
    SELECT mc.*, similarity(normalize_facility_name(mc.winning_name), normalize_facility_name(v_facility.name)) AS sim
    INTO v_cluster
    FROM public.facility_match_clusters mc
    WHERE mc.winning_zip = v_facility.zip_code
    ORDER BY similarity(normalize_facility_name(mc.winning_name), normalize_facility_name(v_facility.name)) DESC NULLS LAST
    LIMIT 1;

    IF v_cluster.id IS NOT NULL AND (v_cluster.match_signals->>'distinct_count')::int >= 1 THEN
      v_score := v_score + 25;
      v_reasons := v_reasons || jsonb_build_array(
        jsonb_build_object(
          'rule', 'samhsa_name_zip_fuzzy',
          'detail', format('Name+zip fuzzy match against cluster %s', v_cluster.id)
        )
      );
    ELSE
      v_reasons := v_reasons || jsonb_build_array(
        jsonb_build_object('rule', 'no_authoritative_match', 'detail',
          'No SAMHSA/state/CARF cluster matches this facility on phone or zip+name.')
      );
    END IF;
  END IF;

  -- Secondary corroboration (low weight): website present + matches
  -- cluster website domain. Cheap to compute; raises score by 5.
  IF v_facility.website IS NOT NULL
     AND v_cluster.id IS NOT NULL
     AND v_cluster.winning_website IS NOT NULL
     AND regexp_replace(v_facility.website, '^https?://(www\.)?', '', 'i')
         = regexp_replace(v_cluster.winning_website, '^https?://(www\.)?', '', 'i')
  THEN
    v_score := v_score + 5;
    v_reasons := v_reasons || jsonb_build_array(
      jsonb_build_object('rule', 'website_corroboration', 'detail', 'Facility website matches cluster website.')
    );
  END IF;

  -- Insert the combined legitimacy signal row.
  INSERT INTO public.verification_signals (
    attempt_id, axis, signal_type, score, passed, reasons, raw_payload
  ) VALUES (
    v_attempt_id, 'legitimacy', 'samhsa_match',
    LEAST(v_score, 100)::numeric(5,2),
    v_score >= (SELECT legitimacy_min_threshold FROM verification_config WHERE id=1),
    v_reasons,
    jsonb_build_object(
      'cluster_id', v_cluster.id,
      'cluster_confidence', v_cluster.match_confidence,
      'winning_name', v_cluster.winning_name,
      'name_similarity', v_name_sim
    )
  );

  -- Update attempt with legitimacy score and advance to ownership.
  UPDATE public.verification_attempts
  SET legitimacy_score = LEAST(v_score, 100)::numeric(5,2),
      status = 'ownership_in_progress',
      updated_at = now()
  WHERE id = v_attempt_id;

  RETURN jsonb_build_object(
    'attempt_id', v_attempt_id,
    'legitimacy_score', LEAST(v_score, 100),
    'alias_offered', v_alias_offered,
    'cluster_id', v_cluster.id,
    'next_stage', 'ownership'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.start_claim_verification(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.start_claim_verification(uuid) TO service_role;


-- ────────────────────────────────────────────────────────────────────
-- 4) record_ownership_signal — called by edge fns after each rung
-- ────────────────────────────────────────────────────────────────────
-- The Voice-OTP / SMS-OTP / domain-email / document edge functions
-- call this after the user clears (or fails) a rung. Records the
-- result + bumps the ownership_score. The decision function reads
-- the highest ownership score across signals.
CREATE OR REPLACE FUNCTION public.record_ownership_signal(
  p_attempt_id uuid,
  p_signal_type text,
  p_passed boolean,
  p_score numeric,
  p_reasons jsonb DEFAULT '[]'::jsonb,
  p_raw_payload jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_signal_id uuid;
  v_max_score numeric;
BEGIN
  IF p_attempt_id IS NULL THEN
    RAISE EXCEPTION 'Missing attempt_id';
  END IF;
  IF p_signal_type NOT IN ('voice_otp','sms_otp','domain_email','document','help_request') THEN
    RAISE EXCEPTION 'Invalid ownership signal type: %', p_signal_type;
  END IF;

  INSERT INTO public.verification_signals (
    attempt_id, axis, signal_type, score, passed, reasons, raw_payload
  ) VALUES (
    p_attempt_id, 'ownership', p_signal_type,
    LEAST(COALESCE(p_score, 0), 100)::numeric(5,2),
    p_passed,
    COALESCE(p_reasons, '[]'::jsonb),
    COALESCE(p_raw_payload, '{}'::jsonb)
  )
  RETURNING id INTO v_signal_id;

  -- Update attempt's ownership_score to the MAX across all signals so
  -- a later rung doesn't lower the score if it scored less. The
  -- ladder is "the provider only needs one win" — keep the best.
  SELECT MAX(score) INTO v_max_score
  FROM public.verification_signals
  WHERE attempt_id = p_attempt_id AND axis = 'ownership' AND passed = true;

  UPDATE public.verification_attempts
  SET ownership_score = COALESCE(v_max_score, 0)::numeric(5,2),
      updated_at = now()
  WHERE id = p_attempt_id;

  RETURN v_signal_id;
END;
$$;

REVOKE ALL ON FUNCTION public.record_ownership_signal(uuid, text, boolean, numeric, jsonb, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_ownership_signal(uuid, text, boolean, numeric, jsonb, jsonb) TO service_role;


-- ────────────────────────────────────────────────────────────────────
-- 5) finalize_claim_decision — combine axes + apply threshold
-- ────────────────────────────────────────────────────────────────────
-- Called once the provider clears (or exhausts) the ownership ladder.
-- Reads the attempt's legitimacy + ownership scores, checks
-- thresholds, applies hard fraud / high-profile overrides, and writes
-- final_decision. Auto-approve also flips facility_claim_requests to
-- 'approved' so the existing approval pipeline takes over.
CREATE OR REPLACE FUNCTION public.finalize_claim_decision(p_attempt_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_attempt record;
  v_config record;
  v_hard_fraud boolean;
  v_review_reasons jsonb := '[]'::jsonb;
  v_combined numeric;
  v_decision text;
  v_route boolean;
BEGIN
  SELECT * INTO v_attempt FROM public.verification_attempts WHERE id = p_attempt_id;
  IF v_attempt.id IS NULL THEN
    RAISE EXCEPTION 'Attempt not found';
  END IF;
  IF v_attempt.final_decision IS NOT NULL THEN
    RETURN jsonb_build_object('attempt_id', p_attempt_id, 'decision', v_attempt.final_decision, 'duplicate', true);
  END IF;

  SELECT * INTO v_config FROM public.verification_config WHERE id=1;

  -- Hard fraud — any signal marked is_hard_fraud_signal in this
  -- attempt forces manual review.
  SELECT EXISTS (
    SELECT 1 FROM public.verification_signals
    WHERE attempt_id = p_attempt_id AND is_hard_fraud_signal = true
  ) INTO v_hard_fraud;

  IF v_hard_fraud THEN
    v_route := true;
    v_decision := 'manual_review';
    v_review_reasons := v_review_reasons || jsonb_build_array(
      jsonb_build_object('rule', 'hard_fraud_signal',
        'detail', 'A hard fraud signal was recorded on this attempt; auto-approval blocked.')
    );
  ELSE
    -- Combined score: weighted average favoring ownership slightly
    -- (60/40). Either axis below its own min threshold blocks auto-
    -- approval entirely.
    v_combined := COALESCE(v_attempt.legitimacy_score, 0) * 0.4
                + COALESCE(v_attempt.ownership_score, 0)  * 0.6;

    IF COALESCE(v_attempt.legitimacy_score, 0) < v_config.legitimacy_min_threshold THEN
      v_route := true;
      v_decision := 'manual_review';
      v_review_reasons := v_review_reasons || jsonb_build_array(
        jsonb_build_object('rule', 'legitimacy_below_threshold',
          'detail', format('legitimacy_score %s < min %s',
            v_attempt.legitimacy_score, v_config.legitimacy_min_threshold))
      );
    ELSIF COALESCE(v_attempt.ownership_score, 0) < v_config.ownership_min_threshold THEN
      v_route := true;
      v_decision := 'manual_review';
      v_review_reasons := v_review_reasons || jsonb_build_array(
        jsonb_build_object('rule', 'ownership_below_threshold',
          'detail', format('ownership_score %s < min %s',
            v_attempt.ownership_score, v_config.ownership_min_threshold))
      );
    ELSIF v_combined < v_config.auto_approve_threshold THEN
      v_route := true;
      v_decision := 'manual_review';
      v_review_reasons := v_review_reasons || jsonb_build_array(
        jsonb_build_object('rule', 'combined_below_threshold',
          'detail', format('combined %s < auto_approve %s',
            v_combined, v_config.auto_approve_threshold))
      );
    ELSE
      -- Final guard: a "high-profile" facility (large lead history)
      -- never auto-approves regardless of score. Conservative until
      -- the engine has a track record.
      IF EXISTS (
        SELECT 1 FROM public.leads
        WHERE facility_id = v_attempt.facility_id
        GROUP BY facility_id
        HAVING COUNT(*) >= v_config.high_profile_review_min_inquiries
      ) THEN
        v_route := true;
        v_decision := 'manual_review';
        v_review_reasons := v_review_reasons || jsonb_build_array(
          jsonb_build_object('rule', 'high_profile_facility',
            'detail', 'Facility exceeds high-profile lead threshold; defaulting to manual review.')
        );
      ELSE
        v_route := false;
        v_decision := 'auto_approved';
      END IF;
    END IF;
  END IF;

  UPDATE public.verification_attempts
  SET status = 'decided',
      final_decision = v_decision,
      confidence_score = COALESCE(v_combined, 0)::numeric(5,2),
      routed_to_review = v_route,
      review_reasons = v_review_reasons,
      completed_at = now(),
      updated_at = now()
  WHERE id = p_attempt_id;

  -- On auto-approve, flip the parent claim row to 'approved' so the
  -- existing approval pipeline (which transfers ownership, sets
  -- claimed_at on facilities, sends emails) takes over. We do NOT
  -- touch facilities.verified here — per spec, "verified" stays a
  -- separate policy decision and may require a higher threshold.
  IF v_decision = 'auto_approved' THEN
    UPDATE public.facility_claim_requests
    SET status = 'approved',
        verification_status = 'verified',
        verified_at = now(),
        decision_notes = COALESCE(decision_notes, '') ||
          E'\n[auto-verify] combined_score=' || v_combined::text,
        updated_at = now()
    WHERE id = v_attempt.claim_id;
  END IF;

  RETURN jsonb_build_object(
    'attempt_id', p_attempt_id,
    'decision', v_decision,
    'routed_to_review', v_route,
    'combined_score', v_combined,
    'legitimacy_score', v_attempt.legitimacy_score,
    'ownership_score', v_attempt.ownership_score,
    'reasons', v_review_reasons
  );
END;
$$;

REVOKE ALL ON FUNCTION public.finalize_claim_decision(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.finalize_claim_decision(uuid) TO service_role;


-- ────────────────────────────────────────────────────────────────────
-- 6) confirm_facility_alias — claimant taps "yes, same facility"
-- ────────────────────────────────────────────────────────────────────
-- Wizard surfaces a one-tap confirmation when a DBA alias was
-- detected. Flips confirmed_by on the alias row.
CREATE OR REPLACE FUNCTION public.confirm_facility_alias(p_alias_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_alias record;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE='42501';
  END IF;
  SELECT a.* INTO v_alias
  FROM public.facility_name_aliases a
  WHERE a.id = p_alias_id;
  IF v_alias.id IS NULL THEN
    RAISE EXCEPTION 'Alias not found';
  END IF;
  -- Only the claimant on a live attempt for this facility can confirm.
  IF NOT EXISTS (
    SELECT 1 FROM public.facility_claim_requests c
    WHERE c.facility_id = v_alias.facility_id
      AND c.claimant_user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE='42501';
  END IF;
  UPDATE public.facility_name_aliases
  SET confirmed_by = v_user_id, confirmed_at = now()
  WHERE id = p_alias_id;
END;
$$;

REVOKE ALL ON FUNCTION public.confirm_facility_alias(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.confirm_facility_alias(uuid) TO authenticated;


COMMIT;
