import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useImpersonation } from "@/hooks/useImpersonation";
import { useAdminUserManagement, ROLE_DEFAULTS, type AdminRoleType } from "@/hooks/useAdminUserManagement";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  RefreshCw,
  Loader2,
  ArrowRightLeft,
  Zap,
} from "lucide-react";
import { Link } from "react-router-dom";
import { EscalationsList } from "@/components/admin/escalations/EscalationsList";

export default function AdminBackOffice() {
  const { user, isSuperAdmin } = useAdminAuth();
  const { startImpersonation, isImpersonating } = useImpersonation();
  const { adminUsers, isLoading: loadingUsers } = useAdminUserManagement();
  const queryClient = useQueryClient();

  // Override dialogs state
  const [reassignOpen, setReassignOpen] = useState(false);
  const [reassignCaseId, setReassignCaseId] = useState("");
  const [reassignAdvisorId, setReassignAdvisorId] = useState("");
  const [forceStatusOpen, setForceStatusOpen] = useState(false);
  const [forceStatusCaseId, setForceStatusCaseId] = useState("");
  const [forceStatusValue, setForceStatusValue] = useState("");

  // System health stats
  const { data: healthStats, isLoading: loadingHealth } = useQuery({
    queryKey: ["back-office-health"],
    queryFn: async () => {
      const [openEscalations, pendingProviders, activeCases, recentAudit, totalStaff] = await Promise.all([
        supabase.from("admin_escalations").select("id", { count: "exact", head: true }).eq("status", "open"),
        supabase.from("facilities").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("concierge_inquiries").select("id", { count: "exact", head: true }).not("status", "in", '("placed","closed")'),
        supabase.from("admin_audit_log").select("id", { count: "exact", head: true }),
        supabase.from("admin_user_profiles").select("id", { count: "exact", head: true }),
      ]);
      return {
        openEscalations: openEscalations.count || 0,
        pendingProviders: pendingProviders.count || 0,
        activeCases: activeCases.count || 0,
        totalAuditEntries: recentAudit.count || 0,
        totalStaff: totalStaff.count || 0,
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
        .limit(15);
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

  // Case reassignment mutation
  const reassignMutation = useMutation({
    mutationFn: async () => {
      if (!reassignCaseId.trim() || !reassignAdvisorId) throw new Error("Case ID and Advisor are required");
      const { error } = await supabase
        .from("concierge_inquiries")
        .update({ assigned_advisor_id: reassignAdvisorId })
        .eq("id", reassignCaseId.trim());
      if (error) throw error;
      // Log event
      await supabase.from("concierge_case_events").insert({
        inquiry_id: reassignCaseId.trim(),
        event_type: "advisor_reassigned",
        event_data: { new_advisor_id: reassignAdvisorId, reassigned_by: user?.id },
        actor_type: "admin",
        actor_id: user?.id,
      });
    },
    onSuccess: () => {
      toast.success("Case reassigned successfully");
      setReassignOpen(false);
      setReassignCaseId("");
      setReassignAdvisorId("");
      queryClient.invalidateQueries({ queryKey: ["back-office-health"] });
    },
    onError: (err: Error) => toast.error("Failed to reassign", { description: err.message }),
  });

  // Force status mutation
  const forceStatusMutation = useMutation({
    mutationFn: async () => {
      if (!forceStatusCaseId.trim() || !forceStatusValue) throw new Error("Case ID and Status are required");
      const updates: Record<string, any> = { status: forceStatusValue };
      if (forceStatusValue === "closed") updates.closed_at = new Date().toISOString();
      const { error } = await supabase
        .from("concierge_inquiries")
        .update(updates)
        .eq("id", forceStatusCaseId.trim());
      if (error) throw error;
      await supabase.from("concierge_case_events").insert({
        inquiry_id: forceStatusCaseId.trim(),
        event_type: "status_force_changed",
        event_data: { new_status: forceStatusValue, forced_by: user?.id },
        actor_type: "admin",
        actor_id: user?.id,
      });
    },
    onSuccess: () => {
      toast.success("Case status forced");
      setForceStatusOpen(false);
      setForceStatusCaseId("");
      setForceStatusValue("");
      queryClient.invalidateQueries({ queryKey: ["back-office-health"] });
    },
    onError: (err: Error) => toast.error("Failed to update", { description: err.message }),
  });

  const handleImpersonate = async (targetUser: any) => {
    if (!user?.id || isImpersonating) return;

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
      description: "The sidebar and dashboard now reflect this user's view. Click 'Exit' to return.",
    });
  };

  const nonSuperAdminUsers = (adminUsers || []).filter(u => u.admin_role !== "super_admin");
  const advisors = (adminUsers || []).filter(u => u.admin_role === "advisor");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-slate-800 to-slate-600 flex items-center justify-center shadow-lg">
            <Shield className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Back Office</h1>
            <p className="text-sm text-muted-foreground">Command center — oversight, impersonation & overrides</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => queryClient.invalidateQueries()}>
          <RefreshCw className="h-4 w-4 mr-1.5" />
          Refresh All
        </Button>
      </div>

      {/* System Health Cards */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-5">
        {[
          { label: "Open Escalations", value: healthStats?.openEscalations, icon: AlertTriangle, color: "text-warning" },
          { label: "Active Cases", value: healthStats?.activeCases, icon: Activity, color: "text-info" },
          { label: "Pending Providers", value: healthStats?.pendingProviders, icon: Users, color: "text-primary" },
          { label: "Total Staff", value: healthStats?.totalStaff, icon: Users, color: "text-muted-foreground" },
          { label: "Audit Entries", value: healthStats?.totalAuditEntries, icon: ClipboardList, color: "text-muted-foreground" },
        ].map((stat) => (
          <Card key={stat.label} className="border shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase">{stat.label}</p>
                  {loadingHealth ? <Skeleton className="h-8 w-10 mt-1" /> : (
                    <p className="text-2xl font-bold tabular-nums">{stat.value}</p>
                  )}
                </div>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Override Actions */}
      <Card className="border shadow-sm border-amber-200/50">
        <CardHeader>
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Zap className="h-4 w-4 text-warning" />
            Override Actions
          </CardTitle>
          <CardDescription className="text-xs">Direct case management overrides (Super Admin only)</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button variant="outline" size="sm" onClick={() => setReassignOpen(true)}>
            <ArrowRightLeft className="h-4 w-4 mr-1.5" />
            Reassign Case
          </Button>
          <Button variant="outline" size="sm" onClick={() => setForceStatusOpen(true)}>
            <Zap className="h-4 w-4 mr-1.5" />
            Force Status Change
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to="/admin/users">
              <Users className="h-4 w-4 mr-1.5" />
              Manage Staff
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to="/admin/security-logs">
              <Shield className="h-4 w-4 mr-1.5" />
              Security Logs
            </Link>
          </Button>
        </CardContent>
      </Card>

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
              See the platform exactly as a staff member sees it. Sidebar, dashboard, and permissions will match the target role.
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
                          {staff.display_name || `${staff.first_name || ''} ${staff.last_name || ''}`.trim() || staff.email}
                        </p>
                        <div className="flex items-center gap-1.5">
                          <Badge variant="outline" className="text-[10px]">
                            {staff.admin_role.replace("_", " ")}
                          </Badge>
                          {staff.employment_type && (
                            <Badge variant="secondary" className="text-[10px]">
                              {staff.employment_type}
                            </Badge>
                          )}
                          <Badge variant={staff.status === "active" ? "default" : "destructive"} className="text-[10px]">
                            {staff.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleImpersonate(staff)}
                      disabled={isImpersonating || staff.status !== "active"}
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
              <CardDescription className="text-xs">Latest actions across the platform</CardDescription>
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
              {recentActions.map((action: any) => {
                const staffMember = adminUsers?.find(u => u.user_id === action.admin_user_id);
                return (
                  <div key={action.id} className="flex items-center justify-between p-2 rounded border text-xs">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px]">{action.action_type}</Badge>
                      <span className="text-muted-foreground">{action.target_type}</span>
                      {staffMember && (
                        <span className="text-muted-foreground">by {staffMember.display_name || staffMember.email}</span>
                      )}
                    </div>
                    <span className="text-muted-foreground tabular-nums">
                      {formatDistanceToNow(new Date(action.created_at), { addSuffix: true })}
                    </span>
                  </div>
                );
              })}
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
              {impersonationLog.map((entry: any) => {
                const targetStaff = adminUsers?.find(u => u.user_id === entry.target_user_id);
                return (
                  <div key={entry.id} className="flex items-center justify-between p-2 rounded border text-xs">
                    <div className="flex items-center gap-2">
                      <Eye className="h-3 w-3 text-muted-foreground" />
                      <span>
                        Viewed as{" "}
                        <span className="font-medium">
                          {targetStaff?.display_name || targetStaff?.email || entry.target_role}
                        </span>
                        {" "}({entry.target_role.replace("_", " ")})
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {entry.ended_at ? (
                        <Badge variant="outline" className="text-[10px]">Ended</Badge>
                      ) : (
                        <Badge variant="destructive" className="text-[10px]">Active</Badge>
                      )}
                      <span className="text-muted-foreground tabular-nums">
                        {formatDistanceToNow(new Date(entry.started_at), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reassign Case Dialog */}
      <Dialog open={reassignOpen} onOpenChange={setReassignOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5" />
              Reassign Case
            </DialogTitle>
            <DialogDescription>Override the current advisor assignment on a case.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Case ID</Label>
              <Input
                placeholder="Paste the case UUID..."
                value={reassignCaseId}
                onChange={(e) => setReassignCaseId(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Assign to Advisor</Label>
              <Select value={reassignAdvisorId} onValueChange={setReassignAdvisorId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select advisor..." />
                </SelectTrigger>
                <SelectContent>
                  {advisors.map((a) => (
                    <SelectItem key={a.user_id} value={a.user_id}>
                      {a.display_name || a.email} ({a.status})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReassignOpen(false)}>Cancel</Button>
            <Button onClick={() => reassignMutation.mutate()} disabled={reassignMutation.isPending || !reassignCaseId.trim() || !reassignAdvisorId}>
              {reassignMutation.isPending && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              Reassign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Force Status Dialog */}
      <Dialog open={forceStatusOpen} onOpenChange={setForceStatusOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-warning" />
              Force Status Change
            </DialogTitle>
            <DialogDescription>Override case status. Use with caution — this bypasses normal workflow.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Case ID</Label>
              <Input
                placeholder="Paste the case UUID..."
                value={forceStatusCaseId}
                onChange={(e) => setForceStatusCaseId(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>New Status</Label>
              <Select value={forceStatusValue} onValueChange={setForceStatusValue}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status..." />
                </SelectTrigger>
                <SelectContent>
                  {["new", "reviewing", "matching", "matched", "introductions_sent", "in_contact", "placed", "closed"].map((s) => (
                    <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setForceStatusOpen(false)}>Cancel</Button>
            <Button onClick={() => forceStatusMutation.mutate()} disabled={forceStatusMutation.isPending || !forceStatusCaseId.trim() || !forceStatusValue} variant="destructive">
              {forceStatusMutation.isPending && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              Force Change
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
