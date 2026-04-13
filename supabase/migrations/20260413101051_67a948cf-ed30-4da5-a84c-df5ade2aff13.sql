
-- =========================================
-- 1. Status transition validation trigger
-- =========================================
CREATE OR REPLACE FUNCTION public.validate_concierge_status_transition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_allowed text[];
BEGIN
  -- Skip if status hasn't changed
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Define valid transitions
  CASE OLD.status
    WHEN 'new' THEN
      v_allowed := ARRAY['reviewing', 'closed'];
    WHEN 'reviewing' THEN
      v_allowed := ARRAY['matching', 'matched', 'closed'];
    WHEN 'matching' THEN
      v_allowed := ARRAY['matched', 'closed'];
    WHEN 'matched' THEN
      v_allowed := ARRAY['introductions_sent', 'in_contact', 'placed', 'closed'];
    WHEN 'introductions_sent' THEN
      v_allowed := ARRAY['in_contact', 'placed', 'closed'];
    WHEN 'in_contact' THEN
      v_allowed := ARRAY['placed', 'closed'];
    WHEN 'placed' THEN
      v_allowed := ARRAY['closed']; -- Only close after placement
    WHEN 'closed' THEN
      v_allowed := ARRAY[]::text[]; -- No transitions from closed
    ELSE
      -- Unknown status, allow transition (forward compatibility)
      RETURN NEW;
  END CASE;

  IF NOT (NEW.status = ANY(v_allowed)) THEN
    RAISE EXCEPTION 'Invalid status transition: % → %. Allowed: %', OLD.status, NEW.status, array_to_string(v_allowed, ', ');
  END IF;

  RETURN NEW;
END;
$$;

-- Create the trigger
DROP TRIGGER IF EXISTS validate_concierge_status_transition_trigger ON public.concierge_inquiries;
CREATE TRIGGER validate_concierge_status_transition_trigger
  BEFORE UPDATE ON public.concierge_inquiries
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_concierge_status_transition();

-- =========================================
-- 2. Harden placement_invoices RLS
-- =========================================
DROP POLICY IF EXISTS "Providers can view own invoices" ON public.placement_invoices;
CREATE POLICY "Providers can view own invoices"
  ON public.placement_invoices FOR SELECT TO authenticated
  USING (
    facility_id IN (SELECT id FROM public.facilities WHERE user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

DROP POLICY IF EXISTS "Service role manages invoices" ON public.placement_invoices;
CREATE POLICY "Service role manages invoices"
  ON public.placement_invoices FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Block direct client inserts/updates on invoices
DROP POLICY IF EXISTS "Providers can insert invoices" ON public.placement_invoices;
DROP POLICY IF EXISTS "Providers can update invoices" ON public.placement_invoices;

-- =========================================
-- 3. Harden concierge_introductions RLS
-- =========================================
DROP POLICY IF EXISTS "Providers can view own introductions" ON public.concierge_introductions;
CREATE POLICY "Providers can view own introductions"
  ON public.concierge_introductions FOR SELECT TO authenticated
  USING (
    facility_id IN (SELECT id FROM public.facilities WHERE user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

DROP POLICY IF EXISTS "Service role manages introductions" ON public.concierge_introductions;
CREATE POLICY "Service role manages introductions"
  ON public.concierge_introductions FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Block direct client inserts on introductions
DROP POLICY IF EXISTS "Admins can insert introductions" ON public.concierge_introductions;

-- =========================================
-- 4. Harden concierge_case_events RLS
-- =========================================
DROP POLICY IF EXISTS "Admins can view case events" ON public.concierge_case_events;
CREATE POLICY "Admins can view case events"
  ON public.concierge_case_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Service role manages case events" ON public.concierge_case_events;
CREATE POLICY "Service role manages case events"
  ON public.concierge_case_events FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Block direct client inserts
DROP POLICY IF EXISTS "Anyone can insert case events" ON public.concierge_case_events;
DROP POLICY IF EXISTS "Authenticated users can insert case events" ON public.concierge_case_events;

-- =========================================
-- 5. Harden concierge_engagements RLS
-- =========================================
DROP POLICY IF EXISTS "Providers can view own engagements" ON public.concierge_engagements;
CREATE POLICY "Providers can view own engagements"
  ON public.concierge_engagements FOR SELECT TO authenticated
  USING (
    provider_id = auth.uid()
    OR facility_id IN (SELECT id FROM public.facilities WHERE user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

DROP POLICY IF EXISTS "Service role manages engagements" ON public.concierge_engagements;
CREATE POLICY "Service role manages engagements"
  ON public.concierge_engagements FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Block direct client inserts on engagements
DROP POLICY IF EXISTS "Providers can insert engagements" ON public.concierge_engagements;
DROP POLICY IF EXISTS "Anyone can insert engagements" ON public.concierge_engagements;
