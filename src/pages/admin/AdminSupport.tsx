import { useState, useEffect, useMemo, useCallback } from "react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { useSearchParams } from "react-router-dom";
import {
  Search, Filter, Inbox, Mail, Building2, User, Clock, CheckCircle2, AlertCircle,
  Download, Trash2, Loader2, RefreshCw, Link2, X, ArrowRightLeft, Flag,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useAdminSupportTickets, SupportTicket, SupportTicketFilters } from "@/hooks/useAdminSupportTickets";
import { SupportTicketModal } from "@/components/admin/SupportTicketModal";
import {
  BulkSupportTicketActionDialog,
  type BulkSupportAction,
} from "@/components/admin/support/BulkSupportTicketActionDialog";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";

function useDebounce(value: string, delay: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

const sourceLabels: Record<string, { label: string; icon: React.ElementType }> = {
  public_contact: { label: "Public", icon: Mail },
  provider_support: { label: "Provider", icon: Building2 },
  seeker_support: { label: "Client", icon: User },
};

const statusConfig: Record<string, { label: string; className: string; icon: React.ElementType }> = {
  new: { label: "New", className: "bg-info/10 text-info border-info/30", icon: AlertCircle },
  open: { label: "Open", className: "bg-warning/10 text-warning border-warning/30", icon: Clock },
  in_progress: { label: "In Progress", className: "bg-chart-3/10 text-chart-3 border-chart-3/30", icon: Clock },
  resolved: { label: "Resolved", className: "bg-success/10 text-success border-success/30", icon: CheckCircle2 },
  closed: { label: "Closed", className: "bg-muted text-muted-foreground border-border", icon: CheckCircle2 },
};

const priorityConfig: Record<string, { label: string; className: string }> = {
  low: { label: "Low", className: "bg-muted text-muted-foreground" },
  normal: { label: "Normal", className: "bg-info/10 text-info" },
  high: { label: "High", className: "bg-warning/10 text-warning" },
  urgent: { label: "Urgent", className: "bg-destructive/10 text-destructive" },
};

/** SLA badge for non-terminal tickets: time-since-created, color-graded. */
function ticketSlaBadge(t: SupportTicket): { label: string; tone: string } | null {
  if (t.status === "resolved" || t.status === "closed") return null;
  const ageHours = (Date.now() - new Date(t.created_at).getTime()) / 36e5;
  if (ageHours >= 48) {
    const days = Math.floor(ageHours / 24);
    return { label: `${days}d`, tone: "bg-destructive/10 text-destructive border-destructive/30" };
  }
  if (ageHours >= 24) {
    return { label: `${Math.floor(ageHours / 24)}d`, tone: "bg-amber-500/10 text-amber-600 border-amber-500/30" };
  }
  return null;
}

export default function AdminSupport() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();

  // URL state — hydrate every filter from the URL so admins can
  // bookmark / share a filtered view. Mirrors AdminLeads /
  // AdminProviders / AdminSeekers / AdminConcierge.
  const [filters, setFilters] = useState<SupportTicketFilters>(() => ({
    status: searchParams.get("status") ?? "all",
    source: searchParams.get("source") ?? "all",
    assignedTo: searchParams.get("assignee") ?? undefined,
  }));
  const [searchTerm, setSearchTerm] = useState(() => searchParams.get("q") ?? "");
  const debouncedSearch = useDebounce(searchTerm, 350);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [deepLinkLoading, setDeepLinkLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<BulkSupportAction | null>(null);

  // Sync URL ← state. `replace:true` keeps history tidy; defaults are
  // NOT written so the bare /admin/support stays clean. Loop-guarded
  // to avoid a useSearchParams render loop.
  useEffect(() => {
    const next = new URLSearchParams();
    if (debouncedSearch) next.set("q", debouncedSearch);
    if (filters.status && filters.status !== "all") next.set("status", filters.status);
    if (filters.source && filters.source !== "all") next.set("source", filters.source);
    if (filters.assignedTo) next.set("assignee", filters.assignedTo);
    const a = next.toString();
    const b = searchParams.toString();
    if (a !== b) setSearchParams(next, { replace: true });
  }, [debouncedSearch, filters.status, filters.source, filters.assignedTo, searchParams, setSearchParams]);

  const { data: tickets = [], isLoading, isFetching, refetch } = useAdminSupportTickets({
    ...filters,
    search: debouncedSearch || undefined,
  });

  // Global counts — these reflect the ENTIRE support_tickets table,
  // not just the currently-filtered view. Filtered counts (line below)
  // are computed in-memory off `tickets`. Splitting the two prevents
  // the misleading state where filtering to "new" made the "Total"
  // KPI = newCount.
  const { data: globalCounts } = useQuery({
    queryKey: ["admin-support-global-counts"],
    queryFn: async () => {
      const buckets = ["new", "open", "in_progress", "resolved", "closed"] as const;
      const results = await Promise.all([
        supabase.from("support_tickets").select("id", { count: "exact", head: true }),
        ...buckets.map((s) =>
          supabase.from("support_tickets").select("id", { count: "exact", head: true }).eq("status", s),
        ),
      ]);
      // Propagate any individual count failures so the KPI strip
      // shows the right state instead of silently rendering zeros.
      for (const r of results) {
        if (r.error) throw r.error;
      }
      const [total, ...byStatus] = results;
      return {
        total: total.count ?? 0,
        new: byStatus[0].count ?? 0,
        open: byStatus[1].count ?? 0,
        in_progress: byStatus[2].count ?? 0,
        resolved: byStatus[3].count ?? 0,
        closed: byStatus[4].count ?? 0,
      };
    },
    staleTime: 1000 * 30,
  });

  // Staff list — feeds the assignee filter and the bulk-reassign
  // dialog. Active admins only; the bulk edge fn also validates this
  // server-side as a defense-in-depth.
  const { data: adminStaff = [] } = useQuery({
    queryKey: ["admin-support-staff"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_user_profiles")
        .select("user_id, display_name")
        .eq("status", "active")
        .order("display_name", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 1000 * 60 * 5,
  });

  const invalidateAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["admin-support-tickets"] });
    queryClient.invalidateQueries({ queryKey: ["admin-support-global-counts"] });
  }, [queryClient]);

  // Realtime — support_tickets is in the supabase_realtime publication
  // (verified pre-deploy). 30s poll layered as a fallback in case the
  // channel drops.
  useEffect(() => {
    const interval = setInterval(invalidateAll, 30000);
    return () => clearInterval(interval);
  }, [invalidateAll]);

  useEffect(() => {
    const channel = supabase
      .channel(`admin-support-live-${Math.random().toString(36).slice(2,8)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "support_tickets" }, () => invalidateAll())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [invalidateAll]);

  // Sync selected ticket with fresh query data so the modal reflects
  // status/assignee updates without re-opening.
  useEffect(() => {
    if (selectedTicket) {
      const fresh = tickets.find((t) => t.id === selectedTicket.id);
      if (fresh && JSON.stringify(fresh) !== JSON.stringify(selectedTicket)) {
        setSelectedTicket(fresh);
      }
    }
  }, [tickets, selectedTicket]);

  // Deep link ?ticket=<id> from admin notifications opens the modal.
  useEffect(() => {
    const ticketId = searchParams.get("ticket");
    if (ticketId && !selectedTicket) {
      setDeepLinkLoading(true);
      supabase
        .from("support_tickets")
        .select("id, sender_name, sender_email, sender_user_id, subject, message, category, priority, status, source, assigned_to, assigned_by, assigned_at, resolved_by, resolved_at, resolution_notes, created_at, updated_at")
        .eq("id", ticketId)
        .maybeSingle()
        .then(({ data, error }) => {
          if (error) {
            toast.error("Failed to load support ticket", {
              description: error.message,
            });
          } else if (data) {
            setSelectedTicket(data as SupportTicket);
          } else {
            toast.error("Support ticket not found", {
              description: "The ticket may have been deleted or doesn't exist.",
            });
          }
          setDeepLinkLoading(false);
          // Use functional setSearchParams so we don't blow away any
          // OTHER URL state that this effect might race with.
          setSearchParams((prev) => {
            const next = new URLSearchParams(prev);
            next.delete("ticket");
            return next;
          }, { replace: true });
        });
    }
  }, [searchParams, selectedTicket, setSearchParams]);

  // In-view counts (currently-filtered) for the status tab labels.
  const inViewCounts = useMemo(() => {
    return tickets.reduce(
      (acc, ticket) => {
        acc[ticket.status] = (acc[ticket.status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );
  }, [tickets]);

  // KPI strip uses GLOBAL counts so filtering doesn't distort them.
  const newCount = globalCounts?.new ?? 0;
  const openCount = globalCounts?.open ?? 0;
  const inProgressCount = globalCounts?.in_progress ?? 0;
  const resolvedCount = globalCounts?.resolved ?? 0;
  const totalCount = globalCounts?.total ?? 0;

  const hasActiveFilters =
    searchTerm !== "" ||
    (filters.status && filters.status !== "all") ||
    (filters.source && filters.source !== "all") ||
    !!filters.assignedTo;

  const clearAllFilters = () => {
    setSearchTerm("");
    setFilters({ status: "all", source: "all", assignedTo: undefined });
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

  // Drop selections that drop out of the filtered view — prevents
  // bulk-acting on rows the admin can no longer see.
  useEffect(() => {
    if (selectedIds.size === 0) return;
    const visible = new Set(tickets.map((t) => t.id));
    let changed = false;
    const next = new Set<string>();
    for (const id of selectedIds) {
      if (visible.has(id)) next.add(id); else changed = true;
    }
    if (changed) setSelectedIds(next);
  }, [tickets, selectedIds]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    setSelectedIds((prev) =>
      prev.size === tickets.length ? new Set() : new Set(tickets.map((t) => t.id))
    );
  }, [tickets]);

  const handleExportCSV = useCallback(() => {
    if (tickets.length === 0) {
      toast.info("No tickets to export");
      return;
    }
    const headers = [
      "ID", "Status", "Priority", "Source", "Category", "Subject",
      "Sender Name", "Sender Email", "Created At", "Updated At",
      "Assigned To", "Resolved At",
    ];
    const rows = tickets.map((t) => [
      t.id,
      t.status,
      t.priority,
      t.source,
      t.category,
      t.subject || "",
      t.sender_name,
      t.sender_email,
      t.created_at,
      t.updated_at,
      t.assigned_admin?.display_name || (t.assigned_to ? "Assigned" : "Unassigned"),
      t.resolved_at || "",
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `support-tickets-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${tickets.length} tickets`);
  }, [tickets]);

  return (
    <div className="space-y-4 sm:space-y-6">
      <AdminPageHeader
        icon={Inbox}
        iconGradient="bg-gradient-to-br from-emerald-500 to-teal-600"
        title="Support Inbox"
        subtitle="Manage support requests from all channels"
        badges={[
          ...(newCount > 0 ? [{ label: "New", value: newCount, className: "bg-info/10 text-info" }] : []),
          ...(openCount + inProgressCount > 0 ? [{ label: "Open", value: openCount + inProgressCount, className: "bg-warning/10 text-warning" }] : []),
        ]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {selectedIds.size > 0 && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => setBulkAction("update_status")}
                  aria-label={`Change status for ${selectedIds.size} selected ticket${selectedIds.size === 1 ? "" : "s"}`}
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
                  aria-label={`Change priority for ${selectedIds.size} selected ticket${selectedIds.size === 1 ? "" : "s"}`}
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
                  aria-label={`Reassign ${selectedIds.size} selected ticket${selectedIds.size === 1 ? "" : "s"}`}
                >
                  <ArrowRightLeft className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Reassign</span>
                  <span>({selectedIds.size})</span>
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => setBulkAction("delete")}
                  aria-label={`Delete ${selectedIds.size} selected ticket${selectedIds.size === 1 ? "" : "s"}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Delete</span>
                  <span>({selectedIds.size})</span>
                </Button>
              </>
            )}
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-muted-foreground hover:text-foreground"
                onClick={copyFilterLink}
                aria-label="Copy a shareable link to this filtered view"
                title="Copy a shareable link to this filtered view"
              >
                <Link2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Copy link</span>
              </Button>
            )}
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
                aria-label="Clear all filters"
                className="gap-1.5 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Clear</span>
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              disabled={tickets.length === 0}
              className="gap-1.5"
              aria-label="Export current view as CSV"
            >
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">CSV</span>
            </Button>
            <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1.5">
              <RefreshCw className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          </div>
        }
      />

      {/* KPI Cards — global counts (not filtered) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardContent className="p-3 sm:p-4">
            <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">New</p>
            <p className="text-xl sm:text-2xl font-bold text-info tabular-nums">{globalCounts ? newCount : "—"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">Open / In Progress</p>
            <p className="text-xl sm:text-2xl font-bold text-warning tabular-nums">{globalCounts ? (openCount + inProgressCount) : "—"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">Resolved</p>
            <p className="text-xl sm:text-2xl font-bold text-success tabular-nums">{globalCounts ? resolvedCount : "—"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">Total</p>
            <p className="text-xl sm:text-2xl font-bold text-foreground tabular-nums">{globalCounts ? totalCount : "—"}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 h-3.5 sm:h-4 w-3.5 sm:w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or message..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 sm:pl-9 h-9 text-sm"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Select
                value={filters.source || "all"}
                onValueChange={(value) => setFilters({ ...filters, source: value })}
              >
                <SelectTrigger className="w-[120px] sm:w-[140px] h-9 text-xs sm:text-sm">
                  <Filter className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                  <SelectValue placeholder="Source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  <SelectItem value="public_contact">Public</SelectItem>
                  <SelectItem value="provider_support">Provider</SelectItem>
                  <SelectItem value="seeker_support">Client</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={filters.assignedTo || "all"}
                onValueChange={(value) =>
                  setFilters({ ...filters, assignedTo: value === "all" ? undefined : value })
                }
              >
                <SelectTrigger className="w-[140px] sm:w-[180px] h-9 text-xs sm:text-sm">
                  <SelectValue placeholder="Assignee" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Assignees</SelectItem>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {adminStaff.map((a) => (
                    <SelectItem key={a.user_id} value={a.user_id}>
                      {a.display_name || a.user_id.slice(0, 8)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Status Tabs — labels show in-view counts (the
              filtered set), not the global counts on the KPI strip. */}
          <Tabs
            value={filters.status || "all"}
            onValueChange={(value) => setFilters({ ...filters, status: value })}
            className="mt-3 sm:mt-4"
          >
            <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0 scrollbar-hide">
              <TabsList className="w-auto inline-flex sm:w-full justify-start bg-muted/50">
                <TabsTrigger value="all" className="data-[state=active]:bg-background text-xs sm:text-sm px-2 sm:px-3 tabular-nums">
                  All ({tickets.length})
                </TabsTrigger>
                <TabsTrigger value="new" className="data-[state=active]:bg-background text-xs sm:text-sm px-2 sm:px-3 tabular-nums">
                  New {inViewCounts["new"] > 0 && `(${inViewCounts["new"]})`}
                </TabsTrigger>
                <TabsTrigger value="open" className="data-[state=active]:bg-background text-xs sm:text-sm px-2 sm:px-3 tabular-nums">
                  Open {inViewCounts["open"] > 0 && `(${inViewCounts["open"]})`}
                </TabsTrigger>
                <TabsTrigger value="in_progress" className="data-[state=active]:bg-background text-xs sm:text-sm px-2 sm:px-3 whitespace-nowrap tabular-nums">
                  In Progress {inViewCounts["in_progress"] > 0 && `(${inViewCounts["in_progress"]})`}
                </TabsTrigger>
                <TabsTrigger value="resolved" className="data-[state=active]:bg-background text-xs sm:text-sm px-2 sm:px-3 tabular-nums">
                  Resolved {inViewCounts["resolved"] > 0 && `(${inViewCounts["resolved"]})`}
                </TabsTrigger>
                <TabsTrigger value="closed" className="data-[state=active]:bg-background text-xs sm:text-sm px-2 sm:px-3 tabular-nums">
                  Closed {inViewCounts["closed"] > 0 && `(${inViewCounts["closed"]})`}
                </TabsTrigger>
              </TabsList>
            </div>
          </Tabs>
        </CardContent>
      </Card>

      {/* Ticket List */}
      <Card>
        <CardHeader className="pb-2 sm:pb-3 px-4 sm:px-6 pt-4 sm:pt-6">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base sm:text-lg tabular-nums">
              {isLoading ? <Skeleton className="h-5 w-24" /> : `${tickets.length} Tickets`}
            </CardTitle>
            {tickets.length > 0 && (
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={selectedIds.size === tickets.length && tickets.length > 0}
                  onCheckedChange={toggleSelectAll}
                  aria-label={
                    selectedIds.size === tickets.length && tickets.length > 0
                      ? "Deselect all visible tickets"
                      : "Select all visible tickets"
                  }
                />
                <span className="text-xs text-muted-foreground">Select all</span>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {!isLoading && isFetching && (
            <div className="px-4 sm:px-6 pt-2 -mb-1 flex items-center gap-1.5 text-[11px] text-muted-foreground" aria-live="polite">
              <Loader2 className="h-3 w-3 animate-spin" />
              Refreshing…
            </div>
          )}
          {isLoading || deepLinkLoading ? (
            <div className="divide-y divide-border">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="px-4 sm:px-6 py-3 sm:py-4 flex items-start gap-3 sm:gap-4">
                  <Skeleton className="h-8 w-8 sm:h-10 sm:w-10 rounded-full shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-3 w-full max-w-md" />
                    <div className="flex gap-2">
                      <Skeleton className="h-5 w-14 rounded-full" />
                      <Skeleton className="h-5 w-20 rounded-full" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : tickets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 sm:py-12 text-muted-foreground">
              <Inbox className="h-10 w-10 sm:h-12 sm:w-12 mb-3 sm:mb-4 text-muted-foreground/40" />
              <p className="text-base sm:text-lg font-medium">No tickets found</p>
              <p className="text-xs sm:text-sm">
                {searchTerm || hasActiveFilters
                  ? "Try adjusting your search or filters"
                  : "Support requests will appear here"}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {tickets.map((ticket) => {
                const source = sourceLabels[ticket.source];
                const status = statusConfig[ticket.status];
                const priority = priorityConfig[ticket.priority];
                const SourceIcon = source?.icon || Mail;
                const isChecked = selectedIds.has(ticket.id);
                const sla = ticketSlaBadge(ticket);

                return (
                  <div
                    key={ticket.id}
                    className={cn(
                      "flex items-start gap-2 sm:gap-3 px-4 sm:px-6 py-3 sm:py-4 hover:bg-muted/50 transition-colors",
                      isChecked && "bg-primary/5"
                    )}
                  >
                    <div className="pt-1" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={() => toggleSelect(ticket.id)}
                        aria-label={`Select ticket from ${ticket.sender_name}`}
                      />
                    </div>
                    <button
                      onClick={() => setSelectedTicket(ticket)}
                      className="flex-1 text-left flex items-start gap-3 sm:gap-4 min-w-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 rounded"
                      aria-label={`Open ticket from ${ticket.sender_name} — ${ticket.subject || ticket.category}`}
                    >
                      <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-muted flex items-center justify-center">
                        <SourceIcon className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                          <span className="font-medium text-foreground text-sm sm:text-base">
                            {ticket.sender_name}
                          </span>
                          <span className="text-muted-foreground hidden sm:inline">·</span>
                          <span className="text-xs sm:text-sm text-muted-foreground hidden sm:inline truncate max-w-[200px]">
                            {ticket.sender_email}
                          </span>
                        </div>
                        {ticket.subject && (
                          <p className="text-xs sm:text-sm font-medium text-foreground/80 mt-0.5 line-clamp-1">
                            {ticket.subject}
                          </p>
                        )}
                        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 line-clamp-1">
                          {ticket.category} — {ticket.message}
                        </p>
                        <div className="flex items-center gap-1.5 sm:gap-2 mt-1.5 sm:mt-2 flex-wrap">
                          <Badge variant="outline" className={cn("text-[10px] sm:text-xs", status?.className)}>
                            {status?.label || ticket.status}
                          </Badge>
                          {ticket.priority !== "normal" && (
                            <Badge variant="outline" className={cn("text-[10px] sm:text-xs", priority?.className)}>
                              {priority?.label || ticket.priority}
                            </Badge>
                          )}
                          {sla && (
                            <Badge variant="outline" className={cn("text-[10px] sm:text-xs", sla.tone)} title="Time since the ticket was created">
                              <Clock className="h-2.5 w-2.5 mr-0.5" />
                              {sla.label}
                            </Badge>
                          )}
                          <span className="text-[10px] sm:text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(ticket.created_at), {
                              addSuffix: true,
                            })}
                          </span>
                        </div>
                      </div>

                      <div className="flex-shrink-0 hidden sm:block">
                        {ticket.assigned_admin ? (
                          <Avatar className="h-7 w-7 sm:h-8 sm:w-8">
                            <AvatarImage src={ticket.assigned_admin.avatar_url || undefined} />
                            <AvatarFallback className="text-[10px] sm:text-xs bg-primary/10 text-primary">
                              {ticket.assigned_admin.display_name
                                ?.split(" ")
                                .map((n) => n[0])
                                .join("")
                                .toUpperCase() || "?"}
                            </AvatarFallback>
                          </Avatar>
                        ) : (
                          <div
                            className="h-7 w-7 sm:h-8 sm:w-8 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center"
                            aria-label="Unassigned"
                            title="Unassigned"
                          >
                            <span className="text-[10px] sm:text-xs text-muted-foreground">?</span>
                          </div>
                        )}
                      </div>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ticket Detail Modal */}
      <SupportTicketModal
        ticket={selectedTicket}
        open={!!selectedTicket}
        onOpenChange={(open) => !open && setSelectedTicket(null)}
        onDeleted={() => {
          setSelectedTicket(null);
          invalidateAll();
        }}
      />

      {/* Bulk action dialog */}
      {bulkAction && (
        <BulkSupportTicketActionDialog
          open={!!bulkAction}
          onOpenChange={(open) => !open && setBulkAction(null)}
          action={bulkAction}
          selectedIds={selectedIds}
          adminStaff={adminStaff}
          onSuccess={() => {
            setSelectedIds(new Set());
            invalidateAll();
          }}
        />
      )}
    </div>
  );
}
