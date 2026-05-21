-- Enable Supabase Realtime on the admin-user management tables so the
-- existing channels in src/hooks/useAdminUserManagement.ts (which already
-- subscribe to postgres_changes on these three tables) actually receive
-- INSERT/UPDATE/DELETE events. Before this migration, an admin who
-- suspended a peer from another browser had no propagation to other
-- admin sessions. RLS still gates which rows individual subscribers see.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'admin_user_profiles'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_user_profiles;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'user_roles'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.user_roles;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'admin_user_permissions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_user_permissions;
  END IF;
END $$;
