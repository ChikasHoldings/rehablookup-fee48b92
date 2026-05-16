-- ╔══════════════════════════════════════════════════════════════════╗
-- ║  Featured Impressions + Phone Clicks                                ║
-- ║                                                                    ║
-- ║  Logs of public-facing Featured rendering activity. Powers the      ║
-- ║  provider dashboard analytics (impressions, phone clicks, CTR)      ║
-- ║  on /provider/marketing/featured and feeds the rotation-fairness    ║
-- ║  audit script.                                                     ║
-- ║                                                                    ║
-- ║  EKRA note: nothing in these tables drives rotation. They're       ║
-- ║  pure post-hoc analytics. Rotation is deterministic from the       ║
-- ║  visitor's rl_rot_seed cookie + facility activation order.         ║
-- ╚══════════════════════════════════════════════════════════════════╝

-- ─── featured_impressions ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.featured_impressions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id uuid NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
  placement_type text NOT NULL,
  placement_value text NOT NULL,
  visitor_seed integer NOT NULL,
  position_in_rail integer NOT NULL,
  page_path text NOT NULL,
  user_agent text,
  ip_hash text,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_featured_impressions_facility_time
  ON public.featured_impressions (facility_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_featured_impressions_bucket_time
  ON public.featured_impressions (placement_type, placement_value, occurred_at DESC);

COMMENT ON TABLE public.featured_impressions IS
  'Server-side impression log written by get-featured-rotation for
   every facility returned per request. Feeds provider-dashboard
   analytics; never drives rotation (pure post-hoc).';

-- ─── featured_phone_clicks ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.featured_phone_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id uuid NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
  placement_type text NOT NULL,
  placement_value text NOT NULL,
  page_path text NOT NULL,
  visitor_seed integer,
  user_agent text,
  ip_hash text,
  clicked_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_featured_phone_clicks_facility_time
  ON public.featured_phone_clicks (facility_id, clicked_at DESC);
CREATE INDEX IF NOT EXISTS idx_featured_phone_clicks_bucket_time
  ON public.featured_phone_clicks (placement_type, placement_value, clicked_at DESC);

COMMENT ON TABLE public.featured_phone_clicks IS
  'Fire-and-forget phone-click log written by log-phone-click. The
   tel: link opens the dialer natively regardless of whether the log
   call succeeds, so this table is best-effort, not the source of
   truth for billing or operations.';

-- ─── blog_articles featured_placement_bucket ─────────────────────
-- Article pages use this column to scope which Featured pool they
-- pull from. NULL means "no Featured rail on this article" — admin
-- fills it in via the CMS once a marketing taxonomy lands.
ALTER TABLE public.blog_articles
  ADD COLUMN IF NOT EXISTS featured_placement_bucket text;

COMMENT ON COLUMN public.blog_articles.featured_placement_bucket IS
  'Optional bucket key (matches placement_caps.placement_value for
   placement_type=''article'') that scopes which Featured facilities
   rotate on this article. NULL = no Featured rail.';

-- ─── RLS ───────────────────────────────────────────────────────────
ALTER TABLE public.featured_impressions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.featured_phone_clicks ENABLE ROW LEVEL SECURITY;

-- Facility owner can SELECT their own impressions
DROP POLICY IF EXISTS "Facility owners can view own featured impressions" ON public.featured_impressions;
CREATE POLICY "Facility owners can view own featured impressions"
  ON public.featured_impressions FOR SELECT
  TO authenticated
  USING (
    facility_id IN (SELECT id FROM public.facilities WHERE user_id = (SELECT auth.uid()))
  );

DROP POLICY IF EXISTS "Facility owners can view own featured phone clicks" ON public.featured_phone_clicks;
CREATE POLICY "Facility owners can view own featured phone clicks"
  ON public.featured_phone_clicks FOR SELECT
  TO authenticated
  USING (
    facility_id IN (SELECT id FROM public.facilities WHERE user_id = (SELECT auth.uid()))
  );

-- Admin can SELECT all
DROP POLICY IF EXISTS "Admins can view all featured impressions" ON public.featured_impressions;
CREATE POLICY "Admins can view all featured impressions"
  ON public.featured_impressions FOR SELECT
  TO authenticated
  USING (public.is_admin((SELECT auth.uid())));

DROP POLICY IF EXISTS "Admins can view all featured phone clicks" ON public.featured_phone_clicks;
CREATE POLICY "Admins can view all featured phone clicks"
  ON public.featured_phone_clicks FOR SELECT
  TO authenticated
  USING (public.is_admin((SELECT auth.uid())));

-- No public read. No INSERT policies — service_role (edge functions)
-- writes; INSERT/UPDATE/DELETE for normal callers is blocked.
