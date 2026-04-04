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

// Get cached admin state for instant render
function getCachedAdminState(): { isAdmin: boolean; isSuperAdmin: boolean; role: AdminRoleType } | null {
  try {
    const ts = localStorage.getItem(ADMIN_CACHE_KEYS.timestamp);
    if (!ts || Date.now() - parseInt(ts, 10) > ADMIN_CACHE_TTL) return null;
    
    const isAdmin = localStorage.getItem(ADMIN_CACHE_KEYS.isAdmin) === "true";
    const isSuperAdmin = localStorage.getItem(ADMIN_CACHE_KEYS.isSuperAdmin) === "true";
    const role = (localStorage.getItem(ADMIN_CACHE_KEYS.role) || "customer_rep") as AdminRoleType;
    
    return isAdmin ? { isAdmin, isSuperAdmin, role } : null;
  } catch {
    return null;
  }
}

function cacheAdminState(isAdmin: boolean, isSuperAdmin: boolean, role: AdminRoleType) {
  try {
    localStorage.setItem(ADMIN_CACHE_KEYS.isAdmin, String(isAdmin));
    localStorage.setItem(ADMIN_CACHE_KEYS.isSuperAdmin, String(isSuperAdmin));
    localStorage.setItem(ADMIN_CACHE_KEYS.role, role);
    localStorage.setItem(ADMIN_CACHE_KEYS.timestamp, String(Date.now()));
  } catch {}
}

function clearAdminCache() {
  try {
    Object.values(ADMIN_CACHE_KEYS).forEach(k => localStorage.removeItem(k));
  } catch {}
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
  const [isSuperAdmin, setIsSuperAdmin] = useState(cached?.isSuperAdmin ?? false);
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
      const { error } = await supabase
        .from("admin_user_profiles")
        .update({ mfa_enabled: true })
        .eq("user_id", user.id);

      if (!error) {
        setRequireMfaSetup(false);
        setAdminProfile((prev) => prev ? { ...prev, mfa_enabled: true } : null);
      }
    } catch {}
  }, [user]);

  const clearForcePasswordChange = useCallback(async () => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from("admin_user_profiles")
        .update({ force_password_change: false, temp_password_hash: null, temp_password_expires_at: null })
        .eq("user_id", user.id);

      if (!error) {
        setForcePasswordChange(false);
        setAdminProfile((prev) => prev ? { ...prev, force_password_change: false } : null);
      }
    } catch {}
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
        setForcePasswordChange(profile?.force_password_change === true);
        setRequireMfaSetup(adminStatus && !superAdminStatus && !hasMfa && profile?.mfa_skip !== true);
        
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

  // Derive admin role
  const adminRole: AdminRoleType = isSuperAdmin 
    ? "super_admin" 
    : (adminProfile?.admin_role || cached?.role || "customer_rep");

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
    hasPermission, 
    canAccessRoute, 
    isLoading,
    isInitialized,
    isLoggingOut,
    logout 
  };
}
