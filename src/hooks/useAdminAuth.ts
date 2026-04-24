import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { setSentryUser, clearSentryUser } from "@/lib/sentry";
import { toast } from "sonner";
import { logAdminAction, AdminAuditActions } from "@/hooks/useAdminAuditLog";

// LocalStorage cache keys for instant admin auth
const ADMIN_CACHE_KEYS = {
  isAdmin: "rl_admin_auth",
  isSuperAdmin: "rl_admin_super",
  role: "rl_admin_role",
  timestamp: "rl_admin_ts",
} as const;

const ADMIN_CACHE_TTL = 60000; // 1 minute

// Get cached admin state for instant render.
// M7: NEVER trust cached super-admin / role flags from localStorage for UI gating.
// A user could set `rl_admin_super = "true"` and briefly see Super-Admin menu items
// before the DB check runs (~1s). RLS still blocks all actions, but the menu
// structure leaks. We only return the boolean `isAdmin` for skeleton render and
// always force-refetch the role and super-admin flag from the DB.
function getCachedAdminState(): { isAdmin: boolean } | null {
  try {
    const ts = localStorage.getItem(ADMIN_CACHE_KEYS.timestamp);
    if (!ts || Date.now() - parseInt(ts, 10) > ADMIN_CACHE_TTL) return null;

    const isAdmin = localStorage.getItem(ADMIN_CACHE_KEYS.isAdmin) === "true";
    return isAdmin ? { isAdmin } : null;
  } catch {
    // Silent failure is acceptable here — first paint just falls back to skeleton.
    return null;
  }
}

function cacheAdminState(isAdmin: boolean, _isSuperAdmin: boolean, _role: AdminRoleType) {
  try {
    // Only persist the boolean isAdmin flag — used purely to skip the auth-wall flash.
    // Super-admin and role values are intentionally NOT cached (M7).
    localStorage.setItem(ADMIN_CACHE_KEYS.isAdmin, String(isAdmin));
    localStorage.setItem(ADMIN_CACHE_KEYS.timestamp, String(Date.now()));
    // Aggressively clear any legacy values written by earlier builds so an attacker
    // can't pre-seed them.
    localStorage.removeItem(ADMIN_CACHE_KEYS.isSuperAdmin);
    localStorage.removeItem(ADMIN_CACHE_KEYS.role);
  } catch {
    // First-paint cache is best-effort.
  }
}

function clearAdminCache() {
  try {
    Object.values(ADMIN_CACHE_KEYS).forEach(k => localStorage.removeItem(k));
  } catch {
    // localStorage may be unavailable in private mode — safe to ignore.
  }
}

// Map routes to permission keys
const routePermissionMap: Record<string, string> = {
  "/admin": "dashboard",
  "/admin/dashboard": "dashboard",
  "/admin/analytics": "analytics",
  "/admin/providers": "providers",
  "/admin/leads": "leads",
  "/admin/seekers": "seekers",
  "/admin/subscriptions": "subscriptions",
  "/admin/featured": "featured",
  "/admin/users": "users",
  "/admin/audit-log": "audit_log",
  "/admin/settings": "settings",
  "/admin/notifications": "notifications",
  "/admin/profile": "dashboard",
  "/admin/reviews": "reviews",
  "/admin/concierge": "placements",
  "/admin/support": "support",
  "/admin/placement-revenue": "placements",
  "/admin/credentials": "providers",
  "/admin/security-logs": "security_logs",
  "/admin/marketing": "leads",
  "/admin/blog": "providers",
  "/admin/international": "placements",
  "/admin/inbox": "placements",
  "/admin/escalations": "escalations",
  "/admin/back-office": "back_office",
  "/admin/provider-directory": "placements",
  "/admin/email-logs": "security_logs",
};

// Admin role type matching database enum
export type AdminRoleType = "super_admin" | "manager" | "customer_rep" | "advisor";

interface AdminProfile {
  force_password_change: boolean | null;
  status: string;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  avatar_url: string | null;
  mfa_enabled: boolean | null;
  mfa_skip: boolean | null;
  admin_role: AdminRoleType | null;
}

export function useAdminAuth() {
  // Initialize from cache for instant perceived loading
  const cached = getCachedAdminState();
  
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(cached?.isAdmin ?? null);
  // M7: super-admin must always come from the DB (never localStorage) to prevent menu-leak.
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const [adminProfile, setAdminProfile] = useState<AdminProfile | null>(null);
  const [forcePasswordChange, setForcePasswordChange] = useState(false);
  const [requireMfaSetup, setRequireMfaSetup] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  // If we have cache, start initialized for instant render
  const [isInitialized, setIsInitialized] = useState(!!cached);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const hasInitialized = useRef(false);
  // Optimistic flag: once password change is cleared locally, don't let re-fetch overwrite it
  // Also check sessionStorage so it survives the USER_UPDATED event race within the same session
  const passwordChangeCleared = useRef(
    sessionStorage.getItem('rl_pwd_change_cleared') === '1'
  );

  const checkAdminStatus = useCallback(async (userId: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.rpc("has_role", {
        _user_id: userId,
        _role: "admin",
      });
      if (error) return false;
      return data === true;
    } catch {
      return false;
    }
  }, []);

  const checkSuperAdminStatus = useCallback(async (userId: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.rpc("is_super_admin", {
        _user_id: userId,
      });
      if (error) return false;
      return data === true;
    } catch {
      return false;
    }
  }, []);

  const fetchPermissions = useCallback(async (userId: string): Promise<Record<string, boolean>> => {
    try {
      const { data, error } = await supabase
        .from("admin_user_permissions")
        .select("permission_key, granted")
        .eq("user_id", userId);

      if (error) return {};

      const perms: Record<string, boolean> = {};
      data?.forEach((p) => {
        perms[p.permission_key] = p.granted;
      });
      return perms;
    } catch {
      return {};
    }
  }, []);

  const fetchAdminProfile = useCallback(async (userId: string): Promise<AdminProfile | null> => {
    try {
      const { data, error } = await supabase
        .rpc("get_admin_profile", { p_user_id: userId })
        .maybeSingle();

      if (error || !data) return null;

      return {
        force_password_change: data.force_password_change,
        status: data.status,
        first_name: data.first_name,
        last_name: data.last_name,
        display_name: data.display_name,
        avatar_url: data.avatar_url,
        mfa_enabled: data.mfa_enabled,
        mfa_skip: data.mfa_skip,
        admin_role: data.admin_role,
      };
    } catch {
      return null;
    }
  }, []);

  const checkMfaStatus = useCallback(async (): Promise<boolean> => {
    try {
      const [factorsResult, aalResult] = await Promise.all([
        supabase.auth.mfa.listFactors(),
        supabase.auth.mfa.getAuthenticatorAssuranceLevel()
      ]);
      
      const hasVerifiedFactor = factorsResult.data?.totp?.some(f => f.status === 'verified') ?? false;
      const currentAAL = aalResult.data?.currentLevel;
      
      return hasVerifiedFactor || currentAAL === 'aal2';
    } catch {
      return false;
    }
  }, []);

  const completeMfaSetup = useCallback(async () => {
    if (!user) return;
    
    try {
      const { error } = await supabase.rpc("complete_admin_mfa_setup", {
        p_user_id: user.id,
      });

      if (!error) {
        setRequireMfaSetup(false);
        setAdminProfile((prev) => prev ? { ...prev, mfa_enabled: true } : null);
      }
      } catch (err) {
        console.error("[useAdminAuth] complete_admin_mfa_setup failed:", err);
      }
    }, [user]);

  const skipMfaSetup = useCallback(() => {
    setRequireMfaSetup(false);
    // Only skip for this session - will prompt again next login
    sessionStorage.setItem('mfa_setup_skipped', '1');
  }, []);

  const clearForcePasswordChange = useCallback(async () => {
    if (!user) return;
    
    // Set optimistic flag FIRST so any concurrent re-fetch won't overwrite
    passwordChangeCleared.current = true;
    // Persist in sessionStorage so it survives USER_UPDATED event race
    sessionStorage.setItem('rl_pwd_change_cleared', '1');
    setForcePasswordChange(false);
    setAdminProfile((prev) => prev ? { ...prev, force_password_change: false, status: 'active' } : null);
    
    try {
      // Use security-definer RPC to bypass RLS restrictions on security fields
      const { error } = await supabase.rpc("complete_admin_password_setup", {
        p_user_id: user.id,
      });
      if (error) {
        console.error("Failed to complete password setup:", error);
      }
    } catch (err) {
      console.error("Error completing password setup:", err);
    }
  }, [user]);

  const hasPermission = useCallback((permissionKey: string): boolean => {
    if (isSuperAdmin) return true;
    return permissions[permissionKey] === true;
  }, [isSuperAdmin, permissions]);

  const canAccessRoute = useCallback((pathname: string): boolean => {
    if (isSuperAdmin) return true;

    let permissionKey = routePermissionMap[pathname];
    
    if (!permissionKey) {
      // Match longest prefix first for sub-routes
      const sortedRoutes = Object.entries(routePermissionMap)
        .filter(([route]) => route !== "/admin")
        .sort((a, b) => b[0].length - a[0].length);
      
      for (const [route, perm] of sortedRoutes) {
        if (pathname.startsWith(route)) {
          permissionKey = perm;
          break;
        }
      }
    }

    // Dashboard, profile, and notifications are always accessible to any admin
    if (!permissionKey || permissionKey === "dashboard" || permissionKey === "notifications") return true;

    // Settings is only accessible if the role has settings permission
    return permissions[permissionKey] === true;
  }, [isSuperAdmin, permissions]);

  useEffect(() => {
    let mounted = true;
    
    const performAdminChecks = async (userId: string, userEmail?: string) => {
      try {
        // Run all checks in parallel for speed
        const [adminStatus, superAdminStatus, userPermissions, profile, hasMfa] = await Promise.all([
          checkAdminStatus(userId),
          checkSuperAdminStatus(userId),
          fetchPermissions(userId),
          fetchAdminProfile(userId),
          checkMfaStatus(),
        ]);
        
        if (!mounted) return;
        
        setIsAdmin(adminStatus);
        setIsSuperAdmin(superAdminStatus);
        setPermissions(userPermissions);
        setAdminProfile(profile);
        setForcePasswordChange(passwordChangeCleared.current ? false : profile?.force_password_change === true);
        const mfaSkippedThisSession = sessionStorage.getItem('mfa_setup_skipped') === '1';
        setRequireMfaSetup(adminStatus && !superAdminStatus && !hasMfa && profile?.mfa_skip !== true && !mfaSkippedThisSession);
        
        // Cache for instant next load
        const role: AdminRoleType = superAdminStatus ? "super_admin" : (profile?.admin_role || "customer_rep");
        cacheAdminState(adminStatus, superAdminStatus, role);
        
        if (adminStatus) {
          setSentryUser({ id: userId, email: userEmail, role: "admin" });
        }
        
        if (!adminStatus) {
          clearAdminCache();
          navigate("/", { replace: true });
        }
      } catch (err) {
        console.error("Error in admin check:", err);
        if (mounted) {
          setIsAdmin(false);
          setIsSuperAdmin(false);
          clearAdminCache();
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
          setIsInitialized(true);
        }
      }
    };

    // Check session immediately
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      
      if (!session?.user) {
        setIsInitialized(true);
        clearAdminCache();
        navigate("/admin/login", { replace: true });
        return;
      }

      setUser(session.user);
      // Perform admin checks without blocking
      performAdminChecks(session.user.id, session.user.email);
    }).catch((error) => {
      console.error("Error getting auth session:", error);
      if (mounted) {
        setIsInitialized(true);
        clearAdminCache();
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!mounted) return;
        
        setUser(session?.user ?? null);

        if (!session?.user) {
          setIsAdmin(false);
          setIsSuperAdmin(false);
          setPermissions({});
          setAdminProfile(null);
          setForcePasswordChange(false);
          setRequireMfaSetup(false);
          setIsInitialized(true);
          clearSentryUser();
          clearAdminCache();
          // Clear password-change session flag on logout
          sessionStorage.removeItem('rl_pwd_change_cleared');
          passwordChangeCleared.current = false;
          navigate("/admin/login", { replace: true });
          return;
        }

        performAdminChecks(session.user.id, session.user.email);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [navigate, checkAdminStatus, checkSuperAdminStatus, fetchPermissions, fetchAdminProfile, checkMfaStatus]);

  const logout = useCallback(async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);

    try {
      if (user) {
        await logAdminAction({
          actionType: AdminAuditActions.LOGOUT,
          targetType: "admin_session",
          targetId: user.id,
          details: { email: user.email },
        });
      }

      clearSentryUser();
      clearAdminCache();
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        toast.error("Logout failed", {
          description: "Please try again or refresh the page.",
        });
        setIsLoggingOut(false);
        return;
      }

      queryClient.clear();
      toast.success("Signed out", {
        description: "You've been successfully logged out.",
      });
      navigate("/admin/login", { replace: true });
    } catch (err) {
      console.error("Logout exception:", err);
      toast.error("Logout failed", {
        description: "An unexpected error occurred.",
      });
      setIsLoggingOut(false);
    }
  }, [user, isLoggingOut, queryClient, navigate]);

  // Derive admin role — M7: never read role from localStorage, always wait for DB profile.
  const adminRole: AdminRoleType = isSuperAdmin
    ? "super_admin"
    : (adminProfile?.admin_role || "customer_rep");

  // Compute full name
  const adminFullName = adminProfile?.first_name && adminProfile?.last_name
    ? `${adminProfile.first_name} ${adminProfile.last_name}`
    : adminProfile?.first_name || adminProfile?.display_name || null;

  return { 
    user, 
    isAdmin: isAdmin === true,
    isSuperAdmin, 
    adminRole,
    adminFullName,
    permissions, 
    adminProfile,
    forcePasswordChange,
    clearForcePasswordChange,
    requireMfaSetup,
    completeMfaSetup,
    skipMfaSetup,
    hasPermission, 
    canAccessRoute, 
    isLoading,
    isInitialized,
    isLoggingOut,
    logout 
  };
}
