import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * RouteChangeTracker
 *
 * Fires a GA4 `page_view` event on every navigation, including initial load.
 *
 * index.html disables gtag's auto-page_view via `send_page_view:false`, so
 * this component is the SINGLE source of `page_view` events. That avoids
 * double-counting (auto-fire + this effect) and lets us ship the correct
 * `page_title` after react-helmet-async has committed the title swap.
 *
 * The deferral (rAF + microtask) is intentional: useEffect runs after React
 * commits, but helmet's mutation of <title> is itself a useEffect — when
 * both useEffects run in the same flush, ordering between them is not
 * guaranteed. Deferring to the next frame guarantees document.title has
 * settled to the page-specific title before we read it for page_title.
 *
 * Mounted inside <BrowserRouter> in App.tsx so `useLocation` works.
 */
export function RouteChangeTracker() {
  const location = useLocation();

  useEffect(() => {
    if (typeof window.gtag !== "function") return;

    const path = location.pathname + location.search;
    const raf = requestAnimationFrame(() => {
      // Read page_location from <link rel="canonical"> so GA4 page_location
      // matches the URL Google indexes — utm/fbclid/gclid query params and
      // mixed-case path variants collapse into a single canonical URL in
      // the report, rather than fragmenting traffic for the same logical
      // page across N "different" pages. Falls back to window.location.href
      // if the canonical hasn't been set yet (only happens on initial mount
      // before SEO/helmet writes the tag). Enforced by
      // scripts/check-canonical-ga-parity.mjs.
      const canonicalEl = document.querySelector<HTMLLinkElement>(
        'link[rel="canonical"]',
      );
      const pageLocation = canonicalEl?.href || window.location.href;
      window.gtag("event", "page_view", {
        page_path: path,
        page_location: pageLocation,
        page_title: document.title,
      });
    });
    return () => cancelAnimationFrame(raf);
  }, [location.pathname, location.search]);

  return null;
}
