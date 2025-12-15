import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";

// Map routes to permission keys
const routePermissionMap: Record<string, string> = {
  "/admin": "dashboard",
  "/admin/providers": "providers",
  "/admin/leads": "leads",
  "/admin/subscriptions": "subscriptions",
  "/admin/featured": "featured",
  "/admin/users": "users",
  "/admin/audit-log": "audit_log",
  "/admin/settings": "settings",
  "/admin/notifications": "notifications",
  "/admin/flagged-images": "providers", // Flagged images falls under providers
};

export function useAdminAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
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

  const hasPermission = useCallback((permissionKey: string): boolean => {
    // Super admins have all permissions
    if (isSuperAdmin) return true;
    return permissions[permissionKey] === true;
  }, [isSuperAdmin, permissions]);

  const canAccessRoute = useCallback((pathname: string): boolean => {
    // Super admins have all permissions
    if (isSuperAdmin) return true;

    // Find the matching permission for this route
    // Check exact match first, then prefix matches
    let permissionKey = routePermissionMap[pathname];
    
    if (!permissionKey) {
      // Check for prefix matches (e.g., /admin/providers/123)
      for (const [route, perm] of Object.entries(routePermissionMap)) {
        if (pathname.startsWith(route) && route !== "/admin") {
          permissionKey = perm;
          break;
        }
      }
    }

    // Dashboard is always accessible if you're an admin
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
          setIsLoading(false);
          navigate("/admin-login", { replace: true });
          return;
        }

        setTimeout(async () => {
          try {
            const [adminStatus, superAdminStatus, userPermissions] = await Promise.all([
              checkAdminStatus(session.user.id),
              checkSuperAdminStatus(session.user.id),
              fetchPermissions(session.user.id),
            ]);
            
            setIsAdmin(adminStatus);
            setIsSuperAdmin(superAdminStatus);
            setPermissions(userPermissions);
            
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
          const [adminStatus, superAdminStatus, userPermissions] = await Promise.all([
            checkAdminStatus(session.user.id),
            checkSuperAdminStatus(session.user.id),
            fetchPermissions(session.user.id),
          ]);
          
          setIsAdmin(adminStatus);
          setIsSuperAdmin(superAdminStatus);
          setPermissions(userPermissions);
          
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
  }, [navigate, checkAdminStatus, checkSuperAdminStatus, fetchPermissions]);

  const logout = async () => {
    await supabase.auth.signOut();
    navigate("/admin-login", { replace: true });
  };

  return { 
    user, 
    isAdmin, 
    isSuperAdmin, 
    permissions, 
    hasPermission, 
    canAccessRoute, 
    isLoading, 
    logout 
  };
}
