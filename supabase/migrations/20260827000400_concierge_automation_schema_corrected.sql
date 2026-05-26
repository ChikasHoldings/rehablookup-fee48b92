-- Corrected, additive subset of the never-applied
-- 20260508150000_placement_automation_enhancements.sql.
--
-- The original migration was never applied to the live DB, which left the
-- concierge placement engine broken: the live validate_concierge_status_
-- transition trigger has no 'matched' case, so match-concierge-intake (used
-- by both the admin "Run Placement" button AND auto-intake) cannot persist
-- status='matched' — the trigger rejects it. submit-concierge-intake also
-- writes auto_matched / auto_introductions_sent_at columns, and send-
-- concierge-introduction inserts response_deadline_at, none of which existed.
--
-- The original couldn't simply be applied as-is: its platform_settings INSERT
-- targets a (key, value, description) schema, but the live table is
-- (setting_key, setting_value jsonb, ...) — so that INSERT would fail. This
-- migration applies only the safe, additive parts and omits the settings
-- INSERT. The automation toggles default OFF in code (submit-concierge-intake),
-- so applying this does NOT switch on auto-emailing.
--
-- 1) Status-transition trigger — strict SUPERSET of the live (manual-only)
--    trigger: every transition the live trigger allowed is still allowed, plus
--    the automated 'matched' path. Cannot break the existing manual flow.

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
      v_allowed := ARRAY['intake_reviewed', 'matched', 'closed'];
    WHEN 'intake_reviewed' THEN
      v_allowed := ARRAY['advisor_assigned', 'matching_providers', 'matched', 'closed'];
    WHEN 'advisor_assigned' THEN
      v_allowed := ARRAY['matching_providers', 'matched', 'closed'];
    WHEN 'matching_providers' THEN
      v_allowed := ARRAY['provider_prequalification', 'matched', 'closed'];
    WHEN 'matched' THEN
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
      v_allowed := ARRAY['intake_submitted', 'closed'];
  END CASE;

  IF NOT (NEW.status = ANY(v_allowed)) THEN
    RAISE EXCEPTION 'Invalid status transition: % → %. Allowed: %', OLD.status, NEW.status, array_to_string(v_allowed, ', ');
  END IF;

  RETURN NEW;
END;
$function$;

-- 2) Additive automation columns actually referenced by live code.
--    (sla_alert_sent_at, seeker_reminder_sent_at, auto_declined,
--    reminder_sent_at from the original are intentionally omitted — no live
--    code uses them.)
ALTER TABLE public.concierge_inquiries
  ADD COLUMN IF NOT EXISTS auto_matched boolean DEFAULT false;
ALTER TABLE public.concierge_inquiries
  ADD COLUMN IF NOT EXISTS auto_matched_at timestamptz;
ALTER TABLE public.concierge_inquiries
  ADD COLUMN IF NOT EXISTS auto_introductions_sent_at timestamptz;
ALTER TABLE public.concierge_inquiries
  ADD COLUMN IF NOT EXISTS auto_introduction_count integer DEFAULT 0;
ALTER TABLE public.concierge_introductions
  ADD COLUMN IF NOT EXISTS response_deadline_at timestamptz;

-- 3) Supporting indexes (placement-monitor SLA scan + auto-decline pending scan).
CREATE INDEX IF NOT EXISTS idx_concierge_inquiries_status_updated
  ON public.concierge_inquiries (status, updated_at)
  WHERE status NOT IN ('completed', 'closed');

CREATE INDEX IF NOT EXISTS idx_concierge_introductions_pending_response
  ON public.concierge_introductions (provider_response, response_deadline_at)
  WHERE provider_response = 'pending' OR provider_response IS NULL;
