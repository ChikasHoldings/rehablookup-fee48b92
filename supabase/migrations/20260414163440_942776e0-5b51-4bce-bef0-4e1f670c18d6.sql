
-- 1. Change the review INSERT policy from 'public' to 'authenticated' role
DROP POLICY IF EXISTS "Authenticated users can insert reviews" ON public.facility_reviews;

CREATE POLICY "Authenticated users can insert reviews"
ON public.facility_reviews
FOR INSERT
TO authenticated
WITH CHECK (
  (auth.uid() = user_id)
  AND (facility_id IN (
    SELECT facilities.id FROM facilities WHERE facilities.status = 'approved'
  ))
);

-- 2. Add unique constraint to prevent duplicate reviews per user per facility
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'facility_reviews_user_facility_unique'
  ) THEN
    ALTER TABLE public.facility_reviews
      ADD CONSTRAINT facility_reviews_user_facility_unique UNIQUE (user_id, facility_id);
  END IF;
END $$;

-- 3. Add validation trigger for review data integrity and XSS prevention
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
    NEW.reviewer_display_name := trim(NEW.reviewer_display_name);
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

DROP TRIGGER IF EXISTS validate_review_data_trigger ON public.facility_reviews;
CREATE TRIGGER validate_review_data_trigger
  BEFORE INSERT OR UPDATE ON public.facility_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_review_data();

-- 4. Create a public-safe view that hides user_id for public review display
CREATE OR REPLACE VIEW public.public_facility_reviews AS
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
