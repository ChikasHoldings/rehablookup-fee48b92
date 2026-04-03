CREATE OR REPLACE FUNCTION public.handle_new_seeker()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Only create seeker profile if user explicitly signed up as a seeker
  -- This prevents providers/admins from accidentally getting seeker profiles
  IF (NEW.raw_user_meta_data->>'account_type') = 'seeker' THEN
    INSERT INTO public.seeker_profiles (user_id, first_name, last_name, display_name, phone, zipcode, city, state)
    VALUES (
      NEW.id,
      NEW.raw_user_meta_data->>'first_name',
      NEW.raw_user_meta_data->>'last_name',
      NEW.raw_user_meta_data->>'display_name',
      NEW.raw_user_meta_data->>'phone',
      NEW.raw_user_meta_data->>'zipcode',
      NEW.raw_user_meta_data->>'city',
      NEW.raw_user_meta_data->>'state'
    )
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$function$;