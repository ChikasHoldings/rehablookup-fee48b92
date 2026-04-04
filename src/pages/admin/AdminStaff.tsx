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
    bgColor: "bg-success/10",
    textColor: "text-success",
    dotColor: "bg-success",
  },
  suspended: {
    label: "Suspended",
    bgColor: "bg-destructive/10",
    textColor: "text-destructive",
    dotColor: "bg-destructive",
  },
  pending_password_reset: {
    label: "Pending Setup",
    bgColor: "bg-warning/10",
    textColor: "text-warning",
    dotColor: "bg-warning",
  },
};

// Semantic role color map for consistent theming
const ROLE_BORDER_COLORS: Record<AdminRoleType, string> = {
  super_admin: "border-l-warning",
  manager: "border-l-primary",
  customer_rep: "border-l-success",
  advisor: "border-l-accent-foreground",
};

const ROLE_ICON_BG: Record<AdminRoleType, string> = {
  super_admin: "bg-warning/10",
  manager: "bg-primary/10",
  customer_rep: "bg-success/10",
  advisor: "bg-accent/20",
};

const ROLE_ICON_TEXT: Record<AdminRoleType, string> = {
  super_admin: "text-warning",
  manager: "text-primary",
  customer_rep: "text-success",
  advisor: "text-accent-foreground",
};

export default function AdminStaff() {
  const { logError } = useAdminErrorHandler("AdminStaff");
  const { isSuperAdmin } = useAdminAuth();
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
  
  const stats = useMemo(() => ({
    total: safeAdminUsers.length,
    superAdmin: safeAdminUsers.filter(u => u?.admin_role === "super_admin").length,
    manager: safeAdminUsers.filter(u => u?.admin_role === "manager").length,
    customerRep: safeAdminUsers.filter(u => u?.admin_role === "customer_rep").length,
    advisor: safeAdminUsers.filter(u => u?.admin_role === "advisor").length,
    active: safeAdminUsers.filter(u => u?.status === "active").length,
    suspended: safeAdminUsers.filter(u => u?.status === "suspended").length,
  }), [safeAdminUsers]);

  const filteredUsers = useMemo(() => {
    return safeAdminUsers.filter(user => {
      if (!user) return false;
      
      const q = searchQuery.toLowerCase();
      const matchesSearch = !q || 
        user.email?.toLowerCase().includes(q) ||
        user.first_name?.toLowerCase().includes(q) ||
        user.last_name?.toLowerCase().includes(q) ||
        user.display_name?.toLowerCase().includes(q);

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
    } catch {
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
        ROLE_BORDER_COLORS[user.admin_role]
      )}>
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4 flex-1 min-w-0">
              <div className="relative">
                <Avatar className="h-12 w-12 ring-2 ring-background shadow-sm">
                  <AvatarImage src={user.avatar_url || undefined} />
                  <AvatarFallback className={cn(
                    "text-sm font-semibold",
                    ROLE_ICON_BG[user.admin_role],
                    ROLE_ICON_TEXT[user.admin_role]
                  )}>
                    {getInitials(user)}
                  </AvatarFallback>
                </Avatar>
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
                  <Badge variant="outline" className={cn(
                    "text-[10px] font-medium gap-1 px-1.5 py-0",
                    ROLE_ICON_BG[user.admin_role],
                    ROLE_ICON_TEXT[user.admin_role],
                    "border-transparent"
                  )}>
                    <RoleIcon className="h-2.5 w-2.5" />
                    {roleConfig.shortLabel}
                  </Badge>
                </div>
                
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Mail className="h-3 w-3 shrink-0" />
                  <span className="truncate">{user.email}</span>
                </div>

                <div className="flex items-center gap-3 pt-0.5">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="flex items-center gap-1 text-[10px] text-muted-foreground tabular-nums">
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
                    "text-[10px] gap-1 px-1.5 py-0 border-transparent",
                    statusConfig.bgColor,
                    statusConfig.textColor
                  )}>
                    <span className={cn("h-1.5 w-1.5 rounded-full", statusConfig.dotColor)} />
                    {statusConfig.label}
                  </Badge>

                  {user.mfa_enabled && (
                    <Badge variant="outline" className="text-[10px] gap-1 px-1.5 py-0 bg-primary/10 text-primary border-transparent">
                      <Shield className="h-2.5 w-2.5" />
                      2FA
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Actions - always visible on mobile, hover on desktop */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="h-8 w-8 shrink-0 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {isSuperAdmin && (
                  <DropdownMenuItem onClick={() => openPermissions(user)}>
                    <Settings className="h-4 w-4 mr-2" />
                    Edit Role & Permissions
                  </DropdownMenuItem>
                )}
                {user.status === "pending_password_reset" && isSuperAdmin && (
                  <DropdownMenuItem onClick={() => setConfirmAction({ action: "resend_invitation", user })}>
                    <Send className="h-4 w-4 mr-2" />
                    Resend Invitation
                  </DropdownMenuItem>
                )}
                {isSuperAdmin && (
                  <DropdownMenuItem onClick={() => setConfirmAction({ action: "reset_password", user })}>
                    <KeyRound className="h-4 w-4 mr-2" />
                    Reset Password
                  </DropdownMenuItem>
                )}
                {isSuperAdmin && (
                  <>
                    <DropdownMenuSeparator />
                    {user.status === "active" ? (
                      <DropdownMenuItem 
                        onClick={() => setConfirmAction({ action: "suspend", user })}
                        className="text-warning focus:text-warning"
                      >
                        <Ban className="h-4 w-4 mr-2" />
                        Suspend User
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem 
                        onClick={() => setConfirmAction({ action: "unsuspend", user })}
                        className="text-success focus:text-success"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Reactivate User
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem 
                      onClick={() => setConfirmAction({ action: "delete", user })}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete User
                    </DropdownMenuItem>
                  </>
                )}
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
          {isSuperAdmin && (
            <Button onClick={() => setCreateDialogOpen(true)} size="sm">
              <UserPlus className="h-4 w-4 mr-2" />
              Add Staff Member
            </Button>
          )}
        </div>
      </div>

      {/* Role Stats */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-5">
        <Card className="border-l-4 border-l-muted-foreground/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total</p>
                <p className="text-2xl font-bold tabular-nums">{isLoading ? <Skeleton className="h-8 w-10" /> : stats.total}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                <Users className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-warning">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Super Admin</p>
                <p className="text-2xl font-bold tabular-nums">{isLoading ? <Skeleton className="h-8 w-10" /> : stats.superAdmin}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center">
                <ShieldAlert className="h-5 w-5 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-primary">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Managers</p>
                <p className="text-2xl font-bold tabular-nums">{isLoading ? <Skeleton className="h-8 w-10" /> : stats.manager}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Briefcase className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-success">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Customer Reps</p>
                <p className="text-2xl font-bold tabular-nums">{isLoading ? <Skeleton className="h-8 w-10" /> : stats.customerRep}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
                <HeadphonesIcon className="h-5 w-5 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-accent-foreground">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Advisors</p>
                <p className="text-2xl font-bold tabular-nums">{isLoading ? <Skeleton className="h-8 w-10" /> : stats.advisor}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-accent/20 flex items-center justify-center">
                <Heart className="h-5 w-5 text-accent-foreground" />
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
                  <SelectItem value="super_admin">Super Admin</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="customer_rep">Customer Rep</SelectItem>
                  <SelectItem value="advisor">Advisor</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "all" | "active" | "suspended")}>
              <TabsList className="h-9">
                <TabsTrigger value="all" className="text-xs px-3">
                  All <span className="tabular-nums ml-1">({stats.total})</span>
                </TabsTrigger>
                <TabsTrigger value="active" className="text-xs px-3">
                  <Activity className="h-3 w-3 mr-1" />
                  Active <span className="tabular-nums ml-1">({stats.active})</span>
                </TabsTrigger>
                <TabsTrigger value="suspended" className="text-xs px-3">
                  <XCircle className="h-3 w-3 mr-1" />
                  Suspended <span className="tabular-nums ml-1">({stats.suspended})</span>
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
                  <Skeleton className="h-12 w-12 rounded-full shrink-0" />
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
              {!searchQuery && filterRole === "all" && isSuperAdmin && (
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
                confirmAction?.action === "delete" && "bg-destructive hover:bg-destructive/90 text-destructive-foreground",
                confirmAction?.action === "suspend" && "bg-warning hover:bg-warning/90 text-warning-foreground"
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
