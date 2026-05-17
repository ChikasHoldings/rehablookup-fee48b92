-- Add-on waitlist — providers who hit a capped scope can opt in to a
-- queue. When the scope frees up (a slot is released or deactivated)
-- the AFTER trigger writes an admin_notifications row with the next
-- waiter's info so an admin can offer them the slot.
--
-- Single table with an addon_type discriminator so the queue is
-- inspectable in one place and the trigger logic shares one shape.
-- Featured uses scope_type + scope_value; Concierge uses geo_state +
-- geo_city. The CHECK constraint enforces which columns are required
-- per addon_type so a malformed row can't slip in.

BEGIN;

CREATE TABLE IF NOT EXISTS public.addon_waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  addon_type text NOT NULL,
  facility_id uuid NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
  requested_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Featured-only columns
  scope_type text,
  scope_value text,
  -- Concierge-only columns
  geo_state text,
  geo_city text,
  level_of_care text[],
  -- Lifecycle
  status text NOT NULL DEFAULT 'waiting',
  requested_at timestamptz NOT NULL DEFAULT now(),
  invited_at timestamptz,
  expires_at timestamptz,
  closed_at timestamptz,
  notes text,
  CHECK (addon_type IN ('featured', 'concierge')),
  CHECK (status IN ('waiting', 'invited', 'fulfilled', 'expired', 'canceled')),
  CHECK (
    (addon_type = 'featured' AND scope_type IS NOT NULL AND scope_value IS NOT NULL
     AND geo_state IS NULL AND geo_city IS NULL AND level_of_care IS NULL)
    OR
    (addon_type = 'concierge' AND geo_state IS NOT NULL
     AND scope_type IS NULL AND scope_value IS NULL)
  )
);

-- One open waitlist entry per (addon, scope, facility). Re-opting in
-- after a 'fulfilled' / 'expired' / 'canceled' resolution is allowed.
CREATE UNIQUE INDEX IF NOT EXISTS addon_waitlist_featured_open_uq
  ON public.addon_waitlist (facility_id, scope_type, scope_value)
  WHERE addon_type = 'featured' AND status IN ('waiting', 'invited');

CREATE UNIQUE INDEX IF NOT EXISTS addon_waitlist_concierge_open_uq
  ON public.addon_waitlist (facility_id, geo_state, geo_city)
  WHERE addon_type = 'concierge' AND status IN ('waiting', 'invited');

-- Indexes for the lookup paths (admin queue view, free-slot drain).
CREATE INDEX IF NOT EXISTS addon_waitlist_featured_lookup_idx
  ON public.addon_waitlist (scope_type, scope_value, status, requested_at);

CREATE INDEX IF NOT EXISTS addon_waitlist_concierge_lookup_idx
  ON public.addon_waitlist (geo_state, geo_city, status, requested_at);

CREATE INDEX IF NOT EXISTS addon_waitlist_requested_by_idx
  ON public.addon_waitlist (requested_by, status);

COMMENT ON TABLE public.addon_waitlist IS
  'Waitlist queue for capped Featured + Concierge scopes. Providers who '
  'hit a full scope opt in; the freed-slot trigger notifies an admin '
  'with the next waiter when a placement/partner row deactivates.';

ALTER TABLE public.addon_waitlist ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy WHERE polname = 'Providers can view their own waitlist entries'
      AND polrelid = 'public.addon_waitlist'::regclass
  ) THEN
    EXECUTE 'CREATE POLICY "Providers can view their own waitlist entries" '
            'ON public.addon_waitlist FOR SELECT TO authenticated '
            'USING (requested_by = auth.uid())';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policy WHERE polname = 'Providers can insert their own waitlist entries'
      AND polrelid = 'public.addon_waitlist'::regclass
  ) THEN
    EXECUTE 'CREATE POLICY "Providers can insert their own waitlist entries" '
            'ON public.addon_waitlist FOR INSERT TO authenticated '
            'WITH CHECK (requested_by = auth.uid())';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policy WHERE polname = 'Providers can cancel their own waitlist entries'
      AND polrelid = 'public.addon_waitlist'::regclass
  ) THEN
    EXECUTE 'CREATE POLICY "Providers can cancel their own waitlist entries" '
            'ON public.addon_waitlist FOR UPDATE TO authenticated '
            'USING (requested_by = auth.uid() AND status IN (''waiting'', ''invited'')) '
            'WITH CHECK (requested_by = auth.uid() AND status = ''canceled'')';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policy WHERE polname = 'Admins can view all waitlist entries'
      AND polrelid = 'public.addon_waitlist'::regclass
  ) THEN
    EXECUTE 'CREATE POLICY "Admins can view all waitlist entries" '
            'ON public.addon_waitlist FOR SELECT TO authenticated '
            'USING (has_role(auth.uid(), ''admin''::app_role))';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policy WHERE polname = 'Admins can update any waitlist entry'
      AND polrelid = 'public.addon_waitlist'::regclass
  ) THEN
    EXECUTE 'CREATE POLICY "Admins can update any waitlist entry" '
            'ON public.addon_waitlist FOR UPDATE TO authenticated '
            'USING (has_role(auth.uid(), ''admin''::app_role)) '
            'WITH CHECK (has_role(auth.uid(), ''admin''::app_role))';
  END IF;
END $$;

-- ============================================================
-- Drain triggers: notify admin when a slot frees with a non-empty
-- waitlist for that scope. The next waiter (oldest 'waiting' entry)
-- is surfaced in admin_notifications.metadata so admin can act.
--
-- We deliberately stop short of auto-emailing the waiter: that
-- introduces a moving-parts dependency (Resend, throttling, opt-out
-- preferences) better handled via an Edge Function cron. The admin
-- notification is the operational handoff for v1.
-- ============================================================

CREATE OR REPLACE FUNCTION public.notify_addon_waitlist_on_featured_free()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  freed boolean := false;
  scope_type_v text;
  scope_value_v text;
  next_waiter record;
BEGIN
  IF TG_OP = 'DELETE' THEN
    freed := OLD.active = true;
    scope_type_v := OLD.placement_type;
    scope_value_v := OLD.placement_value;
  ELSIF TG_OP = 'UPDATE' THEN
    freed := OLD.active = true AND NEW.active = false;
    scope_type_v := NEW.placement_type;
    scope_value_v := NEW.placement_value;
  END IF;

  IF NOT freed THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT id, facility_id, requested_by, requested_at
    INTO next_waiter
    FROM public.addon_waitlist
   WHERE addon_type = 'featured'
     AND scope_type = scope_type_v
     AND scope_value = scope_value_v
     AND status = 'waiting'
   ORDER BY requested_at ASC
   LIMIT 1;

  IF next_waiter.id IS NOT NULL THEN
    INSERT INTO public.admin_notifications (type, title, message, metadata)
    VALUES (
      'addon_waitlist_slot_freed',
      'Featured slot freed — waitlist available',
      format(
        'A Featured slot for %s=%s freed up. The oldest waiting facility (%s, requested %s) can be offered the slot.',
        scope_type_v, scope_value_v, next_waiter.facility_id, next_waiter.requested_at
      ),
      jsonb_build_object(
        'addon_type', 'featured',
        'scope_type', scope_type_v,
        'scope_value', scope_value_v,
        'waitlist_id', next_waiter.id,
        'facility_id', next_waiter.facility_id,
        'requested_by', next_waiter.requested_by,
        'requested_at', next_waiter.requested_at
      )
    );
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_notify_addon_waitlist_on_featured_free') THEN
    EXECUTE 'CREATE TRIGGER trg_notify_addon_waitlist_on_featured_free '
            'AFTER UPDATE OR DELETE ON public.featured_placements '
            'FOR EACH ROW EXECUTE FUNCTION public.notify_addon_waitlist_on_featured_free()';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.notify_addon_waitlist_on_concierge_free()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  freed boolean := false;
  state_v text;
  city_v text;
  next_waiter record;
BEGIN
  IF TG_OP = 'DELETE' THEN
    freed := OLD.active = true;
    state_v := OLD.geo_state;
    city_v := OLD.geo_city;
  ELSIF TG_OP = 'UPDATE' THEN
    freed := OLD.active = true AND NEW.active = false;
    state_v := NEW.geo_state;
    city_v := NEW.geo_city;
  END IF;

  IF NOT freed THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Match waiter on exact (state, city). City NULL on both sides is
  -- treated as statewide; case-insensitive city match for tolerance.
  SELECT id, facility_id, requested_by, requested_at
    INTO next_waiter
    FROM public.addon_waitlist
   WHERE addon_type = 'concierge'
     AND geo_state = state_v
     AND status = 'waiting'
     AND (
       (city_v IS NULL AND geo_city IS NULL) OR
       (city_v IS NOT NULL AND geo_city IS NOT NULL AND lower(geo_city) = lower(city_v))
     )
   ORDER BY requested_at ASC
   LIMIT 1;

  IF next_waiter.id IS NOT NULL THEN
    INSERT INTO public.admin_notifications (type, title, message, metadata)
    VALUES (
      'addon_waitlist_slot_freed',
      'Concierge slot freed — waitlist available',
      format(
        'A Concierge partner slot for %s/%s freed up. The oldest waiting facility (%s, requested %s) can be offered the slot.',
        state_v, COALESCE(city_v, '*'), next_waiter.facility_id, next_waiter.requested_at
      ),
      jsonb_build_object(
        'addon_type', 'concierge',
        'geo_state', state_v,
        'geo_city', city_v,
        'waitlist_id', next_waiter.id,
        'facility_id', next_waiter.facility_id,
        'requested_by', next_waiter.requested_by,
        'requested_at', next_waiter.requested_at
      )
    );
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_notify_addon_waitlist_on_concierge_free') THEN
    EXECUTE 'CREATE TRIGGER trg_notify_addon_waitlist_on_concierge_free '
            'AFTER UPDATE OR DELETE ON public.concierge_partner_facilities '
            'FOR EACH ROW EXECUTE FUNCTION public.notify_addon_waitlist_on_concierge_free()';
  END IF;
END $$;

COMMIT;
