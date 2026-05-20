import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertTriangle, Search, Filter, LayoutGrid, List, Plus, RefreshCw, ArrowRightLeft,
  Flag, Trash2, Download, Link2, X,
} from "lucide-react";
import { EscalationsList } from "@/components/admin/escalations/EscalationsList";
import { EscalationDialog } from "@/components/admin/escalations/EscalationDialog";
import {
  BulkEscalationActionDialog,
  type BulkEscalationAction,
} from "@/components/admin/escalations/BulkEscalationActionDialog";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { toast } from "sonner";

const VALID_STATUS_TABS = ["open", "in_progress", "resolved", "closed", "all"] as const;
const VALID_PRIORITIES = ["critical", "high", "medium", "low"] as const;

type StatusTab = typeof VALID_STATUS_TABS[number];

function useDebounce(value: string, delay: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

export default function AdminEscalations() {
  const queryClient = useQueryClient();
  const { adminRole, isSuperAdmin } = useAdminAuth();
  const canModerate = isSuperAdmin || adminRole === "super_admin" || adminRole === "manager";

  const [searchParams, setSearchParams] = useSearchParams();

  const [filter, setFilter] = useState<StatusTab>(() => {
    const t = searchParams.get("status");
    return t && (VALID_STATUS_TABS as readonly string[]).includes(t) ? (t as StatusTab) : "open";
  });
  const [priorityFilter, setPriorityFilter] = useState<string>(() => {
    const p = searchParams.get("priority");
    return p && (VALID_PRIORITIES as readonly string[]).includes(p) ? p : "all_priorities";
  });
  const [searchInput, setSearchInput] = useState(() => searchParams.get("q") ?? "");
  const searchQuery = useDebounce(searchInput, 350);
  const [viewMode, setViewMode] = useState<"cards" | "compact">(() => {
    return searchParams.get("view") === "compact" ? "compact" : "cards";
  });
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<BulkEscalationAction | null>(null);
  const [initialOpenId, setInitialOpenId] = useState<string | null>(() => searchParams.get("id"));

  // URL ← state sync (loop-guarded)
  useEffect(() => {
    const next = new URLSearchParams();
    if (searchQuery) next.set("q", searchQuery);
    if (filter && filter !== "open") next.set("status", filter);
    if (priorityFilter && priorityFilter !== "all_priorities") next.set("priority", priorityFilter);
    if (viewMode === "compact") next.set("view", viewMode);
    // Preserve ?id deep-link until the row is mounted in the detail sheet —
    // EscalationsList calls onInitialOpenConsumed when it surfaces the row,
    // which clears the param via the onConsumed handler below.
    if (initialOpenId) next.set("id", initialOpenId);
    const a = next.toString();
    const b = searchParams.toString();
    if (a !== b) setSearchParams(next, { replace: true });
  }, [searchQuery, filter, priorityFilter, viewMode, initialOpenId, searchParams, setSearchParams]);

  const { data: counts, isFetching: countsFetching } = useQuery({
    queryKey: ["escalation-counts"],
    queryFn: async () => {
      const [open, inProgress, resolved, closed] = await Promise.all([
        supabase.from("admin_escalations").select("id", { count: "exact", head: true }).eq("status", "open"),
        supabase.from("admin_escalations").select("id", { count: "exact", head: true }).eq("status", "in_progress"),
        supabase.from("admin_escalations").select("id", { count: "exact", head: true }).eq("status", "resolved"),
        supabase.from("admin_escalations").select("id", { count: "exact", head: true }).eq("status", "closed"),
      ]);
      // Surface count failures so isError reflects reality.
      for (const r of [open, inProgress, resolved, closed]) {
        if (r.error) throw r.error;
      }
      return {
        open: open.count || 0,
        in_progress: inProgress.count || 0,
        resolved: resolved.count || 0,
        closed: closed.count || 0,
        total: (open.count || 0) + (inProgress.count || 0) + (resolved.count || 0) + (closed.count || 0),
      };
    },
    staleTime: 30 * 1000,
  });

  const invalidateAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["admin-escalations"] });
    queryClient.invalidateQueries({ queryKey: ["escalation-counts"] });
  }, [queryClient]);

  const hasActiveFilters =
    searchInput !== "" ||
    filter !== "open" ||
    priorityFilter !== "all_priorities";

  const clearAllFilters = () => {
    setSearchInput("");
    setFilter("open");
    setPriorityFilter("all_priorities");
    setSelectedIds(new Set());
  };

  const copyFilterLink = useCallback(async () => {
    try {
      const url = window.location.href;
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        toast.success("Filter link copied to clipboard");
      } else {
        const tmp = document.createElement("input");
        tmp.value = url;
        document.body.appendChild(tmp);
        tmp.select();
        document.execCommand("copy");
        document.body.removeChild(tmp);
        toast.success("Filter link copied to clipboard");
      }
    } catch {
      toast.error("Could not copy link");
    }
  }, []);

  // CSV — pulls the full filtered set directly so we can export
  // even rows beyond the 200-limit visible in the list.
  const handleExportCSV = useCallback(async () => {
    let query = supabase
      .from("admin_escalations")
      .select("id, subject, description, priority, status, created_by, assigned_to, related_type, related_id, resolution_notes, resolved_at, created_at, updated_at")
      .order("created_at", { ascending: false })
      .limit(2000);
    if (filter !== "all") query = query.eq("status", filter as "open" | "in_progress" | "resolved" | "closed");
    if (priorityFilter !== "all_priorities") query = query.eq("priority", priorityFilter as "low" | "medium" | "high" | "critical");

    const { data, error } = await query;
    if (error) {
      toast.error(`Export failed: ${error.message}`);
      return;
    }
    const rows = (data || []).filter((e) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return e.subject.toLowerCase().includes(q) || e.description.toLowerCase().includes(q);
    });
    if (rows.length === 0) {
      toast.info("No escalations to export");
      return;
    }

    const headers = [
      "ID", "Subject", "Description", "Priority", "Status",
      "Created By", "Assigned To", "Related Type", "Related ID",
      "Resolution Notes", "Resolved At", "Created At", "Updated At",
    ];
    const csv = [
      headers.join(","),
      ...rows.map((r) => [
        r.id, r.subject, r.description, r.priority, r.status,
        r.created_by, r.assigned_to || "", r.related_type || "", r.related_id || "",
        r.resolution_notes || "", r.resolved_at || "", r.created_at, r.updated_at,
      ].map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `escalations-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${rows.length} escalations`);
  }, [filter, priorityFilter, searchQuery]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const handleSelectAllVisible = useCallback((ids: string[]) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      const allSelected = ids.every((id) => next.has(id));
      if (allSelected) ids.forEach((id) => next.delete(id));
      else ids.forEach((id) => next.add(id));
      return next;
    });
  }, []);

  const handleInitialOpenConsumed = useCallback(() => {
    setInitialOpenId(null);
  }, []);

  // Stats KPI cards
  const kpiStats = useMemo(() => ([
    { label: "Open", value: counts?.open ?? 0, color: "text-info", bg: "bg-info/10", filterValue: "open" as StatusTab },
    { label: "In Progress", value: counts?.in_progress ?? 0, color: "text-warning", bg: "bg-warning/10", filterValue: "in_progress" as StatusTab },
    { label: "Resolved", value: counts?.resolved ?? 0, color: "text-success", bg: "bg-success/10", filterValue: "resolved" as StatusTab },
    { label: "Closed", value: counts?.closed ?? 0, color: "text-muted-foreground", bg: "bg-muted", filterValue: "closed" as StatusTab },
  ]), [counts]);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        icon={AlertTriangle}
        iconGradient="bg-gradient-to-br from-warning to-destructive"
        title="Escalations"
        subtitle={`${counts?.total ?? 0} total · ${counts?.open ?? 0} open · ${counts?.in_progress ?? 0} in progress`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {canModerate && selectedIds.size > 0 && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => setBulkAction("update_status")}
                  aria-label={`Change status for ${selectedIds.size} selected escalation${selectedIds.size === 1 ? "" : "s"}`}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Status</span>
                  <span>({selectedIds.size})</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => setBulkAction("update_priority")}
                  aria-label={`Change priority for ${selectedIds.size} selected escalation${selectedIds.size === 1 ? "" : "s"}`}
                >
                  <Flag className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Priority</span>
                  <span>({selectedIds.size})</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 border-primary/40 text-primary hover:bg-primary/5"
                  onClick={() => setBulkAction("assign")}
                  aria-label={`Reassign ${selectedIds.size} selected escalation${selectedIds.size === 1 ? "" : "s"}`}
                >
                  <ArrowRightLeft className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Reassign</span>
                  <span>({selectedIds.size})</span>
                </Button>
                {isSuperAdmin && (
                  <Button
                    variant="destructive"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => setBulkAction("delete")}
                    aria-label={`Delete ${selectedIds.size} selected escalation${selectedIds.size === 1 ? "" : "s"}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Delete</span>
                    <span>({selectedIds.size})</span>
                  </Button>
                )}
              </>
            )}
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5"
                onClick={copyFilterLink}
                aria-label="Copy shareable link to this filtered view"
                title="Copy shareable link to this filtered view"
              >
                <Link2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Copy link</span>
              </Button>
            )}
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5"
                onClick={clearAllFilters}
                aria-label="Clear filters"
              >
                <X className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Clear</span>
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={handleExportCSV}
              aria-label="Export filtered escalations as CSV"
            >
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">CSV</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => invalidateAll()}
              disabled={countsFetching}
              aria-label="Refresh"
            >
              <RefreshCw className={countsFetching ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            <Button size="sm" onClick={() => setShowCreateDialog(true)} className="gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">New Escalation</span>
            </Button>
            <div className="flex items-center border rounded-md overflow-hidden">
              <Button
                variant={viewMode === "cards" ? "default" : "ghost"}
                size="icon"
                className="h-8 w-8 rounded-none"
                onClick={() => setViewMode("cards")}
                aria-label="Cards view"
                title="Cards view"
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "compact" ? "default" : "ghost"}
                size="icon"
                className="h-8 w-8 rounded-none"
                onClick={() => setViewMode("compact")}
                aria-label="Compact list view"
                title="Compact list view"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        }
      />

      {/* Stats Summary — KPI cards double as quick-filter toggles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpiStats.map((stat) => (
          <button
            key={stat.label}
            onClick={() => setFilter(stat.filterValue)}
            className={`p-3 rounded-xl border bg-card text-left transition-all hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              filter === stat.filterValue
                ? "ring-2 ring-primary/30 border-primary/50"
                : ""
            }`}
            aria-label={`Filter to ${stat.label}`}
            aria-pressed={filter === stat.filterValue}
          >
            <p className="text-xs text-muted-foreground font-medium">{stat.label}</p>
            <p className={`text-2xl font-bold tabular-nums ${stat.color}`}>{counts ? stat.value : "—"}</p>
          </button>
        ))}
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4 rounded-xl border bg-card">
        <div className="relative flex-1 w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search escalations..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9 h-9"
          />
        </div>

        <div className="overflow-x-auto scrollbar-hide -mx-1 px-1">
          <Tabs value={filter} onValueChange={(v) => setFilter(v as StatusTab)}>
            <TabsList className="h-9">
              <TabsTrigger value="open" className="text-xs px-3 whitespace-nowrap">Open</TabsTrigger>
              <TabsTrigger value="in_progress" className="text-xs px-3 whitespace-nowrap">In Progress</TabsTrigger>
              <TabsTrigger value="resolved" className="text-xs px-3 whitespace-nowrap">Resolved</TabsTrigger>
              <TabsTrigger value="closed" className="text-xs px-3 whitespace-nowrap">Closed</TabsTrigger>
              <TabsTrigger value="all" className="text-xs px-3 whitespace-nowrap">All</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-[140px] h-9">
            <Filter className="h-3 w-3 mr-1" />
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all_priorities">All Priorities</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <EscalationsList
        filterStatus={filter}
        filterPriority={priorityFilter === "all_priorities" ? undefined : priorityFilter}
        searchQuery={searchQuery}
        viewMode={viewMode}
        selectedIds={selectedIds}
        onToggleSelect={toggleSelect}
        onSelectAllVisible={handleSelectAllVisible}
        initialOpenId={initialOpenId}
        onInitialOpenConsumed={handleInitialOpenConsumed}
      />

      <EscalationDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
      />

      {bulkAction && (
        <BulkEscalationActionDialog
          open={!!bulkAction}
          onOpenChange={(open) => !open && setBulkAction(null)}
          action={bulkAction}
          selectedIds={selectedIds}
          onSuccess={() => {
            setSelectedIds(new Set());
            invalidateAll();
          }}
        />
      )}
    </div>
  );
}
