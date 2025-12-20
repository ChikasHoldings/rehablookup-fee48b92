-- Fix the view to use SECURITY INVOKER (default) instead of SECURITY DEFINER
DROP VIEW IF EXISTS public.public_facilities;

CREATE VIEW public.public_facilities 
WITH (security_invoker = true) AS
SELECT 
  id,
  name,
  slug,
  address,
  city,
  state,
  zip_code,
  phone,
  email,
  website,
  description,
  facility_type,
  bed_count,
  gender_served,
  logo_url,
  gallery_urls,
  featured,
  featured_pinned,
  last_featured_shown_at,
  verified,
  reply_email,
  reply_email_verified,
  reply_email_verified_at,
  status,
  created_at,
  updated_at
  -- Explicitly excluding: admin_notes, user_id, lead_limit_override, bonus_leads, 
  -- leads_reset_at, suspended, profile_reminder_count, profile_reminder_sent_at,
  -- profile_completion_celebrated, featured_display_order, year_established
FROM public.facilities
WHERE status = 'approved';

-- Grant SELECT on the view
GRANT SELECT ON public.public_facilities TO authenticated;
GRANT SELECT ON public.public_facilities TO anon;