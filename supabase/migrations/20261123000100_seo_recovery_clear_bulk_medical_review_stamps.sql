-- SEO recovery Phase 1 (2026-11-23): remove unsupported medical-review metadata.
--
-- WHAT WAS WRONG
--   20260828000200_seed_blog_authors.sql stamped every published clinical
--   article with medical_reviewer_id = <"medical-review-team"> and
--   last_medically_reviewed_at = NOW(). All 40 rows carry the identical
--   timestamp 2026-05-23 20:55:16.178138+00 — a bulk stamp, not a review.
--   ArticleByline renders "Medically reviewed by … <date>" and
--   generateArticleSchema() emits reviewedBy/lastReviewed from these columns.
--   The reviewer author row also claims "Licensed clinicians · ASAM-aligned
--   standards"; no named clinician or license exists anywhere in the data.
--
-- WHAT THIS DOES (reversible)
--   1. Backs up the affected article columns and the author row into
--      seo_recovery_backup.* (RLS-locked, not exposed through the Data API).
--   2. Clears ONLY the bulk stamp (exact reviewer id + exact timestamp), so
--      any genuine review recorded later is never touched.
--   3. Replaces the author row's clinician claims with an accurate
--      description. Slug, id and authorship links are unchanged.
--
-- ROLLBACK
--   UPDATE public.blog_articles a
--      SET medical_reviewer_id = b.medical_reviewer_id,
--          last_medically_reviewed_at = b.last_medically_reviewed_at
--     FROM seo_recovery_backup.blog_articles_medical_review_20261123 b
--    WHERE a.id = b.id;
--   UPDATE public.blog_authors a
--      SET name = b.name, credentials = b.credentials, title = b.title, bio = b.bio
--     FROM seo_recovery_backup.blog_authors_20261123 b
--    WHERE a.id = b.id;

CREATE SCHEMA IF NOT EXISTS seo_recovery_backup;
REVOKE ALL ON SCHEMA seo_recovery_backup FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS seo_recovery_backup.blog_articles_medical_review_20261123 AS
SELECT a.id,
       a.slug,
       a.medical_reviewer_id,
       a.last_medically_reviewed_at,
       now() AS backed_up_at
  FROM public.blog_articles a
  JOIN public.blog_authors r ON r.id = a.medical_reviewer_id
 WHERE r.slug = 'medical-review-team';

CREATE TABLE IF NOT EXISTS seo_recovery_backup.blog_authors_20261123 AS
SELECT a.*, now() AS backed_up_at
  FROM public.blog_authors a
 WHERE a.slug = 'medical-review-team';

ALTER TABLE seo_recovery_backup.blog_articles_medical_review_20261123 ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_recovery_backup.blog_authors_20261123 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ALL TABLES IN SCHEMA seo_recovery_backup FROM PUBLIC, anon, authenticated;

-- Clear only the bulk stamp.
UPDATE public.blog_articles a
   SET medical_reviewer_id = NULL,
       last_medically_reviewed_at = NULL
  FROM public.blog_authors r
 WHERE r.id = a.medical_reviewer_id
   AND r.slug = 'medical-review-team'
   AND a.last_medically_reviewed_at = '2026-05-23 20:55:16.178138+00'::timestamptz;

-- Replace unsupported clinician claims on the author profile.
UPDATE public.blog_authors
   SET name        = 'RehabLookup Health Content Team',
       credentials = NULL,
       title       = 'Health education content',
       bio         = 'This byline covers RehabLookup''s health-education articles about treatment options, withdrawal, medications for addiction treatment and co-occurring conditions. These articles have not yet been reviewed by a named, licensed clinician. When an article has been clinically reviewed, the reviewer''s name, credentials and review date will be shown on that article. This content is general information, not medical advice; talk with a qualified clinician about your situation.',
       updated_at  = now()
 WHERE slug = 'medical-review-team';
