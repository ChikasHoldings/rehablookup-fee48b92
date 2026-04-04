-- Remove sensitive tables from Realtime publication one by one
-- Using DO block to safely handle tables that may not be in the publication
DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'public.leads',
    'public.concierge_inquiries',
    'public.concierge_messages',
    'public.platform_settings',
    'public.facility_pending_changes',
    'public.review_disputes',
    'public.facility_staff'
  ])
  LOOP
    BEGIN
      EXECUTE format('ALTER PUBLICATION supabase_realtime DROP TABLE %s', tbl);
    EXCEPTION WHEN OTHERS THEN
      -- Table wasn't in the publication, skip
      NULL;
    END;
  END LOOP;
END;
$$;