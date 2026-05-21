-- Final realtime-publication sweep across admin-relevant tables.
-- After prior passes the publication already includes admin_audit_log,
-- admin_user_*, blog_articles, facility_reviews, marketing_leads,
-- support_tickets, concierge_inquiries, platform_settings, rate_limit_log,
-- blocked_identifiers, not_found_events, admin_escalations, and
-- facility_subscriptions. This migration adds the last six admin-
-- surface tables so cross-session live updates work for the email
-- logs, image moderation, VOB queue, featured placements, concierge
-- partner network, and the subscription activity widget. RLS is
-- unchanged on every table; realtime respects RLS so no info leak.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='email_tracking_events') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.email_tracking_events;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='insurance_verification_requests') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.insurance_verification_requests;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='flagged_images') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.flagged_images;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='featured_placements') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.featured_placements;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='subscription_events') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.subscription_events;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='concierge_partner_facilities') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.concierge_partner_facilities;
  END IF;
END $$;
