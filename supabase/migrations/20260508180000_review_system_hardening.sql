-- ============================================================
-- Review System Hardening Migration
-- Fixes: full name storage, view completeness, legacy name backfill
-- ============================================================

-- 1. Recreate public_facility_reviews view to include reviewer_display_name
--    (the previous recreation removed this column)
DROP VIEW IF EXISTS public.public_facility_reviews;
CREATE VIEW public.public_facility_reviews
WITH (security_invoker = true)
AS
SELECT
  fr.id,
  fr.facility_id,
  fr.rating,
  fr.review_text,
  fr.status,
  fr.helpful_count,
  fr.reviewer_display_name,
  fr.created_at,
  fr.updated_at,
  fr.disputed
FROM public.facility_reviews fr
WHERE fr.status = 'approved';

-- Grant SELECT on the view to anon and authenticated roles
GRANT SELECT ON public.public_facility_reviews TO anon, authenticated;

-- 2. Backfill reviewer_display_name for legacy reviews that have NULL names
--    Use full first + last name (not just initial) from seeker_profiles
UPDATE public.facility_reviews fr
SET reviewer_display_name = (
  SELECT 
    TRIM(
      COALESCE(sp.first_name, SPLIT_PART(sp.display_name, ' ', 1), '') ||
      CASE 
        WHEN COALESCE(sp.last_name, '') != '' THEN ' ' || sp.last_name
        WHEN SPLIT_PART(sp.display_name, ' ', 2) != '' THEN ' ' || SPLIT_PART(sp.display_name, ' ', 2)
        ELSE ''
      END
    )
  FROM public.seeker_profiles sp
  WHERE sp.user_id = fr.user_id
    AND (
      COALESCE(sp.first_name, '') != '' 
      OR COALESCE(sp.display_name, '') != ''
    )
  LIMIT 1
)
WHERE fr.reviewer_display_name IS NULL
  OR TRIM(fr.reviewer_display_name) = '';

-- 3. Update the validate_review_data trigger to store full last name (not just initial)
--    The trigger sanitizes reviewer_display_name but doesn't enforce full name format.
--    We update the trigger to ensure it doesn't truncate last names.
CREATE OR REPLACE FUNCTION public.validate_review_data()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Validate rating range
  IF NEW.rating < 1 OR NEW.rating > 5 THEN
    RAISE EXCEPTION 'Rating must be between 1 and 5';
  END IF;

  -- Validate review text length
  IF NEW.review_text IS NOT NULL AND length(NEW.review_text) > 2000 THEN
    RAISE EXCEPTION 'Review text must be 2000 characters or less';
  END IF;

  -- Strip HTML tags from review text (XSS prevention)
  IF NEW.review_text IS NOT NULL THEN
    NEW.review_text := regexp_replace(NEW.review_text, '<[^>]*>', '', 'g');
    NEW.review_text := regexp_replace(NEW.review_text, 'javascript:', '', 'gi');
    NEW.review_text := regexp_replace(NEW.review_text, 'data:', '', 'gi');
    NEW.review_text := trim(NEW.review_text);
    IF NEW.review_text = '' THEN
      NEW.review_text := NULL;
    END IF;
  END IF;

  -- Strip HTML from reviewer_display_name
  IF NEW.reviewer_display_name IS NOT NULL THEN
    NEW.reviewer_display_name := regexp_replace(NEW.reviewer_display_name, '<[^>]*>', '', 'g');
    NEW.reviewer_display_name := regexp_replace(NEW.reviewer_display_name, 'javascript:', '', 'gi');
    NEW.reviewer_display_name := regexp_replace(NEW.reviewer_display_name, 'data:', '', 'gi');
    NEW.reviewer_display_name := trim(NEW.reviewer_display_name);
    -- Enforce max length for display name
    IF length(NEW.reviewer_display_name) > 100 THEN
      NEW.reviewer_display_name := left(NEW.reviewer_display_name, 100);
    END IF;
    IF NEW.reviewer_display_name = '' THEN
      NEW.reviewer_display_name := NULL;
    END IF;
  END IF;

  -- Require reviewer_display_name on INSERT
  IF TG_OP = 'INSERT' THEN
    IF NEW.reviewer_display_name IS NULL OR trim(NEW.reviewer_display_name) = '' THEN
      RAISE EXCEPTION 'Reviewer display name is required';
    END IF;
  END IF;

  -- Prevent self-review: block facility owners from reviewing their own facilities
  IF TG_OP = 'INSERT' THEN
    IF EXISTS (
      SELECT 1 FROM public.facilities
      WHERE id = NEW.facility_id AND user_id = NEW.user_id
    ) THEN
      RAISE EXCEPTION 'Facility owners cannot review their own facilities';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- 4. Add an RPC function for admin to backfill names on demand
CREATE OR REPLACE FUNCTION public.admin_backfill_reviewer_names()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  updated_count integer;
BEGIN
  -- Only admins can call this
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  UPDATE public.facility_reviews fr
  SET reviewer_display_name = (
    SELECT 
      TRIM(
        COALESCE(sp.first_name, SPLIT_PART(sp.display_name, ' ', 1), '') ||
        CASE 
          WHEN COALESCE(sp.last_name, '') != '' THEN ' ' || sp.last_name
          WHEN SPLIT_PART(sp.display_name, ' ', 2) != '' THEN ' ' || SPLIT_PART(sp.display_name, ' ', 2)
          ELSE ''
        END
      )
    FROM public.seeker_profiles sp
    WHERE sp.user_id = fr.user_id
      AND (
        COALESCE(sp.first_name, '') != '' 
        OR COALESCE(sp.display_name, '') != ''
      )
    LIMIT 1
  )
  WHERE fr.reviewer_display_name IS NULL
    OR TRIM(fr.reviewer_display_name) = '';

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$;

-- 5. Add index on reviewer_display_name for faster admin queries
CREATE INDEX IF NOT EXISTS idx_facility_reviews_display_name 
  ON public.facility_reviews(reviewer_display_name) 
  WHERE reviewer_display_name IS NOT NULL;

-- 6. Add index on status + created_at for faster public review queries
CREATE INDEX IF NOT EXISTS idx_facility_reviews_status_created 
  ON public.facility_reviews(facility_id, status, created_at DESC);
