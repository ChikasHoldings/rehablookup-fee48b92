import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useEscalationTransition, type EscalationStatus } from "@/hooks/useEscalationTransition";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  Loader2,
  User,
  ChevronRight,
  ArrowUpRight,
  ShieldCheck,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { EscalationDetailSheet, type EscalationRow } from "./EscalationDetailSheet";

const PRIORITY_CONFIG = {
  low: { label: "Low", color: "bg-muted text-muted-foreground", dot: "bg-muted-foreground" },
  medium: { label: "Medium", color: "bg-warning/10 text-warning border-warning/20", dot: "bg-warning" },
  high: { label: "High", color: "bg-destructive/10 text-destructive border-destructive/20", dot: "bg-destructive" },
  critical: { label: "Critical", color: "bg-destructive text-destructive-foreground", dot: "bg-destructive" },
};

const STATUS_CONFIG = {
  open: { label: "Open", color: "bg-info/10 text-info border-info/20", icon: AlertTriangle },
  in_progress: { label: "In Progress", color: "bg-warning/10 text-warning border-warning/20", icon: Clock },
  resolved: { label: "Resolved", color: "bg-success/10 text-success border-success/20", icon: CheckCircle2 },
  closed: { label: "Closed", color: "bg-muted text-muted-foreground", icon: FileText },
};

/** Age-based SLA badge for active escalations. Same visual pattern
 *  as /admin/concierge and /admin/providers. */
function escalationSlaBadge(e: EscalationRow): { label: string; tone: string } | null {
  if (e.status === "resolved" || e.status === "closed") return null;
  const ageHours = (Date.now() - new Date(e.created_at).getTime()) / 36e5;
  // Critical escalations have a tighter SLA — 4h amber / 24h red.
  if (e.priority === "critical") {
    if (ageHours >= 24) return { label: `${Math.floor(ageHours / 24)}d`, tone: "bg-destructive/10 text-destructive border-destructive/30" };
    if (ageHours >= 4) return { label: `${Math.floor(ageHours)}h`, tone: "bg-amber-500/10 text-amber-600 border-amber-500/30" };
    return null;
  }
  // Default: 24h amber / 7d red.
  if (ageHours >= 168) return { label: `${Math.floor(ageHours / 24)}d`, tone: "bg-destructive/10 text-destructive border-destructive/30" };
  if (ageHours >= 24) return { label: `${Math.floor(ageHours / 24)}d`, tone: "bg-amber-500/10 text-amber-600 border-amber-500/30" };
  return null;
}

interface EscalationsListProps {
  filterStatus?: string;
  filterPriority?: string;
  searchQuery?: string;
  viewMode?: "cards" | "compact";
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onSelectAllVisible: (ids: string[]) => void;
  /** Caller may seed a specific row open from a notification deep-link. */
  initialOpenId?: string | null;
  onInitialOpenConsumed?: () => void;
}

export function EscalationsList({
  filterStatus = "all",
  filterPriority,
  searchQuery,
  viewMode = "cards",
  selectedIds,
  onToggleSelect,
  onSelectAllVisible,
  initialOpenId = null,
  onInitialOpenConsumed,
}: EscalationsListProps) {
  const { user, isSuperAdmin, adminRole } = useAdminAuth();
  const canModerate = isSuperAdmin || adminRole === "super_admin" || adminRole === "manager";
  const queryClient = useQueryClient();
  const [selectedEscalation, setSelectedEscalation] = useState<EscalationRow | null>(null);
  const [quickResolveId, setQuickResolveId] = useState<string | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState("");

  const { data: escalations, isLoading, isFetching, isError, error, refetch } = useQuery({
    queryKey: ["admin-escalations", filterStatus, filterPriority, searchQuery],
    queryFn: async () => {
      let query = supabase
        .from("admin_escalations")
        .select("id, subject, description, priority, status, created_by, assigned_to, related_type, related_id, resolution_notes, resolved_at, created_at, updated_at")
        .order("created_at", { ascending: false })
        .limit(200);

      if (filterStatus !== "all") {
        query = query.eq("status", filterStatus as "open" | "in_progress" | "resolved" | "closed");
      }
      if (filterPriority) {
        query = query.eq("priority", filterPriority as "low" | "medium" | "high" | "critical");
      }

      const { data, error } = await query;
      if (error) throw error;

      let results = data || [];
      if (searchQuery?.trim()) {
        const q = searchQuery.toLowerCase();
        results = results.filter(
          (e) =>
            e.subject.toLowerCase().includes(q) ||
            e.description.toLowerCase().includes(q)
        );
      }
      return results;
    },
    staleTime: 30 * 1000,
  });

  // Fetch admin names for created_by / assigned_to
  const adminIds = [
    ...new Set(
      (escalations || []).flatMap((e) => [e.created_by, e.assigned_to].filter(Boolean))
    ),
  ];

  const { data: adminNames } = useQuery({
    queryKey: ["admin-names", adminIds],
    queryFn: async () => {
      if (!adminIds.length) return {};
      const { data, error } = await supabase
        .from("admin_user_profiles")
        .select("user_id, first_name, last_name, display_name")
        .in("user_id", adminIds);
      if (error) throw error;
      const map: Record<string, string> = {};
      data?.forEach((a) => {
        map[a.user_id] = a.display_name || [a.first_name, a.last_name].filter(Boolean).join(" ") || "Admin";
      });
      return map;
    },
    enabled: adminIds.length > 0,
  });

  // Realtime channel — admin_escalations is now in the publication
  // (migration 20260622000000). Polling at 30s as a fallback.
  useEffect(() => {
    const invalidate = () => {
      queryClient.invalidateQueries({ queryKey: ["admin-escalations"] });
      queryClient.invalidateQueries({ queryKey: ["escalation-counts"] });
    };
    const interval = setInterval(invalidate, 30000);
    const channel = supabase
      .channel("admin-escalations-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "admin_escalations" }, () => invalidate())
      .subscribe();
    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Deep-link: open a specific escalation when ?id=<uuid> is in the URL.
  useEffect(() => {
    if (!initialOpenId) return;
    const target = escalations?.find((e) => e.id === initialOpenId);
    if (target) {
      setSelectedEscalation(target);
      onInitialOpenConsumed?.();
    }
  }, [initialOpenId, escalations, onInitialOpenConsumed]);

  const updateMutation = useEscalationTransition();

  const handleAssignToMe = (id: string, fromStatus: EscalationStatus) => {
    if (!user?.id) {
      return;
    }
    const nextStatus: EscalationStatus | undefined =
      fromStatus === "open" ? "in_progress" : undefined;
    updateMutation.mutate({
      id,
      fromStatus,
      updates: {
        assigned_to: user.id,
        ...(nextStatus ? { status: nextStatus } : {}),
      },
      auditContext: { surface: "escalations_list_assign_self" },
    });
  };

  const handleQuickResolve = (id: string, fromStatus: EscalationStatus) => {
    updateMutation.mutate({
      id,
      fromStatus,
      updates: {
        status: "resolved",
        resolution_notes: resolutionNotes || null,
      },
      auditContext: { surface: "escalations_list_quick_resolve" },
      onSuccess: () => {
        setQuickResolveId(null);
        setResolutionNotes("");
      },
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-20 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center py-16 rounded-xl border border-destructive/20 bg-destructive/5">
        <AlertTriangle className="h-10 w-10 mx-auto mb-3 text-destructive/70" />
        <p className="text-base font-semibold">Couldn't load escalations</p>
        <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
          {(error as Error)?.message || "An unexpected error occurred."}
        </p>
        <Button size="sm" variant="outline" onClick={() => refetch()} className="mt-4">
          Try again
        </Button>
      </div>
    );
  }

  if (!escalations?.length) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-success/50" />
        <p className="text-lg font-medium">No escalations found</p>
        <p className="text-sm mt-1">
          {filterStatus !== "all" ? "Try changing your filters" : "Everything is running smoothly."}
        </p>
      </div>
    );
  }

  const getAdminName = (id: string | null) => {
    if (!id) return null;
    return adminNames?.[id] || "Admin";
  };

  const allVisibleSelected =
    escalations.length > 0 && escalations.every((e) => selectedIds.has(e.id));

  return (
    <>
      {/* Background-refetch indicator — matches other admin surfaces */}
      {isFetching && (
        <div className="flex items-center gap-1.5 -mt-3 mb-2 text-[11px] text-muted-foreground" aria-live="polite">
          <Loader2 className="h-3 w-3 animate-spin" />
          Refreshing…
        </div>
      )}

      {/* Select-all on this page */}
      {canModerate && (
        <div className="flex items-center gap-2 mb-3">
          <Checkbox
            checked={allVisibleSelected}
            onCheckedChange={() => onSelectAllVisible(escalations.map((e) => e.id))}
            aria-label={
              allVisibleSelected
                ? "Deselect all visible escalations"
                : "Select all visible escalations"
            }
          />
          <span className="text-xs text-muted-foreground">
            {selectedIds.size > 0
              ? `${selectedIds.size} selected`
              : "Select all on this page"}
          </span>
        </div>
      )}

      <div className={cn("space-y-2", viewMode === "compact" && "space-y-0 divide-y rounded-xl border overflow-hidden")}>
        {escalations.map((esc) => {
          const priorityCfg = PRIORITY_CONFIG[esc.priority as keyof typeof PRIORITY_CONFIG] || PRIORITY_CONFIG.medium;
          const statusCfg = STATUS_CONFIG[esc.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.open;
          const StatusIcon = statusCfg.icon;
          const isAssignedToMe = esc.assigned_to === user?.id;
          const canAct = esc.status !== "resolved" && esc.status !== "closed";
          const isQuickResolving = quickResolveId === esc.id;
          const creatorName = getAdminName(esc.created_by);
          const assigneeName = getAdminName(esc.assigned_to);
          const sla = escalationSlaBadge(esc);
          const isChecked = selectedIds.has(esc.id);

          if (viewMode === "compact") {
            return (
              <div
                key={esc.id}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors",
                  esc.priority === "critical" && esc.status === "open" && "bg-destructive/5",
                  isChecked && "bg-primary/5"
                )}
              >
                {canModerate && (
                  <div onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={isChecked}
                      onCheckedChange={() => onToggleSelect(esc.id)}
                      aria-label={`Select escalation ${esc.subject}`}
                    />
                  </div>
                )}
                <button
                  onClick={() => setSelectedEscalation(esc)}
                  className="flex-1 flex items-center gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                  aria-label={`Open detail for ${esc.subject}`}
                >
                  <div className={cn("h-2 w-2 rounded-full flex-shrink-0", priorityCfg.dot)} />
                  <StatusIcon className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                  <span className="font-medium text-sm truncate flex-1">{esc.subject}</span>
                  {sla && (
                    <Badge variant="outline" className={cn("text-[10px] flex-shrink-0", sla.tone)} title="Time since created">
                      <Clock className="h-2.5 w-2.5 mr-0.5" />
                      {sla.label}
                    </Badge>
                  )}
                  {assigneeName && (
                    <span className="text-xs text-muted-foreground hidden sm:block">{assigneeName}</span>
                  )}
                  <Badge variant="outline" className={cn("text-[10px] flex-shrink-0", statusCfg.color)}>
                    {statusCfg.label}
                  </Badge>
                  <span className="text-xs text-muted-foreground tabular-nums flex-shrink-0">
                    {formatDistanceToNow(new Date(esc.created_at), { addSuffix: true })}
                  </span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                </button>
              </div>
            );
          }

          return (
            <div
              key={esc.id}
              className={cn(
                "rounded-xl border p-4 transition-all hover:shadow-sm",
                esc.priority === "critical" && esc.status === "open" && "border-destructive/40 bg-destructive/5",
                esc.status === "resolved" && "opacity-75",
                isChecked && "ring-1 ring-primary/40 bg-primary/[0.02]"
              )}
            >
              <div className="flex items-start gap-3">
                {canModerate && (
                  <div className="pt-1" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={isChecked}
                      onCheckedChange={() => onToggleSelect(esc.id)}
                      aria-label={`Select escalation ${esc.subject}`}
                    />
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedEscalation(esc)}
                  className="flex-1 min-w-0 space-y-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                  aria-label={`Open detail for ${esc.subject}`}
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className={cn("h-2 w-2 rounded-full flex-shrink-0", priorityCfg.dot)} />
                    <h4 className="font-semibold text-sm">{esc.subject}</h4>
                    <Badge variant="outline" className={cn("text-[10px]", priorityCfg.color)}>
                      {priorityCfg.label}
                    </Badge>
                    <Badge variant="outline" className={cn("text-[10px]", statusCfg.color)}>
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {statusCfg.label}
                    </Badge>
                    {sla && (
                      <Badge variant="outline" className={cn("text-[10px]", sla.tone)} title="Time since created">
                        <Clock className="h-3 w-3 mr-0.5" />
                        {sla.label}
                      </Badge>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground line-clamp-2">{esc.description}</p>

                  <div className="flex items-center gap-4 text-[11px] text-muted-foreground flex-wrap">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(new Date(esc.created_at), { addSuffix: true })}
                    </span>
                    {creatorName && (
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        by {creatorName}
                      </span>
                    )}
                    {assigneeName && (
                      <span className="flex items-center gap-1">
                        <ShieldCheck className="h-3 w-3" />
                        {isAssignedToMe ? "Assigned to you" : assigneeName}
                      </span>
                    )}
                    {esc.related_type && (
                      <span className="flex items-center gap-1">
                        <ArrowUpRight className="h-3 w-3" />
                        {esc.related_type}
                      </span>
                    )}
                  </div>

                  {esc.resolution_notes && (
                    <div className="mt-1 p-2 rounded-lg bg-success/5 border border-success/20 text-xs text-success">
                      <span className="font-medium">Resolution:</span> {esc.resolution_notes}
                    </div>
                  )}
                </button>

                {/* Quick Actions */}
                {canAct && (
                  <div className="flex gap-1.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                    {!esc.assigned_to && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAssignToMe(esc.id, esc.status)}
                        disabled={updateMutation.isPending}
                        className="text-xs h-8"
                        aria-label={`Claim escalation ${esc.subject}`}
                      >
                        Claim
                      </Button>
                    )}
                    {(isAssignedToMe || isSuperAdmin) && (
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => setQuickResolveId(isQuickResolving ? null : esc.id)}
                        className="text-xs h-8"
                        aria-label={`Resolve escalation ${esc.subject}`}
                      >
                        Resolve
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {isQuickResolving && (
                <div className="mt-3 pt-3 border-t space-y-2" onClick={(e) => e.stopPropagation()}>
                  <Textarea
                    placeholder="Resolution notes..."
                    value={resolutionNotes}
                    onChange={(e) => setResolutionNotes(e.target.value.slice(0, 2000))}
                    rows={2}
                    className="text-sm"
                    maxLength={2000}
                  />
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" size="sm" onClick={() => setQuickResolveId(null)}>
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleQuickResolve(esc.id, esc.status)}
                      disabled={updateMutation.isPending}
                    >
                      {updateMutation.isPending && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                      Mark Resolved
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <EscalationDetailSheet
        escalation={selectedEscalation}
        open={!!selectedEscalation}
        onOpenChange={(open) => !open && setSelectedEscalation(null)}
        adminNames={adminNames || {}}
      />
    </>
  );
}
