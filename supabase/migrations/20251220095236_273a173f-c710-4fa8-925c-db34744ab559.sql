-- Fix: Exclude admin_notes from public access

-- 1. Drop and recreate the public_facilities view to explicitly exclude admin_notes
DROP VIEW IF EXISTS public.public_facilities;

CREATE VIEW public.public_facilities AS
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

-- 2. Grant SELECT on the view to authenticated and anon users
GRANT SELECT ON public.public_facilities TO authenticated;
GRANT SELECT ON public.public_facilities TO anon;

-- 3. Update the "Anyone can view approved facilities" policy to use a security definer function
-- that returns data without admin_notes

CREATE OR REPLACE FUNCTION public.get_public_facility_data(facility_id uuid)
RETURNS TABLE (
  id uuid,
  name text,
  slug text,
  address text,
  city text,
  state text,
  zip_code text,
  phone text,
  email text,
  website text,
  description text,
  facility_type text,
  bed_count text,
  gender_served text,
  logo_url text,
  gallery_urls text[],
  featured boolean,
  featured_pinned boolean,
  last_featured_shown_at timestamptz,
  verified boolean,
  reply_email text,
  reply_email_verified boolean,
  reply_email_verified_at timestamptz,
  status text,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    f.id,
    f.name,
    f.slug,
    f.address,
    f.city,
    f.state,
    f.zip_code,
    f.phone,
    f.email,
    f.website,
    f.description,
    f.facility_type,
    f.bed_count,
    f.gender_served,
    f.logo_url,
    f.gallery_urls,
    f.featured,
    f.featured_pinned,
    f.last_featured_shown_at,
    f.verified,
    f.reply_email,
    f.reply_email_verified,
    f.reply_email_verified_at,
    f.status,
    f.created_at,
    f.updated_at
  FROM public.facilities f
  WHERE f.id = facility_id AND f.status = 'approved';
$$;