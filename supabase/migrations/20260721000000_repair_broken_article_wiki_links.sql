-- Repair broken wiki-style article cross-references in published
-- article content.
--
-- Background: ArticleDetail.tsx parses [[slug|label]] tokens in
-- article body text into <Link to="/resources/<slug>"> elements
-- (see src/pages/ArticleDetail.tsx parseContentWithLinks). When the
-- target slug doesn't exist in blog_articles the link click lands on
-- ArticleNotFound (real 404 with noindex). A scan of published
-- content found 5 broken cross-references in 5 source articles
-- pointing at 4 distinct non-existent slugs:
--
--   what-to-expect-in-rehab      (2 occurrences)
--   family-support-guide         (1)
--   intervention-guide           (1)
--   non-12-step-alternatives     (1)
--
-- None of these were ever created in blog_articles. They were
-- placeholder targets a previous content seed assumed would exist.
-- This migration retargets each one at the closest published
-- canonical article, preserving the original surface label:
--
--   what-to-expect-in-rehab      -> how-long-does-rehab-take
--   family-support-guide         -> how-to-support-someone-in-recovery
--   intervention-guide           -> how-to-stage-an-intervention
--   non-12-step-alternatives     -> rehab-vs-aa-na
--
-- Idempotent: the regexp_replace patterns target only the exact slug
-- inside the wiki-link delimiter, so re-running is a no-op.

BEGIN;

-- 1) what-to-expect-in-rehab -> how-long-does-rehab-take
UPDATE public.blog_articles
SET
  content = regexp_replace(
    content::text,
    '\[\[what-to-expect-in-rehab\|',
    '[[how-long-does-rehab-take|',
    'g'
  )::jsonb,
  updated_at = now()
WHERE status = 'published'
  AND content::text LIKE '%[[what-to-expect-in-rehab|%';

-- 2) family-support-guide -> how-to-support-someone-in-recovery
UPDATE public.blog_articles
SET
  content = regexp_replace(
    content::text,
    '\[\[family-support-guide\|',
    '[[how-to-support-someone-in-recovery|',
    'g'
  )::jsonb,
  updated_at = now()
WHERE status = 'published'
  AND content::text LIKE '%[[family-support-guide|%';

-- 3) intervention-guide -> how-to-stage-an-intervention
UPDATE public.blog_articles
SET
  content = regexp_replace(
    content::text,
    '\[\[intervention-guide\|',
    '[[how-to-stage-an-intervention|',
    'g'
  )::jsonb,
  updated_at = now()
WHERE status = 'published'
  AND content::text LIKE '%[[intervention-guide|%';

-- 4) non-12-step-alternatives -> rehab-vs-aa-na
UPDATE public.blog_articles
SET
  content = regexp_replace(
    content::text,
    '\[\[non-12-step-alternatives\|',
    '[[rehab-vs-aa-na|',
    'g'
  )::jsonb,
  updated_at = now()
WHERE status = 'published'
  AND content::text LIKE '%[[non-12-step-alternatives|%';

COMMIT;
