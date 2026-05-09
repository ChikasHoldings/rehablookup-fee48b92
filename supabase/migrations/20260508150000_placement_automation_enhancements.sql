-- ============================================================================
-- PLACEMENT AUTOMATION ENHANCEMENTS
-- ============================================================================
-- 1. Update the status transition trigger to support:
--    - 'matched' as a new intermediate status (auto-matching result)
--    - Optional advisor assignment (intake_reviewed can skip to matching_providers)
--    - Direct path from intake_submitted → matched (fully automated flow)
-- 2. Add automation columns to concierge_inquiries
-- 3. Add platform_settings for automation configuration
-- ============================================================================

-- ─── 1. Updated status transition trigger ────────────────────────────────────
-- The new flow supports both manual and automated paths:
--
-- AUTOMATED PATH (no advisor):
--   intake_submitted → intake_reviewed → matched → providers_accepted →
--   presented_to_seeker → seeker_selected → admission_in_progress →
--   admitted → billed → completed
--
-- MANUAL PATH (with advisor):
--   intake_submitted → intake_reviewed → advisor_assigned → matching_providers →
--   provider_prequalification → providers_accepted → presented_to_seeker →
--   seeker_selected → admission_in_progress → admitted → billed → completed
--
-- Both paths can reach 'closed' from any non-terminal status.

CREATE OR REPLACE FUNCTION public.validate_concierge_status_transition()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_allowed text[];
BEGIN
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  CASE OLD.status
    WHEN 'new' THEN
      v_allowed := ARRAY['intake_submitted', 'pending_intake', 'closed'];
    WHEN 'pending_intake' THEN
      v_allowed := ARRAY['intake_submitted', 'closed'];
    WHEN 'intake_submitted' THEN
      -- Can go to review, or directly to matched (auto-match), or closed
      v_allowed := ARRAY['intake_reviewed', 'matched', 'closed'];
    WHEN 'intake_reviewed' THEN
      -- Can assign advisor (manual), go to matching (skip advisor), or matched (auto), or closed
      v_allowed := ARRAY['advisor_assigned', 'matching_providers', 'matched', 'closed'];
    WHEN 'advisor_assigned' THEN
      v_allowed := ARRAY['matching_providers', 'matched', 'closed'];
    WHEN 'matching_providers' THEN
      v_allowed := ARRAY['provider_prequalification', 'matched', 'closed'];
    WHEN 'matched' THEN
      -- Auto-matched: can go to provider_prequalification (intros sent, awaiting responses), providers_accepted, or closed
      v_allowed := ARRAY['provider_prequalification', 'providers_accepted', 'presented_to_seeker', 'closed'];
    WHEN 'provider_prequalification' THEN
      v_allowed := ARRAY['providers_accepted', 'closed'];
    WHEN 'providers_accepted' THEN
      v_allowed := ARRAY['presented_to_seeker', 'closed'];
    WHEN 'presented_to_seeker' THEN
      v_allowed := ARRAY['seeker_selected', 'closed'];
    WHEN 'seeker_selected' THEN
      v_allowed := ARRAY['admission_in_progress', 'closed'];
    WHEN 'admission_in_progress' THEN
      v_allowed := ARRAY['admitted', 'closed'];
    WHEN 'admitted' THEN
      v_allowed := ARRAY['billed', 'closed'];
    WHEN 'billed' THEN
      v_allowed := ARRAY['completed'];
    WHEN 'completed' THEN
      v_allowed := ARRAY[]::text[];
    WHEN 'closed' THEN
      v_allowed := ARRAY[]::text[];
    ELSE
      -- Fallback for any unknown status
      v_allowed := ARRAY['intake_submitted', 'closed'];
  END CASE;

  IF NOT (NEW.status = ANY(v_allowed)) THEN
    RAISE EXCEPTION 'Invalid status transition: % → %. Allowed: %', OLD.status, NEW.status, array_to_string(v_allowed, ', ');
  END IF;

  RETURN NEW;
END;
$function$;

-- ─── 2. Add automation columns to concierge_inquiries ────────────────────────
-- These columns track the automated workflow state.

-- Track whether this case used the automated path (no advisor)
ALTER TABLE public.concierge_inquiries
  ADD COLUMN IF NOT EXISTS auto_matched boolean DEFAULT false;

-- Track when auto-matching was completed
ALTER TABLE public.concierge_inquiries
  ADD COLUMN IF NOT EXISTS auto_matched_at timestamptz;

-- Track when introductions were auto-sent
ALTER TABLE public.concierge_inquiries
  ADD COLUMN IF NOT EXISTS auto_introductions_sent_at timestamptz;

-- Track the number of auto-sent introductions
ALTER TABLE public.concierge_inquiries
  ADD COLUMN IF NOT EXISTS auto_introduction_count integer DEFAULT 0;

-- Track SLA breach alerts
ALTER TABLE public.concierge_inquiries
  ADD COLUMN IF NOT EXISTS sla_alert_sent_at timestamptz;

-- Track seeker reminder sent
ALTER TABLE public.concierge_inquiries
  ADD COLUMN IF NOT EXISTS seeker_reminder_sent_at timestamptz;

-- Track provider response deadline
ALTER TABLE public.concierge_introductions
  ADD COLUMN IF NOT EXISTS response_deadline_at timestamptz;

-- Track auto-decline
ALTER TABLE public.concierge_introductions
  ADD COLUMN IF NOT EXISTS auto_declined boolean DEFAULT false;

-- Track reminder sent to provider
ALTER TABLE public.concierge_introductions
  ADD COLUMN IF NOT EXISTS reminder_sent_at timestamptz;

-- ─── 3. Platform settings for automation configuration ───────────────────────
INSERT INTO public.platform_settings (key, value, description)
VALUES
  ('placement_auto_match_enabled', 'true', 'Enable automatic matching after intake submission'),
  ('placement_auto_introduce_enabled', 'true', 'Enable automatic introduction sending after matching'),
  ('placement_auto_introduce_max', '5', 'Maximum number of auto-introductions per case'),
  ('placement_provider_response_timeout_hours', '72', 'Hours before provider response is auto-declined'),
  ('placement_seeker_reminder_hours', '48', 'Hours before seeker review reminder is sent'),
  ('placement_sla_alert_hours', '48', 'Hours before SLA breach alert is sent to admin'),
  ('placement_advisor_assignment_mode', 'optional', 'Advisor assignment mode: required, optional, disabled')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, description = EXCLUDED.description;

-- ─── 4. Index for cron job performance ───────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_concierge_inquiries_status_updated
  ON public.concierge_inquiries (status, updated_at)
  WHERE status NOT IN ('completed', 'closed');

CREATE INDEX IF NOT EXISTS idx_concierge_introductions_pending_response
  ON public.concierge_introductions (provider_response, response_deadline_at)
  WHERE provider_response = 'pending' OR provider_response IS NULL;
