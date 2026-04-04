import { useLocation, Navigate } from "react-router-dom";
import { useUserRole } from "@/hooks/useUserRole";

interface PublicRouteGuardProps {
  children: React.ReactNode;
}

// Routes that admins/providers can still access (legal pages, etc.)
const ALWAYS_ALLOWED_ROUTES = [
  "/privacy-policy",
  "/terms-of-service",
  "/login",
  "/forgot-password",
];

// Provider-specific public pages
const PROVIDER_ALLOWED_ROUTES = [
  "/for-providers",
  "/provider-resources",
  "/provider-support",
  "/provider-faq",
  "/provider-guides",
  "/providers/resources",
  "/login",
  "/provider-signup",
  "/provider-forgot-password",
  "/provider-reset-password",
];

/**
 * Wrapper component for public routes that redirects authenticated admins
 * and providers to their respective portals. Uses declarative Navigate
 * component for reliable redirects.
 * 
 * Seekers CAN access public routes (they're regular users browsing).
 */
export function PublicRouteGuard({ children }: PublicRouteGuardProps) {
  const { role, isLoading, isAuthenticated } = useUserRole();
  const location = useLocation();

  // Skip loading state - show children immediately for perceived instant loading
  // Redirects will happen after role resolves
  if (isLoading) {
    // Return children during loading for instant content display
    // Role-based redirects will trigger after loading completes
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

  // Allow legal/universal pages for everyone
  if (ALWAYS_ALLOWED_ROUTES.some(route => currentPath.startsWith(route))) {
    return <>{children}</>;
  }

  // Admin redirect - use Navigate component for reliable redirect
  if (role === "admin") {
    return <Navigate to="/admin" replace />;
  }

  // Provider redirect
  if (role === "provider") {
    // Allow provider-specific public pages
    if (PROVIDER_ALLOWED_ROUTES.some(route => currentPath.startsWith(route))) {
      return <>{children}</>;
    }
    return <Navigate to="/provider/dashboard" replace />;
  }

  // Seekers can access all public routes
  return <>{children}</>;
}
