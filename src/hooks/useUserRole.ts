import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export type UserRole = "admin" | "provider" | "seeker" | null;

interface UserRoleResult {
  role: UserRole;
  isLoading: boolean;
  isAuthenticated: boolean;
  userId: string | null;
  sessionExpiresAt: number | null;
}

// Define portal boundaries
const PORTAL_CONFIG = {
  admin: {
    homeRoute: "/admin",
    allowedPrefixes: ["/admin"],
    loginRoute: "/admin/login",
  },
  provider: {
    homeRoute: "/provider/dashboard",
    allowedPrefixes: ["/provider"],
    loginRoute: "/login",
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
  "/login",
  "/forgot-password",
  "/provider-signup",
  "/provider-forgot-password",
  "/provider-reset-password",
  "/admin/login",
  "/auth",
  "/signup",
  "/seeker/signup",
  "/seeker/reset-password",
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
  const [sessionExpiresAt, setSessionExpiresAt] = useState<number | null>(null);
  
  const mountedRef = useRef(true);
  const initializingRef = useRef(true);
  const roleCache = useRef<Map<string, { role: UserRole; timestamp: number }>>(new Map());
  const CACHE_TTL = 30000; // 30 seconds

  useEffect(() => {
    mountedRef.current = true;
    initializingRef.current = true;
    let timeoutId: ReturnType<typeof setTimeout>;
    let refreshIntervalId: ReturnType<typeof setInterval>;

    const determineRole = async (uid: string): Promise<UserRole> => {
      // Check cache first
      const cached = roleCache.current.get(uid);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.role;
      }

      try {
        // Check admin role first (highest priority)
        const { data: isAdmin } = await supabase.rpc("has_role", {
          _user_id: uid,
          _role: "admin",
        });
        
        if (isAdmin === true) {
          roleCache.current.set(uid, { role: "admin", timestamp: Date.now() });
          return "admin";
        }

        // Check provider profile (provider role)
        const { data: providerProfile } = await supabase
          .from("profiles")
          .select("id")
          .eq("user_id", uid)
          .maybeSingle();

        if (providerProfile) {
          roleCache.current.set(uid, { role: "provider", timestamp: Date.now() });
          return "provider";
        }

        // Check seeker profile
        const { data: seekerProfile } = await supabase
          .from("seeker_profiles")
          .select("id")
          .eq("user_id", uid)
          .maybeSingle();

        if (seekerProfile) {
          roleCache.current.set(uid, { role: "seeker", timestamp: Date.now() });
          return "seeker";
        }

        // Authenticated but no profile yet
        roleCache.current.set(uid, { role: null, timestamp: Date.now() });
        return null;
      } catch (error) {
        console.error("[useUserRole] Error determining role:", error);
        return null;
      }
    };

    const updateAuthState = (session: typeof supabase.auth extends { getSession: () => Promise<{ data: { session: infer S } }> } ? S : never) => {
      if (!mountedRef.current) return;
      
      if (!session?.user) {
        setIsAuthenticated(false);
        setUserId(null);
        setRole(null);
        setSessionExpiresAt(null);
        return false;
      }

      setIsAuthenticated(true);
      setUserId(session.user.id);
      setSessionExpiresAt(session.expires_at ? session.expires_at * 1000 : null);
      return true;
    };

    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!mountedRef.current) return;

        const hasSession = updateAuthState(session);
        
        if (hasSession && session?.user) {
          const userRole = await determineRole(session.user.id);
          if (mountedRef.current) {
            setRole(userRole);
          }
        }
        
        if (mountedRef.current) {
          setIsLoading(false);
          initializingRef.current = false;
        }
      } catch (error) {
        console.error("[useUserRole] Error checking session:", error);
        if (mountedRef.current) {
          setIsAuthenticated(false);
          setUserId(null);
          setRole(null);
          setSessionExpiresAt(null);
          setIsLoading(false);
          initializingRef.current = false;
        }
      }
    };

    // Safety timeout - ensure loading state resolves even if auth hangs
    timeoutId = setTimeout(() => {
      if (mountedRef.current && initializingRef.current) {
        console.warn("[useUserRole] Auth initialization timed out");
        setIsLoading(false);
        initializingRef.current = false;
      }
    }, 5000);

    // Proactive token refresh to prevent session expiry
    const checkAndRefreshToken = async () => {
      if (!mountedRef.current) return;
      
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const expiresAt = session.expires_at;
        if (expiresAt) {
          const expiryTime = expiresAt * 1000;
          const fiveMinutesFromNow = Date.now() + 5 * 60 * 1000;
          
          if (expiryTime < fiveMinutesFromNow) {
            await supabase.auth.refreshSession();
          }
        }
      } catch {
        // Silent fail - non-critical
      }
    };

    // Listener for ONGOING auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mountedRef.current) return;
        
        // Skip processing during initial load - initializeAuth handles it
        if (initializingRef.current && event !== "INITIAL_SESSION") return;

        const hasSession = updateAuthState(session);

        if (!hasSession) {
          setRole(null);
          return;
        }

        if (session?.user) {
          // Use setTimeout to avoid Supabase deadlock
          setTimeout(() => {
            if (mountedRef.current) {
              determineRole(session.user.id).then((userRole) => {
                if (mountedRef.current) {
                  setRole(userRole);
                }
              });
            }
          }, 0);
        }
      }
    );

    initializeAuth();

    // Set up proactive token refresh (every 2 minutes)
    refreshIntervalId = setInterval(checkAndRefreshToken, 120000);

    return () => {
      mountedRef.current = false;
      clearTimeout(timeoutId);
      clearInterval(refreshIntervalId);
      subscription.unsubscribe();
    };
  }, []);

  return { role, isLoading, isAuthenticated, userId, sessionExpiresAt };
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
        return { shouldBlock: true, redirectTo: currentPath.startsWith("/admin") ? "/admin/login" : "/login" };
      }
      return { shouldBlock: false, redirectTo: null };
    }

    // Authenticated - enforce portal boundaries
    if (role === "admin") {
      // Admins can ONLY access /admin routes (login is under /admin/login)
      if (!currentPath.startsWith("/admin")) {
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
