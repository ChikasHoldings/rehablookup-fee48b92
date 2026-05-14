import { lazy, Suspense } from "react";

// Render the NotFound page in-place at the current URL instead of redirecting
// to /404. A client-side <Navigate to="/404"> rewrites the URL, so Googlebot
// crawls /alcohol-rehab-in-fakecity, gets 200, then sees the URL change to
// /404 — wasted crawl signal and "Page with redirect" GSC noise. Rendering
// NotFound in-place keeps the original URL, returns the noindex meta, and
// lets Google de-index cleanly.
const NotFound = lazy(() => import("@/pages/NotFound"));

export function InlineNotFound() {
  return (
    <Suspense fallback={null}>
      <NotFound />
    </Suspense>
  );
}
