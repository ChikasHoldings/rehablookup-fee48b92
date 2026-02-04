import { Link, LinkProps } from "react-router-dom";
import { forwardRef, useCallback } from "react";

// Route to lazy import mapping for prefetching (only for lazy-loaded routes)
const routePrefetchMap: Record<string, () => Promise<unknown>> = {
  // Public routes (lazy loaded)
  "/rehab-centers": () => import("@/pages/RehabCenters"),
  "/search-results": () => import("@/pages/SearchResults"),
  "/locations": () => import("@/pages/Locations"),
  "/treatment-types": () => import("@/pages/TreatmentTypes"),
  "/concierge": () => import("@/pages/concierge/ConciergeLanding"),
  "/how-it-works": () => import("@/pages/HowItWorks"),
  "/for-providers": () => import("@/pages/ForProviders"),
  "/insurance": () => import("@/pages/Insurance"),
  "/international": () => import("@/pages/international/InternationalLanding"),
  "/about": () => import("@/pages/About"),
  "/contact": () => import("@/pages/Contact"),
  "/faq": () => import("@/pages/FAQ"),
  "/resources": () => import("@/pages/Resources"),
  // Seeker panel routes (lazy loaded)
  "/account": () => import("@/pages/seeker/SeekerHome"),
  "/account/requests": () => import("@/pages/seeker/SeekerRequests"),
  "/account/saved": () => import("@/pages/seeker/SeekerSaved"),
  "/account/reviews": () => import("@/pages/seeker/SeekerReviews"),
  "/account/settings": () => import("@/pages/seeker/SeekerSettings"),
  "/account/notifications": () => import("@/pages/seeker/SeekerNotifications"),
  "/account/help": () => import("@/pages/seeker/SeekerHelp"),
  "/account/concierge": () => import("@/pages/seeker/SeekerConcierge"),
  // Provider panel routes (lazy loaded)
  "/provider/dashboard": () => import("@/pages/provider/Dashboard"),
  "/provider/listings": () => import("@/pages/provider/MyListings"),
  "/provider/inquiries": () => import("@/pages/provider/Inquiries"),
  "/provider/analytics": () => import("@/pages/provider/Analytics"),
  "/provider/credits": () => import("@/pages/provider/Credits"),
  "/provider/placement-network": () => import("@/pages/provider/PlacementNetwork"),
  "/provider/settings": () => import("@/pages/provider/Settings"),
  "/provider/notifications": () => import("@/pages/provider/Notifications"),
  "/provider/help": () => import("@/pages/provider/Help"),
  "/provider/billing": () => import("@/pages/provider/Billing"),
  "/provider/reviews": () => import("@/pages/provider/Reviews"),
  // "/provider/embed-badge": () => import("@/pages/provider/EmbedBadge"), // Hidden for now
  // Admin panel routes (lazy loaded)
  "/admin": () => import("@/pages/admin/AdminDashboard"),
  "/admin/dashboard": () => import("@/pages/admin/AdminDashboard"),
  "/admin/providers": () => import("@/pages/admin/AdminProviders"),
  "/admin/leads": () => import("@/pages/admin/AdminLeads"),
  "/admin/subscriptions": () => import("@/pages/admin/AdminSubscriptions"),
  "/admin/users": () => import("@/pages/admin/AdminStaff"),
  "/admin/analytics": () => import("@/pages/admin/AdminAnalytics"),
  "/admin/seekers": () => import("@/pages/admin/AdminSeekers"),
  "/admin/concierge": () => import("@/pages/admin/AdminConcierge"),
  "/admin/support": () => import("@/pages/admin/AdminSupport"),
  "/admin/reviews": () => import("@/pages/admin/AdminReviews"),
  "/admin/settings": () => import("@/pages/admin/AdminSettings"),
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
