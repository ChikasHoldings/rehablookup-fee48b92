-- Perf: wrap auth.uid() in (SELECT auth.uid()) so RLS evaluates it once per
-- query instead of once per row (Supabase advisor 0003_auth_rls_initplan).
-- Semantically identical; just hoists the auth lookup out of the per-row loop.
DROP POLICY IF EXISTS "promotions_admin_all" ON public.promotions;
CREATE POLICY "promotions_admin_all" ON public.promotions
  FOR ALL TO authenticated
  USING (has_role((SELECT auth.uid()), 'admin'::app_role))
  WITH CHECK (has_role((SELECT auth.uid()), 'admin'::app_role));

DROP POLICY IF EXISTS "promo_dismissals_self" ON public.promotion_dismissals;
CREATE POLICY "promo_dismissals_self" ON public.promotion_dismissals
  FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));
