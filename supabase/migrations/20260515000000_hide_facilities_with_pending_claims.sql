-- Hide facilities with in-progress claims from the public directory.
--
-- The provider workflow split is:
--
--   • Provider self-submits a facility → status defaults to 'pending'.
--     The existing WHERE clause (status='approved' AND NOT suspended)
--     already hides these from the public view until an admin approves.
--
--   • SAMHSA bulk import inserts with status='approved' so the listing
--     is immediately visible to public visitors who might claim it.
--
--   • A provider claims a SAMHSA listing → a row is inserted into
--     facility_claim_requests with status='pending' (or transitioned
--     to 'under_review' by an admin). The facilities row itself is
--     unchanged (still status='approved') so the listing kept showing
--     up in the public directory during the entire claim review.
--
-- That last case is the bug this migration fixes. The user requirement
-- is: "once a listing is claimed, it's removed from the public pages
-- until admin approval". Implemented here as a NOT EXISTS clause on
-- facility_claim_requests for any pending/under_review row.
--
-- When the claim is approved, the facility_claim_requests row flips to
-- status='approved' and the existing DB trigger transfers ownership
-- (sets facilities.user_id, claimed_at) — at that point the NOT EXISTS
-- clause is true again and the listing reappears in the public view
-- with its new owner attached.

DROP VIEW IF EXISTS public.public_facilities;

CREATE VIEW public.public_facilities
WITH (security_invoker = true) AS
SELECT
  f.id,
  f.name,
  f.slug,
  f.city,
  f.state,
  f.zip_code,
  f.address,
  f.phone,
  f.website,
  f.description,
  f.facility_type,
  f.gender_served,
  f.bed_count,
  f.featured,
  f.featured_display_order,
  f.featured_pinned,
  f.verified,
  f.year_established,
  f.logo_url,
  f.gallery_urls,
  f.status,
  f.calculated_ranking_score,
  f.listing_completeness_score,
  f.response_rate_score,
  f.accepts_international_patients,
  f.created_at,
  f.updated_at
FROM public.facilities f
WHERE f.status = 'approved'
  AND COALESCE(f.suspended, false) = false
  AND NOT EXISTS (
    SELECT 1
    FROM public.facility_claim_requests fcr
    WHERE fcr.facility_id = f.id
      AND fcr.status IN ('pending', 'under_review')
  );

GRANT SELECT ON public.public_facilities TO anon, authenticated;

COMMENT ON VIEW public.public_facilities IS
  'Public-facing facility directory. Hides facilities that are pending admin approval (status != ''approved''), suspended, or under an active claim review. Used by the SPA and SEO endpoints to render the public listings.';
