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

// LocalStorage keys for instant perceived loading
const CACHE_KEYS = {
  role: "rl_cached_role",
  userId: "rl_cached_uid",
  isAuth: "rl_cached_auth",
  timestamp: "rl_cached_ts",
} as const;

const CACHE_TTL = 60000; // 1 minute - short enough to be safe, long enough to feel instant

function getSupabaseStorageKey() {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const projectRef = supabaseUrl?.split("//")[1]?.split(".")[0] || "plckxokpyiubuekvodtc";
  return `sb-${projectRef}-auth-token`;
}

function getStoredSupabaseSession() {
  try {
    const stored = localStorage.getItem(getSupabaseStorageKey());
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    return parsed?.currentSession || parsed;
  } catch {
    return null;
  }
}

function inferRoleFromStoredSession(session: any, routeHint: UserRole = null): UserRole {
  const accountType = session?.user?.user_metadata?.account_type;

  if (accountType === "admin" || accountType === "provider" || accountType === "seeker") {
    return accountType;
  }

  if (session?.user && routeHint === "seeker") {
    return "seeker";
  }

  return null;
}

// Get cached auth state for instant initial render
function getCachedAuthState(routeHint: UserRole = null): { role: UserRole; userId: string | null; isAuth: boolean } | null {
  try {
    const timestamp = localStorage.getItem(CACHE_KEYS.timestamp);
    if (!timestamp || Date.now() - parseInt(timestamp, 10) > CACHE_TTL) {
      return null;
    }

    const cachedRole = (localStorage.getItem(CACHE_KEYS.role) as UserRole) || null;
    const cachedUserId = localStorage.getItem(CACHE_KEYS.userId) || null;
    const cachedIsAuth = localStorage.getItem(CACHE_KEYS.isAuth) === "true";

    const storedSession = getStoredSupabaseSession();
    const storedUserId = storedSession?.user?.id ?? null;

    // Never trust cached auth/role for a different or missing active session.
    if (cachedIsAuth && !storedUserId) {
      return null;
    }

    if (!cachedIsAuth && storedUserId) {
      return null;
    }

    if (cachedUserId && storedUserId && cachedUserId !== storedUserId) {
      return null;
    }

    return {
      role: cachedRole ?? inferRoleFromStoredSession(storedSession, routeHint),
      userId: cachedUserId ?? storedUserId,
      isAuth: cachedIsAuth && !!storedUserId,
    };
  } catch {
    return null;
  }
}

// Cache auth state for instant subsequent loads
function cacheAuthState(role: UserRole, userId: string | null, isAuth: boolean) {
  try {
    localStorage.setItem(CACHE_KEYS.role, role || "");
    localStorage.setItem(CACHE_KEYS.userId, userId || "");
    localStorage.setItem(CACHE_KEYS.isAuth, String(isAuth));
    localStorage.setItem(CACHE_KEYS.timestamp, String(Date.now()));
  } catch {
    // Silent fail - caching is optional optimization
  }
}

// Clear cached auth state on logout
function clearCachedAuthState() {
  try {
    Object.values(CACHE_KEYS).forEach(key => localStorage.removeItem(key));
  } catch {
    // Silent fail
  }
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
 * PERFORMANCE: Uses localStorage caching for instant initial render.
 * Shows cached state immediately, then refreshes in background.
 */
export function useUserRole(): UserRoleResult {
  // Route-based role hint for instant perceived loading on first visit
  const routeHint = typeof window !== "undefined"
    ? window.location.pathname.startsWith("/provider") ? "provider" as UserRole
    : window.location.pathname.startsWith("/admin") ? "admin" as UserRole
    : window.location.pathname.startsWith("/account") ? "seeker" as UserRole
    : null
    : null;

  const storedSession = typeof window !== "undefined" ? getStoredSupabaseSession() : null;
  const storedUserId = storedSession?.user?.id ?? null;
  const cached = getCachedAuthState(routeHint);

  const initialRole = cached?.role ?? inferRoleFromStoredSession(storedSession, storedUserId ? routeHint : null);
  const initialAuth = cached?.isAuth ?? !!storedUserId;
  
  // Only show loading if we have NO cached/stored state to display
  const hasImmediateState = initialAuth || !!cached;

  const [role, setRole] = useState<UserRole>(initialRole);
  const [isLoading, setIsLoading] = useState(!hasImmediateState);
  const [isAuthenticated, setIsAuthenticated] = useState(initialAuth);
  const [userId, setUserId] = useState<string | null>(cached?.userId ?? storedUserId);
  const [sessionExpiresAt, setSessionExpiresAt] = useState<number | null>(null);

  const mountedRef = useRef(true);
  const initializingRef = useRef(true);
  const roleCache = useRef<Map<string, { role: UserRole; timestamp: number }>>(new Map());
  const MEMORY_CACHE_TTL = 30000; // 30 seconds memory cache

  useEffect(() => {
    mountedRef.current = true;
    initializingRef.current = true;
    let timeoutId: ReturnType<typeof setTimeout>;
    let refreshIntervalId: ReturnType<typeof setInterval>;

    const determineRole = async (uid: string): Promise<UserRole> => {
      // Check memory cache first
      const memCached = roleCache.current.get(uid);
      if (memCached && Date.now() - memCached.timestamp < MEMORY_CACHE_TTL) {
        return memCached.role;
      }

      try {
        // Run all checks in parallel for speed
        const [adminResult, providerResult, seekerResult] = await Promise.all([
          supabase.rpc("has_role", { _user_id: uid, _role: "admin" }),
          supabase.from("profiles").select("id").eq("user_id", uid).maybeSingle(),
          supabase.from("seeker_profiles").select("id").eq("user_id", uid).maybeSingle(),
        ]);
        
        // Check admin role first (highest priority)
        if (adminResult.data === true) {
          roleCache.current.set(uid, { role: "admin", timestamp: Date.now() });
          return "admin";
        }

        // Check provider profile
        if (providerResult.data) {
          roleCache.current.set(uid, { role: "provider", timestamp: Date.now() });
          return "provider";
        }

        // Check seeker profile
        if (seekerResult.data) {
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

    const updateAuthState = (session: any) => {
      if (!mountedRef.current) return false;
      
      if (!session?.user) {
        setIsAuthenticated(false);
        setUserId(null);
        setRole(null);
        setSessionExpiresAt(null);
        clearCachedAuthState();
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
            // Cache for next load
            cacheAuthState(userRole, session.user.id, true);
          }
        } else {
          // No session - clear cache
          clearCachedAuthState();
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
          clearCachedAuthState();
        }
      }
    };

    // Safety timeout - ensure loading state resolves even if auth hangs
    // Reduced from 5s to 3s for faster recovery
    timeoutId = setTimeout(() => {
      if (mountedRef.current && initializingRef.current) {
        console.warn("[useUserRole] Auth initialization timed out - recovering from localStorage");
        // Recover auth state from stored Supabase session instead of giving up
        const storedSession = getStoredSupabaseSession();
        if (storedSession?.user) {
          setIsAuthenticated(true);
          setUserId(storedSession.user.id);
          // Keep cached role if available, don't clear it
          const cachedState = getCachedAuthState();
          if (cachedState?.role) {
            setRole(cachedState.role);
          }
        }
        setIsLoading(false);
        initializingRef.current = false;
      }
    }, 3000);

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
          clearCachedAuthState();
          return;
        }

        if (session?.user) {
          // Use setTimeout to avoid Supabase deadlock
          setTimeout(() => {
            if (mountedRef.current) {
              determineRole(session.user.id).then((userRole) => {
                if (mountedRef.current) {
                  setRole(userRole);
                  cacheAuthState(userRole, session.user.id, true);
                }
              });
            }
          }, 0);
        }
      }
    );

    const storedSession = getStoredSupabaseSession();
    if (storedSession?.user?.id) {
      const hasStoredSession = updateAuthState(storedSession);
      if (hasStoredSession) {
        setTimeout(() => {
          if (mountedRef.current) {
            determineRole(storedSession.user.id).then((userRole) => {
              if (mountedRef.current) {
                setRole(userRole);
                cacheAuthState(userRole, storedSession.user.id, true);
              }
            });
          }
        }, 0);
      }
    }

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
