-- Enable realtime on blog_articles so /admin/blog can subscribe to
-- INSERT/UPDATE/DELETE events instead of relying solely on local
-- mutation invalidations. Same pattern as the prior /admin/reviews,
-- /admin/escalations, and /admin/marketing realtime migrations.
--
-- Idempotent: re-running is safe.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'blog_articles'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.blog_articles;
  END IF;
END
$$;
