-- Dunning email cadence — track which milestone emails have been sent
-- on a past_due subscription so the cron driver doesn't double-send.
--
-- Columns on facility_subscriptions:
--   past_due_since timestamptz
--     - Stamped when the webhook transitions status='past_due' (handled
--       in the stripe-webhook update path; this migration just defines
--       the column).
--     - Cleared (set NULL) when status flips back to 'active'.
--   dunning_milestones_sent text[]
--     - Append-only set of milestone tokens we've already emailed for
--       the current past_due cycle: 'day_1' | 'day_3' | 'day_7'.
--     - Reset to ARRAY[]::text[] when status returns to active.
--
-- The send-dunning-email edge function checks the column before sending
-- and appends on success. The trigger here syncs past_due_since on
-- the existing facility_subscriptions UPDATE path.

BEGIN;

ALTER TABLE public.facility_subscriptions
  ADD COLUMN IF NOT EXISTS past_due_since timestamptz,
  ADD COLUMN IF NOT EXISTS dunning_milestones_sent text[] NOT NULL DEFAULT ARRAY[]::text[];

COMMENT ON COLUMN public.facility_subscriptions.past_due_since IS
  'When status first transitioned to past_due in the current dunning '
  'cycle. NULL when not past_due. Cleared when status returns to active.';

COMMENT ON COLUMN public.facility_subscriptions.dunning_milestones_sent IS
  'Tokens for milestone emails already sent in the current past_due '
  'cycle. Reset to empty array when status returns to active. Tokens '
  'are day_1, day_3, day_7.';

CREATE OR REPLACE FUNCTION public.sync_dunning_state()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'past_due' AND (OLD.status IS NULL OR OLD.status <> 'past_due') THEN
      -- Entering past_due: stamp the start of the cycle if not already
      -- set (defensive — webhook retries shouldn't reset the clock).
      IF NEW.past_due_since IS NULL THEN
        NEW.past_due_since := now();
      END IF;
      NEW.dunning_milestones_sent := ARRAY[]::text[];
    ELSIF NEW.status = 'active' AND OLD.status = 'past_due' THEN
      -- Recovered: clear the cycle.
      NEW.past_due_since := NULL;
      NEW.dunning_milestones_sent := ARRAY[]::text[];
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_sync_dunning_state') THEN
    EXECUTE 'CREATE TRIGGER trg_sync_dunning_state '
            'BEFORE UPDATE OF status ON public.facility_subscriptions '
            'FOR EACH ROW EXECUTE FUNCTION public.sync_dunning_state()';
  END IF;
END $$;

-- Backfill: any row currently past_due gets past_due_since = updated_at
-- as a reasonable approximation. New past_due transitions after this
-- migration use the trigger's now() stamp.
UPDATE public.facility_subscriptions
  SET past_due_since = updated_at
  WHERE status = 'past_due' AND past_due_since IS NULL;

COMMIT;
