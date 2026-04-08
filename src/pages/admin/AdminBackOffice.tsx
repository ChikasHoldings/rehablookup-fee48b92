import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useImpersonation } from "@/hooks/useImpersonation";
import { useAdminUserManagement, ROLE_DEFAULTS, type AdminRoleType } from "@/hooks/useAdminUserManagement";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import {
  Shield,
  Eye,
  AlertTriangle,
  Users,
  Activity,
  ClipboardList,
  ChevronRight,
} from "lucide-react";
import { Link } from "react-router-dom";
import { EscalationsList } from "@/components/admin/escalations/EscalationsList";

export default function AdminBackOffice() {
  const { user, isSuperAdmin } = useAdminAuth();
  const { startImpersonation, isImpersonating } = useImpersonation();
  const { adminUsers, isLoading: loadingUsers } = useAdminUserManagement();

  // System health stats
  const { data: healthStats, isLoading: loadingHealth } = useQuery({
    queryKey: ["back-office-health"],
    queryFn: async () => {
      const [openEscalations, pendingProviders, activeCases, recentAudit] = await Promise.all([
        supabase.from("admin_escalations").select("id", { count: "exact", head: true }).eq("status", "open"),
        supabase.from("facilities").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("concierge_inquiries").select("id", { count: "exact", head: true }).not("status", "in", '("placed","closed")'),
        supabase.from("admin_audit_log").select("id", { count: "exact", head: true }),
      ]);
      return {
        openEscalations: openEscalations.count || 0,
        pendingProviders: pendingProviders.count || 0,
        activeCases: activeCases.count || 0,
        totalAuditEntries: recentAudit.count || 0,
      };
    },
  });

  // Recent audit log entries
  const { data: recentActions } = useQuery({
    queryKey: ["back-office-recent-actions"],
    queryFn: async () => {
      const { data } = await supabase
        .from("admin_audit_log")
        .select("id, action_type, target_type, created_at, admin_user_id")
        .order("created_at", { ascending: false })
        .limit(10);
      return data || [];
    },
  });

  // Impersonation log
  const { data: impersonationLog } = useQuery({
    queryKey: ["impersonation-log"],
    queryFn: async () => {
      const { data } = await supabase
        .from("admin_impersonation_log")
        .select("*")
        .order("started_at", { ascending: false })
        .limit(10);
      return data || [];
    },
  });

  const handleImpersonate = async (targetUser: any) => {
    if (!user?.id || isImpersonating) return;

    // Fetch target user's permissions
    const { data: perms } = await supabase
      .from("admin_user_permissions")
      .select("permission_key, granted")
      .eq("user_id", targetUser.user_id);

    const permMap: Record<string, boolean> = {};
    perms?.forEach((p: any) => { permMap[p.permission_key] = p.granted; });

    await startImpersonation(
      {
        userId: targetUser.user_id,
        displayName: targetUser.display_name || targetUser.email,
        role: targetUser.admin_role as AdminRoleType,
        permissions: Object.keys(permMap).length > 0 ? permMap : ROLE_DEFAULTS[targetUser.admin_role as AdminRoleType] || {},
      },
      user.id
    );

    toast.success(`Now viewing as ${targetUser.display_name || targetUser.email}`, {
      description: "You'll see the platform as this user sees it. Click 'Exit' in the banner to return.",
    });
  };

  const nonSuperAdminUsers = (adminUsers || []).filter(u => u.admin_role !== "super_admin");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-slate-800 to-slate-600 flex items-center justify-center shadow-lg">
          <Shield className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Back Office</h1>
          <p className="text-sm text-muted-foreground">Super Admin oversight, impersonation & system health</p>
        </div>
      </div>

      {/* System Health Cards */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Card className="border shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase">Open Escalations</p>
                {loadingHealth ? <Skeleton className="h-8 w-10 mt-1" /> : (
                  <p className="text-2xl font-bold tabular-nums">{healthStats?.openEscalations}</p>
                )}
              </div>
              <AlertTriangle className="h-5 w-5 text-warning" />
            </div>
          </CardContent>
        </Card>
        <Card className="border shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase">Active Cases</p>
                {loadingHealth ? <Skeleton className="h-8 w-10 mt-1" /> : (
                  <p className="text-2xl font-bold tabular-nums">{healthStats?.activeCases}</p>
                )}
              </div>
              <Activity className="h-5 w-5 text-info" />
            </div>
          </CardContent>
        </Card>
        <Card className="border shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase">Pending Providers</p>
                {loadingHealth ? <Skeleton className="h-8 w-10 mt-1" /> : (
                  <p className="text-2xl font-bold tabular-nums">{healthStats?.pendingProviders}</p>
                )}
              </div>
              <Users className="h-5 w-5 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card className="border shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase">Audit Entries</p>
                {loadingHealth ? <Skeleton className="h-8 w-10 mt-1" /> : (
                  <p className="text-2xl font-bold tabular-nums">{healthStats?.totalAuditEntries}</p>
                )}
              </div>
              <ClipboardList className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Open Escalations */}
        <Card className="border shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-medium">Escalation Queue</CardTitle>
                <CardDescription className="text-xs">Issues requiring your attention</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/admin/escalations" className="text-xs">
                  View all <ChevronRight className="h-3 w-3 ml-1" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <EscalationsList filterStatus="open" />
          </CardContent>
        </Card>

        {/* Impersonation Controls */}
        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Eye className="h-4 w-4" />
              View As Staff Member
            </CardTitle>
            <CardDescription className="text-xs">
              See the platform exactly as a staff member sees it (read-only)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingUsers ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : nonSuperAdminUsers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No staff members to impersonate</p>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {nonSuperAdminUsers.map((staff) => (
                  <div
                    key={staff.user_id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">
                          {(staff.first_name?.[0] || staff.email[0]).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {staff.display_name || staff.email}
                        </p>
                        <Badge variant="outline" className="text-[10px]">
                          {staff.admin_role.replace("_", " ")}
                        </Badge>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleImpersonate(staff)}
                      disabled={isImpersonating}
                      className="shrink-0"
                    >
                      <Eye className="h-3.5 w-3.5 mr-1.5" />
                      View As
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="border shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-medium">Recent Staff Activity</CardTitle>
              <CardDescription className="text-xs">Latest actions from the audit log</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/admin/audit-log" className="text-xs">
                Full log <ChevronRight className="h-3 w-3 ml-1" />
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {recentActions?.length ? (
            <div className="space-y-2">
              {recentActions.map((action: any) => (
                <div key={action.id} className="flex items-center justify-between p-2 rounded border text-xs">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">{action.action_type}</Badge>
                    <span className="text-muted-foreground">{action.target_type}</span>
                  </div>
                  <span className="text-muted-foreground tabular-nums">
                    {formatDistanceToNow(new Date(action.created_at), { addSuffix: true })}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">No recent activity</p>
          )}
        </CardContent>
      </Card>

      {/* Impersonation Audit Log */}
      {impersonationLog && impersonationLog.length > 0 && (
        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-medium">Impersonation History</CardTitle>
            <CardDescription className="text-xs">Audit trail of "View As" sessions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {impersonationLog.map((entry: any) => (
                <div key={entry.id} className="flex items-center justify-between p-2 rounded border text-xs">
                  <div className="flex items-center gap-2">
                    <Eye className="h-3 w-3 text-muted-foreground" />
                    <span>Viewed as <span className="font-medium">{entry.target_role}</span></span>
                  </div>
                  <div className="flex items-center gap-2">
                    {entry.ended_at ? (
                      <Badge variant="outline" className="text-[10px] bg-success/10 text-success">Ended</Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] bg-warning/10 text-warning">Active</Badge>
                    )}
                    <span className="text-muted-foreground tabular-nums">
                      {formatDistanceToNow(new Date(entry.started_at), { addSuffix: true })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
