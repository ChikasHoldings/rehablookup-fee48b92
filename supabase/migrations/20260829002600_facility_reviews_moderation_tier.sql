-- Tighten facility_reviews moderation to the super_admin / manager tier.
--
-- The consolidated UPDATE/DELETE policies gated the admin branch on the coarse
-- has_role(auth.uid(),'admin'), but create-admin-user grants a user_roles
-- role='admin' row to EVERY admin tier (super_admin, manager, customer_rep,
-- advisor). The single-action moderation handlers in AdminReviews write
-- directly to the table and were gated only client-side (super_admin/manager),
-- so a properly-provisioned customer_rep/advisor could approve/reject/hide
-- (UPDATE) or delete reviews straight through PostgREST. The bulk-moderation
-- edge function already enforces the tier server-side; this aligns the single-
-- action path.
--
-- can_moderate_users(uid) = admin_user_profiles.admin_role IN (super_admin,
-- manager) AND status='active' AND has_role(uid,'admin'). The review-author
-- branch (a seeker editing/deleting their own review) is preserved exactly.

DROP POLICY IF EXISTS facility_reviews_update_consolidated ON public.facility_reviews;
CREATE POLICY facility_reviews_update_consolidated ON public.facility_reviews
  FOR UPDATE
  USING (
    public.can_moderate_users((SELECT auth.uid()))
    OR (((SELECT auth.uid()) = user_id) AND (status = 'pending'))
  )
  WITH CHECK (
    public.can_moderate_users((SELECT auth.uid()))
    OR (((SELECT auth.uid()) = user_id) AND (status = 'pending'))
  );

DROP POLICY IF EXISTS facility_reviews_delete_consolidated ON public.facility_reviews;
CREATE POLICY facility_reviews_delete_consolidated ON public.facility_reviews
  FOR DELETE
  USING (
    public.can_moderate_users((SELECT auth.uid()))
    OR ((SELECT auth.uid()) = user_id)
  );
