-- /admin/back-office hardening: the Back Office page subscribes (via this
-- migration) to admin_audit_log and admin_impersonation_log so the
-- "Recent Staff Activity" and "Impersonation History" panels propagate
-- new entries across admin sessions in real time. RLS already restricts
-- visibility (admins see audit; super_admins-only see impersonation log)
-- so adding to the publication is safe.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'admin_audit_log'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_audit_log;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'admin_impersonation_log'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_impersonation_log;
  END IF;
END $$;
