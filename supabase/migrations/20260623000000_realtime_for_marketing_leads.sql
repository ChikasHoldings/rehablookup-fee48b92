-- Enable realtime on marketing_leads so the /admin/marketing dashboard's
-- channel actually receives INSERT/UPDATE/DELETE events.
--
-- Same pattern as the prior reviews + escalations realtime migrations.
-- Idempotent: re-running is safe.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'marketing_leads'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.marketing_leads;
  END IF;
END
$$;
