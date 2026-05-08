import { useEffect, useRef, RefObject } from "react";
import { useLocation } from "react-router-dom";

/**
 * Hook for scrolling to top on route changes or step changes.
 * Works with both window scroll and container-based scroll (panels with fixed headers).
 * 
 * @param containerRef - Optional ref to a scrollable container (for panel shells)
 * @param dependencies - Additional dependencies to trigger scroll (e.g., step index)
 */
export function useScrollToTop(
  containerRef?: RefObject<HTMLElement | null>,
  dependencies: unknown[] = []
) {
  const { pathname, hash } = useLocation();
  const isInitialMount = useRef(true);

  useEffect(() => {
    // Skip on initial mount if there's a hash (anchor link navigation)
    if (isInitialMount.current) {
      isInitialMount.current = false;
      if (hash) {
        const element = document.getElementById(hash.slice(1));
        if (element) {
          element.scrollIntoView({ behavior: "instant" });
          return;
        }
      }
    }

    // Scroll container or window to top
    if (containerRef?.current) {
      containerRef.current.scrollTo({ top: 0, behavior: "instant" });
    } else {
      window.scrollTo({ top: 0, behavior: "instant" });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- spread of caller-provided dependencies is intentional; ESLint cannot statically verify them
  }, [pathname, hash, containerRef, ...dependencies]);
}

/**
 * Scrolls to top with smooth animation - use for user-triggered navigation within a page
 */
export function scrollToTopSmooth() {
  window.scrollTo({ top: 0, behavior: "smooth" });
}

/**
 * Scrolls to top instantly - use for programmatic navigation
 */
export function scrollToTopInstant() {
  window.scrollTo({ top: 0, behavior: "instant" });
}

/**
 * Scrolls a container element to top
 */
export function scrollContainerToTop(
  element: HTMLElement | null,
  behavior: ScrollBehavior = "instant"
) {
  if (element) {
    element.scrollTo({ top: 0, behavior });
  }
}
