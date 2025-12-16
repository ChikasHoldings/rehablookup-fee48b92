-- Fix Security Definer View - recreate as SECURITY INVOKER (safer)
DROP VIEW IF EXISTS public.public_facilities;

CREATE VIEW public.public_facilities 
WITH (security_invoker = true) AS
SELECT 
    id,
    name,
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
    slug,
    status,
    featured,
    featured_pinned,
    verified,
    last_featured_shown_at,
    created_at,
    updated_at,
    reply_email,
    reply_email_verified,
    reply_email_verified_at
FROM facilities
WHERE status = 'approved' AND (suspended IS NULL OR suspended = false);