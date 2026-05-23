// Render the NotFound page in-place at the current URL instead of redirecting
// to /404. A client-side <Navigate to="/404"> rewrites the URL, so Googlebot
// crawls /alcohol-rehab-in-fakecity, gets 200, then sees the URL change to
// /404 — wasted crawl signal and "Page with redirect" GSC noise. Rendering
// NotFound in-place keeps the original URL, returns the noindex meta, and
// lets Google de-index cleanly.
//
// 2026-05-23: NotFound is imported eagerly (no lazy + Suspense) so an
// in-place 404 doesn't flash a blank `min-h-screen` placeholder while
// the chunk loads. SEO pages that fall back to this component (bad
// city, dead state slug, deleted article, etc.) now render the 404
// shell immediately. Bundle impact is minimal — NotFound's deps
// (Layout, SEO, ui primitives, supabase) are already shared with
// every public page that imports them.
import NotFound from "@/pages/NotFound";

export function InlineNotFound() {
  return <NotFound />;
}
