import { useLocation, Navigate } from "react-router-dom";
import { useUserRole } from "@/hooks/useUserRole";

interface PublicRouteGuardProps {
  children: React.ReactNode;
}

/**
 * Wrapper for public-facing routes. Redirects authenticated admins/providers
 * to their portals ONLY for the homepage and generic catch-all routes.
 * 
 * All content/SEO pages (rehab-centers, locations, treatment-types, etc.)
 * are accessible to ALL users including admins and providers.
 * 
 * Seekers CAN access all public routes (they're regular users).
 */
export function PublicRouteGuard({ children }: PublicRouteGuardProps) {
  const { role, isLoading, isAuthenticated } = useUserRole();
  const location = useLocation();

  // During loading, show content immediately for fast perceived loading
  if (isLoading) {
    return <>{children}</>;
  }

  // Skip redirect logic in iframe (preview functionality)
  if (typeof window !== "undefined" && window.self !== window.top) {
    return <>{children}</>;
  }

  // Not authenticated - allow public access
  if (!isAuthenticated || !role) {
    return <>{children}</>;
  }

  const currentPath = location.pathname;

  // Only redirect from the homepage — all other public routes are accessible
  // This ensures admins/providers can view SEO pages, content pages, etc.
  if (currentPath === "/") {
    if (role === "admin") {
      return <Navigate to="/admin" replace />;
    }
    if (role === "provider") {
      return <Navigate to="/provider/dashboard" replace />;
    }
  }

  // All other public routes — allow access for everyone
  return <>{children}</>;
}
