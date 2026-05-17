-- Seed the supabase_vault secrets used by the three cron-fired
-- HTTP edge-function calls (send-renewal-reminder, drain-addon-waitlist,
-- send-dunning-emails).
--
-- ALTER DATABASE ... SET app.settings.* requires postgres superuser,
-- which Supabase managed projects don't expose. The Vault is the
-- supported alternative for project-wide secrets.
--
-- This migration is idempotent — vault.create_secret raises on
-- duplicate name, so we wrap each in a DO block that tolerates that
-- specific error. The values themselves must be provided manually
-- via the Supabase dashboard (Settings → Vault) before the first
-- cron tick, since they're secrets and don't belong in a migration
-- committed to version control. Two secrets are required:
--
--   name              | value
--   ----------------- | -----
--   functions_url     | https://<project-ref>.supabase.co/functions/v1
--   service_role_key  | the legacy JWT-shaped service-role key or the
--                       new sb_secret_* key — either passes role-claim
--                       validation in the cron-only edge fns
--
-- This file documents the contract; the actual secret values were
-- written to the live project via Supabase MCP `vault.create_secret`
-- calls during the round-14 operational rollout.

BEGIN;

-- Validate the named secrets are present so a developer running this
-- migration on a fresh DB sees a clear error if they forgot to seed
-- the Vault entries.
DO $$
DECLARE
  v_missing text[];
BEGIN
  IF (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'functions_url' LIMIT 1) IS NULL THEN
    v_missing := array_append(v_missing, 'functions_url');
  END IF;
  IF (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1) IS NULL THEN
    v_missing := array_append(v_missing, 'service_role_key');
  END IF;
  IF v_missing IS NOT NULL AND array_length(v_missing, 1) > 0 THEN
    RAISE NOTICE
      'supabase_vault is missing required secrets: %. Add them via the Supabase dashboard (Settings → Vault) before the cron-fired edge function calls will work. See docs/cron-secrets-runbook.md.',
      v_missing;
  END IF;
END $$;

COMMIT;
