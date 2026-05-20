-- ════════════════════════════════════════════════════════════════════
-- 2026-05-20 add-on write RLS policies
--
-- Both `concierge_partner_facilities` and `featured_placements` had
-- RLS enabled with SELECT-only policies. The provider-side UI
-- (AddConciergeGeoForm / AddFeaturedPlacementForm / *ManagementPanel)
-- writes directly via the user's JWT to add/remove geos and
-- placements, so writes were being silently RLS-denied.
--
-- This migration adds the missing INSERT / UPDATE policies for:
--   • Facility owners — scoped to their own facility_id via
--     `facilities.user_id = auth.uid()` (mirrors the existing SELECT
--     policy ownership check).
--   • Admins         — full INSERT/UPDATE on both tables via
--     `is_admin(auth.uid())` (mirrors the admin SELECT policy).
--
-- DELETE is intentionally NOT granted — both tables use a soft-delete
-- pattern (`active = false, deactivated_at = now()`) preserved via
-- UPDATE policies.
--
-- The cap-enforcement trigger (`enforce_concierge_geo_cap` /
-- `enforce_featured_placement_cap`) continues to protect against
-- over-allocation regardless of who's writing.
-- ════════════════════════════════════════════════════════════════════

-- ── concierge_partner_facilities ────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    WHERE c.relname = 'concierge_partner_facilities'
      AND pol.polname = 'Facility owners can insert own concierge partner geo'
  ) THEN
    CREATE POLICY "Facility owners can insert own concierge partner geo"
      ON public.concierge_partner_facilities
      FOR INSERT
      TO authenticated
      WITH CHECK (
        facility_id IN (
          SELECT id FROM public.facilities WHERE user_id = (SELECT auth.uid())
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    WHERE c.relname = 'concierge_partner_facilities'
      AND pol.polname = 'Facility owners can update own concierge partner geo'
  ) THEN
    CREATE POLICY "Facility owners can update own concierge partner geo"
      ON public.concierge_partner_facilities
      FOR UPDATE
      TO authenticated
      USING (
        facility_id IN (
          SELECT id FROM public.facilities WHERE user_id = (SELECT auth.uid())
        )
      )
      WITH CHECK (
        facility_id IN (
          SELECT id FROM public.facilities WHERE user_id = (SELECT auth.uid())
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    WHERE c.relname = 'concierge_partner_facilities'
      AND pol.polname = 'Admins can manage concierge partner facilities'
  ) THEN
    CREATE POLICY "Admins can manage concierge partner facilities"
      ON public.concierge_partner_facilities
      FOR ALL
      TO authenticated
      USING (public.is_admin((SELECT auth.uid())))
      WITH CHECK (public.is_admin((SELECT auth.uid())));
  END IF;
END $$;

-- ── featured_placements ─────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    WHERE c.relname = 'featured_placements'
      AND pol.polname = 'Facility owners can insert own featured placements'
  ) THEN
    CREATE POLICY "Facility owners can insert own featured placements"
      ON public.featured_placements
      FOR INSERT
      TO authenticated
      WITH CHECK (
        facility_id IN (
          SELECT id FROM public.facilities WHERE user_id = (SELECT auth.uid())
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    WHERE c.relname = 'featured_placements'
      AND pol.polname = 'Facility owners can update own featured placements'
  ) THEN
    CREATE POLICY "Facility owners can update own featured placements"
      ON public.featured_placements
      FOR UPDATE
      TO authenticated
      USING (
        facility_id IN (
          SELECT id FROM public.facilities WHERE user_id = (SELECT auth.uid())
        )
      )
      WITH CHECK (
        facility_id IN (
          SELECT id FROM public.facilities WHERE user_id = (SELECT auth.uid())
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    WHERE c.relname = 'featured_placements'
      AND pol.polname = 'Admins can manage featured placements'
  ) THEN
    CREATE POLICY "Admins can manage featured placements"
      ON public.featured_placements
      FOR ALL
      TO authenticated
      USING (public.is_admin((SELECT auth.uid())))
      WITH CHECK (public.is_admin((SELECT auth.uid())));
  END IF;
END $$;
