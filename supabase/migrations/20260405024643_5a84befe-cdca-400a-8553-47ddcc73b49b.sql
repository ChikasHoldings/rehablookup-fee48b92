ALTER TABLE public.facility_reviews ADD COLUMN reviewer_display_name text;

-- Backfill existing reviews with names from seeker_profiles
UPDATE public.facility_reviews fr
SET reviewer_display_name = 
  CASE 
    WHEN sp.first_name IS NOT NULL AND sp.first_name != '' THEN
      sp.first_name || COALESCE(' ' || LEFT(sp.last_name, 1) || '.', '')
    ELSE NULL
  END
FROM public.seeker_profiles sp
WHERE fr.user_id = sp.user_id AND fr.reviewer_display_name IS NULL;