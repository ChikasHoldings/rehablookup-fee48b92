 import { forwardRef, useTransition, useRef, useEffect } from "react";
 import { LinkProps, useNavigate } from "react-router-dom";
import { prefetchRoute } from "@/lib/routePrefetch";

interface PrefetchLinkProps extends LinkProps {
  prefetch?: boolean;
}

/**
 * Link component that prefetches route on hover/focus
 * Drop-in replacement for react-router's Link
 */
export const PrefetchLink = forwardRef<HTMLAnchorElement, PrefetchLinkProps>(
   ({ prefetch = true, to, onClick, children, className, ...props }, ref) => {
     const navigate = useNavigate();
     const [, startTransition] = useTransition();
    const path = typeof to === "string" ? to : to.pathname || "";

     const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
       // Allow cmd/ctrl+click for new tab
       if (e.metaKey || e.ctrlKey || e.shiftKey) return;
       
       e.preventDefault();
       onClick?.(e as any);
       
       // Navigate with transition - keeps old page visible
       startTransition(() => {
         navigate(path);
       });
     };
 
     const handleMouseEnter = () => {
      if (prefetch && path) {
        prefetchRoute(path);
      }
    };

     const handleFocus = () => {
      if (prefetch && path) {
        prefetchRoute(path);
      }
    };

    return (
       <a
        ref={ref}
         href={path}
         onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onFocus={handleFocus}
         className={className}
        {...props}
       >
         {children}
       </a>
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
