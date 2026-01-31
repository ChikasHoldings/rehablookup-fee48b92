import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export type UserRole = "admin" | "provider" | "seeker" | null;

interface UserRoleResult {
  role: UserRole;
  isLoading: boolean;
  isAuthenticated: boolean;
  userId: string | null;
}

// Define portal boundaries
const PORTAL_CONFIG = {
  admin: {
    homeRoute: "/admin",
    allowedPrefixes: ["/admin"],
    loginRoute: "/admin-login",
  },
  provider: {
    homeRoute: "/provider/dashboard",
    allowedPrefixes: ["/provider"],
    loginRoute: "/provider-login",
  },
  seeker: {
    homeRoute: "/account",
    // Seekers can access public website + /account routes
    allowedPrefixes: ["/", "/account"],
    loginRoute: "/auth",
  },
} as const;

// Routes that are always accessible regardless of role
const PUBLIC_AUTH_ROUTES = [
  "/provider-login",
  "/provider-signup",
  "/provider-forgot-password",
  "/provider-reset-password",
  "/admin-login",
  "/auth",
  "/signup",
  "/reset-password",
];

// Routes providers can still access (provider-facing public pages)
const PROVIDER_ALLOWED_PUBLIC_ROUTES = [
  "/for-providers",
  "/provider-resources",
  "/provider-support",
  "/provider-faq",
  "/privacy-policy",
  "/terms-of-service",
];

/**
 * Unified hook for role resolution and route guarding.
 * This is the SINGLE SOURCE OF TRUTH for user roles.
 * 
 * Role determination:
 * 1. Check user_roles table for 'admin' role
 * 2. Check profiles table for provider profile
 * 3. Check seeker_profiles table for seeker profile
 * 4. If authenticated but no profile, default to null (no role)
 */
export function useUserRole(): UserRoleResult {
  const [role, setRole] = useState<UserRole>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const determineRole = async (uid: string): Promise<UserRole> => {
      try {
        // Check admin role first (highest priority)
        const { data: isAdmin } = await supabase.rpc("has_role", {
          _user_id: uid,
          _role: "admin",
        });
        
        if (isAdmin === true) {
          return "admin";
        }

        // Check provider profile (provider role)
        const { data: providerProfile } = await supabase
          .from("profiles")
          .select("id")
          .eq("user_id", uid)
          .maybeSingle();

        if (providerProfile) {
          return "provider";
        }

        // Check seeker profile
        const { data: seekerProfile } = await supabase
          .from("seeker_profiles")
          .select("id")
          .eq("user_id", uid)
          .maybeSingle();

        if (seekerProfile) {
          return "seeker";
        }

        // Authenticated but no profile yet
        return null;
      } catch (error) {
        console.error("[useUserRole] Error determining role:", error);
        return null;
      }
    };

    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!mounted) return;

        if (!session?.user) {
          setIsAuthenticated(false);
          setUserId(null);
          setRole(null);
          setIsLoading(false);
          return;
        }

        setIsAuthenticated(true);
        setUserId(session.user.id);
        
        const userRole = await determineRole(session.user.id);
        if (mounted) {
          setRole(userRole);
          setIsLoading(false);
        }
      } catch (error) {
        console.error("[useUserRole] Error checking session:", error);
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        if (!session?.user) {
          setIsAuthenticated(false);
          setUserId(null);
          setRole(null);
          setIsLoading(false);
          return;
        }

        setIsAuthenticated(true);
        setUserId(session.user.id);
        
        // Defer role check to avoid deadlock
        setTimeout(async () => {
          if (!mounted) return;
          const userRole = await determineRole(session.user.id);
          if (mounted) {
            setRole(userRole);
            setIsLoading(false);
          }
        }, 0);
      }
    );

    checkSession();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return { role, isLoading, isAuthenticated, userId };
}

/**
 * Hook that enforces portal boundaries based on user role.
 * Automatically redirects users to their correct portal.
 */
export function useRoleBasedRedirect() {
  const { role, isLoading, isAuthenticated } = useUserRole();
  const navigate = useNavigate();
  const location = useLocation();

  const checkAndRedirect = useCallback(() => {
    if (isLoading) return { shouldBlock: true, redirectTo: null };

    const currentPath = location.pathname;

    // Skip check in iframes (preview functionality)
    if (typeof window !== "undefined" && window.self !== window.top) {
      return { shouldBlock: false, redirectTo: null };
    }

    // Allow auth routes for everyone
    if (PUBLIC_AUTH_ROUTES.some(route => currentPath.startsWith(route))) {
      return { shouldBlock: false, redirectTo: null };
    }

    // Not authenticated - allow public routes only
    if (!isAuthenticated) {
      // Block admin and provider routes
      if (currentPath.startsWith("/admin") || currentPath.startsWith("/provider")) {
        return { shouldBlock: true, redirectTo: currentPath.startsWith("/admin") ? "/admin-login" : "/provider-login" };
      }
      return { shouldBlock: false, redirectTo: null };
    }

    // Authenticated - enforce portal boundaries
    if (role === "admin") {
      // Admins can ONLY access /admin routes
      if (!currentPath.startsWith("/admin") && currentPath !== "/admin-login") {
        return { shouldBlock: true, redirectTo: "/admin" };
      }
    } else if (role === "provider") {
      // Providers can access /provider routes + specific allowed public routes
      const isProviderRoute = currentPath.startsWith("/provider");
      const isAllowedPublicRoute = PROVIDER_ALLOWED_PUBLIC_ROUTES.some(
        route => currentPath.startsWith(route)
      );
      
      if (!isProviderRoute && !isAllowedPublicRoute) {
        return { shouldBlock: true, redirectTo: "/provider/dashboard" };
      }
    } else if (role === "seeker") {
      // Seekers can access public website + /account routes
      // Block admin and provider routes
      if (currentPath.startsWith("/admin") || currentPath.startsWith("/provider")) {
        return { shouldBlock: true, redirectTo: "/account" };
      }
    }

    return { shouldBlock: false, redirectTo: null };
  }, [role, isLoading, isAuthenticated, location.pathname]);

  useEffect(() => {
    const { redirectTo } = checkAndRedirect();
    if (redirectTo) {
      navigate(redirectTo, { replace: true });
    }
  }, [checkAndRedirect, navigate]);

  return { role, isLoading, isAuthenticated, checkAndRedirect };
}

/**
 * Get the home route for a given role
 */
export function getPortalHome(role: UserRole): string {
  if (!role) return "/";
  return PORTAL_CONFIG[role]?.homeRoute || "/";
}

/**
 * Check if a route is allowed for a given role
 */
export function isRouteAllowedForRole(pathname: string, role: UserRole): boolean {
  if (!role) {
    // Unauthenticated - block admin and provider routes
    return !pathname.startsWith("/admin") && !pathname.startsWith("/provider");
  }

  // Allow auth routes for everyone
  if (PUBLIC_AUTH_ROUTES.some(route => pathname.startsWith(route))) {
    return true;
  }

  switch (role) {
    case "admin":
      return pathname.startsWith("/admin");
    case "provider":
      return pathname.startsWith("/provider") || 
             PROVIDER_ALLOWED_PUBLIC_ROUTES.some(r => pathname.startsWith(r));
    case "seeker":
      return !pathname.startsWith("/admin") && !pathname.startsWith("/provider");
    default:
      return false;
  }
}
