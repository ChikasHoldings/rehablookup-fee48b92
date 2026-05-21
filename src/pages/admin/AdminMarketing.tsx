import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { format, formatDistanceToNow } from "date-fns";
import {
  Megaphone,
  Users,
  Mail,
  TrendingUp,
  Search,
  Phone,
  MapPin,
  Shield,
  Zap,
  MessageSquare,
  Clock,
  Download,
  Trash2,
  Loader2,
  CheckSquare,
  Square,
  RefreshCw,
  Link2,
  X,
  Send,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { PaginationFooter } from "@/components/common/PaginationFooter";
import { usePagination } from "@/hooks/usePagination";
import { toast } from "sonner";
import {
  MarketingLeadProfileModal,
  type MarketingLead,
} from "@/components/admin/marketing/MarketingLeadProfileModal";
import {
  BulkMarketingLeadActionDialog,
  type BulkMarketingAction,
} from "@/components/admin/marketing/BulkMarketingLeadActionDialog";

function useDebounce(value: string, delay: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

function exportLeadsToCSV(leads: MarketingLead[]) {
  const headers = [
    "First Name", "Last Name", "Email", "Phone", "Location", "Urgency",
    "Level of Care", "Insurance", "Source", "UTM Source", "UTM Medium",
    "UTM Campaign", "Status", "Facilities Requested", "Created",
  ];
  const rows = leads.map((l) => [
    l.first_name, l.last_name, l.email, l.phone,
    l.location_city_state || l.location_zip || "",
    l.urgency || "", l.level_of_care || "", l.insurance_type || "",
    l.source || "", l.utm_source || "", l.utm_medium || "",
    l.utm_campaign || "", l.status || "new",
    String(l.facilities_requested?.length || 0),
    format(new Date(l.created_at), "yyyy-MM-dd HH:mm"),
  ]);
  const csvContent = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `marketing-leads-${format(new Date(), "yyyy-MM-dd")}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

const VALID_STATUSES = ["all", "new", "contacted", "converted", "lost"] as const;
const VALID_URGENCIES = ["all", "immediate", "within-week", "within-month", "researching"] as const;
type StatusFilter = typeof VALID_STATUSES[number];
type UrgencyFilter = typeof VALID_URGENCIES[number];

/** SLA badge for non-converted leads: time since intake, color-graded. */
function leadSlaBadge(l: MarketingLead): { label: string; tone: string } | null {
  if (l.converted_to_concierge) return null;
  const ageHours = (Date.now() - new Date(l.created_at).getTime()) / 36e5;
  // Tighter clock for "immediate" urgency.
  if (l.urgency === "immediate") {
    if (ageHours >= 24) return { label: `${Math.floor(ageHours / 24)}d`, tone: "bg-destructive/10 text-destructive border-destructive/30" };
    if (ageHours >= 4) return { label: `${Math.floor(ageHours)}h`, tone: "bg-amber-500/10 text-amber-600 border-amber-500/30" };
    return null;
  }
  if (l.urgency === "within-week") {
    if (ageHours >= 72) return { label: `${Math.floor(ageHours / 24)}d`, tone: "bg-destructive/10 text-destructive border-destructive/30" };
    if (ageHours >= 24) return { label: `${Math.floor(ageHours / 24)}d`, tone: "bg-amber-500/10 text-amber-600 border-amber-500/30" };
    return null;
  }
  // Default — long fuse.
  if (ageHours >= 336) return { label: `${Math.floor(ageHours / 24)}d`, tone: "bg-destructive/10 text-destructive border-destructive/30" };
  if (ageHours >= 168) return { label: `${Math.floor(ageHours / 24)}d`, tone: "bg-amber-500/10 text-amber-600 border-amber-500/30" };
  return null;
}

export default function AdminMarketing() {
  const queryClient = useQueryClient();
  const { adminRole, isSuperAdmin } = useAdminAuth();
  const canModerate = isSuperAdmin || adminRole === "super_admin" || adminRole === "manager";

  const [searchParams, setSearchParams] = useSearchParams();

  // URL-state hydration
  const [searchInput, setSearchInput] = useState(() => searchParams.get("q") ?? "");
  const debouncedSearch = useDebounce(searchInput, 350);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(() => {
    const t = searchParams.get("status");
    return t && (VALID_STATUSES as readonly string[]).includes(t) ? (t as StatusFilter) : "all";
  });
  const [urgencyFilter, setUrgencyFilter] = useState<UrgencyFilter>(() => {
    const u = searchParams.get("urgency");
    return u && (VALID_URGENCIES as readonly string[]).includes(u) ? (u as UrgencyFilter) : "all";
  });
  const [sourceFilter, setSourceFilter] = useState<string>(() => searchParams.get("source") ?? "all");
  const [selectedLead, setSelectedLead] = useState<MarketingLead | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<BulkMarketingAction | null>(null);

  // Sync URL ← state
  useEffect(() => {
    const next = new URLSearchParams();
    if (debouncedSearch) next.set("q", debouncedSearch);
    if (statusFilter !== "all") next.set("status", statusFilter);
    if (urgencyFilter !== "all") next.set("urgency", urgencyFilter);
    if (sourceFilter !== "all") next.set("source", sourceFilter);
    const a = next.toString();
    const b = searchParams.toString();
    if (a !== b) setSearchParams(next, { replace: true });
  }, [debouncedSearch, statusFilter, urgencyFilter, sourceFilter, searchParams, setSearchParams]);

  // Fetch marketing leads — list view, applies status filter server-side
  // (the others are applied client-side for instant UI).
  const { data: leads = [], isLoading, isFetching, refetch } = useQuery({
    queryKey: ["admin-marketing-leads", statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("marketing_leads")
        .select("id, first_name, last_name, email, phone, status, source, primary_substance, insurance_type, insurance_provider, level_of_care, location_city_state, location_zip, urgency, created_at, updated_at, converted_to_concierge, converted_at, admin_notes, followup_email_sent, followup_email_sent_at, message, who_seeking_help, utm_source, utm_medium, utm_campaign, utm_content, utm_term, landing_page, facilities_requested, matched_facility_ids, age_range, gender, previous_treatment, dual_diagnosis, employment_status, preferred_contact, co_occurring_conditions")
        .order("created_at", { ascending: false })
        .limit(500);

      if (statusFilter === "converted") {
        query = query.eq("converted_to_concierge", true);
      } else if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as MarketingLead[];
    },
    staleTime: 30 * 1000,
  });

  // Global counts — separate query so KPI strip reflects truth even
  // when the list view is filtered. Same pattern as /admin/support.
  const { data: globalCounts } = useQuery({
    queryKey: ["admin-marketing-counts"],
    queryFn: async () => {
      const buckets = ["new", "contacted", "converted", "lost"] as const;
      const results = await Promise.all([
        supabase.from("marketing_leads").select("id", { count: "exact", head: true }),
        ...buckets.map((s) =>
          supabase.from("marketing_leads").select("id", { count: "exact", head: true }).eq("status", s),
        ),
        supabase.from("marketing_leads").select("id", { count: "exact", head: true }).eq("converted_to_concierge", true),
        supabase.from("marketing_leads").select("id", { count: "exact", head: true }).in("urgency", ["immediate", "within-week"]),
      ]);
      for (const r of results) {
        if (r.error) throw r.error;
      }
      const [total, ...rest] = results;
      const [newCount, contactedCount, convertedCount, lostCount, conciergeCount, urgentCount] = rest;
      return {
        total: total.count ?? 0,
        new: newCount.count ?? 0,
        contacted: contactedCount.count ?? 0,
        converted: convertedCount.count ?? 0,
        lost: lostCount.count ?? 0,
        concierge: conciergeCount.count ?? 0,
        urgent: urgentCount.count ?? 0,
      };
    },
    staleTime: 30 * 1000,
  });

  const invalidateAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["admin-marketing-leads"] });
    queryClient.invalidateQueries({ queryKey: ["admin-marketing-counts"] });
    queryClient.invalidateQueries({ queryKey: ["admin-sidebar-counts"] });
  }, [queryClient]);

  // Realtime channel — marketing_leads added to publication via
  // migration 20260623000000. 30s poll fallback layered on top.
  useEffect(() => {
    const interval = setInterval(invalidateAll, 30000);
    return () => clearInterval(interval);
  }, [invalidateAll]);

  useEffect(() => {
    const channel = supabase
      .channel("admin-marketing-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "marketing_leads" }, () => invalidateAll())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [invalidateAll]);

  // Available sources for the source filter — derived from current data
  const availableSources = useMemo(() => {
    const set = new Set<string>();
    leads.forEach((l) => {
      const s = l.source || l.utm_source;
      if (s) set.add(s);
    });
    return Array.from(set).sort();
  }, [leads]);

  // Filter leads by search + urgency + source (status applied server-side)
  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      if (urgencyFilter !== "all" && lead.urgency !== urgencyFilter) return false;
      if (sourceFilter !== "all" && (lead.source || lead.utm_source) !== sourceFilter) return false;
      if (debouncedSearch) {
        const q = debouncedSearch.toLowerCase();
        const hit =
          lead.first_name?.toLowerCase().includes(q) ||
          lead.last_name?.toLowerCase().includes(q) ||
          lead.email?.toLowerCase().includes(q) ||
          lead.phone?.includes(debouncedSearch) ||
          lead.location_city_state?.toLowerCase().includes(q) ||
          lead.location_zip?.includes(debouncedSearch) ||
          lead.utm_campaign?.toLowerCase().includes(q);
        if (!hit) return false;
      }
      return true;
    });
  }, [leads, debouncedSearch, urgencyFilter, sourceFilter]);

  const leadsPagination = usePagination({
    tableId: "admin-marketing-leads",
    defaultPageSize: 25,
    totalItems: filteredLeads.length,
  });
  const visibleLeads = leadsPagination.paginate(filteredLeads);

  // Reset to page 1 when filters/search change.
  useEffect(() => {
    leadsPagination.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, statusFilter, urgencyFilter, sourceFilter]);

  // Selection-drift cleanup — drop selected IDs that left the filtered view
  useEffect(() => {
    if (selectedIds.size === 0) return;
    const visible = new Set(filteredLeads.map((l) => l.id));
    let changed = false;
    const next = new Set<string>();
    for (const id of selectedIds) {
      if (visible.has(id)) next.add(id); else changed = true;
    }
    if (changed) setSelectedIds(next);
  }, [filteredLeads, selectedIds]);

  const hasActiveFilters =
    searchInput !== "" || statusFilter !== "all" || urgencyFilter !== "all" || sourceFilter !== "all";

  const clearAllFilters = () => {
    setSearchInput("");
    setStatusFilter("all");
    setUrgencyFilter("all");
    setSourceFilter("all");
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

  // KPI strip — global counts (not filtered)
  const totalLeads = globalCounts?.total ?? 0;
  const convertedLeads = globalCounts?.concierge ?? 0;
  const newLeads = globalCounts?.new ?? 0;
  const urgentLeads = globalCounts?.urgent ?? 0;
  const engagedLeads = useMemo(
    () => leads.filter((l) => (l.facilities_requested?.length || 0) > 0).length,
    [leads],
  );

  const getStatusBadge = (lead: MarketingLead) => {
    if (lead.converted_to_concierge) {
      return <Badge className="bg-chart-3/10 text-chart-3 border-chart-3/30 gap-1"><Shield className="h-3 w-3" />Concierge</Badge>;
    }
    if ((lead.facilities_requested?.length || 0) > 0) {
      return <Badge className="bg-success/10 text-success border-success/30 gap-1"><MessageSquare className="h-3 w-3" />Engaged</Badge>;
    }
    if (lead.followup_email_sent) {
      return <Badge className="bg-info/10 text-info border-info/30 gap-1"><Mail className="h-3 w-3" />Followed Up</Badge>;
    }
    return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" />New</Badge>;
  };

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAllVisible = useCallback(() => {
    if (visibleLeads.length === 0) return;
    const allIds = visibleLeads.map((l) => l.id);
    const allSelected = allIds.every((id) => selectedIds.has(id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) allIds.forEach((id) => next.delete(id));
      else allIds.forEach((id) => next.add(id));
      return next;
    });
  }, [visibleLeads, selectedIds]);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2 text-foreground">
            <Megaphone className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            Marketing Leads
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Leads captured from campaigns, landing pages, and exit intent
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canModerate && selectedIds.size > 0 && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => setBulkAction("update_status")}
                aria-label={`Change status for ${selectedIds.size} selected lead${selectedIds.size === 1 ? "" : "s"}`}
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Status</span>
                <span>({selectedIds.size})</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => setBulkAction("send_followup")}
                aria-label={`Send follow-up email to ${selectedIds.size} selected lead${selectedIds.size === 1 ? "" : "s"}`}
              >
                <Send className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Follow-up</span>
                <span>({selectedIds.size})</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 border-primary/40 text-primary hover:bg-primary/5"
                onClick={() => setBulkAction("mark_converted")}
                aria-label={`Mark ${selectedIds.size} selected lead${selectedIds.size === 1 ? "" : "s"} as converted`}
              >
                <Shield className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Mark converted</span>
                <span>({selectedIds.size})</span>
              </Button>
              {isSuperAdmin && (
                <Button
                  variant="destructive"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => setBulkAction("delete")}
                  aria-label={`Delete ${selectedIds.size} selected lead${selectedIds.size === 1 ? "" : "s"}`}
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
            onClick={() => exportLeadsToCSV(filteredLeads)}
            disabled={filteredLeads.length === 0}
            aria-label="Export filtered leads to CSV"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">CSV</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => refetch()}
            aria-label="Refresh"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isFetching && "animate-spin")} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>
      </div>

      {/* KPI Summary Bar — global counts (not affected by filters) */}
      <Card>
        <CardContent className="p-0">
          <div className="flex items-stretch flex-wrap">
            <div className="flex items-center gap-0.5 p-3 flex-wrap">
              <button
                onClick={() => setStatusFilter("all")}
                className={cn(
                  "flex flex-col items-center justify-center px-3 py-2.5 rounded-lg transition-all min-w-[72px]",
                  statusFilter === "all" ? "bg-accent/10 ring-1 ring-accent" : "hover:bg-muted/50"
                )}
                aria-label="Show all leads"
                aria-pressed={statusFilter === "all"}
              >
                <Users className="h-3.5 w-3.5 text-muted-foreground mb-1" />
                <span className="text-lg font-semibold tabular-nums leading-none">{globalCounts ? totalLeads : "—"}</span>
                <span className="text-[9px] text-muted-foreground uppercase tracking-wider mt-1">Total</span>
              </button>
              <button
                onClick={() => setStatusFilter("new")}
                className={cn(
                  "flex flex-col items-center justify-center px-3 py-2.5 rounded-lg transition-all min-w-[72px]",
                  statusFilter === "new" ? "bg-accent/10 ring-1 ring-accent" : "hover:bg-muted/50"
                )}
                aria-label="Filter to new leads"
                aria-pressed={statusFilter === "new"}
              >
                <Clock className="h-3.5 w-3.5 text-info mb-1" />
                <span className="text-lg font-semibold tabular-nums leading-none">{globalCounts ? newLeads : "—"}</span>
                <span className="text-[9px] text-muted-foreground uppercase tracking-wider mt-1">New</span>
              </button>
              <div className="flex flex-col items-center justify-center px-3 py-2.5 min-w-[72px]">
                <TrendingUp className="h-3.5 w-3.5 text-success mb-1" />
                <span className="text-lg font-semibold tabular-nums leading-none">{isLoading ? "—" : engagedLeads}</span>
                <span className="text-[9px] text-muted-foreground uppercase tracking-wider mt-1">Engaged</span>
              </div>
              <button
                onClick={() => setStatusFilter("converted")}
                className={cn(
                  "flex flex-col items-center justify-center px-3 py-2.5 rounded-lg transition-all min-w-[72px]",
                  statusFilter === "converted" ? "bg-accent/10 ring-1 ring-accent" : "hover:bg-muted/50"
                )}
                aria-label="Filter to converted leads"
                aria-pressed={statusFilter === "converted"}
              >
                <Shield className="h-3.5 w-3.5 text-chart-3 mb-1" />
                <span className="text-lg font-semibold tabular-nums leading-none">{globalCounts ? convertedLeads : "—"}</span>
                <span className="text-[9px] text-muted-foreground uppercase tracking-wider mt-1">Concierge</span>
              </button>
            </div>

            <div className="w-px bg-border my-2" />

            <div className="flex items-center gap-0.5 p-3">
              <button
                onClick={() => setUrgencyFilter(urgencyFilter === "immediate" ? "all" : "immediate")}
                className={cn(
                  "flex flex-col items-center justify-center px-3 py-2.5 rounded-lg transition-all min-w-[72px]",
                  urgencyFilter === "immediate" ? "bg-destructive/10 ring-1 ring-destructive" : "hover:bg-muted/50"
                )}
                aria-label="Filter to urgent leads"
                aria-pressed={urgencyFilter === "immediate"}
              >
                <Zap className="h-3.5 w-3.5 text-destructive mb-1" />
                <span className="text-lg font-semibold tabular-nums leading-none">{globalCounts ? urgentLeads : "—"}</span>
                <span className="text-[9px] text-muted-foreground uppercase tracking-wider mt-1">Urgent</span>
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, phone, location, or UTM campaign..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
                <SelectTrigger className="w-[140px] h-9 text-sm">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="contacted">Contacted</SelectItem>
                  <SelectItem value="converted">Converted</SelectItem>
                  <SelectItem value="lost">Lost</SelectItem>
                </SelectContent>
              </Select>
              <Select value={urgencyFilter} onValueChange={(v) => setUrgencyFilter(v as UrgencyFilter)}>
                <SelectTrigger className="w-[140px] h-9 text-sm">
                  <SelectValue placeholder="Urgency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Urgency</SelectItem>
                  <SelectItem value="immediate">Immediate</SelectItem>
                  <SelectItem value="within-week">Within Week</SelectItem>
                  <SelectItem value="within-month">Within Month</SelectItem>
                  <SelectItem value="researching">Researching</SelectItem>
                </SelectContent>
              </Select>
              {availableSources.length > 0 && (
                <Select value={sourceFilter} onValueChange={setSourceFilter}>
                  <SelectTrigger className="w-[140px] h-9 text-sm">
                    <SelectValue placeholder="Source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sources</SelectItem>
                    {availableSources.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Refreshing indicator */}
      {!isLoading && isFetching && (
        <div className="flex items-center gap-1.5 -my-2 text-[11px] text-muted-foreground" aria-live="polite">
          <Loader2 className="h-3 w-3 animate-spin" />
          Refreshing…
        </div>
      )}

      {/* Leads Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    {canModerate && (
                      <button
                        onClick={toggleSelectAllVisible}
                        className="p-1"
                        aria-label={
                          visibleLeads.length > 0 && visibleLeads.every((l) => selectedIds.has(l.id))
                            ? "Deselect all visible leads"
                            : "Select all visible leads"
                        }
                      >
                        {visibleLeads.length > 0 && visibleLeads.every((l) => selectedIds.has(l.id)) ? (
                          <CheckSquare className="h-4 w-4 text-primary" />
                        ) : (
                          <Square className="h-4 w-4 text-muted-foreground" />
                        )}
                      </button>
                    )}
                  </TableHead>
                  <TableHead className="min-w-[160px]">Lead</TableHead>
                  <TableHead className="min-w-[180px]">Contact</TableHead>
                  <TableHead className="min-w-[120px]">Location</TableHead>
                  <TableHead className="min-w-[100px]">Urgency</TableHead>
                  <TableHead className="min-w-[80px]">Source</TableHead>
                  <TableHead className="min-w-[100px]">Engagement</TableHead>
                  <TableHead className="min-w-[100px]">Status</TableHead>
                  <TableHead className="min-w-[100px]">Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                      <TableCell><Skeleton className="h-10 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-40" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredLeads.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                      <Megaphone className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
                      <p className="font-medium">No marketing leads found</p>
                      <p className="text-xs mt-1">
                        {hasActiveFilters ? "Try adjusting your search or filters" : "Leads from campaigns will appear here"}
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  visibleLeads.map((lead) => {
                    const isChecked = selectedIds.has(lead.id);
                    const sla = leadSlaBadge(lead);
                    return (
                      <TableRow
                        key={lead.id}
                        className={cn(
                          "cursor-pointer hover:bg-muted/50",
                          isChecked && "bg-primary/5"
                        )}
                        onClick={() => setSelectedLead(lead)}
                      >
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          {canModerate && (
                            <button
                              onClick={() => toggleSelect(lead.id)}
                              className="p-1"
                              aria-label={`Select ${lead.first_name} ${lead.last_name}`}
                            >
                              {isChecked ? (
                                <CheckSquare className="h-4 w-4 text-primary" />
                              ) : (
                                <Square className="h-4 w-4 text-muted-foreground" />
                              )}
                            </button>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <span className="text-sm font-semibold text-primary">
                                {lead.first_name?.[0]}{lead.last_name?.[0]}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium text-foreground text-sm">
                                {lead.first_name} {lead.last_name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {lead.who_seeking_help || "Self"}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm space-y-0.5">
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                              <Mail className="h-3 w-3 shrink-0" />
                              <span className="truncate max-w-[160px]">{lead.email}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                              <Phone className="h-3 w-3 shrink-0" />
                              <span>{lead.phone || "—"}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {lead.location_city_state || lead.location_zip ? (
                            <span className="text-sm text-muted-foreground flex items-center gap-1">
                              <MapPin className="h-3 w-3 shrink-0" />
                              {lead.location_city_state || lead.location_zip}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {lead.urgency ? (
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-xs gap-1",
                                  lead.urgency === "immediate" && "bg-destructive/10 text-destructive border-destructive/30",
                                  lead.urgency === "within-week" && "bg-warning/10 text-warning border-warning/30",
                                  lead.urgency === "within-month" && "bg-info/10 text-info border-info/30",
                                  lead.urgency === "researching" && "bg-muted text-muted-foreground border-border"
                                )}
                              >
                                {lead.urgency === "immediate" && <Zap className="h-3 w-3" />}
                                {lead.urgency}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                            {sla && (
                              <Badge variant="outline" className={cn("text-[10px]", sla.tone)} title="Time since intake — overdue for follow-up">
                                <Clock className="h-2.5 w-2.5 mr-0.5" />
                                {sla.label}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs bg-muted px-2 py-1 rounded text-muted-foreground">
                            {lead.source || lead.utm_source || "direct"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm tabular-nums text-foreground">
                              {lead.facilities_requested?.length || 0}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              requests
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(lead)}</TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <p className="text-foreground">{format(new Date(lead.created_at), "MMM d")}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(lead.created_at), { addSuffix: true })}
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
          <div className="px-4 pb-2">
            <PaginationFooter
              page={leadsPagination.page}
              pageSize={leadsPagination.pageSize}
              totalPages={leadsPagination.totalPages}
              totalItems={filteredLeads.length}
              onPageChange={leadsPagination.setPage}
              onPageSizeChange={leadsPagination.setPageSize}
              itemLabel="lead"
            />
          </div>
        </CardContent>
      </Card>

      {/* Lead Detail Modal */}
      <MarketingLeadProfileModal
        lead={selectedLead}
        open={!!selectedLead}
        onOpenChange={(open) => !open && setSelectedLead(null)}
        onUpdated={invalidateAll}
        onDeleted={() => {
          setSelectedLead(null);
          invalidateAll();
        }}
      />

      {/* Bulk action dialog */}
      {bulkAction && (
        <BulkMarketingLeadActionDialog
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
