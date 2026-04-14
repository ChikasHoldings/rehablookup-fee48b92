CREATE OR REPLACE FUNCTION public.validate_lead_status_transition()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_allowed text[];
BEGIN
  -- Skip if status hasn't changed
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  CASE OLD.status
    WHEN 'new' THEN
      v_allowed := ARRAY['contacted', 'unlocked', 'responding', 'closed', 'expired'];
    WHEN 'contacted' THEN
      v_allowed := ARRAY['responding', 'unlocked', 'closed', 'expired'];
    WHEN 'unlocked' THEN
      v_allowed := ARRAY['contacted', 'responding', 'closed'];
    WHEN 'responding' THEN
      v_allowed := ARRAY['closed'];
    WHEN 'closed' THEN
      v_allowed := ARRAY[]::text[];
    WHEN 'expired' THEN
      v_allowed := ARRAY['unlocked', 'closed'];
    ELSE
      -- Unknown status, allow (forward compat)
      RETURN NEW;
  END CASE;

  IF NOT (NEW.status = ANY(v_allowed)) THEN
    RAISE EXCEPTION 'Invalid lead status transition: % → %. Allowed: %', OLD.status, NEW.status, array_to_string(v_allowed, ', ');
  END IF;

  RETURN NEW;
END;
$function$;