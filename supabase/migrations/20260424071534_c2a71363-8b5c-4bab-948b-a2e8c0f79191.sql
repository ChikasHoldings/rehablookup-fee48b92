-- ----------------------------------------------------------------------------
-- facility_reviews: revoke broad PUBLIC SELECT, then re-grant only the
-- columns intended for anonymous public consumption. user_id stays gated.
-- ----------------------------------------------------------------------------
REVOKE SELECT ON public.facility_reviews FROM PUBLIC;
REVOKE SELECT ON public.facility_reviews FROM anon;

GRANT SELECT (
  id,
  facility_id,
  rating,
  review_text,
  status,
  helpful_count,
  reviewer_display_name,
  disputed,
  created_at,
  updated_at
) ON public.facility_reviews TO anon;

-- authenticated keeps full row access; RLS continues to gate row visibility
GRANT SELECT ON public.facility_reviews TO authenticated;

-- ----------------------------------------------------------------------------
-- facility_staff: same pattern. email/phone are owner/admin only via RLS,
-- but defense-in-depth means we strip them from anon's column grants too.
-- ----------------------------------------------------------------------------
REVOKE SELECT ON public.facility_staff FROM PUBLIC;
REVOKE SELECT ON public.facility_staff FROM anon;

GRANT SELECT (
  id,
  facility_id,
  name,
  job_title,
  bio,
  photo_url,
  display_order,
  is_visible,
  created_at,
  updated_at
) ON public.facility_staff TO anon;

GRANT SELECT ON public.facility_staff TO authenticated;