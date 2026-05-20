-- /admin/security-logs hardening: the page subscribes to both
-- rate_limit_log and blocked_identifiers via a realtime channel (see
-- src/pages/admin/AdminSecurityLogs.tsx) but neither table was in the
-- supabase_realtime publication. New login attempts and auto-blocks
-- from check-brute-force-alerts therefore did not propagate; admins
-- saw stale data until manual refresh. RLS already restricts these
-- tables to admin-readers; adding to the publication is safe.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'rate_limit_log'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.rate_limit_log;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'blocked_identifiers'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.blocked_identifiers;
  END IF;
END $$;
