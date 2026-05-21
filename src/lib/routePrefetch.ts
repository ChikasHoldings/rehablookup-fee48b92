/**
 * Unified route prefetching for instant page navigation
 * Prefetches both code chunks and data on link hover/focus
 */

// Track prefetched routes to avoid duplicate fetches
const prefetchedRoutes = new Set<string>();
 
 // Track visited routes in session for instant animations on return
 const visitedRoutes = new Set<string>();
 
 export function markRouteVisited(path: string): void {
   visitedRoutes.add(path);
 }
 
 export function hasVisitedRoute(path: string): boolean {
   return visitedRoutes.has(path);
 }

// Lazy import maps for each section.
//
// Note: "/" (Index) is intentionally absent — Index.tsx is statically
// imported in App.tsx so it's already in the main bundle (the
// homepage is the most-visited route and the LCP hit of lazy-loading
// it would outweigh any bundle savings). Adding it here would emit a
// Vite "dynamic import will not move module into another chunk"
// warning. Other pages remain lazy so hover-prefetch + adjacent-route
// prefetch can pre-load them off the critical path.
const publicPageMap: Record<string, () => Promise<unknown>> = {
  "/rehab-centers": () => import("@/pages/RehabCenters"),
  "/locations": () => import("@/pages/Locations"),
  "/treatment-types": () => import("@/pages/TreatmentTypes"),
  "/how-it-works": () => import("@/pages/HowItWorks"),
  "/for-providers": () => import("@/pages/ForProviders"),
  "/concierge": () => import("@/pages/concierge/ConciergeLanding"),
  // /international prefetch retired 2026-05-20 — route now redirects to /us-rehab/international-patients.
  "/resources": () => import("@/pages/Resources"),
  "/insurance": () => import("@/pages/Insurance"),
  "/about": () => import("@/pages/About"),
  "/contact": () => import("@/pages/Contact"),
  "/faq": () => import("@/pages/FAQ"),
};

const seekerPageMap: Record<string, () => Promise<unknown>> = {
  "/account": () => import("@/pages/seeker/SeekerHome"),
  "/account/requests": () => import("@/pages/seeker/SeekerRequests"),
  "/account/saved": () => import("@/pages/seeker/SeekerSaved"),
  "/account/reviews": () => import("@/pages/seeker/SeekerReviews"),
  "/account/settings": () => import("@/pages/seeker/SeekerSettings"),
  "/account/notifications": () => import("@/pages/seeker/SeekerNotifications"),
  "/account/help": () => import("@/pages/seeker/SeekerHelp"),
  "/account/concierge": () => import("@/pages/seeker/SeekerConcierge"),
};

const providerPageMap: Record<string, () => Promise<unknown>> = {
  "/provider/dashboard": () => import("@/pages/provider/Dashboard"),
  "/provider/listings": () => import("@/pages/provider/MyListings"),
  "/provider/inquiries": () => import("@/pages/provider/Inquiries"),
  "/provider/reviews": () => import("@/pages/provider/Reviews"),
  "/provider/analytics": () => import("@/pages/provider/Analytics"),
  "/provider/settings": () => import("@/pages/provider/Settings"),
  "/provider/notifications": () => import("@/pages/provider/Notifications"),
  "/provider/help": () => import("@/pages/provider/Help"),
  "/provider/billing": () => import("@/pages/provider/Billing"),
  // /provider/placement-network removed in monetization rebuild.
};

const adminPageMap: Record<string, () => Promise<unknown>> = {
  "/admin": () => import("@/pages/admin/AdminDashboard"),
  "/admin/dashboard": () => import("@/pages/admin/AdminDashboard"),
  "/admin/analytics": () => import("@/pages/admin/AdminAnalytics"),
  "/admin/providers": () => import("@/pages/admin/AdminProviders"),
  "/admin/leads": () => import("@/pages/admin/AdminLeads"),
  "/admin/subscriptions": () => import("@/pages/admin/AdminSubscriptions"),
  "/admin/users": () => import("@/pages/admin/AdminStaff"),
  "/admin/seekers": () => import("@/pages/admin/AdminSeekers"),
  "/admin/audit-log": () => import("@/pages/admin/AdminAuditLog"),
  "/admin/security-logs": () => import("@/pages/admin/AdminSecurityLogs"),
  "/admin/settings": () => import("@/pages/admin/AdminSettings"),
  "/admin/notifications": () => import("@/pages/admin/AdminNotifications"),
  "/admin/profile": () => import("@/pages/admin/AdminProfile"),
  "/admin/reviews": () => import("@/pages/admin/AdminReviews"),
  "/admin/concierge": () => import("@/pages/admin/AdminConcierge"),
  // /admin/placement-revenue dashboard removed in monetization rebuild.
  "/admin/support": () => import("@/pages/admin/AdminSupport"),
  "/admin/marketing": () => import("@/pages/admin/AdminMarketing"),
};

// Find the best matching route for a given path
function findPrefetchFn(path: string): (() => Promise<unknown>) | null {
  // Check exact matches first
  const allMaps = { ...publicPageMap, ...seekerPageMap, ...providerPageMap, ...adminPageMap };
  if (allMaps[path]) return allMaps[path];
  
  // Check prefix matches for dynamic routes
  if (path.startsWith("/rehab-centers/")) return () => import("@/pages/StatePage");
  if (path.startsWith("/center/")) return () => import("@/pages/CenterProfile");
  if (path.startsWith("/treatment-types/")) return () => import("@/pages/TreatmentTypes");
  
  return null;
}

/**
 * Prefetch a route's code chunk
 * Call on link hover/focus for instant navigation
 */
export function prefetchRoute(path: string): void {
  if (prefetchedRoutes.has(path)) return;
  
  const prefetchFn = findPrefetchFn(path);
  if (!prefetchFn) return;
  
  prefetchedRoutes.add(path);
  
  // Use requestIdleCallback for non-blocking prefetch
  const schedule = window.requestIdleCallback || ((cb: () => void) => setTimeout(cb, 1));
  schedule(() => {
    prefetchFn().catch(() => {
      // Remove from set if prefetch fails so it can be retried
      prefetchedRoutes.delete(path);
    });
  });
}

/**
 * Prefetch adjacent pages based on current location
 * Called after navigation completes
 */
export function prefetchAdjacentRoutes(currentPath: string): void {
  const adjacentMap: Record<string, string[]> = {
    // Public
    "/": ["/rehab-centers", "/locations", "/concierge"],
    "/rehab-centers": ["/locations", "/treatment-types"],
    "/locations": ["/rehab-centers"],
    
    // Seeker
    "/account": ["/account/saved", "/account/requests", "/account/concierge"],
    "/account/saved": ["/account", "/account/requests"],
    "/account/requests": ["/account", "/account/saved"],
    "/account/concierge": ["/account"],
    "/account/settings": ["/account", "/account/notifications"],
    
    // Provider
    "/provider/dashboard": ["/provider/inquiries", "/provider/listings", "/provider/analytics"],
    "/provider/inquiries": ["/provider/dashboard", "/provider/listings"],
    "/provider/listings": ["/provider/dashboard", "/provider/inquiries"],
    "/provider/analytics": ["/provider/dashboard"],
    "/provider/settings": ["/provider/dashboard", "/provider/notifications"],
    "/provider/billing": ["/provider/dashboard", "/provider/settings"],
    
    // Admin (handled by existing adminPrefetch.ts)
  };
  
  const adjacent = adjacentMap[currentPath];
  if (!adjacent) return;
  
  // Stagger prefetching
  adjacent.forEach((path, index) => {
    setTimeout(() => prefetchRoute(path), 100 + index * 100);
  });
}

// ============================================
// Panel-specific eager preloading functions
// Called on shell mount for instant navigation
// ============================================

const preloadedPanels = new Set<string>();

/**
 * Preload all provider panel pages eagerly on shell mount
 */
export function preloadProviderPages(): void {
  if (preloadedPanels.has("provider")) return;
  preloadedPanels.add("provider");
  
  const pages = [
    () => import("@/pages/provider/Dashboard"),
    () => import("@/pages/provider/MyListings"),
    () => import("@/pages/provider/Inquiries"),
    () => import("@/pages/provider/Reviews"),
    () => import("@/pages/provider/Analytics"),
    () => import("@/pages/provider/Billing"),
    () => import("@/pages/provider/Settings"),
    () => import("@/pages/provider/Notifications"),
    () => import("@/pages/provider/Help"),
    () => import("@/pages/provider/Billing"),
    () => import("@/pages/provider/EmbedBadge"),
  ];
  
  pages.forEach((load, i) => {
    if (window.requestIdleCallback) {
      window.requestIdleCallback(() => load().catch(() => {}), { timeout: 500 + i * 50 });
    } else {
      setTimeout(() => load().catch(() => {}), 50 + i * 50);
    }
  });
}

/**
 * Preload all admin panel pages eagerly on shell mount
 */
export function preloadAdminPages(): void {
  if (preloadedPanels.has("admin")) return;
  preloadedPanels.add("admin");
  
  const pages = [
    () => import("@/pages/admin/AdminDashboard"),
    () => import("@/pages/admin/AdminAnalytics"),
    () => import("@/pages/admin/AdminProviders"),
    () => import("@/pages/admin/AdminLeads"),
    () => import("@/pages/admin/AdminSubscriptions"),
    () => import("@/pages/admin/AdminStaff"),
    () => import("@/pages/admin/AdminSeekers"),
    () => import("@/pages/admin/AdminAuditLog"),
    () => import("@/pages/admin/AdminSecurityLogs"),
    () => import("@/pages/admin/AdminSettings"),
    () => import("@/pages/admin/AdminNotifications"),
    () => import("@/pages/admin/AdminReviews"),
    () => import("@/pages/admin/AdminConcierge"),
    () => import("@/pages/admin/AdminSupport"),
    () => import("@/pages/admin/AdminMarketing"),
  ];
  
  pages.forEach((load, i) => {
    if (window.requestIdleCallback) {
      window.requestIdleCallback(() => load().catch(() => {}), { timeout: 500 + i * 50 });
    } else {
      setTimeout(() => load().catch(() => {}), 50 + i * 50);
    }
  });
}

/**
 * Preload all seeker panel pages eagerly on shell mount
 */
export function preloadSeekerPages(): void {
  if (preloadedPanels.has("seeker")) return;
  preloadedPanels.add("seeker");
  
  const pages = [
    () => import("@/pages/seeker/SeekerHome"),
    () => import("@/pages/seeker/SeekerRequests"),
    () => import("@/pages/seeker/SeekerSaved"),
    () => import("@/pages/seeker/SeekerReviews"),
    () => import("@/pages/seeker/SeekerSettings"),
    () => import("@/pages/seeker/SeekerNotifications"),
    () => import("@/pages/seeker/SeekerHelp"),
    () => import("@/pages/seeker/SeekerConcierge"),
  ];
  
  pages.forEach((load, i) => {
    if (window.requestIdleCallback) {
      window.requestIdleCallback(() => load().catch(() => {}), { timeout: 500 + i * 50 });
    } else {
      setTimeout(() => load().catch(() => {}), 50 + i * 50);
    }
  });
}

/**
 * Preload key public website pages for instant navigation
 */
export function preloadPublicPages(): void {
  if (preloadedPanels.has("public")) return;
  preloadedPanels.add("public");
  
  const pages = [
    () => import("@/pages/RehabCenters"),
    () => import("@/pages/concierge/ConciergeLanding"),
    () => import("@/pages/Insurance"),
    // InternationalLanding prefetch retired 2026-05-20.
    () => import("@/pages/ForProviders"),
    () => import("@/pages/About"),
    () => import("@/pages/Contact"),
  ];
  
  pages.forEach((load, i) => {
    if (window.requestIdleCallback) {
      window.requestIdleCallback(() => load().catch(() => {}), { timeout: 1000 + i * 100 });
    } else {
      setTimeout(() => load().catch(() => {}), 100 + i * 100);
    }
  });
}

/**
 * Prefetch on visibility - for links in viewport
 */
export function createVisibilityPrefetcher() {
  if (typeof IntersectionObserver === "undefined") return null;
  
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const href = (entry.target as HTMLAnchorElement).getAttribute("href");
          if (href) {
            prefetchRoute(href);
          }
        }
      });
    },
    { rootMargin: "100px" }
  );
  
  return {
    observe: (element: HTMLAnchorElement) => observer.observe(element),
    unobserve: (element: HTMLAnchorElement) => observer.unobserve(element),
    disconnect: () => observer.disconnect(),
  };
}
