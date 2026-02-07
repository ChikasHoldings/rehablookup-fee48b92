import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

/**
 * Global scroll-to-top component for route changes.
 * Handles both window scroll and hash anchor navigation.
 * Place inside BrowserRouter to ensure it captures all navigation.
 */
export function ScrollToTop() {
  const { pathname, hash } = useLocation();
  const prevPathRef = useRef(pathname);

  useEffect(() => {
    // Only scroll if pathname actually changed (not just hash)
    const pathChanged = prevPathRef.current !== pathname;
    prevPathRef.current = pathname;

    // If there's a hash (anchor link), scroll to that element
    if (hash) {
      // Small delay to ensure DOM is ready after navigation
      requestAnimationFrame(() => {
        const element = document.getElementById(hash.slice(1));
        if (element) {
          element.scrollIntoView({ behavior: "instant" });
        }
      });
      return;
    }
    
    // Scroll to top instantly on path change
    if (pathChanged) {
      window.scrollTo({ top: 0, behavior: "instant" });
    }
  }, [pathname, hash]);

  return null;
}

