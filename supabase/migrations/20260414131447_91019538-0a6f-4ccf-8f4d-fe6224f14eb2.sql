-- Remove concierge_introductions from realtime to prevent PII broadcast
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'concierge_introductions'
  ) THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.concierge_introductions;
  END IF;
END $$;