import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

/**
 * Fires a GA4 `page_view` on every React Router navigation.
 *
 * RehabLookup is a US-based site operating under an opt-OUT consent model.
 * Analytics tracking is enabled by default for all visitors. Users can opt
 * out by clicking "Decline" on the cookie banner, which sets analytics_storage
 * to "denied" via GA4 Consent Mode v2 — GA4 then suppresses all hits
 * automatically without any additional client-side gating needed here.
 *
 * Key implementation notes:
 *  1. We do NOT gate page_view on localStorage — GA4 Consent Mode handles
 *     suppression server-side when analytics_storage = "denied".
 *  2. Uses window.location.href for page_location (more reliable than reading
 *     the <link rel="canonical"> tag which can lag on fast SPA navigations).
 *  3. The initial page_view is sent by gtag('config') in index.html — skipped
 *     here to avoid double-counting the landing page.
 *  4. Uses double-RAF to wait for react-helmet-async to flush the new <title>
 *     before capturing it. Falls back to setTimeout for non-RAF environments.
 */

const GA_ID = "G-2VB6C1X2MQ";

export function RouteChangeTracker() {
  const location = useLocation();
  const isFirst = useRef(true);
  const lastUrlRef = useRef<string>("");

  useEffect(() => {
    if (typeof window === "undefined") return;

    const path = location.pathname + location.search + location.hash;
    const debug =
      window.location.search.includes("gtm_debug") ||
      window.location.search.includes("ga_debug") ||
      window.location.hash.includes("gtm_debug") ||
      window.location.hash.includes("ga_debug");

    // Skip first mount — gtag('config') in index.html already sent page_view
    // for the initial URL. Record it so the next nav sends correct referrer.
    if (isFirst.current) {
      isFirst.current = false;
      lastUrlRef.current = window.location.href;
      if (debug) console.info("[GA4] initial page_view (from index.html):", path);
      return;
    }

    // Wait two animation frames so react-helmet-async flushes the new <title>
    // before we capture it. Falls back to setTimeout for environments without RAF.
    const send = () => {
      if (!window.gtag) return;

      const pageLocation = window.location.href;
      const pageReferrer = lastUrlRef.current || document.referrer || "";
      const pageTitle = document.title;

      // Fire page_view unconditionally — no consent gating.
      // Cookie banner removed; analytics_storage is always 'granted'.
      window.gtag("event", "page_view", {
        page_path: path,
        page_title: pageTitle,
        page_location: pageLocation,
        page_referrer: pageReferrer,
        send_to: GA_ID,
      });

      if (debug) {
        console.info(
          "[GA4] SPA page_view sent:",
          path,
          "| title:", pageTitle,
          "| referrer:", pageReferrer,
        );
      }

      lastUrlRef.current = pageLocation;
    };

    const raf1 =
      typeof requestAnimationFrame !== "undefined"
        ? requestAnimationFrame(() => {
            const raf2 = requestAnimationFrame(send);
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
