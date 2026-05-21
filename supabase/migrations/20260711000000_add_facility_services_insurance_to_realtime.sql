-- New facilities show up in the public snapshot the moment they're
-- approved, but service/insurance edits (e.g., provider adds "Holistic
-- Therapy" to their listing) previously waited for the CDN cache to
-- expire because no realtime event fired for those join tables.
--
-- Gated migration: only ADD TABLE if the table isn't already in the
-- publication. Each ALTER PUBLICATION ADD TABLE errors on re-run if the
-- table is already member, so we guard with pg_publication_tables lookups.
DO $$
DECLARE
  has_services boolean;
  has_insurance boolean;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'facility_services'
  ) INTO has_services;

  SELECT EXISTS(
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'facility_insurance'
  ) INTO has_insurance;

  IF NOT has_services THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.facility_services;
  END IF;

  IF NOT has_insurance THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.facility_insurance;
  END IF;
END $$;

-- Ensure the join tables emit FULL row data on UPDATE/DELETE so
-- subscribers can correlate by facility_id without a re-fetch. (For
-- INSERT this is already the default.) REPLICA IDENTITY FULL is idempotent.
ALTER TABLE public.facility_services REPLICA IDENTITY FULL;
ALTER TABLE public.facility_insurance REPLICA IDENTITY FULL;
