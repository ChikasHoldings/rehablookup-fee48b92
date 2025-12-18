import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { setSentryUser, clearSentryUser } from "@/lib/sentry";
import { toast } from "sonner";
import { logAdminAction, AdminAuditActions } from "@/hooks/useAdminAuditLog";
// Map routes to permission keys
const routePermissionMap: Record<string, string> = {
  "/admin": "dashboard",
  "/admin/dashboard": "dashboard",
  "/admin/analytics": "analytics",
  "/admin/providers": "providers",
  "/admin/leads": "leads",
  "/admin/lead-routing": "leads",
  "/admin/subscriptions": "subscriptions",
  "/admin/featured": "featured",
  "/admin/users": "users",
  "/admin/audit-log": "audit_log",
  "/admin/settings": "settings",
  "/admin/notifications": "notifications",
  "/admin/flagged-images": "providers",
  "/admin/profile": "dashboard",
};

interface AdminProfile {
  force_password_change: boolean | null;
  status: string;
  display_name: string | null;
  avatar_url: string | null;
  mfa_enabled: boolean | null;
  mfa_skip: boolean | null;
}

export function useAdminAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const [adminProfile, setAdminProfile] = useState<AdminProfile | null>(null);
  const [forcePasswordChange, setForcePasswordChange] = useState(false);
  const [requireMfaSetup, setRequireMfaSetup] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const checkAdminStatus = useCallback(async (userId: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.rpc("has_role", {
        _user_id: userId,
        _role: "admin",
      });

      if (error) {
        console.error("Error checking admin status:", error);
        return false;
      }

      return data === true;
    } catch (err) {
      console.error("Exception checking admin status:", err);
      return false;
    }
  }, []);

  const checkSuperAdminStatus = useCallback(async (userId: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.rpc("is_super_admin", {
        _user_id: userId,
      });

      if (error) {
        console.error("Error checking super admin status:", error);
        return false;
      }

      return data === true;
    } catch (err) {
      console.error("Exception checking super admin status:", err);
      return false;
    }
  }, []);

  const fetchPermissions = useCallback(async (userId: string): Promise<Record<string, boolean>> => {
    try {
      const { data, error } = await supabase
        .from("admin_user_permissions")
        .select("permission_key, granted")
        .eq("user_id", userId);

      if (error) {
        console.error("Error fetching permissions:", error);
        return {};
      }

      const perms: Record<string, boolean> = {};
      data?.forEach((p) => {
        perms[p.permission_key] = p.granted;
      });
      return perms;
    } catch (err) {
      console.error("Exception fetching permissions:", err);
      return {};
    }
  }, []);

  const fetchAdminProfile = useCallback(async (userId: string): Promise<AdminProfile | null> => {
    try {
      const { data, error } = await supabase
        .from("admin_user_profiles")
        .select("force_password_change, status, display_name, avatar_url, mfa_enabled, mfa_skip")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) {
        console.error("Error fetching admin profile:", error);
        return null;
      }

      return data;
    } catch (err) {
      console.error("Exception fetching admin profile:", err);
      return null;
    }
  }, []);

  const checkMfaStatus = useCallback(async (): Promise<boolean> => {
    try {
      const { data: factorsData } = await supabase.auth.mfa.listFactors();
      return factorsData?.totp?.some(f => f.status === 'verified') ?? false;
    } catch (err) {
      console.error("Error checking MFA status:", err);
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

      if (error) {
        console.error("Error updating MFA status:", error);
        return;
      }

      setRequireMfaSetup(false);
      setAdminProfile((prev) => prev ? { ...prev, mfa_enabled: true } : null);
    } catch (err) {
      console.error("Exception updating MFA status:", err);
    }
  }, [user]);

  const clearForcePasswordChange = useCallback(async () => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from("admin_user_profiles")
        .update({ force_password_change: false, temp_password_hash: null, temp_password_expires_at: null })
        .eq("user_id", user.id);

      if (error) {
        console.error("Error clearing force password change:", error);
        return;
      }

      setForcePasswordChange(false);
      setAdminProfile((prev) => prev ? { ...prev, force_password_change: false } : null);
    } catch (err) {
      console.error("Exception clearing force password change:", err);
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
      for (const [route, perm] of Object.entries(routePermissionMap)) {
        if (pathname.startsWith(route) && route !== "/admin") {
          permissionKey = perm;
          break;
        }
      }
    }

    if (!permissionKey || permissionKey === "dashboard") return true;

    return permissions[permissionKey] === true;
  }, [isSuperAdmin, permissions]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);

        if (!session?.user) {
          setIsAdmin(false);
          setIsSuperAdmin(false);
          setPermissions({});
          setAdminProfile(null);
          setForcePasswordChange(false);
          setRequireMfaSetup(false);
          setIsLoading(false);
          clearSentryUser();
          navigate("/admin-login", { replace: true });
          return;
        }

        setTimeout(async () => {
          try {
            const [adminStatus, superAdminStatus, userPermissions, profile, hasMfa] = await Promise.all([
              checkAdminStatus(session.user.id),
              checkSuperAdminStatus(session.user.id),
              fetchPermissions(session.user.id),
              fetchAdminProfile(session.user.id),
              checkMfaStatus(),
            ]);
            
            setIsAdmin(adminStatus);
            setIsSuperAdmin(superAdminStatus);
            setPermissions(userPermissions);
            setAdminProfile(profile);
            setForcePasswordChange(profile?.force_password_change === true);
            // Require MFA setup if admin but no verified TOTP factor and not skipped (super admins are exempt)
            setRequireMfaSetup(adminStatus && !superAdminStatus && !hasMfa && profile?.mfa_skip !== true);
            
            // Set Sentry user context for error tracking
            if (adminStatus) {
              setSentryUser({
                id: session.user.id,
                email: session.user.email,
                role: "admin",
              });
            }
            
            if (!adminStatus) {
              navigate("/", { replace: true });
            }
          } catch (err) {
            console.error("Error in deferred admin check:", err);
            setIsAdmin(false);
            setIsSuperAdmin(false);
          } finally {
            setIsLoading(false);
          }
        }, 0);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);

      if (!session?.user) {
        setIsLoading(false);
        navigate("/admin-login", { replace: true });
        return;
      }

      setTimeout(async () => {
        try {
          const [adminStatus, superAdminStatus, userPermissions, profile, hasMfa] = await Promise.all([
            checkAdminStatus(session.user.id),
            checkSuperAdminStatus(session.user.id),
            fetchPermissions(session.user.id),
            fetchAdminProfile(session.user.id),
            checkMfaStatus(),
          ]);
          
          setIsAdmin(adminStatus);
          setIsSuperAdmin(superAdminStatus);
          setPermissions(userPermissions);
          setAdminProfile(profile);
          setForcePasswordChange(profile?.force_password_change === true);
          // Require MFA setup if admin but no verified TOTP factor and not skipped (super admins are exempt)
          setRequireMfaSetup(adminStatus && !superAdminStatus && !hasMfa && profile?.mfa_skip !== true);
          
          // Set Sentry user context for error tracking
          if (adminStatus) {
            setSentryUser({
              id: session.user.id,
              email: session.user.email,
              role: "admin",
            });
          }
          
          if (!adminStatus) {
            navigate("/", { replace: true });
          }
        } catch (err) {
          console.error("Error in initial admin check:", err);
          setIsAdmin(false);
          setIsSuperAdmin(false);
        } finally {
          setIsLoading(false);
        }
      }, 0);
    }).catch((error) => {
      console.error("Error getting auth session:", error);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [navigate, checkAdminStatus, checkSuperAdminStatus, fetchPermissions, fetchAdminProfile, checkMfaStatus]);

  const logout = useCallback(async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);

    try {
      // Log logout activity before signing out
      if (user) {
        await logAdminAction({
          actionType: AdminAuditActions.LOGOUT,
          targetType: "admin_session",
          targetId: user.id,
          details: { email: user.email },
        });
      }

      // Clear Sentry user context
      clearSentryUser();

      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error("Logout error:", error);
        toast.error("Logout failed", {
          description: "Please try again or refresh the page.",
        });
        setIsLoggingOut(false);
        return;
      }

      // Clear all cached data
      queryClient.clear();

      // Show success toast
      toast.success("Signed out", {
        description: "You've been successfully logged out.",
      });

      // Navigate to login
      navigate("/admin-login", { replace: true });
    } catch (err) {
      console.error("Logout exception:", err);
      toast.error("Logout failed", {
        description: "An unexpected error occurred.",
      });
      setIsLoggingOut(false);
    }
  }, [user, isLoggingOut, queryClient, navigate]);

  return { 
    user, 
    isAdmin, 
    isSuperAdmin, 
    permissions, 
    adminProfile,
    forcePasswordChange,
    clearForcePasswordChange,
    requireMfaSetup,
    completeMfaSetup,
    hasPermission, 
    canAccessRoute, 
    isLoading,
    isLoggingOut,
    logout 
  };
}
