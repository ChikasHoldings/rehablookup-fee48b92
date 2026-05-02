
UPDATE public.blog_articles
SET content = REPLACE(REPLACE(content::text, '"text":', '"content":'), '"type": "callout", "content"', '"type": "callout", "content"')::jsonb
WHERE slug IN (
  'rehablookup-april-2026-analytics-milestone',
  'ceo-chiedu-kabakwu-scaling-rehablookup'
);
