-- HOTFIX — anon visitors getting "permission denied for function
-- user_is_admin" when reading /blog (and any other page that fetches
-- from blog_articles unauthenticated).
--
-- Root cause: the batch-12 multi-permissive consolidation
-- (20260522060012) merged "Admins can manage all articles" (ALL,
-- calls user_is_admin) and "Public can read published articles"
-- (SELECT, status='published') into a single SELECT policy with
-- USING (user_is_admin(auth.uid()) OR status='published'). The
-- policy is TO public, so anon evaluates it — but Phase 2B revoked
-- anon's EXECUTE on user_is_admin, so the call inside the OR errors
-- before the predicate can fall through to the status check.
--
-- Fix: split back into two SELECT policies. anon never touches
-- user_is_admin; authenticated still gets both paths.
--   • blog_articles_select_public  — TO public, status='published'
--   • blog_articles_select_admin   — TO authenticated, is_admin
--
-- This re-introduces a multiple_permissive_policies advisor warning
-- on (blog_articles, authenticated, SELECT). Accepted: the lint is
-- informational; a broken public blog is a real outage.

DROP POLICY IF EXISTS "blog_articles_select_consolidated" ON public.blog_articles;

CREATE POLICY "blog_articles_select_public"
  ON public.blog_articles
  AS PERMISSIVE FOR SELECT
  USING (status = 'published'::text);

CREATE POLICY "blog_articles_select_admin"
  ON public.blog_articles
  AS PERMISSIVE FOR SELECT
  TO authenticated
  USING (user_is_admin((SELECT auth.uid())));
