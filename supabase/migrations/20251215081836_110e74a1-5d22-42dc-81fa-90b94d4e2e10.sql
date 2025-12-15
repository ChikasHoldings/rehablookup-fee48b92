-- Make handle_facility_approval robust when settings are missing
CREATE OR REPLACE FUNCTION public.handle_facility_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  supabase_url TEXT;
  service_role_key TEXT;
BEGIN
  -- Only trigger when status changes to 'approved'
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    -- Read configuration settings safely
    supabase_url := current_setting('app.settings.supabase_url', true);
    service_role_key := current_setting('app.settings.service_role_key', true);

    -- If configuration is missing, log a warning but do NOT block approval
    IF supabase_url IS NULL OR service_role_key IS NULL THEN
      RAISE WARNING 'handle_facility_approval: app.settings.supabase_url or app.settings.service_role_key not configured. Skipping approval email for facility %', NEW.id;
      RETURN NEW;
    END IF;

    -- Call the edge function to send approval email
    PERFORM net.http_post(
      url := supabase_url || '/functions/v1/send-approval-email',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || service_role_key
      ),
      body := jsonb_build_object(
        'facilityId', NEW.id,
        'facilityName', NEW.name,
        'userId', NEW.user_id
      )
    );
  END IF;
  
  RETURN NEW;
END;
$function$;