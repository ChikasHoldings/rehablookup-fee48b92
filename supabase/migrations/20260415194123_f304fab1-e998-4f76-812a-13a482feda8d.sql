
-- Step 1: Temporarily replace the trigger function to allow migration
CREATE OR REPLACE FUNCTION public.validate_concierge_status_transition()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Temporarily permissive during migration
  RETURN NEW;
END;
$function$;

-- Step 2: Migrate existing data to new status values
UPDATE public.concierge_inquiries SET status = 'intake_submitted' WHERE status = 'new';
UPDATE public.concierge_inquiries SET status = 'intake_reviewed' WHERE status = 'reviewing';
UPDATE public.concierge_inquiries SET status = 'matching_providers' WHERE status = 'matching';
UPDATE public.concierge_inquiries SET status = 'providers_accepted' WHERE status = 'matched';
UPDATE public.concierge_inquiries SET status = 'presented_to_seeker' WHERE status = 'introductions_sent';
UPDATE public.concierge_inquiries SET status = 'seeker_selected' WHERE status = 'in_contact';
UPDATE public.concierge_inquiries SET status = 'admitted' WHERE status = 'placed';
UPDATE public.concierge_inquiries SET status = 'completed' WHERE status = 'closed' AND placement_confirmed = true;

-- Step 3: Now install the strict validation
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
      v_allowed := ARRAY['intake_submitted', 'closed'];
  END CASE;

  IF NOT (NEW.status = ANY(v_allowed)) THEN
    RAISE EXCEPTION 'Invalid status transition: % → %. Allowed: %', OLD.status, NEW.status, array_to_string(v_allowed, ', ');
  END IF;

  RETURN NEW;
END;
$function$;

-- Step 4: Update placement invoice validation
CREATE OR REPLACE FUNCTION public.validate_placement_invoice()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_status text;
BEGIN
  SELECT status INTO v_status
  FROM public.concierge_inquiries
  WHERE id = NEW.inquiry_id;

  IF v_status IS NULL THEN
    RAISE EXCEPTION 'Inquiry % not found', NEW.inquiry_id;
  END IF;

  IF v_status NOT IN ('admitted', 'billed', 'completed') THEN
    RAISE EXCEPTION 'Cannot create invoice: inquiry % is in status %. Must be admitted or later.', NEW.inquiry_id, v_status;
  END IF;

  RETURN NEW;
END;
$function$;
