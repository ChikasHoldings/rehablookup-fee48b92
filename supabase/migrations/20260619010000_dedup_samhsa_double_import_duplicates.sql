-- Dedupe 16 SAMHSA double-import duplicate facilities (SEO meta-uniqueness fix).
--
-- On 2026-05-14 the SAMHSA directory import ran twice ~15 minutes apart (row
-- batches at 23:25:16 and 23:40:11), creating 16 pairs of functionally-identical
-- unclaimed facility rows: same name + address + city + state + phone + type;
-- only the slug hash suffix and id differ. Because these rows are
-- data_source='samhsa_import' (user_id NULL), the existing
-- facilities_provider_dedup_uidx guard intentionally skips them, so they
-- persisted. Two listings per physical location also emit identical
-- <title>/<description>, which fails the cross-page meta-uniqueness SEO
-- validator (scripts/check-unique-meta.mjs) — 32 of its 209 reported errors.
--
-- Pre-delete audit (verified live): none of these 16 rows carry any business or
-- user data — 0 leads, reviews, claims, subscriptions, favourites, compare-list
-- entries, concierge inquiries/threads, featured placements, review requests,
-- seeker alerts, lead distributions, subscription events, or provider
-- notifications. The kept survivor of each pair (the most-recently-updated row)
-- is functionally identical, so no real data is lost. Every facility_id FK is
-- ON DELETE CASCADE / SET NULL, so the delete also clears the identical child
-- rows (services, insurance, age groups, …) automatically.
--
-- Applied out-of-band via MCP on 2026-06-19; the deleted rows were backed up
-- to public.facilities_dedup_backup_20260619 for reversibility. The remaining
-- 51 same-name/city groups are legitimate multi-location organisations (distinct
-- street addresses) and are disambiguated at generation time by
-- scripts/generate-facility-profiles-html.mjs (street address woven into the
-- title + description), not by deletion.
--
-- Idempotent: the DELETE filters on specific ids and no-ops once they are gone.

BEGIN;

DELETE FROM public.facilities WHERE id IN (
  '847bec8f-0786-471e-947b-862b850fe89d', -- Boyd County Outpatient - Victims & Act, Ashland KY
  'b4de9665-7103-47f3-9bfb-1d7ae9583522', -- C. K. Post Addiction Treatment Center, Brentwood NY
  'b3d7e670-8a86-4b62-9f2d-96cfc405f6d8', -- Center for Recovery Services, Boston MA
  'f3fa1a1b-1a9b-4cc5-a659-1a5b1a5defa6', -- Cornerstone at Helping Up Mission, Baltimore MD
  'af9be8d7-fc70-43b7-9395-b01d66552408', -- Cornerstone Montgomery - Knoll Center, Silver Spring MD
  'ad2b8d8c-0b94-4807-927b-78514ebbbb60', -- Family Service Association of Bucks County, Langhorne PA
  'f76a67d0-2d73-43e8-abf8-a6a8850cf820', -- Harbor House, Memphis TN
  '68e43a7b-622b-4637-9a47-a2648ecae9ae', -- New Brunswick Counseling Center, INC., Mount Holly NJ
  'ff39f529-6a4c-4883-ad0b-7fef7851ef17', -- New Mexico Behav Health Institute, Pecos NM
  '4f1889e0-4f16-47de-ada8-8cee99bde969', -- Recovery Services of Northwest Ohio, INC., Defiance OH
  'ded1fa6b-ae73-4248-9109-4d7c97f2c6c8', -- Resources for Human Development / Montgomery County Methadone Center, Norristown PA
  'e53216eb-ab14-41cd-abe4-3271ac6cc16f', -- Serenity at Stout Street Foundation, Commerce City CO
  'af4912d0-3749-476a-bf1b-37f9ad14deb1', -- Tadiso Incorporated, Pittsburgh PA
  'f2b5ca43-4352-4718-a1b6-60b215a80b5f', -- The Empowerment Program, Denver CO
  'f76506c9-f688-4c9b-8603-c79b3275f162', -- Westbrook Health Services, Spencer WV
  'ff7bc869-da55-46c3-bd0d-fc2bf5f7a266'  -- Westcare Community Involvement Center - Las Vegas, Las Vegas NV
);

COMMIT;
