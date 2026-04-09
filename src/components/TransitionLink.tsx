import { forwardRef, useCallback, useTransition, MouseEvent } from "react";
import { Link, LinkProps, useNavigate } from "react-router-dom";
import { prefetchRouteChunk } from "@/components/PrefetchLink";
import { prefetchRoute } from "@/lib/routePrefetch";

/**
 * Drop-in replacement for react-router-dom's <Link> that wraps navigation
 * in React.startTransition so the old page stays visible while the new
 * lazy-loaded chunk streams in. This eliminates blank flashes entirely.
 *
 * Also prefetches the target route chunk on hover/focus for instant loads.
 */
export const TransitionLink = forwardRef<HTMLAnchorElement, LinkProps>(
  ({ to, onClick, onMouseEnter, onFocus, children, ...props }, ref) => {
    const navigate = useNavigate();
    const [, startTransition] = useTransition();
    const path = typeof to === "string" ? to : to.pathname || "";

    const handleClick = useCallback(
      (e: MouseEvent<HTMLAnchorElement>) => {
        // Allow cmd/ctrl+click for new tab
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        // Allow external/hash-only links
        if (path.startsWith("http") || path.startsWith("mailto:") || path.startsWith("tel:")) return;

        e.preventDefault();
        onClick?.(e);

        startTransition(() => {
          navigate(to);
        });
      },
      [to, path, navigate, onClick, startTransition]
    );

    const handleMouseEnter = useCallback(
      (e: MouseEvent<HTMLAnchorElement>) => {
        prefetchRouteChunk(path);
        prefetchRoute(path);
        onMouseEnter?.(e);
      },
      [path, onMouseEnter]
    );

    const handleFocus = useCallback(
      (e: React.FocusEvent<HTMLAnchorElement>) => {
        prefetchRouteChunk(path);
        prefetchRoute(path);
        onFocus?.(e);
      },
      [path, onFocus]
    );

    return (
      <Link
        ref={ref}
        to={to}
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onFocus={handleFocus}
        {...props}
      >
        {children}
      </Link>
    );
  }
);

TransitionLink.displayName = "TransitionLink";
