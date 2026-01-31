-- Create function to get seeker phone numbers from all sources for admin
CREATE OR REPLACE FUNCTION public.get_seeker_phones_for_admin()
RETURNS TABLE(user_id uuid, phone text, source text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  -- Get phones from seeker_profiles
  SELECT sp.user_id, sp.phone, 'profile'::text as source
  FROM public.seeker_profiles sp
  WHERE sp.phone IS NOT NULL AND sp.phone != ''
  
  UNION ALL
  
  -- Get phones from concierge_inquiries
  SELECT ci.user_id, ci.user_phone, 'concierge'::text as source
  FROM public.concierge_inquiries ci
  WHERE ci.user_id IS NOT NULL AND ci.user_phone IS NOT NULL AND ci.user_phone != ''
$$;