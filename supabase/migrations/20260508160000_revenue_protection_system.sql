-- ============================================================================
-- REVENUE PROTECTION SYSTEM
-- ============================================================================
-- Implements comprehensive anti-bypass mechanisms to protect placement revenue:
--
-- 1. Admission verification table (dual-confirmation: provider + seeker)
-- 2. PII disclosure tracking enhancements (tiered access, expiry)
-- 3. Provider compliance scoring and network standing
-- 4. Billing enforcement states and escalation tracking
-- 5. Seeker verification tokens for independent admission confirmation
-- ============================================================================

-- ─── 1. Admission Verifications Table ────────────────────────────────────────
-- Tracks admission confirmations from BOTH provider and seeker independently.
-- Revenue is only captured when at least one party confirms (admin can override).
CREATE TABLE IF NOT EXISTS public.admission_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id uuid NOT NULL REFERENCES public.concierge_inquiries(id) ON DELETE CASCADE,
  facility_id uuid NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
  introduction_id uuid REFERENCES public.concierge_introductions(id) ON DELETE SET NULL,

  -- Provider-side reporting
  provider_reported boolean DEFAULT false,
  provider_reported_at timestamptz,
  provider_reported_by uuid REFERENCES auth.users(id),
  provider_admission_date date,
  provider_notes text,
  provider_report_method text, -- 'self_report' | 'admin_confirmed' | 'system_detected'

  -- Seeker-side verification
  seeker_verified boolean DEFAULT false,
  seeker_verified_at timestamptz,
  seeker_verification_token uuid DEFAULT gen_random_uuid(),
  seeker_verification_sent_at timestamptz,
  seeker_verification_reminder_count integer DEFAULT 0,
  seeker_denial text, -- If seeker says they were NOT admitted

  -- Admin coordination
  admin_confirmed boolean DEFAULT false,
  admin_confirmed_at timestamptz,
  admin_confirmed_by uuid REFERENCES auth.users(id),
  admin_override_reason text,
  admin_notes text,

  -- Billing state
  billing_status text DEFAULT 'pending' CHECK (billing_status IN (
    'pending',           -- Awaiting confirmation
    'confirmed',         -- Admission confirmed, ready to bill
    'invoiced',          -- Invoice sent to provider
    'paid',              -- Payment received
    'overdue',           -- Payment past due
    'escalated',         -- Sent to collections / network suspension
    'waived',            -- Fee waived by admin
    'disputed'           -- Provider disputes the charge
  )),
  billing_amount_cents integer,
  billing_invoice_id text,
  billing_due_date date,
  billing_escalation_level integer DEFAULT 0,
  billing_last_reminder_at timestamptz,
  billing_reminder_count integer DEFAULT 0,

  -- Dispute handling
  dispute_reason text,
  dispute_submitted_at timestamptz,
  dispute_resolved_at timestamptz,
  dispute_resolution text,

  -- Metadata
  verification_status text DEFAULT 'pending' CHECK (verification_status IN (
    'pending',           -- Awaiting any confirmation
    'provider_only',     -- Only provider confirmed
    'seeker_only',       -- Only seeker confirmed
    'both_confirmed',    -- Both parties confirmed
    'admin_override',    -- Admin confirmed without both parties
    'disputed',          -- Under dispute
    'closed_no_admission' -- Confirmed no admission occurred
  )),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  -- Unique constraint: one verification per inquiry+facility pair
  UNIQUE(inquiry_id, facility_id)
);

-- ─── 2. Provider Compliance & Network Standing ───────────────────────────────
-- Tracks provider behavior to detect and penalize bypass attempts.
ALTER TABLE public.facilities
  ADD COLUMN IF NOT EXISTS placement_compliance_score integer DEFAULT 100,
  ADD COLUMN IF NOT EXISTS placement_network_standing text DEFAULT 'good'
    CHECK (placement_network_standing IN ('good', 'warning', 'probation', 'suspended')),
  ADD COLUMN IF NOT EXISTS placement_total_introductions integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS placement_total_admissions integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS placement_total_bypasses integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS placement_last_admission_at timestamptz,
  ADD COLUMN IF NOT EXISTS placement_suspended_at timestamptz,
  ADD COLUMN IF NOT EXISTS placement_suspension_reason text;

-- ─── 3. PII Disclosure Enhancements ─────────────────────────────────────────
-- Add tiered disclosure tracking and expiry to introductions.
ALTER TABLE public.concierge_introductions
  ADD COLUMN IF NOT EXISTS pii_disclosure_level text DEFAULT 'none'
    CHECK (pii_disclosure_level IN ('none', 'partial', 'full')),
  ADD COLUMN IF NOT EXISTS pii_disclosure_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS pii_disclosure_reason text,
  ADD COLUMN IF NOT EXISTS admission_report_deadline timestamptz,
  ADD COLUMN IF NOT EXISTS admission_report_reminder_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS admission_report_reminder_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS provider_admission_reported boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS provider_admission_reported_at timestamptz,
  ADD COLUMN IF NOT EXISTS provider_admission_date date,
  ADD COLUMN IF NOT EXISTS bypass_flag boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS bypass_flag_reason text,
  ADD COLUMN IF NOT EXISTS bypass_flagged_at timestamptz;

-- ─── 4. Concierge Inquiry Enhancements ──────────────────────────────────────
-- Add fields for seeker verification and billing enforcement.
ALTER TABLE public.concierge_inquiries
  ADD COLUMN IF NOT EXISTS seeker_verification_status text DEFAULT 'not_started'
    CHECK (seeker_verification_status IN ('not_started', 'sent', 'verified', 'denied', 'expired')),
  ADD COLUMN IF NOT EXISTS seeker_verification_token uuid,
  ADD COLUMN IF NOT EXISTS seeker_verification_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS billing_enforcement_status text DEFAULT 'not_applicable'
    CHECK (billing_enforcement_status IN ('not_applicable', 'pending_confirmation', 'confirmed', 'invoiced', 'paid', 'overdue', 'escalated', 'waived', 'disputed')),
  ADD COLUMN IF NOT EXISTS admission_confirmed_source text
    CHECK (admission_confirmed_source IN ('provider_report', 'seeker_verification', 'admin_manual', 'both_parties', 'system_detected'));

-- ─── 5. Platform Settings for Revenue Protection ─────────────────────────────
INSERT INTO public.platform_settings (key, value, description)
VALUES
  ('revenue_pii_disclosure_expiry_hours', '168', 'Hours after PII disclosure before it expires (7 days default)'),
  ('revenue_admission_report_deadline_hours', '48', 'Hours after PII disclosure for provider to report admission'),
  ('revenue_seeker_verification_enabled', 'true', 'Enable independent seeker admission verification'),
  ('revenue_seeker_verification_delay_hours', '72', 'Hours after PII disclosure before sending seeker verification'),
  ('revenue_auto_flag_unreported_days', '7', 'Days after PII disclosure with no report to flag as potential bypass'),
  ('revenue_billing_reminder_interval_days', '3', 'Days between billing reminders'),
  ('revenue_billing_escalation_after_days', '14', 'Days overdue before escalating to suspension'),
  ('revenue_compliance_score_bypass_penalty', '25', 'Points deducted from compliance score per bypass flag'),
  ('revenue_compliance_suspension_threshold', '50', 'Compliance score below which provider is suspended'),
  ('revenue_require_admin_pii_approval', 'true', 'Require admin/advisor approval before PII disclosure')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, description = EXCLUDED.description;

-- ─── 6. Admin Notifications Table Enhancement ────────────────────────────────
-- Add severity and action_required fields for revenue alerts.
ALTER TABLE public.admin_notifications
  ADD COLUMN IF NOT EXISTS severity text DEFAULT 'info'
    CHECK (severity IN ('info', 'warning', 'critical', 'urgent')),
  ADD COLUMN IF NOT EXISTS action_required boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS action_taken_at timestamptz,
  ADD COLUMN IF NOT EXISTS action_taken_by uuid REFERENCES auth.users(id);

-- ─── 7. Indexes for Revenue Protection Queries ──────────────────────────────
CREATE INDEX IF NOT EXISTS idx_admission_verifications_inquiry
  ON public.admission_verifications (inquiry_id);
CREATE INDEX IF NOT EXISTS idx_admission_verifications_facility
  ON public.admission_verifications (facility_id);
CREATE INDEX IF NOT EXISTS idx_admission_verifications_billing_status
  ON public.admission_verifications (billing_status)
  WHERE billing_status NOT IN ('paid', 'waived');
CREATE INDEX IF NOT EXISTS idx_admission_verifications_pending
  ON public.admission_verifications (verification_status, created_at)
  WHERE verification_status = 'pending';
CREATE INDEX IF NOT EXISTS idx_introductions_pii_disclosed
  ON public.concierge_introductions (admin_disclosed_pii_at, admission_report_deadline)
  WHERE admin_disclosed_pii_at IS NOT NULL AND provider_admission_reported = false;
CREATE INDEX IF NOT EXISTS idx_facilities_compliance
  ON public.facilities (placement_network_standing, placement_compliance_score)
  WHERE placement_network_standing != 'good';

-- ─── 8. RLS Policies for admission_verifications ─────────────────────────────
ALTER TABLE public.admission_verifications ENABLE ROW LEVEL SECURITY;

-- Admin: full access
CREATE POLICY admin_all_admission_verifications ON public.admission_verifications
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
  );

-- Provider: can view and report for their own facilities
CREATE POLICY provider_view_own_verifications ON public.admission_verifications
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.facilities f
      WHERE f.id = admission_verifications.facility_id AND f.user_id = auth.uid()
    )
  );

CREATE POLICY provider_update_own_verifications ON public.admission_verifications
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.facilities f
      WHERE f.id = admission_verifications.facility_id AND f.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.facilities f
      WHERE f.id = admission_verifications.facility_id AND f.user_id = auth.uid()
    )
  );

-- ─── 9. Function: Provider reports admission ─────────────────────────────────
-- Called by providers to self-report an admission. Creates or updates the
-- admission_verifications record and triggers admin notification.
CREATE OR REPLACE FUNCTION public.provider_report_admission(
  p_introduction_id uuid,
  p_admission_date date,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_intro RECORD;
  v_facility RECORD;
  v_verification_id uuid;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  -- Verify the caller owns the facility for this introduction
  SELECT ci.*, f.user_id AS facility_owner, f.id AS fac_id, f.name AS facility_name
  INTO v_intro
  FROM public.concierge_introductions ci
  JOIN public.facilities f ON f.id = ci.facility_id
  WHERE ci.id = p_introduction_id;

  IF v_intro IS NULL THEN
    RAISE EXCEPTION 'Introduction not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_intro.facility_owner != v_caller THEN
    RAISE EXCEPTION 'Not authorized: you do not own this facility' USING ERRCODE = '42501';
  END IF;

  -- Must have accepted the introduction first
  IF v_intro.provider_response != 'interested' THEN
    RAISE EXCEPTION 'Cannot report admission: introduction not accepted' USING ERRCODE = 'P0002';
  END IF;

  -- Update the introduction record
  UPDATE public.concierge_introductions
  SET provider_admission_reported = true,
      provider_admission_reported_at = now(),
      provider_admission_date = p_admission_date
  WHERE id = p_introduction_id;

  -- Create or update admission verification
  INSERT INTO public.admission_verifications (
    inquiry_id, facility_id, introduction_id,
    provider_reported, provider_reported_at, provider_reported_by,
    provider_admission_date, provider_notes, provider_report_method,
    verification_status
  ) VALUES (
    v_intro.inquiry_id, v_intro.facility_id, p_introduction_id,
    true, now(), v_caller,
    p_admission_date, p_notes, 'self_report',
    'provider_only'
  )
  ON CONFLICT (inquiry_id, facility_id) DO UPDATE SET
    provider_reported = true,
    provider_reported_at = now(),
    provider_reported_by = v_caller,
    provider_admission_date = p_admission_date,
    provider_notes = COALESCE(p_notes, admission_verifications.provider_notes),
    provider_report_method = 'self_report',
    verification_status = CASE
      WHEN admission_verifications.seeker_verified THEN 'both_confirmed'
      ELSE 'provider_only'
    END,
    updated_at = now()
  RETURNING id INTO v_verification_id;

  -- Log case event
  INSERT INTO public.concierge_case_events (
    inquiry_id, event_type, event_data, actor_id, actor_type
  ) VALUES (
    v_intro.inquiry_id,
    'provider_reported_admission',
    jsonb_build_object(
      'facility_id', v_intro.facility_id,
      'facility_name', v_intro.facility_name,
      'admission_date', p_admission_date,
      'verification_id', v_verification_id
    ),
    v_caller,
    'provider'
  );

  -- Create admin notification (urgent)
  INSERT INTO public.admin_notifications (
    type, title, message, metadata, severity, action_required
  ) VALUES (
    'admission_reported',
    'Provider Reported Admission',
    v_intro.facility_name || ' reported admitting a concierge client on ' || p_admission_date::text || '. Confirm and bill.',
    jsonb_build_object(
      'inquiry_id', v_intro.inquiry_id,
      'facility_id', v_intro.facility_id,
      'introduction_id', p_introduction_id,
      'verification_id', v_verification_id,
      'admission_date', p_admission_date
    ),
    'critical',
    true
  );

  RETURN jsonb_build_object(
    'success', true,
    'verification_id', v_verification_id,
    'message', 'Admission reported successfully. Our team will confirm and coordinate billing.'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.provider_report_admission(uuid, date, text) TO authenticated;

-- ─── 10. Function: Seeker verifies admission ─────────────────────────────────
-- Called via a unique verification link sent to the seeker.
CREATE OR REPLACE FUNCTION public.seeker_verify_admission(
  p_token uuid,
  p_confirmed boolean,
  p_denial_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_verification RECORD;
BEGIN
  -- Find the verification by token
  SELECT av.*, ci.user_name
  INTO v_verification
  FROM public.admission_verifications av
  JOIN public.concierge_inquiries ci ON ci.id = av.inquiry_id
  WHERE av.seeker_verification_token = p_token
    AND av.seeker_verified = false;

  IF v_verification IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Invalid or expired verification link.');
  END IF;

  IF p_confirmed THEN
    UPDATE public.admission_verifications
    SET seeker_verified = true,
        seeker_verified_at = now(),
        verification_status = CASE
          WHEN provider_reported THEN 'both_confirmed'
          ELSE 'seeker_only'
        END,
        updated_at = now()
    WHERE id = v_verification.id;

    -- Log event
    INSERT INTO public.concierge_case_events (
      inquiry_id, event_type, event_data, actor_type
    ) VALUES (
      v_verification.inquiry_id,
      'seeker_verified_admission',
      jsonb_build_object('facility_id', v_verification.facility_id, 'confirmed', true),
      'seeker'
    );
  ELSE
    UPDATE public.admission_verifications
    SET seeker_verified = false,
        seeker_verified_at = now(),
        seeker_denial = p_denial_reason,
        verification_status = 'closed_no_admission',
        updated_at = now()
    WHERE id = v_verification.id;

    -- Flag potential bypass if provider reported but seeker denies
    IF v_verification.provider_reported THEN
      INSERT INTO public.admin_notifications (
        type, title, message, metadata, severity, action_required
      ) VALUES (
        'admission_dispute',
        'Admission Dispute: Seeker Denies',
        'Seeker denied admission that provider reported. Possible data discrepancy or billing issue.',
        jsonb_build_object(
          'inquiry_id', v_verification.inquiry_id,
          'facility_id', v_verification.facility_id,
          'verification_id', v_verification.id,
          'denial_reason', p_denial_reason
        ),
        'urgent',
        true
      );
    END IF;

    INSERT INTO public.concierge_case_events (
      inquiry_id, event_type, event_data, actor_type
    ) VALUES (
      v_verification.inquiry_id,
      'seeker_denied_admission',
      jsonb_build_object('facility_id', v_verification.facility_id, 'reason', p_denial_reason),
      'seeker'
    );
  END IF;

  RETURN jsonb_build_object('success', true, 'message', 'Thank you for your response.');
END;
$$;

-- This function is called via public API (no auth required — token-based)
GRANT EXECUTE ON FUNCTION public.seeker_verify_admission(uuid, boolean, text) TO anon;
GRANT EXECUTE ON FUNCTION public.seeker_verify_admission(uuid, boolean, text) TO authenticated;

-- ─── 11. Function: Admin confirms admission and triggers billing ─────────────
-- Enhanced version that creates the verification record and triggers billing.
CREATE OR REPLACE FUNCTION public.admin_confirm_admission_and_bill(
  p_inquiry_id uuid,
  p_facility_id uuid,
  p_admission_date date,
  p_override_reason text DEFAULT NULL,
  p_fee_amount_cents integer DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_is_admin boolean;
  v_verification_id uuid;
  v_inquiry RECORD;
  v_facility RECORD;
BEGIN
  -- Verify admin
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = v_caller AND role = 'admin'
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Only administrators can confirm admissions' USING ERRCODE = '42501';
  END IF;

  -- Get inquiry and facility
  SELECT * INTO v_inquiry FROM public.concierge_inquiries WHERE id = p_inquiry_id;
  SELECT * INTO v_facility FROM public.facilities WHERE id = p_facility_id;

  IF v_inquiry IS NULL OR v_facility IS NULL THEN
    RAISE EXCEPTION 'Inquiry or facility not found' USING ERRCODE = 'P0002';
  END IF;

  -- Create or update admission verification
  INSERT INTO public.admission_verifications (
    inquiry_id, facility_id,
    admin_confirmed, admin_confirmed_at, admin_confirmed_by,
    admin_override_reason,
    verification_status,
    billing_status, billing_amount_cents,
    billing_due_date
  ) VALUES (
    p_inquiry_id, p_facility_id,
    true, now(), v_caller,
    p_override_reason,
    'admin_override',
    'confirmed', p_fee_amount_cents,
    (CURRENT_DATE + INTERVAL '7 days')::date
  )
  ON CONFLICT (inquiry_id, facility_id) DO UPDATE SET
    admin_confirmed = true,
    admin_confirmed_at = now(),
    admin_confirmed_by = v_caller,
    admin_override_reason = COALESCE(p_override_reason, admission_verifications.admin_override_reason),
    verification_status = CASE
      WHEN admission_verifications.provider_reported AND admission_verifications.seeker_verified THEN 'both_confirmed'
      WHEN admission_verifications.provider_reported THEN 'provider_only'
      WHEN admission_verifications.seeker_verified THEN 'seeker_only'
      ELSE 'admin_override'
    END,
    billing_status = 'confirmed',
    billing_amount_cents = COALESCE(p_fee_amount_cents, admission_verifications.billing_amount_cents),
    billing_due_date = COALESCE(admission_verifications.billing_due_date, (CURRENT_DATE + INTERVAL '7 days')::date),
    updated_at = now()
  RETURNING id INTO v_verification_id;

  -- Log event
  INSERT INTO public.concierge_case_events (
    inquiry_id, event_type, event_data, actor_id, actor_type
  ) VALUES (
    p_inquiry_id,
    'admin_confirmed_admission',
    jsonb_build_object(
      'facility_id', p_facility_id,
      'facility_name', v_facility.name,
      'admission_date', p_admission_date,
      'fee_cents', p_fee_amount_cents,
      'override_reason', p_override_reason,
      'verification_id', v_verification_id
    ),
    v_caller,
    'super_admin'
  );

  RETURN jsonb_build_object(
    'success', true,
    'verification_id', v_verification_id,
    'billing_status', 'confirmed'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_confirm_admission_and_bill(uuid, uuid, date, text, integer) TO authenticated;

-- ─── 12. Trigger: Auto-set admission_report_deadline on PII disclosure ───────
CREATE OR REPLACE FUNCTION public.set_admission_report_deadline()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- When PII is disclosed, set a 48h deadline for provider to report admission
  IF NEW.admin_disclosed_pii_at IS NOT NULL AND OLD.admin_disclosed_pii_at IS NULL THEN
    NEW.admission_report_deadline := NEW.admin_disclosed_pii_at + INTERVAL '48 hours';
    NEW.pii_disclosure_level := 'full';
    NEW.pii_disclosure_expires_at := NEW.admin_disclosed_pii_at + INTERVAL '168 hours'; -- 7 days
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_admission_report_deadline_trigger ON public.concierge_introductions;
CREATE TRIGGER set_admission_report_deadline_trigger
  BEFORE UPDATE ON public.concierge_introductions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_admission_report_deadline();

-- ─── 13. View: Revenue Protection Dashboard Data ─────────────────────────────
CREATE OR REPLACE VIEW public.revenue_protection_overview AS
SELECT
  av.id AS verification_id,
  av.inquiry_id,
  av.facility_id,
  f.name AS facility_name,
  ci.user_name AS seeker_first_name,
  av.verification_status,
  av.billing_status,
  av.billing_amount_cents,
  av.provider_reported,
  av.provider_reported_at,
  av.provider_admission_date,
  av.seeker_verified,
  av.seeker_verified_at,
  av.admin_confirmed,
  av.admin_confirmed_at,
  av.billing_due_date,
  av.billing_reminder_count,
  av.billing_escalation_level,
  av.dispute_reason,
  av.created_at,
  av.updated_at,
  -- Computed flags
  CASE WHEN av.billing_due_date < CURRENT_DATE AND av.billing_status NOT IN ('paid', 'waived') THEN true ELSE false END AS is_overdue,
  CASE WHEN av.billing_escalation_level > 0 THEN true ELSE false END AS is_escalated,
  f.placement_network_standing,
  f.placement_compliance_score
FROM public.admission_verifications av
JOIN public.facilities f ON f.id = av.facility_id
JOIN public.concierge_inquiries ci ON ci.id = av.inquiry_id;
