-- Create function to handle facility approval notification
CREATE OR REPLACE FUNCTION public.handle_facility_approval()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  supabase_url TEXT;
  service_role_key TEXT;
BEGIN
  -- Only trigger when status changes to 'approved'
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    -- Call the edge function to send approval email
    PERFORM net.http_post(
      url := current_setting('app.settings.supabase_url', true) || '/functions/v1/send-approval-email',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
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
$$;

-- Create trigger for facility status changes
DROP TRIGGER IF EXISTS on_facility_approved ON public.facilities;
CREATE TRIGGER on_facility_approved
  AFTER UPDATE OF status ON public.facilities
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_facility_approval();