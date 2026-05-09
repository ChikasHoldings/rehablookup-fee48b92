-- ============================================================================
-- HARDEN PLACEMENT WORKFLOW
-- ============================================================================
-- 1. Fix get_provider_safe_inquiries to mask user_name to first name at SQL level
-- 2. Migrate legacy 'new' status cases to 'intake_submitted'
-- 3. Add 'new' → 'intake_submitted' to the DB trigger for safety
-- ============================================================================

-- ─── 1. Fix PII leak in get_provider_safe_inquiries ──────────────────────────
-- The function previously returned the full user_name. Now returns first name only.
CREATE OR REPLACE FUNCTION public.get_provider_safe_inquiries(p_facility_id uuid)
RETURNS TABLE (
  id uuid,
  user_name text,
  level_of_care text,
  payment_type text,
  timeline_urgency text,
  preferred_state text,
  preferred_city text,
  status text,
  age_range text,
  gender text,
  primary_concern text,
  insurance_carrier text,
  detox_needed text,
  co_occurring_concerns jsonb,
  substance_use_duration text,
  budget_range text,
  seeker_confirmed boolean,
  seeker_confirmed_at timestamptz,
  placement_confirmed boolean,
  placement_confirmed_at timestamptz,
  placed_facility_id uuid
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    i.id,
    -- Mask to first name only — full name is PII
    split_part(COALESCE(i.user_name, ''), ' ', 1) AS user_name,
    i.level_of_care,
    i.payment_type,
    i.timeline_urgency,
    i.preferred_state,
    i.preferred_city,
    i.status,
    i.age_range,
    i.gender,
    i.primary_concern,
    i.insurance_carrier,
    i.detox_needed,
    i.co_occurring_concerns,
    i.substance_use_duration,
    i.budget_range,
    i.seeker_confirmed,
    i.seeker_confirmed_at,
    i.placement_confirmed,
    i.placement_confirmed_at,
    i.placed_facility_id
  FROM public.concierge_inquiries i
  JOIN public.concierge_introductions ci ON ci.inquiry_id = i.id
  WHERE ci.facility_id = p_facility_id
    AND EXISTS (
      SELECT 1 FROM public.facilities f
      WHERE f.id = p_facility_id AND f.user_id = auth.uid()
    );
$$;

-- ─── 2. Migrate legacy 'new' status cases to 'intake_submitted' ─────────────
-- Disable the trigger temporarily to allow the bulk update
ALTER TABLE public.concierge_inquiries DISABLE TRIGGER validate_concierge_status_transition_trigger;

UPDATE public.concierge_inquiries
SET status = 'intake_submitted',
    updated_at = NOW()
WHERE status = 'new';

ALTER TABLE public.concierge_inquiries ENABLE TRIGGER validate_concierge_status_transition_trigger;

-- ─── 3. Update the DB trigger to explicitly handle 'new' status ─────────────
-- This ensures any edge case where 'new' appears is handled gracefully.
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
      v_allowed := ARRAY['intake_reviewed', 'closed'];
    WHEN 'intake_reviewed' THEN
      v_allowed := ARRAY['advisor_assigned', 'closed'];
    WHEN 'advisor_assigned' THEN
      v_allowed := ARRAY['matching_providers', 'closed'];
    WHEN 'matching_providers' THEN
      v_allowed := ARRAY['provider_prequalification', 'closed'];
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
      -- Fallback for any unknown status — allow transition to intake_submitted or closed
      v_allowed := ARRAY['intake_submitted', 'closed'];
  END CASE;
  IF NOT (NEW.status = ANY(v_allowed)) THEN
    RAISE EXCEPTION 'Invalid status transition: % → %. Allowed: %', OLD.status, NEW.status, array_to_string(v_allowed, ', ');
  END IF;
  RETURN NEW;
END;
$function$;


-- ─── 4. Fix CRITICAL missing RLS policies on concierge_introductions ────────
-- The "Admins can insert introductions" policy was dropped and never recreated.
-- Providers also have no UPDATE policy, so they can't respond to introductions.

-- Admin INSERT policy: admins can create introductions from the detail modal
DROP POLICY IF EXISTS "Admins can manage introductions" ON public.concierge_introductions;
CREATE POLICY "Admins can manage introductions"
  ON public.concierge_introductions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Provider UPDATE policy: providers can update their own introductions (response, notes)
DROP POLICY IF EXISTS "Providers can update own introductions" ON public.concierge_introductions;
CREATE POLICY "Providers can update own introductions"
  ON public.concierge_introductions
  FOR UPDATE TO authenticated
  USING (
    facility_id IN (SELECT id FROM public.facilities WHERE user_id = auth.uid())
  )
  WITH CHECK (
    facility_id IN (SELECT id FROM public.facilities WHERE user_id = auth.uid())
  );


-- ─── 5. Fix CRITICAL missing INSERT policy on concierge_case_events ─────────
-- The "Anyone can insert case events" and "Authenticated users can insert case events"
-- policies were dropped in 20260413. But seekers (SeekerProviderReviewCard) and
-- providers (DomesticCandidatesTab) both do direct .insert() on this table.
-- Only "Admins can insert case events" survived. We need a scoped INSERT policy
-- for seekers and providers.

-- Seekers can insert events for their own cases
DROP POLICY IF EXISTS "Seekers can insert own case events" ON public.concierge_case_events;
CREATE POLICY "Seekers can insert own case events"
  ON public.concierge_case_events
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.concierge_inquiries
      WHERE id = inquiry_id AND user_id = auth.uid()
    )
  );

-- Providers can insert events for cases they are introduced to
DROP POLICY IF EXISTS "Providers can insert case events for their introductions" ON public.concierge_case_events;
CREATE POLICY "Providers can insert case events for their introductions"
  ON public.concierge_case_events
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.concierge_introductions
      WHERE inquiry_id = concierge_case_events.inquiry_id
        AND facility_id IN (SELECT id FROM public.facilities WHERE user_id = auth.uid())
    )
  );
