import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useUserRole, getPortalHome } from "@/hooks/useUserRole";

interface PublicRouteGuardProps {
  children: React.ReactNode;
}

// Routes that admins/providers can still access (legal pages, etc.)
const ALWAYS_ALLOWED_ROUTES = [
  "/privacy-policy",
  "/terms-of-service",
];

// Provider-specific public pages
const PROVIDER_ALLOWED_ROUTES = [
  "/for-providers",
  "/provider-resources",
  "/provider-support",
  "/provider-faq",
  "/provider-login",
  "/provider-signup",
  "/provider-forgot-password",
  "/provider-reset-password",
];

/**
 * Wrapper component for public routes that redirects authenticated admins
 * and providers to their respective portals. This ensures strict separation
 * between public website and admin/provider experiences.
 * 
 * Seekers CAN access public routes (they're regular users browsing).
 */
export function PublicRouteGuard({ children }: PublicRouteGuardProps) {
  const { role, isLoading, isAuthenticated } = useUserRole();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Skip if still loading or in iframe
    if (isLoading) return;
    if (typeof window !== "undefined" && window.self !== window.top) return;

    // Not authenticated - allow public access
    if (!isAuthenticated || !role) return;

    const currentPath = location.pathname;

    // Allow legal/universal pages for everyone
    if (ALWAYS_ALLOWED_ROUTES.some(route => currentPath.startsWith(route))) {
      return;
    }

    // Check role-specific restrictions
    if (role === "admin") {
      // Admins cannot access ANY public routes except legal pages
      // Redirect to admin portal
      navigate("/admin", { replace: true });
      return;
    }

    if (role === "provider") {
      // Providers can access provider-specific public pages
      if (PROVIDER_ALLOWED_ROUTES.some(route => currentPath.startsWith(route))) {
        return;
      }
      
      // Block all other public routes
      navigate("/provider/dashboard", { replace: true });
      return;
    }

    // Seekers can access all public routes - no redirect needed
  }, [role, isLoading, isAuthenticated, location.pathname, navigate]);

  // Show loading while checking role
  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // If user is admin or provider (not seeker), show loading during redirect
  if (isAuthenticated && (role === "admin" || role === "provider")) {
    const currentPath = location.pathname;
    const isAllowedRoute = 
      ALWAYS_ALLOWED_ROUTES.some(r => currentPath.startsWith(r)) ||
      (role === "provider" && PROVIDER_ALLOWED_ROUTES.some(r => currentPath.startsWith(r)));
    
    if (!isAllowedRoute) {
      return (
        <div className="h-screen flex items-center justify-center bg-background">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      );
    }
  }

  return <>{children}</>;
}
