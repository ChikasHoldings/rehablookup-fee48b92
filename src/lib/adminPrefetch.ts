// Prefetch map for admin pages - matches lazy imports in App.tsx
const prefetchMap: Record<string, () => Promise<unknown>> = {
  "/admin": () => import("@/pages/admin/AdminDashboard"),
  "/admin/dashboard": () => import("@/pages/admin/AdminDashboard"),
  "/admin/analytics": () => import("@/pages/admin/AdminAnalytics"),
  "/admin/providers": () => import("@/pages/admin/AdminProviders"),
  "/admin/leads": () => import("@/pages/admin/AdminLeads"),
  "/admin/lead-routing": () => import("@/pages/admin/AdminLeadRouting"),
  "/admin/subscriptions": () => import("@/pages/admin/AdminSubscriptions"),
  "/admin/featured": () => import("@/pages/admin/AdminFeatured"),
  "/admin/credentials": () => import("@/pages/admin/AdminCredentials"),
  "/admin/flagged-images": () => import("@/pages/admin/AdminFlaggedImages"),
  "/admin/users": () => import("@/pages/admin/AdminUsers"),
  "/admin/audit-log": () => import("@/pages/admin/AdminAuditLog"),
  "/admin/security-logs": () => import("@/pages/admin/AdminSecurityLogs"),
  "/admin/location-changes": () => import("@/pages/admin/AdminLocationChanges"),
  "/admin/settings": () => import("@/pages/admin/AdminSettings"),
  "/admin/notifications": () => import("@/pages/admin/AdminNotifications"),
  "/admin/profile": () => import("@/pages/admin/AdminProfile"),
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
