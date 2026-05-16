import { useEffect } from "react";
import { trackEvent } from "@/lib/analytics";

/**
 * Global delegated click listener that fires a single `phone_click`
 * analytics event for every <a href="tel:..."> on the page — without
 * each call-site needing to wire its own onClick.
 *
 * Mount once at the app root. Captures clicks during the capture
 * phase so we record the event even if a child element calls
 * stopPropagation in its own onClick.
 *
 * Event shape (via analytics.trackEvent):
 *   phone_click  { tel, page_path, location? }
 *
 * `location` is read from the nearest ancestor that has a
 * `data-cta-location` attribute, which lets call-sites annotate
 * where the link lives (e.g. "facility_card", "hero_cta") without
 * duplicating tracking code.
 */
export function useTelClickTracking() {
  useEffect(() => {
    if (typeof document === "undefined") return;

    const handler = (e: MouseEvent) => {
      const target = e.target as Element | null;
      if (!target) return;
      const anchor = target.closest('a[href^="tel:"]') as HTMLAnchorElement | null;
      if (!anchor) return;
      const tel = anchor.getAttribute("href") ?? "";
      const locationEl = anchor.closest("[data-cta-location]") as HTMLElement | null;
      const location = locationEl?.dataset.ctaLocation;
      try {
        trackEvent("phone_click", {
          tel,
          page_path: window.location.pathname,
          ...(location ? { location } : {}),
        });
      } catch {
        /* never break navigation because tracking failed */
      }
    };

    document.addEventListener("click", handler, true);
    return () => document.removeEventListener("click", handler, true);
  }, []);
}
