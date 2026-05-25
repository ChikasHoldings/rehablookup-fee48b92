-- Pro-gate the public "Verified" trust badge (product decision 2026-05-25).
--
-- The facility-level `verified` flag is earned via claim/admin verification and
-- is plan-independent. Per product, the PUBLIC "Verified" badge is a Pro perk:
-- publicly a facility reads as verified only when it is verified AND on an
-- active Pro subscription. The raw facilities.verified column is unchanged
-- (provider + admin dashboards still see true verification state); only the
-- public exposure is masked — same has_active_pro() pattern already used for
-- phone / website / video_url / virtual_tour_url.
--
-- Coverage: every live public surface that renders the badge sources `verified`
-- from one of these two — the profile pages, search cards, and build-time SEO
-- HTML go through public_facilities; the detail-page fallback uses
-- get_public_facility_data. Client render sites already gate on
-- `facility.verified` so they auto-relock; a downgrade re-locks the badge via
-- the time/status check inside has_active_pro().

CREATE OR REPLACE VIEW public.public_facilities AS
 SELECT id,
    name,
    slug,
    city,
    state,
    zip_code,
    address,
    phone,
    website,
    description,
    facility_type,
    gender_served,
    bed_count,
    featured,
    featured_display_order,
    featured_pinned,
    CASE WHEN has_active_pro(id) THEN verified ELSE false END AS verified,
    year_established,
    logo_url,
    gallery_urls,
    status,
    calculated_ranking_score,
    listing_completeness_score,
    response_rate_score,
    accepts_international_patients,
    created_at,
    updated_at,
    email,
    user_id IS NOT NULL AND claimed_at IS NOT NULL AS is_claimed,
    has_active_pro(id) AS is_pro,
    has_active_pro(id) AS is_premium_visible,
    data_source,
    hours_of_operation,
    languages_spoken,
    accessibility_features,
    accepting_admissions,
        CASE
            WHEN has_active_pro(id) THEN video_url
            ELSE NULL::text
        END AS video_url,
        CASE
            WHEN has_active_pro(id) THEN virtual_tour_url
            ELSE NULL::text
        END AS virtual_tour_url
   FROM facilities
  WHERE status = 'approved'::text AND COALESCE(suspended, false) = false;

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
    CASE
      WHEN public.has_active_pro(f.id) THEN f.verified
      ELSE false
    END AS verified,
    f.reply_email,
    f.reply_email_verified,
    f.reply_email_verified_at,
    f.status,
    f.created_at,
    f.updated_at
  FROM public.facilities f
  WHERE f.id = facility_id AND f.status = 'approved';
$function$;
