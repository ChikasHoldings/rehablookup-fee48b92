
-- Drop and recreate public_facilities view with Pro-gated phone/website
DROP VIEW IF EXISTS public.public_facilities;

CREATE VIEW public.public_facilities
WITH (security_invoker=on) AS
SELECT 
  f.id,
  f.name,
  f.slug,
  f.address,
  f.city,
  f.state,
  f.zip_code,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM public.pro_subscriptions ps 
      WHERE ps.facility_id = f.id 
        AND ps.status = 'active' 
        AND (ps.current_period_end IS NULL OR ps.current_period_end > now())
    ) THEN f.phone
    ELSE NULL
  END AS phone,
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
  f.year_established,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM public.pro_subscriptions ps 
      WHERE ps.facility_id = f.id 
        AND ps.status = 'active' 
        AND (ps.current_period_end IS NULL OR ps.current_period_end > now())
    ) THEN f.website
    ELSE NULL
  END AS website,
  f.status,
  f.created_at,
  f.updated_at
FROM facilities f
WHERE (f.status = 'approved'::text);

-- Update get_public_facility_data to also enforce Pro-only phone/website
CREATE OR REPLACE FUNCTION public.get_public_facility_data(facility_id uuid)
 RETURNS TABLE(id uuid, name text, slug text, address text, city text, state text, zip_code text, phone text, email text, website text, description text, facility_type text, bed_count text, gender_served text, logo_url text, gallery_urls text[], featured boolean, featured_pinned boolean, last_featured_shown_at timestamp with time zone, verified boolean, reply_email text, reply_email_verified boolean, reply_email_verified_at timestamp with time zone, status text, created_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT 
    f.id,
    f.name,
    f.slug,
    f.address,
    f.city,
    f.state,
    f.zip_code,
    CASE 
      WHEN public.has_active_pro(f.id) THEN f.phone
      ELSE NULL
    END AS phone,
    f.email,
    CASE 
      WHEN public.has_active_pro(f.id) THEN f.website
      ELSE NULL
    END AS website,
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
$function$;
