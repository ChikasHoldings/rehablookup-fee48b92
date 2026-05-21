-- /account/notification-preferences hardening — propagate cross-tab /
-- admin-edit changes via realtime so toggling on one device updates
-- another device within ~200ms. RLS on notification_preferences already
-- restricts realtime delivery to rows where auth.uid() = user_id.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname='supabase_realtime'
      AND schemaname='public'
      AND tablename='notification_preferences'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notification_preferences;
  END IF;
END $$;
