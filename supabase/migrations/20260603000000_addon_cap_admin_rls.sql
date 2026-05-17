-- Lock down the add-on cap tables (placement_caps + concierge_geo_caps)
-- so the upcoming admin cap-management UI can call them under the
-- caller's JWT instead of via service_role, while non-admins still
-- only get read access (or none, in the case of concierge_geo_caps).
--
-- Before this migration:
--   placement_caps      RLS=on; one policy "Public can view ..." USING (true).
--                       No INSERT/UPDATE/DELETE policies → silent failure
--                       for any client-side write.
--   concierge_geo_caps  RLS=off → anyone could SELECT/INSERT/UPDATE/DELETE
--                       with the anon or authenticated key. Security gap.
--
-- After:
--   placement_caps:      public SELECT (unchanged) + admin-only write.
--   concierge_geo_caps:  RLS enabled, public SELECT (so the Add forms can
--                        read cap data via the existing RPCs without
--                        elevated auth), admin-only write.
--
-- Both tables remain rideable by service_role (Edge Functions); the
-- admin-only policies are gated on has_role(auth.uid(), 'admin') which
-- evaluates to false when there is no JWT, so service-role writes
-- bypass via the bypass-RLS connection.
--
-- Idempotent: every policy creation is gated on pg_policy lookup.

BEGIN;

-- ============================================================
-- placement_caps — add admin-only write policies
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy
    WHERE polname = 'Admins can insert placement caps'
      AND polrelid = 'public.placement_caps'::regclass
  ) THEN
    EXECUTE 'CREATE POLICY "Admins can insert placement caps" '
            'ON public.placement_caps FOR INSERT TO authenticated '
            'WITH CHECK (has_role(auth.uid(), ''admin''::app_role))';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policy
    WHERE polname = 'Admins can update placement caps'
      AND polrelid = 'public.placement_caps'::regclass
  ) THEN
    EXECUTE 'CREATE POLICY "Admins can update placement caps" '
            'ON public.placement_caps FOR UPDATE TO authenticated '
            'USING (has_role(auth.uid(), ''admin''::app_role)) '
            'WITH CHECK (has_role(auth.uid(), ''admin''::app_role))';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policy
    WHERE polname = 'Admins can delete placement caps'
      AND polrelid = 'public.placement_caps'::regclass
  ) THEN
    EXECUTE 'CREATE POLICY "Admins can delete placement caps" '
            'ON public.placement_caps FOR DELETE TO authenticated '
            'USING (has_role(auth.uid(), ''admin''::app_role))';
  END IF;
END $$;

-- ============================================================
-- concierge_geo_caps — enable RLS + public read + admin write
-- ============================================================

ALTER TABLE public.concierge_geo_caps ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy
    WHERE polname = 'Public can view concierge geo caps'
      AND polrelid = 'public.concierge_geo_caps'::regclass
  ) THEN
    EXECUTE 'CREATE POLICY "Public can view concierge geo caps" '
            'ON public.concierge_geo_caps FOR SELECT USING (true)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policy
    WHERE polname = 'Admins can insert concierge geo caps'
      AND polrelid = 'public.concierge_geo_caps'::regclass
  ) THEN
    EXECUTE 'CREATE POLICY "Admins can insert concierge geo caps" '
            'ON public.concierge_geo_caps FOR INSERT TO authenticated '
            'WITH CHECK (has_role(auth.uid(), ''admin''::app_role))';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policy
    WHERE polname = 'Admins can update concierge geo caps'
      AND polrelid = 'public.concierge_geo_caps'::regclass
  ) THEN
    EXECUTE 'CREATE POLICY "Admins can update concierge geo caps" '
            'ON public.concierge_geo_caps FOR UPDATE TO authenticated '
            'USING (has_role(auth.uid(), ''admin''::app_role)) '
            'WITH CHECK (has_role(auth.uid(), ''admin''::app_role))';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policy
    WHERE polname = 'Admins can delete concierge geo caps'
      AND polrelid = 'public.concierge_geo_caps'::regclass
  ) THEN
    EXECUTE 'CREATE POLICY "Admins can delete concierge geo caps" '
            'ON public.concierge_geo_caps FOR DELETE TO authenticated '
            'USING (has_role(auth.uid(), ''admin''::app_role))';
  END IF;
END $$;

COMMIT;
