
-- Create a function to enforce facility limits server-side
CREATE OR REPLACE FUNCTION public.enforce_facility_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_count INT;
  is_pro BOOLEAN;
  purchased_slots INT;
  max_allowed INT;
BEGIN
  -- Count existing facilities for this user
  SELECT COUNT(*) INTO current_count
  FROM public.facilities
  WHERE user_id = NEW.user_id;

  -- Check if user has an active Pro subscription
  SELECT EXISTS (
    SELECT 1 FROM public.pro_subscriptions
    WHERE provider_id = NEW.user_id
      AND status = 'active'
      AND (current_period_end IS NULL OR current_period_end > now())
  ) INTO is_pro;

  -- Count purchased listing slots
  SELECT COALESCE(COUNT(*), 0) INTO purchased_slots
  FROM public.purchased_listing_slots
  WHERE user_id = NEW.user_id
    AND status = 'completed';

  -- Calculate max allowed
  IF is_pro THEN
    max_allowed := 5 + purchased_slots;
  ELSE
    max_allowed := 1;
  END IF;

  -- Enforce limit
  IF current_count >= max_allowed THEN
    RAISE EXCEPTION 'Facility limit reached. Your plan allows % facilities.', max_allowed;
  END IF;

  RETURN NEW;
END;
$$;

-- Create the trigger
CREATE TRIGGER enforce_facility_limit_trigger
  BEFORE INSERT ON public.facilities
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_facility_limit();
