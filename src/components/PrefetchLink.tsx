import { forwardRef, useCallback, useTransition } from "react";
import { LinkProps, useNavigate } from "react-router-dom";
import { prefetchRoute } from "@/lib/routePrefetch";

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
  "/provider/billing": () => import("@/pages/provider/Billing"),
  // /provider/placement-network removed in monetization rebuild.
  "/provider/settings": () => import("@/pages/provider/Settings"),
  "/provider/notifications": () => import("@/pages/provider/Notifications"),
  "/provider/help": () => import("@/pages/provider/Help"),
  "/provider/reviews": () => import("@/pages/provider/Reviews"),
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

export function prefetchRouteChunk(path: string) {
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

/**
 * Link component that:
 * 1. Prefetches route chunk on hover/focus
 * 2. Uses useTransition on click to keep old page visible while new one loads
 * This eliminates blank flashes during lazy-loaded route transitions.
 */
export const PrefetchLink = forwardRef<HTMLAnchorElement, PrefetchLinkProps>(
  ({ to, prefetch = true, onMouseEnter, onFocus, onClick, children, className, ...props }, ref) => {
    const path = typeof to === "string" ? to : to.pathname || "";
    const navigate = useNavigate();
    const [, startTransition] = useTransition();

    const handleClick = useCallback(
      (e: React.MouseEvent<HTMLAnchorElement>) => {
        // Allow cmd/ctrl+click for new tab
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;

        e.preventDefault();
        onClick?.(e as any);

        // Navigate inside a transition — React keeps the old UI visible
        // until the new lazy component's chunk is ready
        startTransition(() => {
          navigate(path);
        });
      },
      [path, navigate, onClick, startTransition]
    );

    const handleMouseEnter = useCallback(
      (e: React.MouseEvent<HTMLAnchorElement>) => {
        if (prefetch) {
          prefetchRouteChunk(path);
          prefetchRoute(path);
        }
        onMouseEnter?.(e);
      },
      [path, prefetch, onMouseEnter]
    );

    const handleFocus = useCallback(
      (e: React.FocusEvent<HTMLAnchorElement>) => {
        if (prefetch) {
          prefetchRouteChunk(path);
          prefetchRoute(path);
        }
        onFocus?.(e);
      },
      [path, prefetch, onFocus]
    );

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
