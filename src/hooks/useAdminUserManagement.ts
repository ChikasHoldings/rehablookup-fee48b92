import { useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type AdminRole = "admin" | "moderator";

export type AdminUserStatus = "active" | "suspended" | "pending_password_reset";

export const ADMIN_PERMISSIONS = {
  dashboard: { label: "Dashboard", description: "View dashboard metrics and overview" },
  analytics: { label: "Analytics", description: "View detailed analytics and reports" },
  providers: { label: "Providers", description: "Manage providers and facilities" },
  leads: { label: "Leads", description: "View and assign leads" },
  subscriptions: { label: "Subscriptions", description: "Manage subscriptions and billing" },
  featured: { label: "Featured Placement", description: "Manage featured listings" },
  users: { label: "User Management", description: "Create and manage admin users (Super Admin only)" },
  audit_log: { label: "Audit Log", description: "View system audit logs" },
  settings: { label: "Settings", description: "Access system settings" },
  notifications: { label: "Notifications", description: "View and manage notifications" },
} as const;

export const ROLE_DEFAULTS: Record<AdminRole, Record<string, boolean>> = {
  admin: {
    dashboard: true,
    analytics: true,
    providers: true,
    leads: true,
    subscriptions: true,
    featured: true,
    users: true,
    audit_log: true,
    settings: true,
    notifications: true,
  },
  moderator: {
    dashboard: true,
    analytics: true,
    providers: true,
    leads: true,
    subscriptions: false,
    featured: false,
    users: false,
    audit_log: false,
    settings: false,
    notifications: true,
  },
};

export type AdminUser = {
  user_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  created_at: string;
  roles: AdminRole[];
  status: AdminUserStatus;
  display_name: string | null;
  avatar_url: string | null;
  last_login_at: string | null;
  permissions: Record<string, boolean>;
};

export function useAdminUserManagement() {
  const queryClient = useQueryClient();

  // Invalidate admin users query helper
  const invalidateAdminUsers = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["admin-users-full"] });
  }, [queryClient]);

  // Real-time subscriptions - always active
  useEffect(() => {
    const rolesChannel = supabase
      .channel("admin-users-roles")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_roles" },
        (payload) => {
          console.log("User roles update:", payload.eventType);
          invalidateAdminUsers();
          if (payload.eventType === "INSERT") {
            toast.info("New admin user added", { description: "User list updated" });
          } else if (payload.eventType === "DELETE") {
            toast.info("Admin user removed", { description: "User list updated" });
          }
        }
      )
      .subscribe();

    const profilesChannel = supabase
      .channel("admin-users-profiles")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "admin_user_profiles" },
        (payload) => {
          console.log("Admin profiles update:", payload.eventType);
          invalidateAdminUsers();
          if (payload.eventType === "UPDATE") {
            toast.info("Admin user updated", { description: "Data refreshed" });
          }
        }
      )
      .subscribe();

    const permissionsChannel = supabase
      .channel("admin-users-permissions")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "admin_user_permissions" },
        (payload) => {
          console.log("Admin permissions update:", payload.eventType);
          invalidateAdminUsers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(rolesChannel);
      supabase.removeChannel(profilesChannel);
      supabase.removeChannel(permissionsChannel);
    };
  }, [invalidateAdminUsers]);

  // Fetch all admin users with their roles and permissions
  const { data: adminUsers, isLoading, refetch } = useQuery({
    queryKey: ["admin-users-full"],
    queryFn: async () => {
      // Get all users with admin/moderator roles
      const { data: allRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role");

      if (rolesError) throw rolesError;

      // Get unique user IDs with admin roles
      const adminUserIds = [...new Set((allRoles || []).map(r => r.user_id))];
      
      if (adminUserIds.length === 0) {
        return [];
      }

      // Get profiles for these users
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, email, first_name, last_name, created_at")
        .in("user_id", adminUserIds);

      if (profilesError) throw profilesError;

      // Get admin profiles
      const { data: adminProfiles, error: adminProfilesError } = await supabase
        .from("admin_user_profiles")
        .select("*")
        .in("user_id", adminUserIds);

      if (adminProfilesError) console.error("Admin profiles error:", adminProfilesError);

      // Get permissions
      const { data: permissions, error: permissionsError } = await supabase
        .from("admin_user_permissions")
        .select("*")
        .in("user_id", adminUserIds);

      if (permissionsError) console.error("Permissions error:", permissionsError);

      // Group roles by user
      const rolesByUser: Record<string, AdminRole[]> = {};
      (allRoles || []).forEach((r) => {
        if (!rolesByUser[r.user_id]) {
          rolesByUser[r.user_id] = [];
        }
        rolesByUser[r.user_id].push(r.role as AdminRole);
      });

      // Group admin profiles by user
      const adminProfilesByUser: Record<string, any> = {};
      (adminProfiles || []).forEach((p) => {
        adminProfilesByUser[p.user_id] = p;
      });

      // Group permissions by user
      const permissionsByUser: Record<string, Record<string, boolean>> = {};
      (permissions || []).forEach((p) => {
        if (!permissionsByUser[p.user_id]) {
          permissionsByUser[p.user_id] = {};
        }
        permissionsByUser[p.user_id][p.permission_key] = p.granted;
      });

      return (profiles || []).map((profile) => {
        const adminProfile = adminProfilesByUser[profile.user_id];
        const userRoles = rolesByUser[profile.user_id] || [];
        const userPermissions = permissionsByUser[profile.user_id] || {};

        return {
          user_id: profile.user_id,
          email: profile.email,
          first_name: profile.first_name,
          last_name: profile.last_name,
          created_at: profile.created_at,
          roles: userRoles,
          status: (adminProfile?.status || "active") as AdminUserStatus,
          display_name: adminProfile?.display_name || null,
          avatar_url: adminProfile?.avatar_url || null,
          last_login_at: adminProfile?.last_login_at || null,
          permissions: userPermissions,
        };
      }) as AdminUser[];
    },
  });

  // Create admin user mutation
  const createAdminUserMutation = useMutation({
    mutationFn: async (data: {
      email: string;
      displayName: string;
      role: AdminRole;
      permissions: Record<string, boolean>;
    }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await supabase.functions.invoke("create-admin-user", {
        body: data,
      });

      if (response.error) throw new Error(response.error.message);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin-users-full"] });
      toast.success("Admin user created successfully", {
        description: "Invitation email has been sent.",
      });
      return data;
    },
    onError: (error: Error) => {
      toast.error("Failed to create admin user", {
        description: error.message,
      });
    },
  });

  // Manage admin user mutation (suspend, unsuspend, delete, reset password, update role, update permissions)
  const manageAdminUserMutation = useMutation({
    mutationFn: async (data: {
      action: "suspend" | "unsuspend" | "delete" | "reset_password" | "update_role" | "update_permissions";
      targetUserId: string;
      newRole?: AdminRole;
      permissions?: Record<string, boolean>;
    }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await supabase.functions.invoke("manage-admin-user", {
        body: data,
      });

      if (response.error) throw new Error(response.error.message);
      return response.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin-users-full"] });
      
      const messages: Record<string, string> = {
        suspend: "User suspended successfully",
        unsuspend: "User unsuspended successfully",
        delete: "User deleted successfully",
        reset_password: "Password reset successfully. New credentials sent via email.",
        update_role: "Role updated successfully",
        update_permissions: "Permissions updated successfully",
      };

      toast.success(messages[variables.action] || "Action completed");
      return data;
    },
    onError: (error: Error) => {
      toast.error("Action failed", {
        description: error.message,
      });
    },
  });

  // Check if current user can perform action
  const canPerformAction = async (action: string, targetUserId: string): Promise<boolean> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    // Can't modify self for certain actions
    if ((action === "suspend" || action === "delete") && user.id === targetUserId) {
      return false;
    }

    return true;
  };

  return {
    adminUsers,
    isLoading,
    refetch,
    createAdminUser: createAdminUserMutation.mutateAsync,
    isCreating: createAdminUserMutation.isPending,
    manageAdminUser: manageAdminUserMutation.mutateAsync,
    isManaging: manageAdminUserMutation.isPending,
    canPerformAction,
  };
}
