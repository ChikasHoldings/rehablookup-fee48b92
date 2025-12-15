import { useState } from "react";
import {
  Search,
  UserPlus,
  MoreHorizontal,
  ShieldCheck,
  ShieldAlert,
  Users as UsersIcon,
  Ban,
  Trash2,
  KeyRound,
  Settings,
  Mail,
  Clock,
  CheckCircle,
  XCircle,
} from "lucide-react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { useAdminUserManagement, AdminUser, AdminRole } from "@/hooks/useAdminUserManagement";
import { CreateAdminUserDialog } from "@/components/admin/CreateAdminUserDialog";
import { AdminUserPermissionsDialog } from "@/components/admin/AdminUserPermissionsDialog";

const ROLE_INFO = {
  admin: {
    label: "Super Admin",
    icon: ShieldAlert,
    badgeClass: "bg-amber-100 text-amber-800 hover:bg-amber-100",
  },
  moderator: {
    label: "Moderator",
    icon: ShieldCheck,
    badgeClass: "bg-blue-100 text-blue-800 hover:bg-blue-100",
  },
};

export default function AdminUsers() {
  const { adminUsers, isLoading, manageAdminUser, isManaging } = useAdminUserManagement();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState<"all" | AdminRole>("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "suspended">("all");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [permissionsDialogOpen, setPermissionsDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    action: "suspend" | "unsuspend" | "delete" | "reset_password";
    user: AdminUser;
  } | null>(null);

  // Stats
  const adminCount = adminUsers?.filter(u => u.roles.includes("admin")).length || 0;
  const moderatorCount = adminUsers?.filter(u => u.roles.includes("moderator")).length || 0;
  const activeCount = adminUsers?.filter(u => u.status === "active").length || 0;
  const suspendedCount = adminUsers?.filter(u => u.status === "suspended").length || 0;

  // Filtered users
  const filteredUsers = adminUsers?.filter(user => {
    const matchesSearch = !searchQuery || 
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.last_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.display_name?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole = filterRole === "all" || user.roles.includes(filterRole);
    const matchesStatus = filterStatus === "all" || user.status === filterStatus;

    return matchesSearch && matchesRole && matchesStatus;
  });

  const getUserDisplayName = (user: AdminUser) => {
    if (user.display_name) return user.display_name;
    if (user.first_name && user.last_name) return `${user.first_name} ${user.last_name}`;
    return user.email;
  };

  const handleAction = async () => {
    if (!confirmAction) return;
    
    await manageAdminUser({
      action: confirmAction.action,
      targetUserId: confirmAction.user.user_id,
    });
    
    setConfirmAction(null);
  };

  const openPermissions = (user: AdminUser) => {
    setSelectedUser(user);
    setPermissionsDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">User Management</h1>
          <p className="text-muted-foreground">Manage admin users, roles and permissions</p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          Create Admin User
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Super Admins</CardTitle>
            <ShieldAlert className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? <Skeleton className="h-8 w-12" /> : adminCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Moderators</CardTitle>
            <ShieldCheck className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? <Skeleton className="h-8 w-12" /> : moderatorCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? <Skeleton className="h-8 w-12" /> : activeCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Suspended</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? <Skeleton className="h-8 w-12" /> : suspendedCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
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
            <Select value={filterRole} onValueChange={(v) => setFilterRole(v as any)}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="admin">Super Admin</SelectItem>
                <SelectItem value="moderator">Moderator</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as any)}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Admin Users</CardTitle>
          <CardDescription>{filteredUsers?.length || 0} users</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
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
            <div className="text-center py-12 text-muted-foreground">
              <UsersIcon className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No admin users found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers?.map((user) => {
                  const initials = (user.first_name?.[0] || "") + (user.last_name?.[0] || "") || user.email.slice(0, 2).toUpperCase();
                  const primaryRole = user.roles.includes("admin") ? "admin" : "moderator";
                  const roleInfo = ROLE_INFO[primaryRole];
                  const RoleIcon = roleInfo.icon;

                  return (
                    <TableRow key={user.user_id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarImage src={user.avatar_url || undefined} />
                            <AvatarFallback className="bg-slate-200 text-slate-700 text-sm font-medium">
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{getUserDisplayName(user)}</p>
                            <p className="text-xs text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={roleInfo.badgeClass}>
                          <RoleIcon className="h-3 w-3 mr-1" />
                          {roleInfo.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.status === "active" ? "outline" : "destructive"}>
                          {user.status === "active" ? "Active" : "Suspended"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {user.last_login_at ? format(new Date(user.last_login_at), "MMM d, yyyy") : "Never"}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openPermissions(user)}>
                              <Settings className="h-4 w-4 mr-2" />
                              Edit Permissions
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setConfirmAction({ action: "reset_password", user })}>
                              <KeyRound className="h-4 w-4 mr-2" />
                              Reset Password
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {user.status === "active" ? (
                              <DropdownMenuItem 
                                onClick={() => setConfirmAction({ action: "suspend", user })}
                                className="text-amber-600"
                              >
                                <Ban className="h-4 w-4 mr-2" />
                                Suspend User
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem 
                                onClick={() => setConfirmAction({ action: "unsuspend", user })}
                                className="text-green-600"
                              >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Unsuspend User
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem 
                              onClick={() => setConfirmAction({ action: "delete", user })}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete User
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <CreateAdminUserDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} />
      <AdminUserPermissionsDialog 
        open={permissionsDialogOpen} 
        onOpenChange={setPermissionsDialogOpen}
        user={selectedUser}
      />

      {/* Confirmation Dialog */}
      <AlertDialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.action === "suspend" && "Suspend User"}
              {confirmAction?.action === "unsuspend" && "Unsuspend User"}
              {confirmAction?.action === "delete" && "Delete User"}
              {confirmAction?.action === "reset_password" && "Reset Password"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.action === "suspend" && `Are you sure you want to suspend ${getUserDisplayName(confirmAction.user)}? They will not be able to access the admin panel.`}
              {confirmAction?.action === "unsuspend" && `Restore access for ${getUserDisplayName(confirmAction.user)}?`}
              {confirmAction?.action === "delete" && `Permanently delete ${getUserDisplayName(confirmAction.user)}? This action cannot be undone.`}
              {confirmAction?.action === "reset_password" && `Generate a new temporary password for ${getUserDisplayName(confirmAction.user)}? They will receive an email with the new credentials.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleAction}
              className={confirmAction?.action === "delete" ? "bg-red-600 hover:bg-red-700" : ""}
              disabled={isManaging}
            >
              {isManaging ? "Processing..." : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
