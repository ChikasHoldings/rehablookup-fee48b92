import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * RouteChangeTracker
 *
 * Fires a GA4 `page_view` event on every client-side route change.
 *
 * GA4's default `gtag('config', 'G-MM5K8398LY')` only fires once on the
 * initial hard page load. For a React SPA using client-side routing, we must
 * manually push a `page_view` event to the dataLayer on every navigation so
 * that GA4 records each virtual page view accurately.
 *
 * This component is rendered inside <BrowserRouter> in App.tsx so that
 * `useLocation` has access to the router context.
 */
export function RouteChangeTracker() {
  const location = useLocation();

  useEffect(() => {
    // Guard: only fire if gtag is available (GA4 script loaded)
    if (typeof window.gtag !== "function") return;

    window.gtag("event", "page_view", {
      page_path: location.pathname + location.search,
      page_location: window.location.href,
      page_title: document.title,
    });
  }, [location.pathname, location.search]);

  return null;
}
