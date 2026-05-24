-- Repair: one duplicate provider-listed facility row + permanent guard.
--
-- Background: user da2fe714-3d1d-495d-a3ba-100734b540db created two
-- functionally-identical facility rows 71 seconds apart on
-- 2026-05-23 — same name, address, phone, email, gallery, description,
-- services / age groups / insurance child rows. Root cause was the
-- ProviderSignup → ?step=plan cache-race bug that landed the user
-- back on the build form instead of advancing to plan; the user hit
-- submit again, the second insert succeeded (slug got a "-1" suffix),
-- and "My Listings" now renders both as separate facilities.
--
-- The cache-race itself was fixed in commit eaf257806 (this branch).
-- This migration cleans up the existing duplicate and adds a
-- database-level guard so the same crash mode can't produce
-- duplicates again from any code path (rogue script, direct SQL,
-- service-role mistake, etc.).
--
-- 1) Drop child rows tied to the second facility row, then the row
--    itself. Both rows are functionally identical — no real data is
--    lost. We keep the first row (6c30651a-...) because its slug is
--    the cleaner form without the "-1" disambiguator suffix.
--
-- 2) Add a unique partial index on
--      (user_id, lower(trim(name)), lower(trim(address)), lower(trim(city)))
--    where user_id IS NOT NULL AND data_source IS NOT 'samhsa_import'.
--    SAMHSA-imported facilities are excluded because (a) they have
--    user_id IS NULL by definition (unclaimed) so the WHERE filter
--    would skip them anyway, and (b) legitimate chains can have
--    co-named-on-same-block facilities in raw SAMHSA data that we
--    promote into the directory.
--
-- Idempotent: the DELETE is filtered on the specific facility id and
-- becomes a no-op once the row is gone; the unique index uses
-- CREATE UNIQUE INDEX IF NOT EXISTS.

BEGIN;

-- 1) Remove the duplicate row + its dependent child rows.
DELETE FROM public.facility_services       WHERE facility_id = '8ba842b3-7ed7-4f7a-a51a-7accc1dfa6f4';
DELETE FROM public.facility_age_groups     WHERE facility_id = '8ba842b3-7ed7-4f7a-a51a-7accc1dfa6f4';
DELETE FROM public.facility_insurance      WHERE facility_id = '8ba842b3-7ed7-4f7a-a51a-7accc1dfa6f4';
DELETE FROM public.facilities              WHERE id          = '8ba842b3-7ed7-4f7a-a51a-7accc1dfa6f4';

-- 2) Permanent guard against same-user, same-name, same-address
--    duplicates. The next provider who hits the same crash mode will
--    get a constraint-violation error on the second insert instead
--    of a silently-created duplicate row.
CREATE UNIQUE INDEX IF NOT EXISTS facilities_provider_dedup_uidx
  ON public.facilities (
    user_id,
    lower(btrim(name)),
    lower(btrim(coalesce(address, ''))),
    lower(btrim(coalesce(city, '')))
  )
  WHERE user_id IS NOT NULL
    AND data_source IS DISTINCT FROM 'samhsa_import';

COMMENT ON INDEX public.facilities_provider_dedup_uidx IS
  'Prevents a provider from creating two facility rows with the same '
  'name + address + city (case- and whitespace-insensitive). Triggered '
  'by 2026-05-23 incident where a stuck cache caused a double-submit '
  'and two identical "kass recovery center" rows landed. Excludes '
  'SAMHSA-imported rows (user_id IS NULL anyway, and chain duplicates '
  'in the raw SAMHSA dump are legitimately allowed in the directory '
  'until claim time).';

COMMIT;
