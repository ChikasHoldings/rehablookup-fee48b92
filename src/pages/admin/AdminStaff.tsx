import { useState, useMemo } from "react";
import { useAdminErrorHandler } from "@/hooks/useAdminErrorHandler";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import {
  Search,
  UserPlus,
  MoreHorizontal,
  ShieldAlert,
  Briefcase,
  HeadphonesIcon,
  Heart,
  Ban,
  Trash2,
  KeyRound,
  Settings,
  Mail,
  Clock,
  CheckCircle,
  XCircle,
  Filter,
  Calendar,
  Activity,
  Send,
  Shield,
  Users,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { format, formatDistanceToNow } from "date-fns";
import { 
  useAdminUserManagement, 
  AdminUser, 
  AdminRoleType, 
  ADMIN_ROLE_CONFIG 
} from "@/hooks/useAdminUserManagement";
import { CreateAdminUserDialog } from "@/components/admin/CreateAdminUserDialog";
import { AdminUserPermissionsDialog } from "@/components/admin/AdminUserPermissionsDialog";
import { cn } from "@/lib/utils";

const ROLE_ICONS: Record<AdminRoleType, React.ElementType> = {
  super_admin: ShieldAlert,
  manager: Briefcase,
  customer_rep: HeadphonesIcon,
  advisor: Heart,
};

const STATUS_CONFIG = {
  active: {
    label: "Active",
    bgColor: "bg-emerald-50",
    textColor: "text-emerald-700",
    dotColor: "bg-emerald-500",
  },
  suspended: {
    label: "Suspended",
    bgColor: "bg-red-50",
    textColor: "text-red-700",
    dotColor: "bg-red-500",
  },
  pending_password_reset: {
    label: "Pending Setup",
    bgColor: "bg-amber-50",
    textColor: "text-amber-700",
    dotColor: "bg-amber-500",
  },
};

export default function AdminStaff() {
  const { logError } = useAdminErrorHandler("AdminStaff");
  const { adminUsers, isLoading, manageAdminUser, isManaging, refetch } = useAdminUserManagement();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState<"all" | AdminRoleType>("all");
  const [activeTab, setActiveTab] = useState<"all" | "active" | "suspended">("all");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [permissionsDialogOpen, setPermissionsDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    action: "suspend" | "unsuspend" | "delete" | "reset_password" | "resend_invitation";
    user: AdminUser;
  } | null>(null);

  const safeAdminUsers = adminUsers || [];
  
  // Stats by role
  const stats = useMemo(() => ({
    total: safeAdminUsers.length,
    superAdmin: safeAdminUsers.filter(u => u?.admin_role === "super_admin").length,
    manager: safeAdminUsers.filter(u => u?.admin_role === "manager").length,
    customerRep: safeAdminUsers.filter(u => u?.admin_role === "customer_rep").length,
    advisor: safeAdminUsers.filter(u => u?.admin_role === "advisor").length,
    active: safeAdminUsers.filter(u => u?.status === "active").length,
    suspended: safeAdminUsers.filter(u => u?.status === "suspended").length,
  }), [safeAdminUsers]);

  // Filtered users
  const filteredUsers = useMemo(() => {
    return safeAdminUsers.filter(user => {
      if (!user) return false;
      
      const matchesSearch = !searchQuery || 
        user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.last_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.display_name?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesRole = filterRole === "all" || user.admin_role === filterRole;
      const matchesStatus = activeTab === "all" || user.status === activeTab;

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [safeAdminUsers, searchQuery, filterRole, activeTab]);

  const getUserDisplayName = (user: AdminUser) => {
    if (user.display_name) return user.display_name;
    if (user.first_name && user.last_name) return `${user.first_name} ${user.last_name}`;
    return user.email.split("@")[0];
  };

  const getInitials = (user: AdminUser) => {
    if (user.first_name && user.last_name) {
      return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase();
    }
    return user.email.slice(0, 2).toUpperCase();
  };

  const handleAction = async () => {
    if (!confirmAction) return;
    
    try {
      await manageAdminUser({
        action: confirmAction.action,
        targetUserId: confirmAction.user.user_id,
      });
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      // Error handled by mutation
    }
    
    setConfirmAction(null);
  };

  const openPermissions = (user: AdminUser) => {
    setSelectedUser(user);
    setPermissionsDialogOpen(true);
  };

  const UserCard = ({ user }: { user: AdminUser }) => {
    const roleConfig = ADMIN_ROLE_CONFIG[user.admin_role];
    const statusConfig = STATUS_CONFIG[user.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.active;
    const RoleIcon = ROLE_ICONS[user.admin_role];

    return (
      <Card className={cn(
        "group relative overflow-hidden transition-all duration-200 hover:shadow-md border-l-4",
        user.status === "suspended" && "opacity-70",
        `border-l-${roleConfig.iconColor.replace('text-', '')}`
      )} style={{ borderLeftColor: `var(--${roleConfig.iconColor.replace('text-', '').replace('-500', '')}-500)` }}>
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-4">
            {/* User Info */}
            <div className="flex items-start gap-4 flex-1 min-w-0">
              <div className="relative">
                <Avatar className="h-12 w-12 ring-2 ring-background shadow-sm">
                  <AvatarImage src={user.avatar_url || undefined} />
                  <AvatarFallback className={cn(
                    "text-sm font-semibold",
                    roleConfig.bgColor,
                    roleConfig.color
                  )}>
                    {getInitials(user)}
                  </AvatarFallback>
                </Avatar>
                {/* Status indicator */}
                <div className={cn(
                  "absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-background",
                  statusConfig.dotColor
                )} />
              </div>

              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-sm text-foreground truncate">
                    {getUserDisplayName(user)}
                  </h3>
                  <Badge className={cn(
                    "text-[10px] font-medium gap-1 px-1.5 py-0",
                    roleConfig.bgColor,
                    roleConfig.color,
                    "border",
                    roleConfig.borderColor
                  )}>
                    <RoleIcon className="h-2.5 w-2.5" />
                    {roleConfig.shortLabel}
                  </Badge>
                </div>
                
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Mail className="h-3 w-3" />
                  <span className="truncate">{user.email}</span>
                </div>

                <div className="flex items-center gap-3 pt-0.5">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Clock className="h-2.5 w-2.5" />
                        {user.last_login_at 
                          ? formatDistanceToNow(new Date(user.last_login_at), { addSuffix: true })
                          : "Never"
                        }
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p>Last login: {user.last_login_at 
                        ? format(new Date(user.last_login_at), "PPpp")
                        : "Never logged in"
                      }</p>
                    </TooltipContent>
                  </Tooltip>

                  <Badge variant="outline" className={cn(
                    "text-[10px] gap-1 px-1.5 py-0",
                    statusConfig.bgColor,
                    statusConfig.textColor,
                    "border-transparent"
                  )}>
                    <span className={cn("h-1.5 w-1.5 rounded-full", statusConfig.dotColor)} />
                    {statusConfig.label}
                  </Badge>

                  {user.mfa_enabled && (
                    <Badge variant="outline" className="text-[10px] gap-1 px-1.5 py-0 bg-blue-50 text-blue-700 border-transparent">
                      <Shield className="h-2.5 w-2.5" />
                      2FA
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => openPermissions(user)}>
                  <Settings className="h-4 w-4 mr-2" />
                  Edit Role & Permissions
                </DropdownMenuItem>
                {user.status === "pending_password_reset" && (
                  <DropdownMenuItem 
                    onClick={() => setConfirmAction({ action: "resend_invitation", user })}
                    className="text-blue-600 focus:text-blue-600"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Resend Invitation
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => setConfirmAction({ action: "reset_password", user })}>
                  <KeyRound className="h-4 w-4 mr-2" />
                  Reset Password
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {user.status === "active" ? (
                  <DropdownMenuItem 
                    onClick={() => setConfirmAction({ action: "suspend", user })}
                    className="text-amber-600 focus:text-amber-600"
                  >
                    <Ban className="h-4 w-4 mr-2" />
                    Suspend User
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem 
                    onClick={() => setConfirmAction({ action: "unsuspend", user })}
                    className="text-emerald-600 focus:text-emerald-600"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Reactivate User
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem 
                  onClick={() => setConfirmAction({ action: "delete", user })}
                  className="text-red-600 focus:text-red-600"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete User
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Admin Staff</h1>
          <p className="text-sm text-muted-foreground">Manage admin accounts, roles, and permissions</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
            Refresh
          </Button>
          <Button onClick={() => setCreateDialogOpen(true)} size="sm">
            <UserPlus className="h-4 w-4 mr-2" />
            Add Staff Member
          </Button>
        </div>
      </div>

      {/* Role Stats */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-5">
        <Card className="border-l-4 border-l-slate-400">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total</p>
                <p className="text-2xl font-bold">{isLoading ? <Skeleton className="h-8 w-10" /> : stats.total}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center">
                <Users className="h-5 w-5 text-slate-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Super Admin</p>
                <p className="text-2xl font-bold">{isLoading ? <Skeleton className="h-8 w-10" /> : stats.superAdmin}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <ShieldAlert className="h-5 w-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Managers</p>
                <p className="text-2xl font-bold">{isLoading ? <Skeleton className="h-8 w-10" /> : stats.manager}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Briefcase className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Customer Reps</p>
                <p className="text-2xl font-bold">{isLoading ? <Skeleton className="h-8 w-10" /> : stats.customerRep}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                <HeadphonesIcon className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Advisors</p>
                <p className="text-2xl font-bold">{isLoading ? <Skeleton className="h-8 w-10" /> : stats.advisor}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <Heart className="h-5 w-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>
              <Select value={filterRole} onValueChange={(v) => setFilterRole(v as "all" | AdminRoleType)}>
                <SelectTrigger className="w-full sm:w-[180px] h-9">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="super_admin">
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="h-4 w-4 text-amber-500" />
                      Super Admin
                    </div>
                  </SelectItem>
                  <SelectItem value="manager">
                    <div className="flex items-center gap-2">
                      <Briefcase className="h-4 w-4 text-blue-500" />
                      Manager
                    </div>
                  </SelectItem>
                  <SelectItem value="customer_rep">
                    <div className="flex items-center gap-2">
                      <HeadphonesIcon className="h-4 w-4 text-emerald-500" />
                      Customer Rep
                    </div>
                  </SelectItem>
                  <SelectItem value="advisor">
                    <div className="flex items-center gap-2">
                      <Heart className="h-4 w-4 text-purple-500" />
                      Advisor
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "all" | "active" | "suspended")}>
              <TabsList className="h-9">
                <TabsTrigger value="all" className="text-xs px-3">
                  All ({stats.total})
                </TabsTrigger>
                <TabsTrigger value="active" className="text-xs px-3">
                  <Activity className="h-3 w-3 mr-1" />
                  Active ({stats.active})
                </TabsTrigger>
                <TabsTrigger value="suspended" className="text-xs px-3">
                  <XCircle className="h-3 w-3 mr-1" />
                  Suspended ({stats.suspended})
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardContent>
      </Card>

      {/* User Grid */}
      {isLoading ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredUsers.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center text-center">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
                <Users className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="font-medium text-foreground mb-1">No staff members found</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                {searchQuery || filterRole !== "all" 
                  ? "Try adjusting your search or filters"
                  : "Add your first admin staff member to get started"
                }
              </p>
              {!searchQuery && filterRole === "all" && (
                <Button onClick={() => setCreateDialogOpen(true)} className="mt-4" size="sm">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Staff Member
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filteredUsers.map((user) => (
            <UserCard key={user.user_id} user={user} />
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <CreateAdminUserDialog 
        open={createDialogOpen} 
        onOpenChange={setCreateDialogOpen} 
      />

      {/* Permissions Dialog */}
      <AdminUserPermissionsDialog
        open={permissionsDialogOpen}
        onOpenChange={setPermissionsDialogOpen}
        user={selectedUser}
      />

      {/* Confirm Action Dialog */}
      <AlertDialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.action === "suspend" && "Suspend Admin User"}
              {confirmAction?.action === "unsuspend" && "Reactivate Admin User"}
              {confirmAction?.action === "delete" && "Delete Admin User"}
              {confirmAction?.action === "reset_password" && "Reset Password"}
              {confirmAction?.action === "resend_invitation" && "Resend Invitation"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.action === "suspend" && (
                <>
                  This will suspend <strong>{confirmAction.user.email}</strong>'s access to the admin panel. 
                  They will be unable to log in until reactivated.
                </>
              )}
              {confirmAction?.action === "unsuspend" && (
                <>
                  This will restore <strong>{confirmAction.user.email}</strong>'s access to the admin panel.
                </>
              )}
              {confirmAction?.action === "delete" && (
                <>
                  This will permanently delete <strong>{confirmAction.user.email}</strong>'s admin account. 
                  This action cannot be undone.
                </>
              )}
              {confirmAction?.action === "reset_password" && (
                <>
                  This will generate a new temporary password for <strong>{confirmAction.user.email}</strong> 
                  and send it via email. The user will be required to change it on next login.
                </>
              )}
              {confirmAction?.action === "resend_invitation" && (
                <>
                  This will send a new invitation email to <strong>{confirmAction.user.email}</strong> 
                  with fresh login credentials.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleAction}
              disabled={isManaging}
              className={cn(
                confirmAction?.action === "delete" && "bg-red-600 hover:bg-red-700",
                confirmAction?.action === "suspend" && "bg-amber-600 hover:bg-amber-700"
              )}
            >
              {isManaging ? "Processing..." : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
