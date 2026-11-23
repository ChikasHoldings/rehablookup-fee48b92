-- SEO recovery (2026-11-23): stop the daily ranking job from rewriting
-- facilities.updated_at.
--
-- Why
--   The cron job `calculate_ranking_scores` (05:00 UTC) updates
--   listing_completeness_score / response_rate_score / calculated_ranking_score
--   on every facility. The generic BEFORE UPDATE trigger
--   (update_updated_at_column) then sets updated_at = now(), so ~1,000
--   facilities looked "modified" every day. updated_at feeds the <lastmod> of
--   sitemap-facilities.xml, so lastmod no longer said when a listing actually
--   changed (observed 2026-11-23: 997 of 3,796 rows stamped 05:00:54 today).
--
-- What
--   A facilities-specific trigger function that leaves updated_at unchanged
--   when an UPDATE changes nothing except the ranking-score columns. Every
--   other change still sets updated_at = now(), exactly as before.
--
-- Data: no rows are changed by this migration. Rows already stamped by the
-- job keep today's updated_at until their next real change.
--
-- Rollback
--   DROP TRIGGER update_facilities_updated_at ON public.facilities;
--   CREATE TRIGGER update_facilities_updated_at BEFORE UPDATE ON public.facilities
--     FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
--   DROP FUNCTION public.facilities_touch_updated_at();

CREATE OR REPLACE FUNCTION public.facilities_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  maintenance_only constant text[] := ARRAY[
    'listing_completeness_score',
    'response_rate_score',
    'calculated_ranking_score',
    'updated_at'
  ];
BEGIN
  IF (to_jsonb(NEW) - maintenance_only) = (to_jsonb(OLD) - maintenance_only) THEN
    NEW.updated_at = OLD.updated_at;
  ELSE
    NEW.updated_at = now();
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS update_facilities_updated_at ON public.facilities;
CREATE TRIGGER update_facilities_updated_at
  BEFORE UPDATE ON public.facilities
  FOR EACH ROW EXECUTE FUNCTION public.facilities_touch_updated_at();
