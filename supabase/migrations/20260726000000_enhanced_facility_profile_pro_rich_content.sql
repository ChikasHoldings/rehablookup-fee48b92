-- Enhanced facility profile: net-new tables + Pro-gated public views
--
-- Adds the rich-profile data surfaces that Pro facilities show on
-- /center/<slug>: programs (description + level of care + length),
-- amenities (tag-style), video + virtual-tour URLs, and an
-- "is_highlighted" hint on existing accreditations so providers can
-- showcase a specific certification.
--
-- Server-side gating is enforced by VIEWS that bake has_active_pro(id)
-- into the WHERE clause / CASE expression. A tampered SPA, the prerender
-- script (which uses the anon key), and any third-party tool reading
-- the API all see the same rich-vs-thin shape — there is no client-side
-- gate that can be flipped.
--
-- Idempotent: every CREATE/ALTER guards on IF NOT EXISTS and every view
-- uses CREATE OR REPLACE.

BEGIN;

-- ─── 1. New columns on existing tables ─────────────────────────────────

ALTER TABLE public.facilities
  ADD COLUMN IF NOT EXISTS video_url text,
  ADD COLUMN IF NOT EXISTS virtual_tour_url text;

COMMENT ON COLUMN public.facilities.video_url IS
  'Public-facing facility tour video URL (hosted; YouTube/Vimeo/MP4). '
  'Exposed publicly only via public_facilities for Pro-tier facilities — '
  'tampering with the SPA cannot reveal it for Free facilities.';

COMMENT ON COLUMN public.facilities.virtual_tour_url IS
  '360° / matterport virtual tour URL. Pro-gated identically to '
  'video_url via the public_facilities view.';

ALTER TABLE public.facility_accreditations
  ADD COLUMN IF NOT EXISTS is_highlighted boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.facility_accreditations.is_highlighted IS
  'Provider-set flag that surfaces an accreditation in the rich '
  'profile "Accreditation Showcase" section. Only takes effect on the '
  'public profile when the facility has active Pro (rendered via the '
  'public_facility_accreditations view).';

-- ─── 2. facility_programs (rich CRUD content, like facility_staff) ─────

CREATE TABLE IF NOT EXISTS public.facility_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id uuid NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text NOT NULL,
  -- Free-form labels rather than enums so providers can list things like
  -- "Outpatient", "PHP", "IOP", "Detox + Residential" without us having
  -- to keep an enum in sync with the SAMHSA taxonomy.
  level_of_care text,
  length_text text,
  display_order integer NOT NULL DEFAULT 0,
  is_visible boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT facility_programs_name_not_blank CHECK (length(btrim(name)) > 0),
  CONSTRAINT facility_programs_description_not_blank CHECK (length(btrim(description)) > 0)
);

CREATE INDEX IF NOT EXISTS facility_programs_facility_order_idx
  ON public.facility_programs (facility_id, display_order, created_at);

ALTER TABLE public.facility_programs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "facility_programs_select_owner_or_admin" ON public.facility_programs;
CREATE POLICY "facility_programs_select_owner_or_admin"
  ON public.facility_programs FOR SELECT
  TO authenticated
  USING (
    has_role((SELECT auth.uid()), 'admin'::app_role)
    OR user_owns_facility(facility_id, (SELECT auth.uid()))
  );

DROP POLICY IF EXISTS "facility_programs_insert_owner" ON public.facility_programs;
CREATE POLICY "facility_programs_insert_owner"
  ON public.facility_programs FOR INSERT
  TO authenticated
  WITH CHECK (user_owns_facility(facility_id, (SELECT auth.uid())));

DROP POLICY IF EXISTS "facility_programs_update_owner_or_admin" ON public.facility_programs;
CREATE POLICY "facility_programs_update_owner_or_admin"
  ON public.facility_programs FOR UPDATE
  TO authenticated
  USING (
    has_role((SELECT auth.uid()), 'admin'::app_role)
    OR user_owns_facility(facility_id, (SELECT auth.uid()))
  )
  WITH CHECK (
    has_role((SELECT auth.uid()), 'admin'::app_role)
    OR user_owns_facility(facility_id, (SELECT auth.uid()))
  );

DROP POLICY IF EXISTS "facility_programs_delete_owner_or_admin" ON public.facility_programs;
CREATE POLICY "facility_programs_delete_owner_or_admin"
  ON public.facility_programs FOR DELETE
  TO authenticated
  USING (
    has_role((SELECT auth.uid()), 'admin'::app_role)
    OR user_owns_facility(facility_id, (SELECT auth.uid()))
  );

-- updated_at trigger (mirrors facility_staff trigger pattern)
CREATE OR REPLACE FUNCTION public.touch_facility_programs_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS facility_programs_touch_updated_at ON public.facility_programs;
CREATE TRIGGER facility_programs_touch_updated_at
  BEFORE UPDATE ON public.facility_programs
  FOR EACH ROW EXECUTE FUNCTION public.touch_facility_programs_updated_at();

-- ─── 3. facility_amenities (tag-style, like facility_services) ─────────

CREATE TABLE IF NOT EXISTS public.facility_amenities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id uuid NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
  amenity_name text NOT NULL,
  is_highlighted boolean NOT NULL DEFAULT false,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT facility_amenities_name_not_blank CHECK (length(btrim(amenity_name)) > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS facility_amenities_uniq_per_facility
  ON public.facility_amenities (facility_id, lower(amenity_name));

CREATE INDEX IF NOT EXISTS facility_amenities_facility_order_idx
  ON public.facility_amenities (facility_id, display_order, created_at);

ALTER TABLE public.facility_amenities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "facility_amenities_select_owner_or_admin" ON public.facility_amenities;
CREATE POLICY "facility_amenities_select_owner_or_admin"
  ON public.facility_amenities FOR SELECT
  TO authenticated
  USING (
    has_role((SELECT auth.uid()), 'admin'::app_role)
    OR user_owns_facility(facility_id, (SELECT auth.uid()))
  );

DROP POLICY IF EXISTS "facility_amenities_insert_owner" ON public.facility_amenities;
CREATE POLICY "facility_amenities_insert_owner"
  ON public.facility_amenities FOR INSERT
  TO authenticated
  WITH CHECK (user_owns_facility(facility_id, (SELECT auth.uid())));

DROP POLICY IF EXISTS "facility_amenities_update_owner_or_admin" ON public.facility_amenities;
CREATE POLICY "facility_amenities_update_owner_or_admin"
  ON public.facility_amenities FOR UPDATE
  TO authenticated
  USING (
    has_role((SELECT auth.uid()), 'admin'::app_role)
    OR user_owns_facility(facility_id, (SELECT auth.uid()))
  )
  WITH CHECK (
    has_role((SELECT auth.uid()), 'admin'::app_role)
    OR user_owns_facility(facility_id, (SELECT auth.uid()))
  );

DROP POLICY IF EXISTS "facility_amenities_delete_owner_or_admin" ON public.facility_amenities;
CREATE POLICY "facility_amenities_delete_owner_or_admin"
  ON public.facility_amenities FOR DELETE
  TO authenticated
  USING (
    has_role((SELECT auth.uid()), 'admin'::app_role)
    OR user_owns_facility(facility_id, (SELECT auth.uid()))
  );

-- ─── 4. Pro-gated public views ─────────────────────────────────────────

-- 4a. public_facilities — add Pro-gated video_url, virtual_tour_url.
--     Recreating the view (not ALTER) because the existing column shape
--     changes. CASCADE drops any dependents (none currently — verified
--     via pg_depend) but recreating downstream is safe and idempotent.
DROP VIEW IF EXISTS public.public_facilities CASCADE;
CREATE VIEW public.public_facilities AS
SELECT
  id,
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
  verified,
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
  ((user_id IS NOT NULL) AND (claimed_at IS NOT NULL)) AS is_claimed,
  has_active_pro(id) AS is_pro,
  has_active_pro(id) AS is_premium_visible,
  data_source,
  hours_of_operation,
  languages_spoken,
  accessibility_features,
  accepting_admissions,
  -- Pro-gated rich content columns. NULL for Free facilities so the
  -- client (and the prerender script reading via anon key) cannot
  -- ever surface them — has_active_pro is re-evaluated at fetch time,
  -- so a downgrade flips these to NULL on the next read with no cache
  -- invalidation step needed.
  CASE WHEN has_active_pro(id) THEN video_url END AS video_url,
  CASE WHEN has_active_pro(id) THEN virtual_tour_url END AS virtual_tour_url
FROM public.facilities
WHERE status = 'approved' AND COALESCE(suspended, false) = false;

-- 4b. public_facility_staff — gate on Pro.
--     Previously: any approved facility's visible staff was public.
--     Now: only Pro facilities surface staff publicly. The provider
--     editor (authenticated) still reads via the raw table per
--     facility_staff RLS, so no editor regressions.
DROP VIEW IF EXISTS public.public_facility_staff CASCADE;
CREATE VIEW public.public_facility_staff AS
SELECT
  fs.id,
  fs.facility_id,
  fs.name,
  fs.job_title,
  fs.bio,
  fs.photo_url,
  fs.display_order,
  fs.is_visible,
  fs.created_at
FROM public.facility_staff fs
JOIN public.facilities f ON f.id = fs.facility_id
WHERE f.status = 'approved'
  AND fs.is_visible = true
  AND has_active_pro(fs.facility_id);

-- 4c. public_facility_programs — Pro-gated.
CREATE OR REPLACE VIEW public.public_facility_programs AS
SELECT
  p.id,
  p.facility_id,
  p.name,
  p.description,
  p.level_of_care,
  p.length_text,
  p.display_order,
  p.created_at
FROM public.facility_programs p
JOIN public.facilities f ON f.id = p.facility_id
WHERE f.status = 'approved'
  AND p.is_visible = true
  AND has_active_pro(p.facility_id);

-- 4d. public_facility_amenities — Pro-gated.
CREATE OR REPLACE VIEW public.public_facility_amenities AS
SELECT
  a.id,
  a.facility_id,
  a.amenity_name,
  a.is_highlighted,
  a.display_order,
  a.created_at
FROM public.facility_amenities a
JOIN public.facilities f ON f.id = a.facility_id
WHERE f.status = 'approved'
  AND has_active_pro(a.facility_id);

-- 4e. public_facility_accreditations — always public (Free facilities
--     keep their accreditation list), but is_highlighted is masked to
--     false for Free so the "Showcase" presentation only fires for Pro.
CREATE OR REPLACE VIEW public.public_facility_accreditations AS
SELECT
  fa.id,
  fa.facility_id,
  fa.accreditation_type,
  fa.verified,
  fa.verified_at,
  fa.expiry_date,
  fa.verification_url,
  fa.issuing_authority,
  -- Free facilities can still mark accreditations as highlighted in
  -- the editor (for forward-compatibility) but the public surface
  -- only honours the flag for Pro. Avoids exposing a UI capability
  -- that doesn't take effect until they upgrade.
  CASE WHEN has_active_pro(fa.facility_id) THEN fa.is_highlighted ELSE false END AS is_highlighted,
  fa.created_at
FROM public.facility_accreditations fa
JOIN public.facilities f ON f.id = fa.facility_id
WHERE f.status = 'approved';

-- Grant SELECT on the new views to anon + authenticated so the SPA and
-- the prerender script (anon key) can read them. The underlying tables
-- remain RLS-protected; views run with the caller's role but pull
-- through the security_invoker default — has_active_pro is the gate,
-- not RLS-on-the-view.
GRANT SELECT ON public.public_facilities TO anon, authenticated;
GRANT SELECT ON public.public_facility_staff TO anon, authenticated;
GRANT SELECT ON public.public_facility_programs TO anon, authenticated;
GRANT SELECT ON public.public_facility_amenities TO anon, authenticated;
GRANT SELECT ON public.public_facility_accreditations TO anon, authenticated;

COMMIT;
