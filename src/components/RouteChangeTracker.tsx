import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

/**
 * Fires a GA4 `page_view` on every React Router navigation.
 *
 * Notes:
 *  - The initial `page_view` is sent automatically by the gtag snippet in
 *    index.html (`gtag('config', ..., { send_page_view: true })`).
 *  - SPA route changes do NOT trigger a new `page_view` automatically.
 *  - We send an explicit `page_view` EVENT (not `config`) so we don't reset
 *    GA4 client state, and we wait two frames so react-helmet-async has
 *    flushed the new <title> before we read `document.title`.
 *  - We always send the canonical `page_location` (full URL) and
 *    `page_referrer` (previous URL) so GA4 sees real navigation chains.
 */
export function RouteChangeTracker() {
  const location = useLocation();
  const isFirst = useRef(true);
  const lastUrlRef = useRef<string>("");

  useEffect(() => {
    if (typeof window === "undefined") return;

    const path = location.pathname + location.search + location.hash;
    const debug =
      window.location.search.includes("gtm_debug") ||
      window.location.hash.includes("gtm_debug");

    // Skip first mount — gtag('config') in index.html already sent page_view
    // for the initial URL. Record it so the next nav sends correct referrer.
    if (isFirst.current) {
      isFirst.current = false;
      lastUrlRef.current = window.location.href;
      if (debug) console.info("[GA4] initial page_view (from index.html):", path);
      return;
    }

    // Wait two animation frames so react-helmet-async flushes the new <title>
    // and canonical before we capture them. Falls back to setTimeout for SSR.
    const send = () => {
      if (!window.gtag) return;
      // Prefer <link rel="canonical"> href so GA4 page_location always
      // matches what Google indexes — strips utm/query, enforces lowercase,
      // and pins to the production host. Falls back to window.location.href
      // when the page hasn't set a canonical yet.
      const canonicalEl = document.querySelector(
        'link[rel="canonical"]',
      ) as HTMLLinkElement | null;
      const pageLocation = canonicalEl?.href || window.location.href;
      const pageReferrer = lastUrlRef.current || document.referrer || "";
      const pageTitle = document.title;

      window.gtag("event", "page_view", {
        page_path: path,
        page_title: pageTitle,
        page_location: pageLocation,
        page_referrer: pageReferrer,
        send_to: "G-2VB6C1X2MQ",
      });

      lastUrlRef.current = pageLocation;
      if (debug) {
        console.info(
          "[GA4] SPA page_view sent:",
          path,
          "| title:",
          pageTitle,
          "| referrer:",
          pageReferrer,
        );
      }
    };

    const raf1 =
      typeof requestAnimationFrame !== "undefined"
        ? requestAnimationFrame(() => {
            const raf2 = requestAnimationFrame(send);
            // Stash inner id so we can cancel on unmount
            (raf1 as unknown as { inner?: number }).inner = raf2 as unknown as number;
          })
        : (setTimeout(send, 50) as unknown as number);

    return () => {
      if (typeof cancelAnimationFrame !== "undefined") {
        cancelAnimationFrame(raf1 as unknown as number);
        const inner = (raf1 as unknown as { inner?: number }).inner;
        if (typeof inner === "number") cancelAnimationFrame(inner);
      } else {
        clearTimeout(raf1 as unknown as number);
      }
    };
  }, [location.pathname, location.search, location.hash]);

  return null;
}
