-- /admin/escalations hardening:
--   1. Add admin_escalations to supabase_realtime so the dashboard's
--      channels actually receive INSERT/UPDATE/DELETE events.
--   2. Add an INSERT trigger that fans out admin_notifications to all
--      super_admins + managers when a new escalation is filed, so the
--      bell-menu surfaces it without the client having to do parallel
--      writes.
--
-- Idempotent — re-running is safe.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'admin_escalations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_escalations;
  END IF;
END
$$;

-- Notify managers + super-admins on escalation creation. We write to
-- admin_user_notifications (per-recipient) so each eligible admin can
-- dismiss independently and the bell-menu surfaces the new escalation
-- with a deep-link to /admin/escalations?id=<uuid>. The creator is
-- excluded since they obviously already know about it.
CREATE OR REPLACE FUNCTION public.notify_admins_on_escalation_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recipient_id uuid;
  priority_label text;
BEGIN
  priority_label := CASE NEW.priority::text
    WHEN 'critical' THEN 'Critical'
    WHEN 'high' THEN 'High'
    WHEN 'medium' THEN 'Medium'
    WHEN 'low' THEN 'Low'
    ELSE NEW.priority::text
  END;

  FOR recipient_id IN
    SELECT user_id
    FROM public.admin_user_profiles
    WHERE admin_role IN ('super_admin', 'manager')
      AND status = 'active'
      AND user_id <> NEW.created_by
  LOOP
    INSERT INTO public.admin_user_notifications (
      user_id,
      type,
      title,
      message,
      metadata,
      read,
      link
    ) VALUES (
      recipient_id,
      'escalation_created',
      priority_label || ' escalation: ' || NEW.subject,
      LEFT(NEW.description, 280),
      jsonb_build_object(
        'escalation_id', NEW.id,
        'priority', NEW.priority::text,
        'related_type', NEW.related_type,
        'related_id', NEW.related_id,
        'created_by', NEW.created_by
      ),
      false,
      '/admin/escalations?id=' || NEW.id::text
    );
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_admins_on_escalation_insert ON public.admin_escalations;
CREATE TRIGGER trg_notify_admins_on_escalation_insert
AFTER INSERT ON public.admin_escalations
FOR EACH ROW EXECUTE FUNCTION public.notify_admins_on_escalation_insert();
