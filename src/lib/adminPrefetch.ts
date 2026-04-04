// Prefetch map for admin pages - matches lazy imports in App.tsx
const prefetchMap: Record<string, () => Promise<unknown>> = {
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
  "/admin/placement-revenue": () => import("@/pages/admin/PlacementRevenueDashboard"),
  "/admin/support": () => import("@/pages/admin/AdminSupport"),
  "/admin/marketing": () => import("@/pages/admin/AdminMarketing"),
  "/admin/blog": () => import("@/pages/admin/AdminBlog"),
};

// Adjacent pages to prefetch based on current page (ordered by priority)
const adjacentPagesMap: Record<string, string[]> = {
  "/admin": ["/admin/analytics", "/admin/providers", "/admin/leads"],
  "/admin/dashboard": ["/admin/analytics", "/admin/providers", "/admin/leads"],
  "/admin/analytics": ["/admin", "/admin/providers", "/admin/leads"],
  "/admin/providers": ["/admin", "/admin/leads", "/admin/subscriptions"],
  "/admin/leads": ["/admin/providers", "/admin/seekers", "/admin"],
  "/admin/seekers": ["/admin/leads", "/admin"],
  "/admin/subscriptions": ["/admin/providers", "/admin"],
  "/admin/users": ["/admin/audit-log", "/admin/security-logs", "/admin"],
  "/admin/audit-log": ["/admin/users", "/admin/security-logs"],
  "/admin/security-logs": ["/admin/users", "/admin/audit-log"],
  "/admin/settings": ["/admin/profile", "/admin"],
  "/admin/notifications": ["/admin", "/admin/settings"],
  "/admin/profile": ["/admin/settings", "/admin"],
  "/admin/reviews": ["/admin/providers"],
  "/admin/concierge": ["/admin", "/admin/placement-revenue", "/admin/providers"],
  "/admin/placement-revenue": ["/admin/concierge", "/admin/subscriptions"],
};

// Track already prefetched routes to avoid duplicate fetches
const prefetchedRoutes = new Set<string>();

export function prefetchAdminPage(path: string): void {
  if (prefetchedRoutes.has(path)) return;
  
  const prefetchFn = prefetchMap[path];
  if (prefetchFn) {
    prefetchedRoutes.add(path);
    // Use requestIdleCallback for non-blocking prefetch, fallback to setTimeout
    const schedule = window.requestIdleCallback || ((cb: () => void) => setTimeout(cb, 1));
    schedule(() => {
      prefetchFn().catch(() => {
        // Remove from set if prefetch fails so it can be retried
        prefetchedRoutes.delete(path);
      });
    });
  }
}

// Prefetch adjacent pages when landing on a page
export function prefetchAdjacentPages(currentPath: string): void {
  const adjacentPages = adjacentPagesMap[currentPath];
  if (!adjacentPages) return;

  // Stagger prefetching to avoid blocking the main thread
  adjacentPages.forEach((path, index) => {
    setTimeout(() => {
      prefetchAdminPage(path);
    }, 100 + index * 150); // Start after 100ms, then stagger by 150ms
  });
}
