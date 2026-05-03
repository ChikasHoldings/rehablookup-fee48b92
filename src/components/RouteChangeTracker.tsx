import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

/**
 * Fires a GA4 `page_view` on every React Router navigation.
 *
 * The initial `page_view` is sent automatically by the gtag snippet in
 * index.html (`gtag('config', ..., { send_page_view: true })`). SPA route
 * changes do NOT trigger a new `page_view`, which causes massive
 * underreporting in GA4 Reports while Realtime still shows users.
 *
 * This component sends an explicit `page_view` event on every pathname/search
 * change, including the initial mount (deduped by gtag itself when the URL
 * matches the initial config call).
 */
export function RouteChangeTracker() {
  const location = useLocation();
  const isFirst = useRef(true);

  useEffect(() => {
    if (typeof window === "undefined" || !window.gtag) return;
    const path = location.pathname + location.search + location.hash;
    const debug =
      typeof window !== "undefined" &&
      (window.location.search.includes("gtm_debug") ||
        window.location.hash.includes("gtm_debug"));

    // Skip first mount — gtag('config') in index.html already sent page_view.
    if (isFirst.current) {
      isFirst.current = false;
      if (debug) {
        // eslint-disable-next-line no-console
        console.info("[GA4] initial page_view (from index.html):", path);
      }
      return;
    }
    window.gtag("config", "G-2VB6C1X2MQ", {
      page_path: path,
      page_title: document.title,
    });
    if (debug) {
      // eslint-disable-next-line no-console
      console.info("[GA4] SPA page_view sent:", path, "| title:", document.title);
    }
  }, [location.pathname, location.search, location.hash]);

  return null;
}
