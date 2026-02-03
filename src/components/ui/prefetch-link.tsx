import { forwardRef, useEffect, useRef } from "react";
import { Link, LinkProps } from "react-router-dom";
import { prefetchRoute } from "@/lib/routePrefetch";

interface PrefetchLinkProps extends LinkProps {
  prefetch?: boolean;
}

/**
 * Link component that prefetches route on hover/focus
 * Drop-in replacement for react-router's Link
 */
export const PrefetchLink = forwardRef<HTMLAnchorElement, PrefetchLinkProps>(
  ({ prefetch = true, to, onMouseEnter, onFocus, ...props }, ref) => {
    const path = typeof to === "string" ? to : to.pathname || "";

    const handleMouseEnter = (e: React.MouseEvent<HTMLAnchorElement>) => {
      if (prefetch && path) {
        prefetchRoute(path);
      }
      onMouseEnter?.(e);
    };

    const handleFocus = (e: React.FocusEvent<HTMLAnchorElement>) => {
      if (prefetch && path) {
        prefetchRoute(path);
      }
      onFocus?.(e);
    };

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

/**
 * Hook to prefetch adjacent routes when component mounts
 * Use in layout components to preload likely next pages
 */
export function usePrefetchOnMount(routes: string[]) {
  const prefetchedRef = useRef(false);

  useEffect(() => {
    if (prefetchedRef.current) return;
    prefetchedRef.current = true;

    // Stagger prefetches to avoid blocking
    routes.forEach((route, index) => {
      setTimeout(() => prefetchRoute(route), 200 + index * 100);
    });
  }, [routes]);
}
