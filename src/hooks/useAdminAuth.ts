import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";

// Map routes to permission keys
const routePermissionMap: Record<string, string> = {
  "/admin": "dashboard",
  "/admin/dashboard": "dashboard",
  "/admin/analytics": "analytics",
  "/admin/providers": "providers",
  "/admin/leads": "leads",
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
}

export function useAdminAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const [adminProfile, setAdminProfile] = useState<AdminProfile | null>(null);
  const [forcePasswordChange, setForcePasswordChange] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

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
        .select("force_password_change, status, display_name, avatar_url")
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
          setIsLoading(false);
          navigate("/admin-login", { replace: true });
          return;
        }

        setTimeout(async () => {
          try {
            const [adminStatus, superAdminStatus, userPermissions, profile] = await Promise.all([
              checkAdminStatus(session.user.id),
              checkSuperAdminStatus(session.user.id),
              fetchPermissions(session.user.id),
              fetchAdminProfile(session.user.id),
            ]);
            
            setIsAdmin(adminStatus);
            setIsSuperAdmin(superAdminStatus);
            setPermissions(userPermissions);
            setAdminProfile(profile);
            setForcePasswordChange(profile?.force_password_change === true);
            
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
          const [adminStatus, superAdminStatus, userPermissions, profile] = await Promise.all([
            checkAdminStatus(session.user.id),
            checkSuperAdminStatus(session.user.id),
            fetchPermissions(session.user.id),
            fetchAdminProfile(session.user.id),
          ]);
          
          setIsAdmin(adminStatus);
          setIsSuperAdmin(superAdminStatus);
          setPermissions(userPermissions);
          setAdminProfile(profile);
          setForcePasswordChange(profile?.force_password_change === true);
          
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
  }, [navigate, checkAdminStatus, checkSuperAdminStatus, fetchPermissions, fetchAdminProfile]);

  const logout = async () => {
    await supabase.auth.signOut();
    navigate("/admin-login", { replace: true });
  };

  return { 
    user, 
    isAdmin, 
    isSuperAdmin, 
    permissions, 
    adminProfile,
    forcePasswordChange,
    clearForcePasswordChange,
    hasPermission, 
    canAccessRoute, 
    isLoading, 
    logout 
  };
}
