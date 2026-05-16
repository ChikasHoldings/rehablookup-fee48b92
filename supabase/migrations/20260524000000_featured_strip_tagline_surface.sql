-- Featured Strip: additive schema for the new horizontal-scroll
-- Featured surface that reuses the existing FeaturedRail rotation
-- engine + tracking tables.
--
-- Two additions, both safe:
--
--   1. facilities.sponsored_tagline (text, NULL, length<=120)
--      Optional 1-line tagline a Featured subscriber can set for
--      their strip card. NULL → client generates one from the
--      facility's top services + insurance.
--
--   2. featured_impressions.surface (text, NULL)
--      Distinguishes server-logged rail impressions (NULL or 'rail')
--      from client-logged strip impressions ('strip'). Lets
--      useFeaturedPlacementAnalytics filter or aggregate by surface
--      without UNIONing across two tables.
--
-- No new tables, no new RLS, no destructive changes.

BEGIN;

ALTER TABLE public.facilities
  ADD COLUMN IF NOT EXISTS sponsored_tagline text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'facilities_sponsored_tagline_length_chk'
  ) THEN
    ALTER TABLE public.facilities
      ADD CONSTRAINT facilities_sponsored_tagline_length_chk
      CHECK (sponsored_tagline IS NULL OR length(sponsored_tagline) <= 120);
  END IF;
END $$;

COMMENT ON COLUMN public.facilities.sponsored_tagline IS
  'Optional 120-char tagline shown on Featured Strip cards. NULL means '
  'the client falls back to an auto-generated tagline from the '
  'facility''s top services + insurance.';

ALTER TABLE public.featured_impressions
  ADD COLUMN IF NOT EXISTS surface text;

CREATE INDEX IF NOT EXISTS idx_featured_impressions_surface_time
  ON public.featured_impressions (surface, occurred_at DESC)
  WHERE surface IS NOT NULL;

COMMENT ON COLUMN public.featured_impressions.surface IS
  'Which Featured surface logged this impression. NULL/''rail'' '
  '= grid rail (server-logged on get-featured-rotation call). '
  '''strip'' = horizontal scroll strip (client-logged via '
  'IntersectionObserver with 50%/500ms debounce).';

COMMIT;
