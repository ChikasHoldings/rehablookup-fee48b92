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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { format } from "date-fns";

type UserWithRole = {
  user_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  created_at: string;
  is_admin: boolean;
};

export default function AdminUsers() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [addAdminDialogOpen, setAddAdminDialogOpen] = useState(false);
  const [emailToAdd, setEmailToAdd] = useState("");
  const [userToRevoke, setUserToRevoke] = useState<UserWithRole | null>(null);

  // Fetch all profiles with their admin status
  const { data: users, isLoading } = useQuery({
    queryKey: ["admin-users-management"],
    queryFn: async () => {
      // First get all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, email, first_name, last_name, created_at")
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      // Then get all admin roles
      const { data: adminRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .eq("role", "admin");

      if (rolesError) throw rolesError;

      const adminUserIds = new Set(adminRoles?.map((r) => r.user_id) || []);

      return (profiles || []).map((profile) => ({
        ...profile,
        is_admin: adminUserIds.has(profile.user_id),
      })) as UserWithRole[];
    },
  });

  // Get admin count
  const adminCount = users?.filter((u) => u.is_admin).length || 0;

  // Filtered users based on search
  const filteredUsers = users?.filter((user) => {
    if (!searchQuery) return true;
    const search = searchQuery.toLowerCase();
    return (
      user.email.toLowerCase().includes(search) ||
      user.first_name?.toLowerCase().includes(search) ||
      user.last_name?.toLowerCase().includes(search)
    );
  });

  // Grant admin role mutation
  const grantAdminMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.from("user_roles").insert({
        user_id: userId,
        role: "admin",
      });
      if (error) throw error;

      // Log admin action
      const {
        data: { user },
      } = await supabase.auth.getUser();
      await supabase.from("admin_audit_log").insert({
        admin_user_id: user?.id,
        action_type: "admin_role_granted",
        target_type: "user",
        target_id: userId,
        details: { action: "granted admin role" },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users-management"] });
      toast.success("Admin role granted successfully");
    },
    onError: (error: any) => {
      if (error.message?.includes("duplicate")) {
        toast.error("User already has admin role");
      } else {
        toast.error("Failed to grant admin role");
      }
    },
  });

  // Revoke admin role mutation
  const revokeAdminMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("role", "admin");
      if (error) throw error;

      // Log admin action
      const {
        data: { user },
      } = await supabase.auth.getUser();
      await supabase.from("admin_audit_log").insert({
        admin_user_id: user?.id,
        action_type: "admin_role_revoked",
        target_type: "user",
        target_id: userId,
        details: { action: "revoked admin role" },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users-management"] });
      toast.success("Admin role revoked successfully");
      setUserToRevoke(null);
    },
    onError: () => {
      toast.error("Failed to revoke admin role");
    },
  });

  // Add admin by email
  const handleAddAdminByEmail = async () => {
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

    if (user.is_admin) {
      toast.error("User already has admin role");
      return;
    }

    grantAdminMutation.mutate(user.user_id);
    setAddAdminDialogOpen(false);
    setEmailToAdd("");
  };

  const handleRevokeAdmin = (user: UserWithRole) => {
    setUserToRevoke(user);
  };

  const confirmRevokeAdmin = () => {
    if (userToRevoke) {
      revokeAdminMutation.mutate(userToRevoke.user_id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">User Management</h1>
          <p className="text-muted-foreground">Manage admin roles and permissions</p>
        </div>
        <Button onClick={() => setAddAdminDialogOpen(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          Add Admin
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
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
            <Shield className="h-4 w-4 text-muted-foreground" />
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
            <CardTitle className="text-sm font-medium">Regular Users</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">
                {(users?.length || 0) - adminCount}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
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
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {user.first_name && user.last_name
                              ? `${user.first_name} ${user.last_name}`
                              : user.email}
                          </span>
                          {user.is_admin && (
                            <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
                              <Shield className="h-3 w-3 mr-1" />
                              Admin
                            </Badge>
                          )}
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
                        {user.is_admin ? (
                          <DropdownMenuItem
                            onClick={() => handleRevokeAdmin(user)}
                            className="text-red-600"
                          >
                            <UserMinus className="h-4 w-4 mr-2" />
                            Revoke Admin
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            onClick={() => grantAdminMutation.mutate(user.user_id)}
                          >
                            <UserPlus className="h-4 w-4 mr-2" />
                            Grant Admin
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

      {/* Add Admin Dialog */}
      <Dialog open={addAdminDialogOpen} onOpenChange={setAddAdminDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Admin</DialogTitle>
            <DialogDescription>
              Enter the email address of the user you want to grant admin access.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="user@example.com"
              value={emailToAdd}
              onChange={(e) => setEmailToAdd(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddAdminByEmail()}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAddAdminDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddAdminByEmail}
              disabled={grantAdminMutation.isPending}
            >
              {grantAdminMutation.isPending ? "Adding..." : "Add Admin"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revoke Confirmation Dialog */}
      <AlertDialog
        open={!!userToRevoke}
        onOpenChange={() => setUserToRevoke(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Revoke Admin Access
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to revoke admin access for{" "}
              <strong>
                {userToRevoke?.first_name && userToRevoke?.last_name
                  ? `${userToRevoke.first_name} ${userToRevoke.last_name}`
                  : userToRevoke?.email}
              </strong>
              ? They will no longer be able to access the admin panel.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmRevokeAdmin}
              className="bg-red-600 hover:bg-red-700"
            >
              {revokeAdminMutation.isPending ? "Revoking..." : "Revoke Access"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
