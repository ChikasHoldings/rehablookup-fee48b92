import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Shield,
  Search,
  UserPlus,
  UserMinus,
  Mail,
  Calendar,
  MoreHorizontal,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  Users as UsersIcon,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { format } from "date-fns";

type AppRole = "admin" | "moderator";

type UserRole = {
  user_id: string;
  role: AppRole;
};

type UserWithRoles = {
  user_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  created_at: string;
  roles: AppRole[];
};

const ROLE_INFO = {
  admin: {
    label: "Admin",
    description: "Full access to all admin features including user management, settings, and billing",
    icon: ShieldAlert,
    badgeClass: "bg-amber-100 text-amber-800 hover:bg-amber-100",
    permissions: [
      "Manage all providers and facilities",
      "View and manage all leads",
      "Manage subscriptions and billing",
      "Grant/revoke admin and moderator roles",
      "Access audit logs and settings",
      "Manage featured placements",
    ],
  },
  moderator: {
    label: "Moderator",
    description: "Limited access for content moderation and provider support",
    icon: ShieldCheck,
    badgeClass: "bg-blue-100 text-blue-800 hover:bg-blue-100",
    permissions: [
      "View and approve/reject providers",
      "View and assign leads",
      "View facility details",
      "Add admin notes to providers",
      "Cannot manage billing or subscriptions",
      "Cannot manage user roles",
    ],
  },
};

export default function AdminUsers() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState<"all" | AppRole>("all");
  const [addRoleDialogOpen, setAddRoleDialogOpen] = useState(false);
  const [emailToAdd, setEmailToAdd] = useState("");
  const [roleToAdd, setRoleToAdd] = useState<AppRole>("moderator");
  const [userToModify, setUserToModify] = useState<{ user: UserWithRoles; action: "revoke"; role: AppRole } | null>(null);

  // Fetch all profiles with their roles
  const { data: users, isLoading } = useQuery({
    queryKey: ["admin-users-management"],
    queryFn: async () => {
      // First get all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, email, first_name, last_name, created_at")
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      // Then get all roles
      const { data: allRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role");

      if (rolesError) throw rolesError;

      // Group roles by user
      const rolesByUser: Record<string, AppRole[]> = {};
      (allRoles || []).forEach((r) => {
        if (!rolesByUser[r.user_id]) {
          rolesByUser[r.user_id] = [];
        }
        rolesByUser[r.user_id].push(r.role as AppRole);
      });

      return (profiles || []).map((profile) => ({
        ...profile,
        roles: rolesByUser[profile.user_id] || [],
      })) as UserWithRoles[];
    },
  });

  // Get counts
  const adminCount = users?.filter((u) => u.roles.includes("admin")).length || 0;
  const moderatorCount = users?.filter((u) => u.roles.includes("moderator")).length || 0;
  const usersWithRoles = users?.filter((u) => u.roles.length > 0).length || 0;

  // Filtered users based on search and role filter
  const filteredUsers = users?.filter((user) => {
    const matchesSearch = !searchQuery || 
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.last_name?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole = filterRole === "all" || user.roles.includes(filterRole);

    return matchesSearch && matchesRole;
  });

  // Grant role mutation
  const grantRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      const { error } = await supabase.from("user_roles").insert({
        user_id: userId,
        role: role,
      });
      if (error) throw error;

      // Log admin action
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from("admin_audit_log").insert({
        admin_user_id: user?.id,
        action_type: `${role}_role_granted`,
        target_type: "user",
        target_id: userId,
        details: { action: `granted ${role} role` },
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin-users-management"] });
      toast.success(`${ROLE_INFO[variables.role].label} role granted successfully`);
    },
    onError: (error: any) => {
      if (error.message?.includes("duplicate")) {
        toast.error("User already has this role");
      } else {
        toast.error("Failed to grant role");
      }
    },
  });

  // Revoke role mutation
  const revokeRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("role", role);
      if (error) throw error;

      // Log admin action
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from("admin_audit_log").insert({
        admin_user_id: user?.id,
        action_type: `${role}_role_revoked`,
        target_type: "user",
        target_id: userId,
        details: { action: `revoked ${role} role` },
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin-users-management"] });
      toast.success(`${ROLE_INFO[variables.role].label} role revoked successfully`);
      setUserToModify(null);
    },
    onError: () => {
      toast.error("Failed to revoke role");
    },
  });

  // Add role by email
  const handleAddRoleByEmail = async () => {
    if (!emailToAdd.trim()) {
      toast.error("Please enter an email address");
      return;
    }

    const user = users?.find(
      (u) => u.email.toLowerCase() === emailToAdd.toLowerCase()
    );

    if (!user) {
      toast.error("No user found with that email address");
      return;
    }

    if (user.roles.includes(roleToAdd)) {
      toast.error(`User already has ${ROLE_INFO[roleToAdd].label} role`);
      return;
    }

    grantRoleMutation.mutate({ userId: user.user_id, role: roleToAdd });
    setAddRoleDialogOpen(false);
    setEmailToAdd("");
  };

  const handleRevokeRole = (user: UserWithRoles, role: AppRole) => {
    setUserToModify({ user, action: "revoke", role });
  };

  const confirmRevokeRole = () => {
    if (userToModify) {
      revokeRoleMutation.mutate({ userId: userToModify.user.user_id, role: userToModify.role });
    }
  };

  const getUserDisplayName = (user: UserWithRoles) => {
    if (user.first_name && user.last_name) {
      return `${user.first_name} ${user.last_name}`;
    }
    return user.email;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">User Management</h1>
          <p className="text-muted-foreground">Manage admin and moderator roles</p>
        </div>
        <Button onClick={() => setAddRoleDialogOpen(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          Add Role
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">{users?.length || 0}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Admins</CardTitle>
            <ShieldAlert className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">{adminCount}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Moderators</CardTitle>
            <ShieldCheck className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">{moderatorCount}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">With Roles</CardTitle>
            <UsersIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">{usersWithRoles}</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Role Permissions Info */}
      <div className="grid gap-4 md:grid-cols-2">
        {(Object.entries(ROLE_INFO) as [AppRole, typeof ROLE_INFO.admin][]).map(([role, info]) => {
          const Icon = info.icon;
          return (
            <Card key={role}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Icon className={`h-5 w-5 ${role === "admin" ? "text-amber-500" : "text-blue-500"}`} />
                  {info.label} Role
                </CardTitle>
                <CardDescription>{info.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-sm space-y-1">
                  {info.permissions.map((perm, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className={`mt-1.5 h-1.5 w-1.5 rounded-full flex-shrink-0 ${role === "admin" ? "bg-amber-500" : "bg-blue-500"}`} />
                      <span className="text-muted-foreground">{perm}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterRole} onValueChange={(v) => setFilterRole(v as "all" | AppRole)}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                <SelectItem value="admin">Admins Only</SelectItem>
                <SelectItem value="moderator">Moderators Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Users List */}
      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
          <CardDescription>
            {filteredUsers?.length || 0} users found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredUsers?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No users found
            </div>
          ) : (
            <div className="space-y-3">
              {filteredUsers?.map((user) => {
                const initials =
                  (user.first_name?.[0] || "") + (user.last_name?.[0] || "") ||
                  user.email.slice(0, 2).toUpperCase();

                return (
                  <div
                    key={user.user_id}
                    className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-slate-200 text-slate-700 text-sm font-medium">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">{getUserDisplayName(user)}</span>
                          {user.roles.map((role) => {
                            const info = ROLE_INFO[role];
                            const Icon = info.icon;
                            return (
                              <Badge key={role} className={info.badgeClass}>
                                <Icon className="h-3 w-3 mr-1" />
                                {info.label}
                              </Badge>
                            );
                          })}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {user.email}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Joined {format(new Date(user.created_at), "MMM d, yyyy")}
                        </p>
                      </div>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {!user.roles.includes("admin") && (
                          <DropdownMenuItem
                            onClick={() => grantRoleMutation.mutate({ userId: user.user_id, role: "admin" })}
                          >
                            <ShieldAlert className="h-4 w-4 mr-2 text-amber-500" />
                            Grant Admin
                          </DropdownMenuItem>
                        )}
                        {!user.roles.includes("moderator") && (
                          <DropdownMenuItem
                            onClick={() => grantRoleMutation.mutate({ userId: user.user_id, role: "moderator" })}
                          >
                            <ShieldCheck className="h-4 w-4 mr-2 text-blue-500" />
                            Grant Moderator
                          </DropdownMenuItem>
                        )}
                        {user.roles.length > 0 && <DropdownMenuSeparator />}
                        {user.roles.includes("admin") && (
                          <DropdownMenuItem
                            onClick={() => handleRevokeRole(user, "admin")}
                            className="text-red-600"
                          >
                            <UserMinus className="h-4 w-4 mr-2" />
                            Revoke Admin
                          </DropdownMenuItem>
                        )}
                        {user.roles.includes("moderator") && (
                          <DropdownMenuItem
                            onClick={() => handleRevokeRole(user, "moderator")}
                            className="text-red-600"
                          >
                            <UserMinus className="h-4 w-4 mr-2" />
                            Revoke Moderator
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Role Dialog */}
      <Dialog open={addRoleDialogOpen} onOpenChange={setAddRoleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Role to User</DialogTitle>
            <DialogDescription>
              Enter the email address and select the role you want to assign.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Email Address</label>
              <Input
                placeholder="user@example.com"
                value={emailToAdd}
                onChange={(e) => setEmailToAdd(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Role</label>
              <Select value={roleToAdd} onValueChange={(v) => setRoleToAdd(v as AppRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="h-4 w-4 text-amber-500" />
                      Admin - Full access
                    </div>
                  </SelectItem>
                  <SelectItem value="moderator">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-blue-500" />
                      Moderator - Limited access
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="bg-muted p-3 rounded-lg">
              <p className="text-sm font-medium mb-1">{ROLE_INFO[roleToAdd].label}</p>
              <p className="text-xs text-muted-foreground">{ROLE_INFO[roleToAdd].description}</p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAddRoleDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddRoleByEmail}
              disabled={grantRoleMutation.isPending}
            >
              {grantRoleMutation.isPending ? "Adding..." : "Add Role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revoke Confirmation Dialog */}
      <AlertDialog
        open={!!userToModify}
        onOpenChange={() => setUserToModify(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Revoke {userToModify?.role ? ROLE_INFO[userToModify.role].label : ""} Access
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to revoke {userToModify?.role ? ROLE_INFO[userToModify.role].label.toLowerCase() : ""} access for{" "}
              <strong>{userToModify?.user ? getUserDisplayName(userToModify.user) : ""}</strong>?
              {userToModify?.role === "admin" && (
                <span className="block mt-2 text-amber-600">
                  They will no longer have full admin privileges.
                </span>
              )}
              {userToModify?.role === "moderator" && (
                <span className="block mt-2">
                  They will no longer be able to moderate content.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmRevokeRole}
              className="bg-red-600 hover:bg-red-700"
            >
              {revokeRoleMutation.isPending ? "Revoking..." : "Revoke Access"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
