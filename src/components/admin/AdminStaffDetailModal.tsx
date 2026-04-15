import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  User,
  Mail,
  Phone,
  Clock,
  Shield,
  ShieldAlert,
  Briefcase,
  HeadphonesIcon,
  Heart,
  Activity,
  Settings,
  KeyRound,
  Ban,
  CheckCircle,
  FileText,
  Calendar,
  Fingerprint,
  Globe,
} from "lucide-react";
import type { AdminUser, AdminRoleType } from "@/hooks/useAdminUserManagement";
import { ADMIN_ROLE_CONFIG, ADMIN_PERMISSIONS, ROLE_DEFAULTS } from "@/hooks/useAdminUserManagement";

const ROLE_ICONS: Record<AdminRoleType, React.ElementType> = {
  super_admin: ShieldAlert,
  manager: Briefcase,
  customer_rep: HeadphonesIcon,
  advisor: Heart,
};

const STATUS_STYLES: Record<string, { label: string; className: string }> = {
  active: { label: "Active", className: "bg-success/10 text-success border-success/30" },
  suspended: { label: "Suspended", className: "bg-destructive/10 text-destructive border-destructive/30" },
  pending_password_reset: { label: "Pending Setup", className: "bg-warning/10 text-warning border-warning/30" },
};

interface AdminStaffDetailModalProps {
  user: AdminUser | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAction?: (action: string, user: AdminUser) => void;
}

export function AdminStaffDetailModal({
  user,
  open,
  onOpenChange,
  onAction,
}: AdminStaffDetailModalProps) {
  const { isSuperAdmin } = useAdminAuth();
  const [activeTab, setActiveTab] = useState("overview");

  // Fetch audit log for this user
  const { data: auditLogs, isLoading: auditLoading } = useQuery({
    queryKey: ["admin-staff-audit", user?.user_id],
    queryFn: async () => {
      if (!user?.user_id) return [];
      const { data, error } = await supabase
        .from("admin_audit_log")
        .select("id, action_type, target_type, target_id, details, created_at")
        .eq("admin_user_id", user.user_id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.user_id && open,
  });

  // Fetch assigned concierge cases (for advisors)
  const { data: assignedCases } = useQuery({
    queryKey: ["admin-staff-cases", user?.user_id],
    queryFn: async () => {
      if (!user?.user_id) return [];
      const { data, error } = await supabase
        .from("concierge_inquiries")
        .select("id, user_name, status, created_at, updated_at")
        .eq("assigned_advisor_id", user.user_id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.user_id && open,
  });

  if (!user) return null;

  const roleConfig = ADMIN_ROLE_CONFIG[user.admin_role];
  const statusStyle = STATUS_STYLES[user.status] || STATUS_STYLES.active;
  const RoleIcon = ROLE_ICONS[user.admin_role];
  const displayName = user.display_name || [user.first_name, user.last_name].filter(Boolean).join(" ") || user.email.split("@")[0];
  const initials = user.first_name && user.last_name
    ? `${user.first_name[0]}${user.last_name[0]}`.toUpperCase()
    : user.email.slice(0, 2).toUpperCase();

  const effectivePermissions = { ...ROLE_DEFAULTS[user.admin_role], ...user.permissions };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 gap-0">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 flex-shrink-0">
          <div className="flex items-start gap-4">
            <Avatar className="h-14 w-14 ring-2 ring-background shadow-md">
              <AvatarImage src={user.avatar_url || undefined} />
              <AvatarFallback className={cn("text-base font-bold", `bg-${user.admin_role === "super_admin" ? "warning" : "primary"}/10`, `text-${user.admin_role === "super_admin" ? "warning" : "primary"}`)}>
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <DialogTitle className="text-lg">{displayName}</DialogTitle>
                <Badge variant="outline" className={cn("text-xs gap-1", statusStyle.className)}>
                  {statusStyle.label}
                </Badge>
              </div>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <Badge variant="outline" className="text-[10px] gap-1">
                  <RoleIcon className="h-3 w-3" />
                  {roleConfig.label}
                </Badge>
                {user.mfa_enabled && (
                  <Badge variant="outline" className="text-[10px] gap-1 bg-primary/10 text-primary border-primary/30">
                    <Shield className="h-3 w-3" />
                    2FA
                  </Badge>
                )}
                {user.employment_type && (
                  <Badge variant="outline" className="text-[10px] capitalize">
                    {user.employment_type === "va" ? "VA" : user.employment_type}
                    {user.commission_rate ? ` · ${user.commission_rate}%` : ""}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <Mail className="h-3 w-3" />
                {user.email}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          {isSuperAdmin && onAction && (
            <div className="flex gap-2 mt-3 flex-wrap">
              <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => onAction("edit_permissions", user)}>
                <Settings className="h-3 w-3 mr-1" />
                Permissions
              </Button>
              <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => onAction("reset_password", user)}>
                <KeyRound className="h-3 w-3 mr-1" />
                Reset Password
              </Button>
              {user.status === "active" ? (
                <Button size="sm" variant="outline" className="text-xs h-7 text-warning hover:text-warning" onClick={() => onAction("suspend", user)}>
                  <Ban className="h-3 w-3 mr-1" />
                  Suspend
                </Button>
              ) : user.status === "suspended" ? (
                <Button size="sm" variant="outline" className="text-xs h-7 text-success hover:text-success" onClick={() => onAction("unsuspend", user)}>
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Reactivate
                </Button>
              ) : null}
            </div>
          )}
        </DialogHeader>

        <Separator />

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="mx-6 mt-3 grid grid-cols-4 flex-shrink-0">
            <TabsTrigger value="overview" className="text-xs gap-1">
              <User className="h-3.5 w-3.5" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="permissions" className="text-xs gap-1">
              <Shield className="h-3.5 w-3.5" />
              Access
            </TabsTrigger>
            <TabsTrigger value="assignments" className="text-xs gap-1">
              <Briefcase className="h-3.5 w-3.5" />
              Assigned
            </TabsTrigger>
            <TabsTrigger value="activity" className="text-xs gap-1">
              <Activity className="h-3.5 w-3.5" />
              Activity
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 px-6 pb-6">
            {/* Overview */}
            <TabsContent value="overview" className="m-0 mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <InfoItem icon={Calendar} label="Joined" value={format(new Date(user.created_at), "MMM d, yyyy")} />
                <InfoItem icon={Clock} label="Last Login" value={user.last_login_at ? formatDistanceToNow(new Date(user.last_login_at), { addSuffix: true }) : "Never"} />
                <InfoItem icon={Mail} label="Email" value={user.email} />
                <InfoItem icon={Phone} label="Phone" value={user.phone || "Not set"} />
                <InfoItem icon={Fingerprint} label="MFA" value={user.mfa_enabled ? "Enabled" : user.mfa_skip ? "Skipped" : "Not set up"} />
                <InfoItem icon={Globe} label="Employment" value={user.employment_type ? (user.employment_type === "va" ? "Virtual Assistant" : user.employment_type === "contractor" ? "Contractor" : "Employee") : "Not specified"} />
              </div>

              <Separator />

              <div>
                <h4 className="text-sm font-medium mb-2">Role Description</h4>
                <p className="text-xs text-muted-foreground">{roleConfig.description}</p>
              </div>
            </TabsContent>

            {/* Permissions */}
            <TabsContent value="permissions" className="m-0 mt-4 space-y-3">
              <p className="text-xs text-muted-foreground mb-3">
                Permissions are based on the <strong>{roleConfig.label}</strong> role with any custom overrides.
              </p>
              <div className="space-y-1.5">
                {Object.entries(ADMIN_PERMISSIONS).map(([key, perm]) => {
                  const granted = effectivePermissions[key] ?? false;
                  return (
                    <div key={key} className="flex items-center justify-between p-2.5 rounded-lg border">
                      <div>
                        <p className="text-sm font-medium">{perm.label}</p>
                        <p className="text-[11px] text-muted-foreground">{perm.description}</p>
                      </div>
                      <Badge variant="outline" className={cn("text-[10px]", granted ? "bg-success/10 text-success" : "bg-muted text-muted-foreground")}>
                        {granted ? "Granted" : "Denied"}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </TabsContent>

            {/* Assignments */}
            <TabsContent value="assignments" className="m-0 mt-4 space-y-3">
              <h4 className="text-sm font-medium">Assigned Placement Cases</h4>
              {!assignedCases?.length ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Briefcase className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No assigned cases</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {assignedCases.map((c) => (
                    <div key={c.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                      <div>
                        <p className="text-sm font-medium">{c.user_name}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-[10px] capitalize">{c.status}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Activity / Audit Log */}
            <TabsContent value="activity" className="m-0 mt-4 space-y-3">
              <h4 className="text-sm font-medium">Recent Actions</h4>
              {auditLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : !auditLogs?.length ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No activity recorded</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {auditLogs.map((log) => (
                    <div key={log.id} className="p-3 rounded-lg border text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-medium capitalize">{log.action_type.replace(/_/g, " ")}</span>
                        <span className="text-muted-foreground tabular-nums">
                          {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-muted-foreground mt-0.5">
                        {log.target_type}{log.target_id ? ` · ${log.target_id.slice(0, 8)}…` : ""}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function InfoItem({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="p-3 rounded-lg border">
      <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
        <Icon className="h-3 w-3" />
        <span className="text-[10px] font-medium uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-sm font-medium truncate">{value}</p>
    </div>
  );
}
