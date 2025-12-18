import { Link, LinkProps } from "react-router-dom";
import { forwardRef, useCallback } from "react";

// Route to lazy import mapping for prefetching
const routePrefetchMap: Record<string, () => Promise<unknown>> = {
  "/rehab-centers": () => import("@/pages/RehabCenters"),
  "/request-help": () => import("@/pages/RequestHelp"),
  "/for-providers": () => import("@/pages/ForProviders"),
  "/how-it-works": () => import("@/pages/HowItWorks"),
  "/treatment-types": () => import("@/pages/TreatmentTypes"),
  "/resources": () => import("@/pages/Resources"),
  "/about": () => import("@/pages/About"),
  "/contact": () => import("@/pages/Contact"),
  "/faq": () => import("@/pages/FAQ"),
  "/provider-login": () => import("@/pages/ProviderLogin"),
  "/provider-signup": () => import("@/pages/ProviderSignup"),
};

// Track which routes have been prefetched to avoid duplicate fetches
const prefetchedRoutes = new Set<string>();

export function prefetchRoute(path: string) {
  const normalizedPath = path.split("?")[0].split("#")[0];
  
  if (prefetchedRoutes.has(normalizedPath)) return;
  
  const prefetcher = routePrefetchMap[normalizedPath];
  if (prefetcher) {
    prefetchedRoutes.add(normalizedPath);
    prefetcher();
  }
}

interface PrefetchLinkProps extends LinkProps {
  prefetch?: boolean;
}

export const PrefetchLink = forwardRef<HTMLAnchorElement, PrefetchLinkProps>(
  ({ to, prefetch = true, onMouseEnter, onFocus, ...props }, ref) => {
    const path = typeof to === "string" ? to : to.pathname || "";

    const handleMouseEnter = useCallback(
      (e: React.MouseEvent<HTMLAnchorElement>) => {
        if (prefetch) {
          prefetchRoute(path);
        }
        onMouseEnter?.(e);
      },
      [path, prefetch, onMouseEnter]
    );

    const handleFocus = useCallback(
      (e: React.FocusEvent<HTMLAnchorElement>) => {
        if (prefetch) {
          prefetchRoute(path);
        }
        onFocus?.(e);
      },
      [path, prefetch, onFocus]
    );

    return (
      <Link
        ref={ref}
        to={to}
        onMouseEnter={handleMouseEnter}
        onFocus={handleFocus}
        {...props}
      />
    );
  }
);

PrefetchLink.displayName = "PrefetchLink";
