import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

/**
 * Fires a GA4 `page_view` on every React Router navigation.
 *
 * Key fixes:
 *  1. Reads consent state from localStorage before firing — if analytics_storage
 *     is 'denied', we queue the page_view and fire it when consent is granted.
 *  2. Uses window.location.href for page_location (more reliable than reading
 *     the <link rel="canonical"> tag which can lag on fast SPA navigations).
 *  3. Listens for 'rehablookup:consent-updated' dispatched by CookieConsentBanner
 *     so that if a user accepts cookies mid-session, the queued page_view fires.
 *  4. The initial page_view is sent by gtag('config') in index.html — skipped
 *     here to avoid double-counting the landing page.
 */

const GA_ID = "G-2VB6C1X2MQ";
const COOKIE_CONSENT_KEY = "rehablookup_cookie_consent";

function isAnalyticsGranted(): boolean {
  try {
    const saved = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!saved) return false;
    const parsed = JSON.parse(saved);
    return parsed?.version === "1.0" && parsed?.analytics === true;
  } catch {
    return false;
  }
}

export function RouteChangeTracker() {
  const location = useLocation();
  const isFirst = useRef(true);
  const lastUrlRef = useRef<string>("");
  // Store the pending page_view so we can fire it when consent is granted.
  const pendingPageView = useRef<{
    path: string;
    pageLocation: string;
    pageReferrer: string;
  } | null>(null);

  // Listen for consent updates from CookieConsentBanner.
  // If analytics was just granted, fire the pending page_view immediately.
  useEffect(() => {
    const onConsentUpdated = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.analytics === true && pendingPageView.current) {
        const { path, pageLocation, pageReferrer } = pendingPageView.current;
        pendingPageView.current = null;
        if (window.gtag) {
          window.gtag("event", "page_view", {
            page_path: path,
            page_title: document.title,
            page_location: pageLocation,
            page_referrer: pageReferrer,
            send_to: GA_ID,
          });
        }
      }
    };
    window.addEventListener("rehablookup:consent-updated", onConsentUpdated);
    return () => {
      window.removeEventListener("rehablookup:consent-updated", onConsentUpdated);
    };
  }, []);

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
    // before we capture it. Falls back to setTimeout for environments without RAF.
    const send = () => {
      if (!window.gtag) return;

      // Use window.location.href directly — more reliable than reading the
      // <link rel="canonical"> tag which can lag on fast SPA navigations.
      const pageLocation = window.location.href;
      const pageReferrer = lastUrlRef.current || document.referrer || "";
      const pageTitle = document.title;

      // Store as pending regardless — fire immediately if consent is granted,
      // otherwise CookieConsentBanner will fire it on accept.
      pendingPageView.current = { path, pageLocation, pageReferrer };

      if (isAnalyticsGranted()) {
        pendingPageView.current = null;
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
      } else {
        if (debug) console.info("[GA4] page_view queued (consent pending):", path);
      }

      lastUrlRef.current = pageLocation;
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
