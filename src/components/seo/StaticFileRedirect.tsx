import { useEffect } from "react";

/**
 * Redirect from a SPA route to a static asset served by the host
 * (i.e. a file in /public). Plain <Navigate to="/sitemap-index.xml" />
 * does NOT work for this — React Router treats the target as an SPA
 * path and the catch-all <Route path="*"> renders NotFound. We use
 * `window.location.replace` so the browser issues a real HTTP request
 * for the file.
 *
 * Use this only for static assets (.xml, .pdf, .txt). For SPA routes
 * keep using react-router's <Navigate>.
 */
export function StaticFileRedirect({ to }: { to: string }) {
  useEffect(() => {
    if (typeof window === "undefined") return;
    // .replace() so the SPA-route entry doesn't get added to history
    // — back button skips the placeholder route.
    window.location.replace(to);
  }, [to]);
  return null;
}
