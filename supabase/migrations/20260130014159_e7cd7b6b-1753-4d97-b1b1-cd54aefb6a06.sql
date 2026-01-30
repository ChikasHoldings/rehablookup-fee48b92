CREATE OR REPLACE FUNCTION public.handle_new_seeker()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Only create seeker profile if user doesn't have provider or admin role
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = NEW.id AND role IN ('admin')
  ) AND NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE user_id = NEW.id
  ) THEN
    INSERT INTO public.seeker_profiles (user_id, display_name, first_name, last_name)
    VALUES (
      NEW.id, 
      NEW.raw_user_meta_data ->> 'display_name',
      NEW.raw_user_meta_data ->> 'first_name',
      NEW.raw_user_meta_data ->> 'last_name'
    );
    
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'seeker');
  END IF;
  RETURN NEW;
END;
$function$;