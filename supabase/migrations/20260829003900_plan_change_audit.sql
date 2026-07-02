-- =============================================================================
-- Plan-change audit trail.
--
-- Part of the 2026-07-02 entitlement-leak hardening: every change to a
-- provider's paid entitlement (facility_subscriptions insert / status / tier /
-- period / cancel-flag update / delete) now writes an immutable audit row, so
-- "who was Pro when, and what changed it" is answerable without spelunking
-- Stripe. The Stripe webhook is the only production writer of
-- facility_subscriptions; this trigger records its effects (plus any manual
-- ops SQL) uniformly at the DB layer, which cannot be bypassed by a future
-- writer.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.plan_change_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid,
  facility_id uuid,
  provider_id uuid,
  stripe_subscription_id text,
  op text NOT NULL CHECK (op IN ('INSERT', 'UPDATE', 'DELETE')),
  old_tier text,
  new_tier text,
  old_status text,
  new_status text,
  old_period_end timestamptz,
  new_period_end timestamptz,
  old_cancel_at_period_end boolean,
  new_cancel_at_period_end boolean,
  -- auth.uid() of the actor when the write came through a JWT'd session;
  -- NULL for service-role/webhook/SQL writers.
  actor_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS plan_change_audit_facility_idx
  ON public.plan_change_audit (facility_id, created_at DESC);
CREATE INDEX IF NOT EXISTS plan_change_audit_provider_idx
  ON public.plan_change_audit (provider_id, created_at DESC);

ALTER TABLE public.plan_change_audit ENABLE ROW LEVEL SECURITY;

-- Admin read-only. No INSERT/UPDATE/DELETE policies: rows are written only by
-- the SECURITY DEFINER trigger below and are immutable to clients.
DROP POLICY IF EXISTS plan_change_audit_admin_select ON public.plan_change_audit;
CREATE POLICY plan_change_audit_admin_select
  ON public.plan_change_audit FOR SELECT TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.log_plan_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF TG_OP = 'UPDATE'
     AND NEW.status IS NOT DISTINCT FROM OLD.status
     AND NEW.tier IS NOT DISTINCT FROM OLD.tier
     AND NEW.current_period_end IS NOT DISTINCT FROM OLD.current_period_end
     AND NEW.cancel_at_period_end IS NOT DISTINCT FROM OLD.cancel_at_period_end THEN
    -- Not a plan-relevant change (e.g. add-on column refresh) — skip.
    RETURN NEW;
  END IF;

  INSERT INTO public.plan_change_audit (
    subscription_id, facility_id, provider_id, stripe_subscription_id, op,
    old_tier, new_tier, old_status, new_status,
    old_period_end, new_period_end,
    old_cancel_at_period_end, new_cancel_at_period_end,
    actor_user_id
  ) VALUES (
    COALESCE(NEW.id, OLD.id),
    COALESCE(NEW.facility_id, OLD.facility_id),
    COALESCE(NEW.provider_id, OLD.provider_id),
    COALESCE(NEW.stripe_subscription_id, OLD.stripe_subscription_id),
    TG_OP,
    CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE OLD.tier END,
    CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE NEW.tier END,
    CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE OLD.status END,
    CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE NEW.status END,
    CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE OLD.current_period_end END,
    CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE NEW.current_period_end END,
    CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE OLD.cancel_at_period_end END,
    CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE NEW.cancel_at_period_end END,
    (SELECT auth.uid())
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.log_plan_change() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS log_plan_change_trg ON public.facility_subscriptions;
CREATE TRIGGER log_plan_change_trg
  AFTER INSERT OR UPDATE OR DELETE ON public.facility_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.log_plan_change();
