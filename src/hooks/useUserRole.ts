import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import type { Session } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";

/**
 * RehabLookup account roles after the consumer-account retirement.
 * Consumer/seeker profiles may remain in the database for historical records,
 * but they are no longer an active application role on rehablookup.com.
 */
export type UserRole = "admin" | "provider" | null;

interface UserRoleResult {
  role: UserRole;
  isLoading: boolean;
  isAuthenticated: boolean;
  userId: string | null;
  sessionExpiresAt: number | null;
}

const CACHE_KEYS = {
  role: "rl_cached_role",
  userId: "rl_cached_uid",
  isAuth: "rl_cached_auth",
  timestamp: "rl_cached_ts",
} as const;

const CACHE_TTL = 60_000;
const MEMORY_CACHE_TTL = 30_000;

function getSupabaseStorageKey() {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const projectRef = supabaseUrl?.split("//")[1]?.split(".")[0] || "mldbxpntzcjalgjmwnqa";
  return `sb-${projectRef}-auth-token`;
}

function getStoredSupabaseSession(): Session | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(getSupabaseStorageKey());
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    return (parsed?.currentSession || parsed) as Session | null;
  } catch {
    return null;
  }
}

function inferRoleFromStoredSession(session: Session | null): UserRole {
  const accountType = session?.user?.user_metadata?.account_type;
  if (accountType === "admin" || accountType === "provider") return accountType;
  return null;
}

function clearCachedAuthState() {
  if (typeof window === "undefined") return;
  try {
    Object.values(CACHE_KEYS).forEach((key) => localStorage.removeItem(key));
  } catch {
    // Cache is only a performance optimization.
  }
}

function cacheAuthState(role: UserRole, userId: string | null, isAuth: boolean) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CACHE_KEYS.role, role || "");
    localStorage.setItem(CACHE_KEYS.userId, userId || "");
    localStorage.setItem(CACHE_KEYS.isAuth, String(isAuth));
    localStorage.setItem(CACHE_KEYS.timestamp, String(Date.now()));
  } catch {
    // Cache is only a performance optimization.
  }
}

function getCachedAuthState(): { role: UserRole; userId: string | null; isAuth: boolean } | null {
  if (typeof window === "undefined") return null;
  try {
    const timestamp = Number(localStorage.getItem(CACHE_KEYS.timestamp) || 0);
    if (!timestamp || Date.now() - timestamp > CACHE_TTL) return null;

    const rawRole = localStorage.getItem(CACHE_KEYS.role);
    // A pre-cutover cached `seeker` role must never resurrect consumer account UI.
    if (rawRole && rawRole !== "admin" && rawRole !== "provider") {
      clearCachedAuthState();
      return null;
    }

    const role = (rawRole as UserRole) || null;
    const userId = localStorage.getItem(CACHE_KEYS.userId) || null;
    const isAuth = localStorage.getItem(CACHE_KEYS.isAuth) === "true";
    const storedSession = getStoredSupabaseSession();
    const storedUserId = storedSession?.user?.id ?? null;

    if (!role || !isAuth || !storedUserId || !userId || userId !== storedUserId) return null;
    return { role, userId, isAuth: true };
  } catch {
    return null;
  }
}

const PUBLIC_AUTH_ROUTES = [
  "/login",
  "/provider/forgot-password",
  "/provider/reset-password",
  "/provider/onboarding",
  "/admin/login",
];

const PROVIDER_ALLOWED_PUBLIC_ROUTES = [
  "/for-providers",
  "/provider-resources",
  "/provider-support",
  "/provider-faq",
  "/provider-guides",
  "/providers/resources",
  "/privacy-policy",
  "/terms-of-service",
];

export function useUserRole(): UserRoleResult {
  const storedSession = getStoredSupabaseSession();
  const cached = getCachedAuthState();
  const inferredRole = cached?.role ?? inferRoleFromStoredSession(storedSession);
  const inferredUserId = cached?.userId ?? (inferredRole ? storedSession?.user?.id ?? null : null);

  const [role, setRole] = useState<UserRole>(inferredRole);
  const [isLoading, setIsLoading] = useState(!cached && !inferredRole);
  const [isAuthenticated, setIsAuthenticated] = useState(Boolean(inferredRole && inferredUserId));
  const [userId, setUserId] = useState<string | null>(inferredUserId);
  const [sessionExpiresAt, setSessionExpiresAt] = useState<number | null>(
    inferredRole && storedSession?.expires_at ? storedSession.expires_at * 1000 : null,
  );

  const mountedRef = useRef(true);
  const roleCache = useRef<Map<string, { role: UserRole; timestamp: number }>>(new Map());

  useEffect(() => {
    mountedRef.current = true;

    const resetPublicAuth = () => {
      if (!mountedRef.current) return;
      setRole(null);
      setIsAuthenticated(false);
      setUserId(null);
      setSessionExpiresAt(null);
      clearCachedAuthState();
    };

    const determineRole = async (uid: string): Promise<UserRole> => {
      const cachedRole = roleCache.current.get(uid);
      if (cachedRole && Date.now() - cachedRole.timestamp < MEMORY_CACHE_TTL) {
        return cachedRole.role;
      }

      try {
        const [adminResult, providerResult] = await Promise.all([
          supabase.rpc("has_role", { _user_id: uid, _role: "admin" }),
          supabase.from("profiles").select("id").eq("user_id", uid).maybeSingle(),
        ]);

        const resolved: UserRole = adminResult.data === true
          ? "admin"
          : providerResult.data
            ? "provider"
            : null;

        roleCache.current.set(uid, { role: resolved, timestamp: Date.now() });
        return resolved;
      } catch (error) {
        console.error("[useUserRole] Error determining account role:", error);
        return null;
      }
    };

    const applySession = async (session: Session | null) => {
      if (!session?.user?.id) {
        resetPublicAuth();
        return;
      }

      const resolvedRole = await determineRole(session.user.id);
      if (!mountedRef.current) return;

      if (!resolvedRole) {
        // Historical seeker or otherwise non-provider/admin sessions are no
        // longer considered signed-in accounts on RehabLookup. We intentionally
        // leave the Supabase record untouched; the provider-only login signs
        // out such a session if it reaches the auth surface.
        resetPublicAuth();
        return;
      }

      setRole(resolvedRole);
      setIsAuthenticated(true);
      setUserId(session.user.id);
      setSessionExpiresAt(session.expires_at ? session.expires_at * 1000 : null);
      cacheAuthState(resolvedRole, session.user.id, true);
    };

    const initialize = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        await applySession(session);
      } catch (error) {
        console.error("[useUserRole] Error checking session:", error);
        resetPublicAuth();
      } finally {
        if (mountedRef.current) setIsLoading(false);
      }
    };

    void initialize();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setTimeout(() => {
        if (mountedRef.current) void applySession(session);
      }, 0);
    });

    const refreshIntervalId = setInterval(async () => {
      if (!mountedRef.current || !isAuthenticated) return;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.expires_at) return;
        if (session.expires_at * 1000 < Date.now() + 5 * 60 * 1000) {
          await supabase.auth.refreshSession();
        }
      } catch {
        // Non-critical; the normal auth listener will resolve eventual expiry.
      }
    }, 120_000);

    return () => {
      mountedRef.current = false;
      clearInterval(refreshIntervalId);
      subscription.unsubscribe();
    };
  }, [isAuthenticated]);

  return { role, isLoading, isAuthenticated, userId, sessionExpiresAt };
}

/** Enforce only the two surviving account portals: provider and admin. */
export function useRoleBasedRedirect() {
  const { role, isLoading, isAuthenticated } = useUserRole();
  const navigate = useNavigate();
  const location = useLocation();

  const checkAndRedirect = useCallback(() => {
    if (isLoading) return { shouldBlock: true, redirectTo: null };

    const currentPath = location.pathname;
    if (typeof window !== "undefined" && window.self !== window.top) {
      return { shouldBlock: false, redirectTo: null };
    }

    if (PUBLIC_AUTH_ROUTES.some((route) => currentPath.startsWith(route))) {
      return { shouldBlock: false, redirectTo: null };
    }

    if (!isAuthenticated) {
      if (currentPath.startsWith("/admin")) {
        return { shouldBlock: true, redirectTo: "/admin/login" };
      }
      if (currentPath.startsWith("/provider")) {
        return { shouldBlock: true, redirectTo: "/login" };
      }
      return { shouldBlock: false, redirectTo: null };
    }

    if (role === "admin" && currentPath.startsWith("/provider")) {
      return { shouldBlock: true, redirectTo: "/admin" };
    }

    if (role === "provider" && currentPath.startsWith("/admin")) {
      return { shouldBlock: true, redirectTo: "/provider/dashboard" };
    }

    return { shouldBlock: false, redirectTo: null };
  }, [role, isLoading, isAuthenticated, location.pathname]);

  useEffect(() => {
    const { redirectTo } = checkAndRedirect();
    if (redirectTo) navigate(redirectTo, { replace: true });
  }, [checkAndRedirect, navigate]);

  return { role, isLoading, isAuthenticated, checkAndRedirect };
}

export function getPortalHome(role: UserRole): string {
  if (role === "admin") return "/admin";
  if (role === "provider") return "/provider/dashboard";
  return "/";
}

export function isRouteAllowedForRole(pathname: string, role: UserRole): boolean {
  if (PUBLIC_AUTH_ROUTES.some((route) => pathname.startsWith(route))) return true;

  if (!role) {
    return !pathname.startsWith("/admin") && !pathname.startsWith("/provider");
  }

  if (role === "admin") {
    return pathname.startsWith("/admin") || !pathname.startsWith("/provider");
  }

  return pathname.startsWith("/provider") || PROVIDER_ALLOWED_PUBLIC_ROUTES.some((route) => pathname.startsWith(route));
}
