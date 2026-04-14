
-- Remove duplicate unique constraint (facility_reviews_user_id_facility_id_key is redundant)
ALTER TABLE public.facility_reviews DROP CONSTRAINT IF EXISTS facility_reviews_user_id_facility_id_key;
