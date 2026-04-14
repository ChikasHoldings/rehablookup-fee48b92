
-- Fix the view to use SECURITY INVOKER (default, non-definer)
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
