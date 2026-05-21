import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
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
  Download,
  Link as LinkIcon,
  Check as CheckIcon,
  X,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
  ADMIN_ROLE_CONFIG,
} from "@/hooks/useAdminUserManagement";
import { CreateAdminUserDialog } from "@/components/admin/CreateAdminUserDialog";
import { AdminUserPermissionsDialog } from "@/components/admin/AdminUserPermissionsDialog";
import { AdminStaffDetailModal } from "@/components/admin/AdminStaffDetailModal";
import {
  BulkAdminStaffActionDialog,
  BulkAdminStaffAction,
} from "@/components/admin/staff/BulkAdminStaffActionDialog";
import { cn } from "@/lib/utils";
import { PaginationFooter } from "@/components/common/PaginationFooter";
import { usePagination } from "@/hooks/usePagination";
import { toast } from "sonner";

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

const ROLE_FILTER_VALUES = new Set<"all" | AdminRoleType>([
  "all",
  "super_admin",
  "manager",
  "customer_rep",
  "advisor",
]);
const TAB_VALUES = new Set<"all" | "active" | "suspended">([
  "all",
  "active",
  "suspended",
]);

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (s.includes(",") || s.includes('"') || s.includes("\n") || s.includes("\r")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export default function AdminStaff() {
  useAdminErrorHandler("AdminStaff");
  const { isSuperAdmin, user: currentUser } = useAdminAuth();
  const {
    adminUsers,
    isLoading,
    isFetching,
    manageAdminUser,
    isManaging,
    refetch,
    queryError,
  } = useAdminUserManagement();

  const [searchParams, setSearchParams] = useSearchParams();
  const hydratedRef = useRef(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState<"all" | AdminRoleType>("all");
  const [activeTab, setActiveTab] = useState<"all" | "active" | "suspended">("all");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [permissionsDialogOpen, setPermissionsDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [detailUser, setDetailUser] = useState<AdminUser | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    action: "suspend" | "unsuspend" | "delete" | "reset_password" | "resend_invitation";
    user: AdminUser;
  } | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDialog, setBulkDialog] = useState<{
    open: boolean;
    action: BulkAdminStaffAction;
  }>({ open: false, action: "suspend" });
  const [copiedLink, setCopiedLink] = useState(false);

  // Hydrate state from URL once on mount
  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;

    const q = searchParams.get("q") || "";
    const role = searchParams.get("role") || "all";
    const tab = searchParams.get("tab") || "all";

    if (q) setSearchQuery(q);
    if (ROLE_FILTER_VALUES.has(role as "all" | AdminRoleType)) {
      setFilterRole(role as "all" | AdminRoleType);
    }
    if (TAB_VALUES.has(tab as "all" | "active" | "suspended")) {
      setActiveTab(tab as "all" | "active" | "suspended");
    }
  }, [searchParams]);

  // Sync state -> URL (loop-guarded: only write when different)
  useEffect(() => {
    if (!hydratedRef.current) return;
    const next = new URLSearchParams(searchParams);
    const setOrDelete = (key: string, value: string, defaultValue: string) => {
      if (value && value !== defaultValue) next.set(key, value);
      else next.delete(key);
    };
    setOrDelete("q", searchQuery, "");
    setOrDelete("role", filterRole, "all");
    setOrDelete("tab", activeTab, "all");

    if (next.toString() !== searchParams.toString()) {
      setSearchParams(next, { replace: true });
    }
  }, [searchQuery, filterRole, activeTab, searchParams, setSearchParams]);

  const safeAdminUsers = useMemo(() => adminUsers || [], [adminUsers]);

  const stats = useMemo(
    () => ({
      total: safeAdminUsers.length,
      superAdmin: safeAdminUsers.filter((u) => u?.admin_role === "super_admin").length,
      manager: safeAdminUsers.filter((u) => u?.admin_role === "manager").length,
      customerRep: safeAdminUsers.filter((u) => u?.admin_role === "customer_rep").length,
      advisor: safeAdminUsers.filter((u) => u?.admin_role === "advisor").length,
      active: safeAdminUsers.filter((u) => u?.status === "active").length,
      suspended: safeAdminUsers.filter((u) => u?.status === "suspended").length,
      pending: safeAdminUsers.filter((u) => u?.status === "pending_password_reset").length,
    }),
    [safeAdminUsers],
  );

  const filteredUsers = useMemo(() => {
    return safeAdminUsers.filter((user) => {
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

  const staffPagination = usePagination({
    tableId: "admin-staff",
    defaultPageSize: 25,
    totalItems: filteredUsers.length,
  });
  const visibleUsers = staffPagination.paginate(filteredUsers);

  useEffect(() => {
    staffPagination.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, searchQuery, filterRole]);

  // Drop selected IDs that fall out of the filtered view to prevent stale
  // selections from carrying into bulk actions.
  useEffect(() => {
    const visible = new Set(filteredUsers.map((u) => u.user_id));
    setSelectedIds((prev) => {
      let changed = false;
      const next = new Set<string>();
      prev.forEach((id) => {
        if (visible.has(id)) next.add(id);
        else changed = true;
      });
      return changed ? next : prev;
    });
  }, [filteredUsers]);

  const filtersActive =
    searchQuery !== "" || filterRole !== "all" || activeTab !== "all";

  const handleClearFilters = useCallback(() => {
    setSearchQuery("");
    setFilterRole("all");
    setActiveTab("all");
    setSelectedIds(new Set());
  }, []);

  const handleCopyLink = useCallback(async () => {
    const url = window.location.href;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(url);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = url;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopiedLink(true);
      toast.success("Filtered view link copied");
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (err) {
      toast.error(
        `Failed to copy link: ${err instanceof Error ? err.message : "unknown error"}`,
      );
    }
  }, []);

  const handleExportCsv = useCallback(() => {
    if (filteredUsers.length === 0) {
      toast.error("No staff members in current filter to export");
      return;
    }

    const headers = [
      "user_id",
      "email",
      "first_name",
      "last_name",
      "display_name",
      "admin_role",
      "status",
      "employment_type",
      "commission_rate",
      "phone",
      "mfa_enabled",
      "mfa_skip",
      "created_at",
      "last_login_at",
    ];
    const rows = filteredUsers.map((u) =>
      [
        u.user_id,
        u.email,
        u.first_name ?? "",
        u.last_name ?? "",
        u.display_name ?? "",
        u.admin_role,
        u.status,
        u.employment_type ?? "",
        u.commission_rate ?? "",
        u.phone ?? "",
        u.mfa_enabled ? "yes" : "no",
        u.mfa_skip ? "yes" : "no",
        u.created_at,
        u.last_login_at ?? "",
      ]
        .map(csvEscape)
        .join(","),
    );
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `admin-staff-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filteredUsers.length} staff member${filteredUsers.length === 1 ? "" : "s"}`);
  }, [filteredUsers]);

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

  // Self-action guard: never let an admin suspend/delete their own account.
  // The dropdown gates this already, but the alert-dialog Confirm button
  // also blocks it as a belt-and-suspenders safety check.
  const isSelfTarget =
    !!confirmAction && !!currentUser && confirmAction.user.user_id === currentUser.id;

  const handleAction = async () => {
    if (!confirmAction) return;

    if (isSelfTarget && (confirmAction.action === "suspend" || confirmAction.action === "delete")) {
      toast.error("You cannot suspend or delete your own account.");
      setConfirmAction(null);
      return;
    }

    try {
      await manageAdminUser({
        action: confirmAction.action,
        targetUserId: confirmAction.user.user_id,
      });
    } catch {
      // useAdminUserManagement's mutation onError already surfaces a toast
      // with the underlying error message — nothing further to do here.
    }

    setConfirmAction(null);
  };

  const openPermissions = (user: AdminUser) => {
    setSelectedUser(user);
    setPermissionsDialogOpen(true);
  };

  // Visible (paginated) IDs eligible for bulk action: exclude super admins
  // (server skips them anyway) and the current user (server skips too).
  const eligibleVisibleIds = useMemo(
    () =>
      visibleUsers
        .filter(
          (u) =>
            u.admin_role !== "super_admin" &&
            (!currentUser || u.user_id !== currentUser.id),
        )
        .map((u) => u.user_id),
    [visibleUsers, currentUser],
  );

  const allVisibleSelected =
    eligibleVisibleIds.length > 0 &&
    eligibleVisibleIds.every((id) => selectedIds.has(id));

  const toggleSelectAllVisible = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        eligibleVisibleIds.forEach((id) => next.delete(id));
      } else {
        eligibleVisibleIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const openBulk = (action: BulkAdminStaffAction) =>
    setBulkDialog({ open: true, action });

  const UserCard = ({ user }: { user: AdminUser }) => {
    const roleConfig = ADMIN_ROLE_CONFIG[user.admin_role];
    const statusConfig =
      STATUS_CONFIG[user.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.active;
    const RoleIcon = ROLE_ICONS[user.admin_role];
    const isSelf = !!currentUser && user.user_id === currentUser.id;
    const isProtected = user.admin_role === "super_admin" || isSelf;
    const isSelected = selectedIds.has(user.user_id);

    return (
      <Card
        className={cn(
          "group relative overflow-hidden transition-all duration-200 hover:shadow-md border-l-4",
          user.status === "suspended" && "opacity-70",
          isSelected && "ring-2 ring-primary/40",
          ROLE_BORDER_COLORS[user.admin_role],
        )}
      >
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-4">
            {/* Multi-select checkbox: only for super admin and only for
                eligible targets. Lives outside the card-click handler so
                checking it doesn't open the detail modal. */}
            {isSuperAdmin && !isProtected && (
              <div
                className="pt-1"
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
              >
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => toggleSelectOne(user.user_id)}
                  aria-label={`Select ${getUserDisplayName(user)}`}
                />
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                setDetailUser(user);
                setDetailModalOpen(true);
              }}
              className="flex items-start gap-4 flex-1 min-w-0 text-left rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={`Open ${getUserDisplayName(user)} details`}
            >
              <div className="relative">
                <Avatar className="h-12 w-12 ring-2 ring-background shadow-sm">
                  <AvatarImage src={user.avatar_url || undefined} />
                  <AvatarFallback
                    className={cn(
                      "text-sm font-semibold",
                      ROLE_ICON_BG[user.admin_role],
                      ROLE_ICON_TEXT[user.admin_role],
                    )}
                  >
                    {getInitials(user)}
                  </AvatarFallback>
                </Avatar>
                <div
                  className={cn(
                    "absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-background",
                    statusConfig.dotColor,
                  )}
                  aria-hidden="true"
                />
              </div>

              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-sm text-foreground truncate">
                    {getUserDisplayName(user)}
                  </h3>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[10px] font-medium gap-1 px-1.5 py-0",
                      ROLE_ICON_BG[user.admin_role],
                      ROLE_ICON_TEXT[user.admin_role],
                      "border-transparent",
                    )}
                  >
                    <RoleIcon className="h-2.5 w-2.5" />
                    {roleConfig.shortLabel}
                  </Badge>
                  {isSelf && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-muted/50 text-muted-foreground border-transparent">
                      You
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Mail className="h-3 w-3 shrink-0" />
                  <span className="truncate">{user.email}</span>
                </div>

                {user.employment_type && (
                  <Badge
                    variant="outline"
                    className="text-[10px] px-1.5 py-0 bg-muted/50 text-muted-foreground border-transparent w-fit"
                  >
                    {user.employment_type === "va"
                      ? "VA"
                      : user.employment_type === "contractor"
                        ? "Contractor"
                        : "Employee"}
                    {user.employment_type === "contractor" && user.commission_rate
                      ? ` · ${user.commission_rate}%`
                      : ""}
                  </Badge>
                )}

                <div className="flex items-center gap-3 pt-0.5">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="flex items-center gap-1 text-[10px] text-muted-foreground tabular-nums">
                        <Clock className="h-2.5 w-2.5" />
                        {user.last_login_at
                          ? formatDistanceToNow(new Date(user.last_login_at), { addSuffix: true })
                          : "Never"}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p>
                        Last login:{" "}
                        {user.last_login_at
                          ? format(new Date(user.last_login_at), "PPpp")
                          : "Never logged in"}
                      </p>
                    </TooltipContent>
                  </Tooltip>

                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[10px] gap-1 px-1.5 py-0 border-transparent",
                      statusConfig.bgColor,
                      statusConfig.textColor,
                    )}
                  >
                    <span
                      className={cn("h-1.5 w-1.5 rounded-full", statusConfig.dotColor)}
                      aria-hidden="true"
                    />
                    {statusConfig.label}
                  </Badge>

                  {user.mfa_enabled && (
                    <Badge
                      variant="outline"
                      className="text-[10px] gap-1 px-1.5 py-0 bg-primary/10 text-primary border-transparent"
                    >
                      <Shield className="h-2.5 w-2.5" />
                      2FA
                    </Badge>
                  )}
                </div>
              </div>
            </button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                  aria-label={`Actions for ${getUserDisplayName(user)}`}
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
                  <DropdownMenuItem
                    onClick={() => setConfirmAction({ action: "resend_invitation", user })}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Resend Invitation
                  </DropdownMenuItem>
                )}
                {isSuperAdmin && (
                  <DropdownMenuItem
                    onClick={() => setConfirmAction({ action: "reset_password", user })}
                  >
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
                        disabled={isSelf}
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
                      disabled={isSelf}
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
      <AdminPageHeader
        icon={Users}
        iconGradient="bg-gradient-to-br from-primary to-indigo-500"
        title="Admin Staff"
        subtitle="Manage admin accounts, roles, and permissions"
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyLink}
              aria-label="Copy link to filtered view"
              disabled={!filtersActive}
              title={filtersActive ? "Copy filtered view URL" : "Apply a filter first"}
            >
              {copiedLink ? (
                <CheckIcon className="h-4 w-4 mr-2 text-success" />
              ) : (
                <LinkIcon className="h-4 w-4 mr-2" />
              )}
              Copy link
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              aria-label="Export current view to CSV"
              disabled={isLoading || filteredUsers.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              aria-label="Refresh staff list"
              disabled={isFetching}
            >
              <RefreshCw className={cn("h-4 w-4 mr-2", isFetching && "animate-spin")} />
              Refresh
            </Button>
            {isSuperAdmin && (
              <Button
                onClick={() => setCreateDialogOpen(true)}
                size="sm"
                aria-label="Add new staff member"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Add Staff Member
              </Button>
            )}
          </div>
        }
      />

      {/* Query-error banner */}
      {queryError && (
        <Card className="border-destructive/40 bg-destructive/5" role="alert">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-destructive">
                Failed to load admin staff
              </p>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                {queryError instanceof Error ? queryError.message : String(queryError)}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Role Stats */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-5">
        <Card className="border-l-4 border-l-muted-foreground/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Total
                </p>
                <p className="text-2xl font-bold tabular-nums">
                  {isLoading ? <Skeleton className="h-8 w-10" /> : stats.total}
                </p>
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
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Super Admin
                </p>
                <p className="text-2xl font-bold tabular-nums">
                  {isLoading ? <Skeleton className="h-8 w-10" /> : stats.superAdmin}
                </p>
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
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Managers
                </p>
                <p className="text-2xl font-bold tabular-nums">
                  {isLoading ? <Skeleton className="h-8 w-10" /> : stats.manager}
                </p>
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
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Customer Reps
                </p>
                <p className="text-2xl font-bold tabular-nums">
                  {isLoading ? <Skeleton className="h-8 w-10" /> : stats.customerRep}
                </p>
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
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Advisors
                </p>
                <p className="text-2xl font-bold tabular-nums">
                  {isLoading ? <Skeleton className="h-8 w-10" /> : stats.advisor}
                </p>
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
                  aria-label="Search staff"
                />
              </div>
              <Select
                value={filterRole}
                onValueChange={(v) => setFilterRole(v as "all" | AdminRoleType)}
              >
                <SelectTrigger className="w-full sm:w-[180px] h-9" aria-label="Filter by role">
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
              {filtersActive && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearFilters}
                  aria-label="Clear all filters"
                  className="h-9"
                >
                  <X className="h-4 w-4 mr-2" />
                  Clear
                </Button>
              )}
            </div>

            <Tabs
              value={activeTab}
              onValueChange={(v) => setActiveTab(v as "all" | "active" | "suspended")}
            >
              <TabsList className="h-9">
                <TabsTrigger value="all" className="text-xs px-3" aria-label="All staff">
                  All <span className="tabular-nums ml-1">({stats.total})</span>
                </TabsTrigger>
                <TabsTrigger value="active" className="text-xs px-3" aria-label="Active staff only">
                  <Activity className="h-3 w-3 mr-1" />
                  Active <span className="tabular-nums ml-1">({stats.active})</span>
                </TabsTrigger>
                <TabsTrigger value="suspended" className="text-xs px-3" aria-label="Suspended staff only">
                  <XCircle className="h-3 w-3 mr-1" />
                  Suspended <span className="tabular-nums ml-1">({stats.suspended})</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardContent>
      </Card>

      {/* Bulk action bar (super admin only) */}
      {isSuperAdmin && selectedIds.size > 0 && (
        <div
          className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-lg border border-primary/40 bg-primary/5"
          role="region"
          aria-label="Bulk staff actions"
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Checkbox
              checked={allVisibleSelected}
              onCheckedChange={toggleSelectAllVisible}
              aria-label={allVisibleSelected ? "Deselect all on page" : "Select all on page"}
            />
            <span className="text-sm font-medium">
              {selectedIds.size} selected
            </span>
            <Button
              variant="link"
              size="sm"
              className="h-auto p-0 text-xs"
              onClick={() => setSelectedIds(new Set())}
            >
              Clear selection
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => openBulk("suspend")}
              className="text-warning hover:text-warning"
              aria-label={`Bulk suspend ${selectedIds.size} staff members`}
            >
              <Ban className="h-3.5 w-3.5 mr-1.5" /> Suspend
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => openBulk("unsuspend")}
              className="text-success hover:text-success"
              aria-label={`Bulk reactivate ${selectedIds.size} staff members`}
            >
              <CheckCircle className="h-3.5 w-3.5 mr-1.5" /> Reactivate
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => openBulk("reset_password")}
              aria-label={`Bulk reset passwords for ${selectedIds.size} staff members`}
            >
              <KeyRound className="h-3.5 w-3.5 mr-1.5" /> Reset PW
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => openBulk("resend_invitation")}
              aria-label={`Bulk resend invitations for ${selectedIds.size} staff members`}
            >
              <Send className="h-3.5 w-3.5 mr-1.5" /> Resend invite
            </Button>
          </div>
        </div>
      )}

      {/* isFetching indicator (post-hydration) */}
      {isFetching && !isLoading && (
        <p
          className="text-xs text-muted-foreground -mt-2 px-1"
          aria-live="polite"
        >
          Refreshing staff list…
        </p>
      )}

      {/* Bulk select-all-on-page helper (only when there are eligible rows) */}
      {isSuperAdmin && eligibleVisibleIds.length > 0 && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground pl-1">
          <Checkbox
            checked={allVisibleSelected}
            onCheckedChange={toggleSelectAllVisible}
            aria-label={
              allVisibleSelected ? "Deselect all on page" : "Select all on page"
            }
          />
          <span>
            {allVisibleSelected ? "Deselect" : "Select"} all visible (
            {eligibleVisibleIds.length})
          </span>
          <span className="text-muted-foreground/60">
            · Super admins and your own account are not bulk-actionable
          </span>
        </div>
      )}

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
                {filtersActive
                  ? "Try adjusting your search or filters"
                  : "Add your first admin staff member to get started"}
              </p>
              {!filtersActive && isSuperAdmin && (
                <Button
                  onClick={() => setCreateDialogOpen(true)}
                  className="mt-4"
                  size="sm"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Staff Member
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {visibleUsers.map((user) => (
              <UserCard key={user.user_id} user={user} />
            ))}
          </div>
          <PaginationFooter
            page={staffPagination.page}
            pageSize={staffPagination.pageSize}
            totalPages={staffPagination.totalPages}
            totalItems={filteredUsers.length}
            onPageChange={staffPagination.setPage}
            onPageSizeChange={staffPagination.setPageSize}
            itemLabel="staff member"
          />
        </>
      )}

      {/* Staff Detail Modal */}
      <AdminStaffDetailModal
        user={detailUser}
        open={detailModalOpen}
        onOpenChange={setDetailModalOpen}
        onAction={(action, u) => {
          setDetailModalOpen(false);
          if (action === "edit_permissions") {
            openPermissions(u);
          } else {
            setConfirmAction({
              action: action as "suspend" | "unsuspend" | "delete" | "reset_password" | "resend_invitation",
              user: u,
            });
          }
        }}
      />

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

      {/* Bulk Action Dialog */}
      <BulkAdminStaffActionDialog
        open={bulkDialog.open}
        onOpenChange={(open) => setBulkDialog((b) => ({ ...b, open }))}
        action={bulkDialog.action}
        selectedIds={selectedIds}
        onSuccess={() => {
          setSelectedIds(new Set());
          refetch();
        }}
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
                  This will suspend <strong>{confirmAction.user.email}</strong>'s access to
                  the admin panel. They will be unable to log in until reactivated.
                </>
              )}
              {confirmAction?.action === "unsuspend" && (
                <>
                  This will restore <strong>{confirmAction.user.email}</strong>'s access to
                  the admin panel.
                </>
              )}
              {confirmAction?.action === "delete" && (
                <>
                  This will permanently delete <strong>{confirmAction.user.email}</strong>'s
                  admin account. This action cannot be undone.
                </>
              )}
              {confirmAction?.action === "reset_password" && (
                <>
                  This will generate a new temporary password for{" "}
                  <strong>{confirmAction.user.email}</strong> and send it via email. The
                  user will be required to change it on next login.
                </>
              )}
              {confirmAction?.action === "resend_invitation" && (
                <>
                  This will send a new invitation email to{" "}
                  <strong>{confirmAction.user.email}</strong> with fresh login credentials.
                </>
              )}
              {isSelfTarget && (confirmAction?.action === "suspend" || confirmAction?.action === "delete") && (
                <span className="block mt-2 text-destructive font-medium">
                  You cannot perform this action on your own account.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleAction}
              disabled={
                isManaging ||
                (isSelfTarget && (confirmAction?.action === "suspend" || confirmAction?.action === "delete"))
              }
              className={cn(
                confirmAction?.action === "delete" &&
                  "bg-destructive hover:bg-destructive/90 text-destructive-foreground",
                confirmAction?.action === "suspend" &&
                  "bg-warning hover:bg-warning/90 text-warning-foreground",
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
