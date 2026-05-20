import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useImpersonation } from "@/hooks/useImpersonation";
import {
  useAdminUserManagement,
  ROLE_DEFAULTS,
  type AdminRoleType,
  type AdminUser,
} from "@/hooks/useAdminUserManagement";
import { getCaseEventActorType } from "@/lib/caseEventActor";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
  AlertCircle,
} from "lucide-react";
import { EscalationsList } from "@/components/admin/escalations/EscalationsList";
import { SmokeTestRunner } from "@/components/admin/SmokeTestRunner";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const FORCE_STATUS_OPTIONS = [
  "intake_submitted",
  "intake_reviewed",
  "advisor_assigned",
  "matching_providers",
  "provider_prequalification",
  "providers_accepted",
  "presented_to_seeker",
  "seeker_selected",
  "admission_in_progress",
  "admitted",
  "billed",
  "completed",
  "closed",
] as const;

// The auto-expire trigger on admin_impersonation_log flips ended_at to now()
// + 60 minutes after start, so any row with ended_at IS NULL but a
// started_at older than this threshold is effectively orphaned. We label
// it "Expired" instead of the misleading "Active" badge.
const IMPERSONATION_STALE_MS = 60 * 60 * 1000;

const BACK_OFFICE_QUERY_KEYS = [
  ["back-office-health"],
  ["back-office-recent-actions"],
  ["impersonation-log"],
  ["admin-users-full"],
  ["admin-escalations"],
] as const;

export default function AdminBackOffice() {
  const { user, isSuperAdmin, adminRole } = useAdminAuth();
  const { startImpersonation, stopImpersonation, isImpersonating, impersonating } =
    useImpersonation();
  const {
    adminUsers,
    isLoading: loadingUsers,
    queryError: usersQueryError,
    refetch: refetchUsers,
  } = useAdminUserManagement();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const hydratedRef = useRef(false);

  // Override dialogs state
  const [reassignOpen, setReassignOpen] = useState(false);
  const [reassignCaseId, setReassignCaseId] = useState("");
  const [reassignAdvisorId, setReassignAdvisorId] = useState("");
  const [reassignReason, setReassignReason] = useState("");
  const [forceStatusOpen, setForceStatusOpen] = useState(false);
  const [forceStatusCaseId, setForceStatusCaseId] = useState("");
  const [forceStatusValue, setForceStatusValue] = useState("");
  const [forceStatusReason, setForceStatusReason] = useState("");

  // URL deep-links: ?reassign=<uuid> opens the reassign dialog pre-filled
  // and ?force=<uuid> opens the force-status dialog pre-filled. Super-admin
  // only, since both dialogs are super-admin gated. Drained from the URL
  // after consumption so reload doesn't keep re-opening the dialog.
  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;

    if (!isSuperAdmin) return;

    const reassign = searchParams.get("reassign");
    const force = searchParams.get("force");

    let dirty = false;
    const next = new URLSearchParams(searchParams);

    if (reassign && UUID_REGEX.test(reassign)) {
      setReassignCaseId(reassign);
      setReassignOpen(true);
      next.delete("reassign");
      dirty = true;
    }
    if (force && UUID_REGEX.test(force)) {
      setForceStatusCaseId(force);
      setForceStatusOpen(true);
      next.delete("force");
      dirty = true;
    }

    if (dirty) setSearchParams(next, { replace: true });
  }, [isSuperAdmin, searchParams, setSearchParams]);

  // Realtime: admin_audit_log + admin_impersonation_log went into the
  // supabase_realtime publication in migration 20260626000000. We re-fetch
  // both panels (and the audit-count tile) on every change so the back
  // office stays current across concurrent admin sessions. 30s poll
  // fallback covers channel drops.
  useEffect(() => {
    const invalidate = () => {
      queryClient.invalidateQueries({ queryKey: ["back-office-recent-actions"] });
      queryClient.invalidateQueries({ queryKey: ["back-office-health"] });
      queryClient.invalidateQueries({ queryKey: ["impersonation-log"] });
    };

    const channel = supabase
      .channel("admin-back-office-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "admin_audit_log" },
        invalidate,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "admin_impersonation_log" },
        invalidate,
      )
      .subscribe();

    const interval = setInterval(invalidate, 30_000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [queryClient]);

  // System health stats — every count check is .error-guarded; failures
  // bubble to isError so the UI surfaces the issue instead of silently
  // showing zeros.
  const {
    data: healthStats,
    isLoading: loadingHealth,
    isError: healthError,
    error: healthErrorObj,
    refetch: refetchHealth,
  } = useQuery({
    queryKey: ["back-office-health"],
    queryFn: async () => {
      const [openEscalations, pendingProviders, activeCases, recentAudit, totalStaff, activeImpersonations] = await Promise.all([
        supabase.from("admin_escalations").select("id", { count: "exact", head: true }).eq("status", "open"),
        supabase.from("facilities").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("concierge_inquiries").select("id", { count: "exact", head: true }).not("status", "in", "(completed,closed)"),
        supabase.from("admin_audit_log").select("id", { count: "exact", head: true }),
        supabase.from("admin_user_profiles").select("id", { count: "exact", head: true }),
        supabase
          .from("admin_impersonation_log")
          .select("id", { count: "exact", head: true })
          .is("ended_at", null)
          .gt("started_at", new Date(Date.now() - IMPERSONATION_STALE_MS).toISOString()),
      ]);

      const errors = [
        openEscalations.error,
        pendingProviders.error,
        activeCases.error,
        recentAudit.error,
        totalStaff.error,
        activeImpersonations.error,
      ].filter(Boolean);
      if (errors.length > 0) {
        throw new Error(
          `Health stats partial failure: ${errors[0]!.message}`,
        );
      }

      return {
        openEscalations: openEscalations.count ?? 0,
        pendingProviders: pendingProviders.count ?? 0,
        activeCases: activeCases.count ?? 0,
        totalAuditEntries: recentAudit.count ?? 0,
        totalStaff: totalStaff.count ?? 0,
        activeImpersonations: activeImpersonations.count ?? 0,
      };
    },
    staleTime: 15_000,
  });

  // Recent audit entries — error-throwing on failure, realtime via channel.
  const {
    data: recentActions,
    isError: recentActionsError,
    error: recentActionsErrorObj,
    refetch: refetchRecentActions,
  } = useQuery({
    queryKey: ["back-office-recent-actions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_audit_log")
        .select("id, action_type, target_type, created_at, admin_user_id")
        .order("created_at", { ascending: false })
        .limit(15);
      if (error) throw error;
      return data || [];
    },
    staleTime: 10_000,
  });

  // Impersonation log — error-throwing, realtime via channel, accepts null
  // target_role defensively (we now coerce display).
  const {
    data: impersonationLog,
    isError: impLogError,
    error: impLogErrorObj,
    refetch: refetchImpLog,
  } = useQuery({
    queryKey: ["impersonation-log"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_impersonation_log")
        .select("id, admin_user_id, target_user_id, target_role, started_at, ended_at")
        .order("started_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data || [];
    },
    enabled: isSuperAdmin,
    staleTime: 10_000,
  });

  // Lookup map for resolving admin display names on the activity feed.
  // Avoids the O(n*m) Array.find pattern on every render.
  const adminUserMap = useMemo(() => {
    const map = new Map<string, AdminUser>();
    (adminUsers || []).forEach((u) => map.set(u.user_id, u));
    return map;
  }, [adminUsers]);

  // Case reassignment mutation — Super Admin / Manager tool.
  //
  // Hardening notes:
  //   1. Validates the case ID is a UUID before round-tripping
  //   2. Snapshots the prior advisor to enforce an optimistic lock
  //   3. Writes the case_events + audit_log entries CHECKING THEIR ERRORS
  //      so a partial-state half-update (DB row updated but timeline /
  //      audit missing) is surfaced instead of swallowed
  //   4. Includes an optional reason in both the case_events payload and
  //      the audit log for accountability
  const reassignMutation = useMutation({
    mutationFn: async () => {
      const caseId = reassignCaseId.trim();
      if (!caseId || !UUID_REGEX.test(caseId)) {
        throw new Error("Case ID must be a valid UUID");
      }
      if (!reassignAdvisorId) throw new Error("Advisor selection is required");

      const { data: existing, error: fetchErr } = await supabase
        .from("concierge_inquiries")
        .select("id, assigned_advisor_id")
        .eq("id", caseId)
        .maybeSingle();
      if (fetchErr) throw fetchErr;
      if (!existing) throw new Error("Case not found");
      const previousAdvisorId = existing.assigned_advisor_id ?? null;

      if (previousAdvisorId === reassignAdvisorId) {
        throw new Error("Selected advisor is already assigned to this case");
      }

      let q = supabase
        .from("concierge_inquiries")
        .update({ assigned_advisor_id: reassignAdvisorId })
        .eq("id", caseId);
      q = previousAdvisorId
        ? q.eq("assigned_advisor_id", previousAdvisorId)
        : q.is("assigned_advisor_id", null);
      const { data: updated, error } = await q.select("id").maybeSingle();
      if (error) throw error;
      if (!updated) {
        throw new Error(
          "This case's advisor was changed by someone else. Refresh and try again.",
        );
      }

      const trimmedReason = reassignReason.trim().slice(0, 500) || null;

      // Timeline event for the case — propagate errors so a partial-state
      // outcome is surfaced rather than swallowed.
      const { error: eventErr } = await supabase
        .from("concierge_case_events")
        .insert({
          inquiry_id: caseId,
          event_type: "advisor_reassigned",
          event_data: {
            new_advisor_id: reassignAdvisorId,
            previous_advisor_id: previousAdvisorId,
            reassigned_by: user?.id,
            reason: trimmedReason,
          },
          actor_type: getCaseEventActorType(adminRole),
          actor_id: user?.id,
        });
      if (eventErr) {
        throw new Error(
          `Case reassigned but timeline event failed to write: ${eventErr.message}`,
        );
      }

      if (user?.id) {
        const { error: auditErr } = await supabase.from("admin_audit_log").insert({
          admin_user_id: user.id,
          action_type: "concierge_advisor_reassign",
          target_type: "concierge_inquiry",
          target_id: caseId,
          details: {
            from_advisor_id: previousAdvisorId,
            to_advisor_id: reassignAdvisorId,
            surface: "back_office_reassign",
            reason: trimmedReason,
          },
        });
        if (auditErr) {
          throw new Error(
            `Case reassigned but audit log write failed: ${auditErr.message}`,
          );
        }
      }
    },
    onSuccess: () => {
      toast.success("Case reassigned successfully");
      setReassignOpen(false);
      setReassignCaseId("");
      setReassignAdvisorId("");
      setReassignReason("");
      queryClient.invalidateQueries({ queryKey: ["back-office-health"] });
      queryClient.invalidateQueries({ queryKey: ["back-office-recent-actions"] });
    },
    onError: (err: Error) =>
      toast.error("Failed to reassign", { description: err.message }),
  });

  // Force status mutation — uses SECURITY DEFINER RPC that bypasses the
  // validate_concierge_status_transition trigger after verifying the
  // caller is an active Super Admin. The RPC also writes the audit log
  // and case-event entries server-side, AND now accepts an explicit
  // reason that we surface in the dialog.
  const forceStatusMutation = useMutation({
    mutationFn: async () => {
      const caseId = forceStatusCaseId.trim();
      if (!caseId || !UUID_REGEX.test(caseId)) {
        throw new Error("Case ID must be a valid UUID");
      }
      if (!forceStatusValue) throw new Error("Target status is required");
      if (!isSuperAdmin) {
        throw new Error("Only Super Admin may force status changes");
      }

      const trimmedReason = forceStatusReason.trim().slice(0, 500) || null;
      const { error } = await supabase.rpc("admin_force_concierge_status", {
        p_inquiry_id: caseId,
        p_new_status: forceStatusValue,
        p_reason: trimmedReason,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Case status forced");
      setForceStatusOpen(false);
      setForceStatusCaseId("");
      setForceStatusValue("");
      setForceStatusReason("");
      queryClient.invalidateQueries({ queryKey: ["back-office-health"] });
      queryClient.invalidateQueries({ queryKey: ["back-office-recent-actions"] });
    },
    onError: (err: Error) =>
      toast.error("Failed to update", { description: err.message }),
  });

  const handleImpersonate = async (targetUser: AdminUser) => {
    if (!user?.id || isImpersonating) return;

    // Pull granular permission overrides for the target user. RLS allows
    // admins to read admin_user_permissions, so a failure here is real
    // (network / DB outage) and we surface it via toast.
    const { data: perms, error: permsErr } = await supabase
      .from("admin_user_permissions")
      .select("permission_key, granted")
      .eq("user_id", targetUser.user_id);
    if (permsErr) {
      toast.error(`Could not load target permissions: ${permsErr.message}`);
      return;
    }

    const permMap: Record<string, boolean> = {};
    (perms || []).forEach((p) => {
      permMap[p.permission_key] = p.granted;
    });

    try {
      await startImpersonation(
        {
          userId: targetUser.user_id,
          displayName: targetUser.display_name || targetUser.email,
          role: targetUser.admin_role,
          permissions:
            Object.keys(permMap).length > 0
              ? permMap
              : (ROLE_DEFAULTS[targetUser.admin_role] || {}),
        },
        user.id,
      );

      toast.success(
        `Now viewing as ${targetUser.display_name || targetUser.email}`,
        {
          description:
            "The sidebar and dashboard now reflect this user's view. Use the banner at the top of the page to return.",
        },
      );
      // Realtime will refresh the impersonation log card automatically; an
      // explicit invalidate covers the channel-drop case.
      queryClient.invalidateQueries({ queryKey: ["impersonation-log"] });
      queryClient.invalidateQueries({ queryKey: ["back-office-health"] });
    } catch (err) {
      toast.error(
        err instanceof Error
          ? `Failed to start impersonation: ${err.message}`
          : "Failed to start impersonation",
      );
    }
  };

  const handleRefreshAll = useCallback(() => {
    BACK_OFFICE_QUERY_KEYS.forEach((key) =>
      queryClient.invalidateQueries({ queryKey: key as readonly unknown[] }),
    );
    toast.success("Back office data refreshing");
  }, [queryClient]);

  // Pre-filter the impersonation candidate list and the advisor list. We
  // hide the current user from the impersonation list because impersonating
  // yourself is incoherent.
  const nonSuperAdminUsers = useMemo(
    () =>
      (adminUsers || []).filter(
        (u) => u.admin_role !== "super_admin" && (!user || u.user_id !== user.id),
      ),
    [adminUsers, user],
  );
  const advisors = useMemo(
    () => (adminUsers || []).filter((u) => u.admin_role === "advisor" && u.status === "active"),
    [adminUsers],
  );

  // Non-super-admin guard at the page level: render an Alert and exit
  // early. Routing already enforces the back_office permission gate, but
  // belt-and-suspenders is consistent with how the rest of the admin
  // panel handles privileged surfaces.
  if (!isSuperAdmin) {
    return (
      <div className="p-6">
        <Alert variant="destructive" role="alert">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Super Admin only</AlertTitle>
          <AlertDescription>
            The Back Office is restricted to Super Admins. If you reached this
            page in error, please contact your administrator.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Active-impersonation reminder (shows in addition to the
          AdminShell's persistent banner so admins on the back-office
          surface can't miss it). */}
      {isImpersonating && impersonating && (
        <Alert variant="default" className="border-warning/40 bg-warning/5" role="status">
          <Eye className="h-4 w-4 text-warning" />
          <AlertTitle>
            Viewing as {impersonating.displayName} ({impersonating.role.replace("_", " ")})
          </AlertTitle>
          <AlertDescription className="flex items-center justify-between gap-3">
            <span className="text-xs">
              "View As" affordances below are disabled until you exit
              impersonation.
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => user?.id && stopImpersonation(user.id)}
              aria-label="Exit impersonation"
            >
              Exit
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-slate-800 to-slate-600 flex items-center justify-center shadow-lg">
            <Shield className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground truncate">
              Back Office
            </h1>
            <p className="text-sm text-muted-foreground truncate">
              Command center — oversight, impersonation &amp; overrides
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefreshAll}
          aria-label="Refresh all back office data"
        >
          <RefreshCw className="h-4 w-4 mr-1.5" />
          Refresh All
        </Button>
      </div>

      {/* Admin-users query error banner */}
      {usersQueryError && (
        <Card className="border-destructive/40 bg-destructive/5" role="alert">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-destructive">
                Failed to load admin staff
              </p>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                {usersQueryError instanceof Error
                  ? usersQueryError.message
                  : String(usersQueryError)}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetchUsers()}>
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {/* System Health Cards */}
      {healthError ? (
        <Card className="border-destructive/40 bg-destructive/5" role="alert">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-destructive">
                Failed to load system health
              </p>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                {healthErrorObj instanceof Error
                  ? healthErrorObj.message
                  : String(healthErrorObj)}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetchHealth()}>
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Retry
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-6">
          {[
            {
              label: "Open Escalations",
              value: healthStats?.openEscalations,
              icon: AlertTriangle,
              color: "text-warning",
            },
            {
              label: "Active Cases",
              value: healthStats?.activeCases,
              icon: Activity,
              color: "text-info",
            },
            {
              label: "Pending Providers",
              value: healthStats?.pendingProviders,
              icon: Users,
              color: "text-primary",
            },
            {
              label: "Total Staff",
              value: healthStats?.totalStaff,
              icon: Users,
              color: "text-muted-foreground",
            },
            {
              label: "Audit Entries",
              value: healthStats?.totalAuditEntries,
              icon: ClipboardList,
              color: "text-muted-foreground",
            },
            {
              label: "Active 'View As'",
              value: healthStats?.activeImpersonations,
              icon: Eye,
              color:
                (healthStats?.activeImpersonations ?? 0) > 0
                  ? "text-warning"
                  : "text-muted-foreground",
            },
          ].map((stat) => (
            <Card key={stat.label} className="border shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-muted-foreground uppercase truncate">
                      {stat.label}
                    </p>
                    {loadingHealth ? (
                      <Skeleton className="h-8 w-10 mt-1" />
                    ) : (
                      <p className="text-2xl font-bold tabular-nums">{stat.value}</p>
                    )}
                  </div>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Override Actions — Super Admin only */}
      <Card className="border shadow-sm border-amber-200/50">
        <CardHeader>
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Zap className="h-4 w-4 text-warning" />
            Override Actions
          </CardTitle>
          <CardDescription className="text-xs">
            Direct case management overrides (Super Admin only). Every override is
            written to the admin audit log.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setReassignOpen(true)}
            aria-label="Open reassign case dialog"
          >
            <ArrowRightLeft className="h-4 w-4 mr-1.5" />
            Reassign Case
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setForceStatusOpen(true)}
            aria-label="Open force status change dialog"
          >
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
          <Button variant="outline" size="sm" asChild>
            <Link to="/admin/audit-log">
              <ClipboardList className="h-4 w-4 mr-1.5" />
              Audit Log
            </Link>
          </Button>
        </CardContent>
      </Card>

      {/* Smoke Tests — Super Admin only */}
      <SmokeTestRunner />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Open Escalations */}
        <Card className="border shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-medium">
                  Escalation Queue
                </CardTitle>
                <CardDescription className="text-xs">
                  Issues requiring your attention
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/admin/escalations" className="text-xs">
                  View all <ChevronRight className="h-3 w-3 ml-1" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="max-h-[480px] overflow-y-auto">
              <EscalationsList filterStatus="open" />
            </div>
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
              See the platform exactly as a staff member sees it. Sidebar,
              dashboard, and permissions will match the target role.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingUsers ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : nonSuperAdminUsers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No staff members to impersonate
              </p>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {nonSuperAdminUsers.map((staff) => {
                  const inactive = staff.status !== "active";
                  const reasonDisabled = isImpersonating
                    ? "Already impersonating — exit first"
                    : inactive
                      ? `Cannot view as a ${staff.status.replace("_", " ")} account`
                      : null;
                  return (
                    <div
                      key={staff.user_id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs">
                            {(staff.first_name?.[0] || staff.email[0]).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">
                            {staff.display_name ||
                              `${staff.first_name || ""} ${staff.last_name || ""}`.trim() ||
                              staff.email}
                          </p>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Badge variant="outline" className="text-[10px]">
                              {staff.admin_role.replace("_", " ")}
                            </Badge>
                            {staff.employment_type && (
                              <Badge variant="secondary" className="text-[10px]">
                                {staff.employment_type}
                              </Badge>
                            )}
                            <Badge
                              variant={staff.status === "active" ? "default" : "destructive"}
                              className="text-[10px]"
                            >
                              {staff.status.replace("_", " ")}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      {reasonDisabled ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled
                                className="shrink-0"
                                aria-label={`Cannot view as ${staff.display_name || staff.email}: ${reasonDisabled}`}
                              >
                                <Eye className="h-3.5 w-3.5 mr-1.5" />
                                View As
                              </Button>
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>{reasonDisabled}</TooltipContent>
                        </Tooltip>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleImpersonate(staff)}
                          className="shrink-0"
                          aria-label={`View as ${staff.display_name || staff.email}`}
                        >
                          <Eye className="h-3.5 w-3.5 mr-1.5" />
                          View As
                        </Button>
                      )}
                    </div>
                  );
                })}
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
              <CardTitle className="text-base font-medium">
                Recent Staff Activity
              </CardTitle>
              <CardDescription className="text-xs">
                Latest actions across the platform — propagates in real time
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/admin/audit-log" className="text-xs">
                Full log <ChevronRight className="h-3 w-3 ml-1" />
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {recentActionsError ? (
            <Alert variant="destructive" role="alert">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Failed to load recent activity</AlertTitle>
              <AlertDescription className="flex items-center justify-between gap-3">
                <span className="text-xs truncate">
                  {recentActionsErrorObj instanceof Error
                    ? recentActionsErrorObj.message
                    : String(recentActionsErrorObj)}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetchRecentActions()}
                >
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Retry
                </Button>
              </AlertDescription>
            </Alert>
          ) : recentActions?.length ? (
            <div className="space-y-2 max-h-[480px] overflow-y-auto">
              {recentActions.map((action) => {
                const staffMember = action.admin_user_id
                  ? adminUserMap.get(action.admin_user_id)
                  : undefined;
                return (
                  <div
                    key={action.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-2 rounded border text-xs"
                  >
                    <div className="flex items-center gap-2 flex-wrap min-w-0">
                      <Badge variant="outline" className="text-[10px] shrink-0">
                        {action.action_type}
                      </Badge>
                      <span className="text-muted-foreground truncate">
                        {action.target_type}
                      </span>
                      {staffMember && (
                        <span className="text-muted-foreground truncate">
                          by {staffMember.display_name || staffMember.email}
                        </span>
                      )}
                    </div>
                    <span className="text-muted-foreground tabular-nums shrink-0">
                      {formatDistanceToNow(new Date(action.created_at), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No recent activity
            </p>
          )}
        </CardContent>
      </Card>

      {/* Impersonation Audit Log */}
      <Card className="border shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-medium">
            Impersonation History
          </CardTitle>
          <CardDescription className="text-xs">
            Audit trail of "View As" sessions. Sessions auto-close after 60
            minutes via DB trigger.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {impLogError ? (
            <Alert variant="destructive" role="alert">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Failed to load impersonation history</AlertTitle>
              <AlertDescription className="flex items-center justify-between gap-3">
                <span className="text-xs truncate">
                  {impLogErrorObj instanceof Error
                    ? impLogErrorObj.message
                    : String(impLogErrorObj)}
                </span>
                <Button variant="outline" size="sm" onClick={() => refetchImpLog()}>
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Retry
                </Button>
              </AlertDescription>
            </Alert>
          ) : impersonationLog && impersonationLog.length > 0 ? (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {impersonationLog.map((entry) => {
                const targetStaff = entry.target_user_id
                  ? adminUserMap.get(entry.target_user_id)
                  : undefined;
                const startedAtMs = entry.started_at
                  ? new Date(entry.started_at).getTime()
                  : 0;
                const isStale =
                  !entry.ended_at &&
                  startedAtMs > 0 &&
                  Date.now() - startedAtMs > IMPERSONATION_STALE_MS;
                const statusLabel = entry.ended_at
                  ? "Ended"
                  : isStale
                    ? "Expired"
                    : "Active";
                const statusVariant =
                  statusLabel === "Active"
                    ? "destructive"
                    : statusLabel === "Expired"
                      ? "secondary"
                      : "outline";
                const roleLabel = entry.target_role
                  ? entry.target_role.replace("_", " ")
                  : "unknown role";
                return (
                  <div
                    key={entry.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-2 rounded border text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Eye className="h-3 w-3 text-muted-foreground shrink-0" />
                      <span className="truncate">
                        Viewed as{" "}
                        <span className="font-medium">
                          {targetStaff?.display_name ||
                            targetStaff?.email ||
                            entry.target_role ||
                            "unknown"}
                        </span>{" "}
                        ({roleLabel})
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge
                        variant={statusVariant}
                        className="text-[10px]"
                      >
                        {statusLabel}
                      </Badge>
                      <span className="text-muted-foreground tabular-nums">
                        {entry.started_at
                          ? formatDistanceToNow(new Date(entry.started_at), {
                              addSuffix: true,
                            })
                          : "unknown"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No impersonation history yet
            </p>
          )}
        </CardContent>
      </Card>

      {/* Reassign Case Dialog */}
      <Dialog
        open={reassignOpen}
        onOpenChange={(open) => {
          if (reassignMutation.isPending) return;
          setReassignOpen(open);
          if (!open) {
            setReassignCaseId("");
            setReassignAdvisorId("");
            setReassignReason("");
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5" />
              Reassign Case
            </DialogTitle>
            <DialogDescription>
              Override the current advisor assignment on a case. The change is
              recorded in the case timeline and the admin audit log.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="reassign-case-id">Case ID</Label>
              <Input
                id="reassign-case-id"
                placeholder="Paste the case UUID..."
                value={reassignCaseId}
                onChange={(e) => setReassignCaseId(e.target.value)}
                disabled={reassignMutation.isPending}
                aria-invalid={
                  reassignCaseId.trim() !== "" && !UUID_REGEX.test(reassignCaseId.trim())
                }
              />
              {reassignCaseId.trim() !== "" &&
                !UUID_REGEX.test(reassignCaseId.trim()) && (
                  <p className="text-[11px] text-destructive">
                    Must be a valid UUID
                  </p>
                )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="reassign-advisor">Assign to Advisor</Label>
              <Select
                value={reassignAdvisorId}
                onValueChange={setReassignAdvisorId}
                disabled={reassignMutation.isPending}
              >
                <SelectTrigger id="reassign-advisor" aria-label="Select advisor">
                  <SelectValue placeholder="Select advisor..." />
                </SelectTrigger>
                <SelectContent>
                  {advisors.length === 0 ? (
                    <div className="px-2 py-1.5 text-xs text-muted-foreground">
                      No active advisors available
                    </div>
                  ) : (
                    advisors.map((a) => (
                      <SelectItem key={a.user_id} value={a.user_id}>
                        {a.display_name || a.email}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reassign-reason">
                Reason{" "}
                <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Textarea
                id="reassign-reason"
                value={reassignReason}
                onChange={(e) => setReassignReason(e.target.value.slice(0, 500))}
                placeholder="Why is this case being reassigned?"
                rows={2}
                disabled={reassignMutation.isPending}
                className="resize-none"
              />
              <p className="text-[11px] text-muted-foreground tabular-nums">
                {reassignReason.length}/500
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setReassignOpen(false)}
              disabled={reassignMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={() => reassignMutation.mutate()}
              disabled={
                reassignMutation.isPending ||
                !reassignCaseId.trim() ||
                !UUID_REGEX.test(reassignCaseId.trim()) ||
                !reassignAdvisorId
              }
            >
              {reassignMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              )}
              Reassign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Force Status Dialog */}
      <Dialog
        open={forceStatusOpen}
        onOpenChange={(open) => {
          if (forceStatusMutation.isPending) return;
          setForceStatusOpen(open);
          if (!open) {
            setForceStatusCaseId("");
            setForceStatusValue("");
            setForceStatusReason("");
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-warning" />
              Force Status Change
            </DialogTitle>
            <DialogDescription>
              Override case status. Use with caution — this bypasses normal
              workflow validation. Every override is written to the admin
              audit log.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="force-case-id">Case ID</Label>
              <Input
                id="force-case-id"
                placeholder="Paste the case UUID..."
                value={forceStatusCaseId}
                onChange={(e) => setForceStatusCaseId(e.target.value)}
                disabled={forceStatusMutation.isPending}
                aria-invalid={
                  forceStatusCaseId.trim() !== "" &&
                  !UUID_REGEX.test(forceStatusCaseId.trim())
                }
              />
              {forceStatusCaseId.trim() !== "" &&
                !UUID_REGEX.test(forceStatusCaseId.trim()) && (
                  <p className="text-[11px] text-destructive">
                    Must be a valid UUID
                  </p>
                )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="force-status">New Status</Label>
              <Select
                value={forceStatusValue}
                onValueChange={setForceStatusValue}
                disabled={forceStatusMutation.isPending}
              >
                <SelectTrigger id="force-status" aria-label="Select target status">
                  <SelectValue placeholder="Select status..." />
                </SelectTrigger>
                <SelectContent>
                  {FORCE_STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="force-reason">
                Reason{" "}
                <span className="text-muted-foreground font-normal">
                  (recommended)
                </span>
              </Label>
              <Textarea
                id="force-reason"
                value={forceStatusReason}
                onChange={(e) => setForceStatusReason(e.target.value.slice(0, 500))}
                placeholder="Why is this status being forced?"
                rows={2}
                disabled={forceStatusMutation.isPending}
                className="resize-none"
              />
              <p className="text-[11px] text-muted-foreground tabular-nums">
                {forceStatusReason.length}/500
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setForceStatusOpen(false)}
              disabled={forceStatusMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={() => forceStatusMutation.mutate()}
              disabled={
                forceStatusMutation.isPending ||
                !forceStatusCaseId.trim() ||
                !UUID_REGEX.test(forceStatusCaseId.trim()) ||
                !forceStatusValue
              }
              variant="destructive"
            >
              {forceStatusMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              )}
              Force Change
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
