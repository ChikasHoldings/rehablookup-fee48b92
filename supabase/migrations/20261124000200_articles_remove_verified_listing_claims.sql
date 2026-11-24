-- Data correction (2026-11-24): remove "verified" listing claims from
-- published article bodies.
--
-- Why
--   0 of 3,796 public listings are verified, but 11 published articles told
--   readers to "find verified treatment centers" / "find verified facilities
--   accepting your insurance", and one offered "contacting our team for
--   personalized guidance" (a retired service). check:trust-claims (rule
--   added in the same change) blocked the production build on 9 of them.
--
-- What
--   1. Back up id, slug, content and updated_at of every affected row to
--      seo_recovery_backup.blog_articles_verified_copy_20261124 (RLS-locked,
--      not exposed through the Data API).
--   2. Rewrite only the matched phrases:
--        "<verb> [our] verified [treatment|rehab] <noun>" → "<verb> [our] [treatment|rehab] <noun>"
--        "directory of verified treatment centers or contacting our team for
--         personalized guidance" → "directory of treatment centers and
--         contacting the facilities directly"
--   published_at and last_medically_reviewed_at are not touched.
--
-- Rollback
--   UPDATE public.blog_articles a SET content = b.content
--     FROM seo_recovery_backup.blog_articles_verified_copy_20261124 b
--    WHERE a.id = b.id;

CREATE SCHEMA IF NOT EXISTS seo_recovery_backup;
REVOKE ALL ON SCHEMA seo_recovery_backup FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS seo_recovery_backup.blog_articles_verified_copy_20261124 AS
  SELECT id, slug, content, updated_at, now() AS backed_up_at
    FROM public.blog_articles
   WHERE content::text ~* '(compare|browse|find|search|with|of|to) (our )?verified (treatment |rehab )?(programs|facilit|centers|providers)';

ALTER TABLE seo_recovery_backup.blog_articles_verified_copy_20261124 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ALL TABLES IN SCHEMA seo_recovery_backup FROM PUBLIC, anon, authenticated;

UPDATE public.blog_articles a
   SET content = regexp_replace(
         regexp_replace(
           a.content::text,
           'directory of verified treatment centers or contacting our team for personalized guidance',
           'directory of treatment centers and contacting the facilities directly',
           'g'),
         '\m(compare|browse|find|search|with|of|to) (our )?verified (treatment |rehab )?(programs|facilit|centers|providers)',
         '\1 \2\3\4',
         'gi')::jsonb
  FROM seo_recovery_backup.blog_articles_verified_copy_20261124 b
 WHERE a.id = b.id;
