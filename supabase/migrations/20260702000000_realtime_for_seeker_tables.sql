-- Add seeker-surface tables to supabase_realtime so multi-device
-- sync works on the client account panel. user_favorites &
-- saved_searches give "saved on phone, visible on desktop" within
-- ~200ms. seeker_profiles + profiles propagate settings changes
-- across sessions. seeker_facility_alerts surfaces new alert
-- subscriptions live. RLS is unchanged — realtime respects RLS so
-- each user only sees their own rows.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='user_favorites') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.user_favorites;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='saved_searches') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.saved_searches;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='seeker_profiles') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.seeker_profiles;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='profiles') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='seeker_facility_alerts') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.seeker_facility_alerts;
  END IF;
END $$;
