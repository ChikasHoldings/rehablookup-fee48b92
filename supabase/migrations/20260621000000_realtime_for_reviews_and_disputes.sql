-- Enable realtime on facility_reviews + review_disputes so the
-- /admin/reviews dashboard's channels actually receive INSERT/UPDATE/
-- DELETE events. The page had subscribed via supabase.channel(...)
-- but the tables weren't in the supabase_realtime publication, so the
-- channels were silent and admins had to refresh manually.
--
-- Idempotent: skipped if the table is already in the publication.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'facility_reviews'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.facility_reviews;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'review_disputes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.review_disputes;
  END IF;
END
$$;
