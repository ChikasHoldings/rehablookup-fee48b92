import { useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { logAdminError } from "@/lib/adminErrorLogger";

// 4-tier admin role system
export type AdminRoleType = "super_admin" | "manager" | "customer_rep" | "advisor";

export type AdminUserStatus = "active" | "suspended" | "pending_password_reset";

// Role configuration with display info and default permissions
export const ADMIN_ROLE_CONFIG: Record<AdminRoleType, {
  label: string;
  shortLabel: string;
  description: string;
  color: string;
  bgColor: string;
  borderColor: string;
  iconColor: string;
  gradient: string;
}> = {
  super_admin: {
    label: "Super Admin",
    shortLabel: "Super Admin",
    description: "Full platform access. Can manage all staff, settings, and system configuration.",
    color: "text-amber-700",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
    iconColor: "text-amber-500",
    gradient: "from-amber-500 to-orange-500",
  },
  manager: {
    label: "Manager",
    shortLabel: "Manager",
    description: "Manages providers, leads, subscriptions, and analytics. No staff or system access.",
    color: "text-blue-700",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    iconColor: "text-blue-500",
    gradient: "from-blue-500 to-indigo-500",
  },
  customer_rep: {
    label: "Customer Rep",
    shortLabel: "Rep",
    description: "Handles user support, reviews, and basic lead management. Limited analytics access.",
    color: "text-emerald-700",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-200",
    iconColor: "text-emerald-500",
    gradient: "from-emerald-500 to-teal-500",
  },
  advisor: {
    label: "Placement Advisor",
    shortLabel: "Advisor",
    description: "Concierge specialist. Access to placement cases, messaging, and seeker support.",
    color: "text-purple-700",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-200",
    iconColor: "text-purple-500",
    gradient: "from-purple-500 to-violet-500",
  },
};

// Permission definitions
export const ADMIN_PERMISSIONS = {
  dashboard: { label: "Dashboard", description: "View dashboard metrics and overview" },
  analytics: { label: "Analytics", description: "View detailed analytics and reports" },
  providers: { label: "Providers", description: "Manage providers and facilities" },
  leads: { label: "Leads", description: "View and manage leads" },
  subscriptions: { label: "Subscriptions", description: "Manage subscriptions and billing" },
  featured: { label: "Featured Placement", description: "Manage featured listings" },
  reviews: { label: "Review Moderation", description: "Moderate facility reviews" },
  seekers: { label: "User Management", description: "View and manage seeker accounts" },
  placements: { label: "Concierge/Placements", description: "Manage placement cases and concierge" },
  support: { label: "Support Inbox", description: "Handle support tickets and seeker communications" },
  security_logs: { label: "Security Logs", description: "View security and rate limit logs" },
  users: { label: "Admin Staff", description: "Create and manage admin users (Super Admin only)" },
  audit_log: { label: "Audit Log", description: "View system audit logs" },
  settings: { label: "Settings", description: "Access system settings" },
  notifications: { label: "Notifications", description: "View and manage notifications" },
} as const;

// Default permissions per role
export const ROLE_DEFAULTS: Record<AdminRoleType, Record<string, boolean>> = {
  super_admin: {
    dashboard: true,
    analytics: true,
    providers: true,
    leads: true,
    subscriptions: true,
    featured: true,
    reviews: true,
    seekers: true,
    placements: true,
    support: true,
    security_logs: true,
    users: true,
    audit_log: true,
    settings: true,
    notifications: true,
  },
  manager: {
    dashboard: true,
    analytics: true,
    providers: true,
    leads: true,
    subscriptions: true,
    featured: true,
    reviews: true,
    seekers: true,
    placements: true,
    support: true,
    security_logs: false,
    users: false,
    audit_log: false,
    settings: false,
    notifications: true,
  },
  customer_rep: {
    dashboard: true,
    analytics: false,
    providers: true,
    leads: true,
    subscriptions: false,
    featured: false,
    reviews: true,
    seekers: true,
    placements: false,
    support: true,
    security_logs: false,
    users: false,
    audit_log: false,
    settings: false,
    notifications: true,
  },
  advisor: {
    dashboard: true,
    analytics: false,
    providers: false,
    leads: false,
    subscriptions: false,
    featured: false,
    reviews: false,
    seekers: true,
    placements: true,
    support: true,
    security_logs: false,
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
  admin_role: AdminRoleType;
  status: AdminUserStatus;
  display_name: string | null;
  avatar_url: string | null;
  last_login_at: string | null;
  permissions: Record<string, boolean>;
  mfa_skip: boolean;
  mfa_enabled: boolean;
};

export function useAdminUserManagement() {
  const queryClient = useQueryClient();

  const invalidateAdminUsers = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["admin-users-full"] });
  }, [queryClient]);

  // Real-time subscriptions
  useEffect(() => {
    const rolesChannel = supabase
      .channel("admin-users-roles")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_roles" },
        (payload) => {
          console.log("User roles update:", payload.eventType);
          invalidateAdminUsers();
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
        }
      )
      .subscribe();

    const permissionsChannel = supabase
      .channel("admin-users-permissions")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "admin_user_permissions" },
        () => {
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
  const { data: adminUsers, isLoading, error: queryError, refetch } = useQuery({
    queryKey: ["admin-users-full"],
    queryFn: async () => {
      // Use the security-definer RPC that resolves emails from auth.users
      // This ensures admin users without a profiles row are still visible
      const { data: adminList, error: listError } = await supabase
        .rpc("get_admin_users_list");

      if (listError) {
        logAdminError("useAdminUserManagement", "fetch_admin_list", listError, { queryKey: "admin-users-full" });
        throw listError;
      }

      if (!adminList || adminList.length === 0) {
        return [];
      }

      const adminUserIds = adminList.map((u: any) => u.user_id);

      // Get permissions
      const { data: permissions, error: permissionsError } = await supabase
        .from("admin_user_permissions")
        .select("user_id, permission_key, granted")
        .in("user_id", adminUserIds);

      if (permissionsError) {
        logAdminError("useAdminUserManagement", "fetch_permissions", permissionsError, { queryKey: "admin-users-full" });
      }

      // Group permissions by user
      const permissionsByUser: Record<string, Record<string, boolean>> = {};
      (permissions || []).forEach((p) => {
        if (!permissionsByUser[p.user_id]) {
          permissionsByUser[p.user_id] = {};
        }
        permissionsByUser[p.user_id][p.permission_key] = p.granted;
      });

      return adminList.map((u: any) => {
        const userPermissions = permissionsByUser[u.user_id] || {};
        const adminRole = (u.admin_role as AdminRoleType) || "customer_rep";

        return {
          user_id: u.user_id,
          email: u.email || "unknown",
          first_name: u.first_name,
          last_name: u.last_name,
          created_at: u.created_at,
          admin_role: adminRole,
          status: (u.status || "active") as AdminUserStatus,
          display_name: u.display_name || null,
          avatar_url: u.avatar_url || null,
          last_login_at: u.last_login_at || null,
          permissions: userPermissions,
          mfa_skip: u.mfa_skip || false,
          mfa_enabled: u.mfa_enabled || false,
        };
      }) as AdminUser[];
    },
  });

  useEffect(() => {
    if (queryError) {
      logAdminError("useAdminUserManagement", "query_error", queryError, { queryKey: "admin-users-full" });
    }
  }, [queryError]);

  // Create admin user mutation
  const createAdminUserMutation = useMutation({
    mutationFn: async (data: {
      email: string;
      displayName: string;
      adminRole: AdminRoleType;
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
      logAdminError("useAdminUserManagement", "create_admin_user", error, { mutation: "createAdminUser" });
      toast.error("Failed to create admin user", {
        description: error.message,
      });
    },
  });

  // Manage admin user mutation
  const manageAdminUserMutation = useMutation({
    mutationFn: async (data: {
      action: "suspend" | "unsuspend" | "delete" | "reset_password" | "update_role" | "update_permissions" | "resend_invitation" | "toggle_mfa_skip";
      targetUserId: string;
      newRole?: AdminRoleType;
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
        resend_invitation: "Invitation resent successfully",
        toggle_mfa_skip: "2FA enforcement setting updated",
      };

      toast.success(messages[variables.action] || "Action completed");
      return data;
    },
    onError: (error: Error, variables) => {
      logAdminError("useAdminUserManagement", "manage_admin_user", error, { 
        mutation: "manageAdminUser", 
        action: variables.action,
        targetUserId: variables.targetUserId 
      });
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
