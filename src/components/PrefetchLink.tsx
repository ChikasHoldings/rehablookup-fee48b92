import { Link, LinkProps } from "react-router-dom";
import { forwardRef, useCallback } from "react";

// Route to lazy import mapping for prefetching (only for lazy-loaded routes)
const routePrefetchMap: Record<string, () => Promise<unknown>> = {
  // Provider panel routes (lazy loaded)
  "/provider/dashboard": () => import("@/pages/provider/Dashboard"),
  "/provider/listing": () => import("@/pages/provider/Listing"),
  "/provider/inquiries": () => import("@/pages/provider/Inquiries"),
  "/provider/analytics": () => import("@/pages/provider/Analytics"),
  "/provider/credits": () => import("@/pages/provider/Credits"),
  "/provider/unlock-history": () => import("@/pages/provider/UnlockHistory"),
  "/provider/pro-upgrade": () => import("@/pages/provider/ProUpgrade"),
  "/provider/placement": () => import("@/pages/provider/PlacementNetwork"),
  "/provider/settings": () => import("@/pages/provider/Settings"),
  "/provider/notifications": () => import("@/pages/provider/Notifications"),
  "/provider/help": () => import("@/pages/provider/Help"),
  // Admin panel routes (lazy loaded)
  "/admin": () => import("@/pages/admin/AdminDashboard"),
  "/admin/dashboard": () => import("@/pages/admin/AdminDashboard"),
  "/admin/providers": () => import("@/pages/admin/AdminProviders"),
  "/admin/leads": () => import("@/pages/admin/AdminLeads"),
  "/admin/subscriptions": () => import("@/pages/admin/AdminSubscriptions"),
  "/admin/featured": () => import("@/pages/admin/AdminFeatured"),
  "/admin/users": () => import("@/pages/admin/AdminUsers"),
  "/admin/analytics": () => import("@/pages/admin/AdminAnalytics"),
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
