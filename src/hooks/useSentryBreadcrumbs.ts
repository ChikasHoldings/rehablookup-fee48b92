import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { addNavigationBreadcrumb } from "@/lib/sentry";

/**
 * Hook to automatically track route changes as Sentry breadcrumbs
 */
export function useSentryBreadcrumbs() {
  const location = useLocation();
  const previousPath = useRef<string>(location.pathname);

  useEffect(() => {
    if (previousPath.current !== location.pathname) {
      addNavigationBreadcrumb(previousPath.current, location.pathname);
      previousPath.current = location.pathname;
    }
  }, [location.pathname]);
}
