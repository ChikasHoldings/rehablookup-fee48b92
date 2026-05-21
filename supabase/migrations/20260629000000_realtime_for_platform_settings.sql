-- /admin/settings hardening: add platform_settings to supabase_realtime
-- so the admin settings page's existing channel actually receives
-- change events. Cross-admin coordination (admin A flipping a flag,
-- admin B watching the panel) was silently broken. RLS is unchanged.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'platform_settings'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.platform_settings;
  END IF;
END $$;
