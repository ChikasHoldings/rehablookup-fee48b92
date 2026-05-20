-- /admin/not-found-events hardening: add not_found_events to the
-- supabase_realtime publication so the admin 404 monitor can
-- propagate new entries in real time. RLS already restricts the
-- table to admin-readers; adding to the publication is safe.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'not_found_events'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.not_found_events;
  END IF;
END $$;
