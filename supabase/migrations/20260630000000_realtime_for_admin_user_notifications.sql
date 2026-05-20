-- /admin/notifications hardening: add admin_user_notifications to
-- supabase_realtime so the per-user personal notification stream
-- propagates events in real time. The bell icon + per-user inbox
-- already subscribe to this table; the channel was inert.
-- RLS gates each user to their own rows.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'admin_user_notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_user_notifications;
  END IF;
END $$;
