import { useState, useMemo, useEffect, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Users, Search, Mail, Phone, Zap, Download, X, Trash2,
  CheckSquare, Square, Loader2, UserCheck,
  MessageSquare, Building2, CalendarIcon, Clock, Timer,
  ArrowRightLeft, ArrowUpDown, RefreshCw, Link2,
} from "lucide-react";
import { format, subDays, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAdminErrorHandler } from "@/hooks/useAdminErrorHandler";
import { exportLeadsToCSV } from "@/lib/csvExport";
import { InquiryDetailModal } from "@/components/admin/inquiries/InquiryDetailModal";
import { BulkReassignDialog } from "@/components/admin/inquiries/BulkReassignDialog";
import { BulkStatusUpdateDialog } from "@/components/admin/inquiries/BulkStatusUpdateDialog";
import { PaginationFooter } from "@/components/common/PaginationFooter";
import { usePagination } from "@/hooks/usePagination";

export type Lead = {
  id: string;
  facility_id: string | null;
  original_facility_id: string | null;
  name: string;
  email: string;
  phone: string;
  status: string;
  created_at: string;
  urgency: string | null;
  level_of_care: string | null;
  source: string | null;
  location_city_state: string | null;
  location_zip: string | null;
  primary_substance: string[] | null;
  insurance_type: string | null;
  message: string | null;
  inquiry_type: string | null;
  who_seeking_help: string | null;
  provider_response_status: string | null;
  provider_responded_at: string | null;
  qualified: boolean | null;
  quality_flag: string | null;
  assignment_status: string | null;
  age_range: string | null;
  gender: string | null;
  preferred_contact: string;
  assigned_at: string | null;
  lead_expired_at: string | null;
  shared_with: string[] | null;
};

type Facility = { id: string; name: string; city: string; state: string };
type DateRange = { from: Date | undefined; to: Date | undefined };

const DATE_PRESETS = [
  { label: "All Time", value: "all", getRange: () => ({ from: undefined, to: undefined }) },
  { label: "Today", value: "today", getRange: () => ({ from: new Date(), to: new Date() }) },
  { label: "Last 7 Days", value: "7days", getRange: () => ({ from: subDays(new Date(), 7), to: new Date() }) },
  { label: "Last 30 Days", value: "30days", getRange: () => ({ from: subDays(new Date(), 30), to: new Date() }) },
  { label: "This Month", value: "thisMonth", getRange: () => ({ from: startOfMonth(new Date()), to: new Date() }) },
  { label: "Last Month", value: "lastMonth", getRange: () => ({ from: startOfMonth(subMonths(new Date(), 1)), to: endOfMonth(subMonths(new Date(), 1)) }) },
  { label: "Custom", value: "custom", getRange: () => ({ from: undefined, to: undefined }) },
];



function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    new: { label: "New", className: "bg-info/10 text-info border-info/30" },
    contacted: { label: "Contacted", className: "bg-chart-3/10 text-chart-3 border-chart-3/30" },
    responding: { label: "Responding", className: "bg-chart-5/10 text-chart-5 border-chart-5/30" },
    converted: { label: "Converted", className: "bg-success/10 text-success border-success/30" },
    closed: { label: "Closed", className: "bg-muted text-muted-foreground border-border" },
    expired: { label: "Expired", className: "bg-muted text-muted-foreground border-border" },
  };
  const { label, className } = config[status] || { label: status, className: "bg-muted text-muted-foreground border-border" };
  return <Badge variant="outline" className={cn(className, "text-xs")}>{label}</Badge>;
}

function LeadStatusBadge({ lead }: { lead: Lead }) {
  // "Shared" / "Reassigned" badges (based on redistribution_status) were
  // removed 2026-05-21 — they were holdovers from the per-lead-sale model.
  // Admins viewing a lead now infer reassignment context from the
  // facility column in the row itself + the admin_audit_log entry.
  // Only surface an explicit "Expired" pill when the lead carries an expiry
  // timestamp but its main status hasn't been flipped to "expired" yet (a rare
  // race) — otherwise the Status column's StatusBadge already shows it, so a
  // separate badge would be redundant. Rendered inline in the Status column.
  if (lead.lead_expired_at && lead.status !== "expired") {
    return (
      <Badge variant="outline" className="bg-muted text-muted-foreground border-border gap-1 text-xs">
        <Clock className="h-3 w-3" />Expired
      </Badge>
    );
  }
  return null;
}

function useDebounce(value: string, delay: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

export default function AdminLeads() {
  const queryClient = useQueryClient();
  const { logError } = useAdminErrorHandler("AdminLeads");

  // URL-state — filter + sort + date-range state mirrors to the
  // URL search params so any filter combination is bookmarkable
  // and shareable. On mount we hydrate state FROM the URL; on every
  // change we write state BACK to the URL. Round-tripping through
  // useSearchParams (replace, not push) keeps the back button sane.
  const [searchParams, setSearchParams] = useSearchParams();
  const parseDate = (s: string | null): Date | undefined => {
    if (!s) return undefined;
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? undefined : d;
  };

  const [searchInput, setSearchInput] = useState(() => searchParams.get("q") ?? "");
  const [statusFilter, setStatusFilter] = useState(() => searchParams.get("status") ?? "all");
  const [inquiryTypeFilter, setInquiryTypeFilter] = useState(() => searchParams.get("type") ?? "all");
  const [datePreset, setDatePreset] = useState(() => searchParams.get("dp") ?? "all");
  const [dateRange, setDateRange] = useState<DateRange>(() => ({
    from: parseDate(searchParams.get("from")),
    to: parseDate(searchParams.get("to")),
  }));
  // Sort state — admin can sort by any of the columns. Default
  // matches the prior locked behaviour (newest first). Each value
  // is `${column}:${direction}` so a single Select can drive both.
  const [sortKey, setSortKey] = useState<string>(() => searchParams.get("sort") ?? "created_at:desc");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [bulkReassignOpen, setBulkReassignOpen] = useState(false);
  const [bulkStatusOpen, setBulkStatusOpen] = useState(false);

  const searchQuery = useDebounce(searchInput, 350);
  const hasActiveFilters = statusFilter !== "all" || inquiryTypeFilter !== "all" || searchInput !== "" || dateRange.from !== undefined;

  // Sync state → URL on every change. `replace: true` keeps the
  // browser history short (one history entry per page-load, not one
  // per keystroke), and we skip writing default ("all") values to
  // keep the URL tidy.
  useEffect(() => {
    const next = new URLSearchParams();
    if (searchQuery) next.set("q", searchQuery);
    if (statusFilter && statusFilter !== "all") next.set("status", statusFilter);
    if (inquiryTypeFilter && inquiryTypeFilter !== "all") next.set("type", inquiryTypeFilter);
    if (datePreset && datePreset !== "all") next.set("dp", datePreset);
    if (dateRange.from) next.set("from", format(dateRange.from, "yyyy-MM-dd"));
    if (dateRange.to) next.set("to", format(dateRange.to, "yyyy-MM-dd"));
    if (sortKey && sortKey !== "created_at:desc") next.set("sort", sortKey);
    // Only update if the URL params actually differ — avoids a
    // useSearchParams render loop.
    const a = next.toString();
    const b = searchParams.toString();
    if (a !== b) setSearchParams(next, { replace: true });
  }, [searchQuery, statusFilter, inquiryTypeFilter, datePreset, dateRange, sortKey, searchParams, setSearchParams]);

  const clearAllFilters = () => {
    setStatusFilter("all"); setInquiryTypeFilter("all");
    setSearchInput(""); setDatePreset("all"); setDateRange({ from: undefined, to: undefined });
    setSortKey("created_at:desc"); setCurrentPage(1); setSelectedIds(new Set());
  };

  const copyFilterLink = useCallback(async () => {
    try {
      const url = window.location.href;
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        toast.success("Filter link copied to clipboard");
      } else {
        // Fallback for environments where the clipboard API is unavailable
        // (older browsers, insecure contexts). Selecting an input is the
        // most reliable cross-browser fallback.
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

  const handleDatePresetChange = (value: string) => {
    setDatePreset(value);
    if (value !== "custom") {
      const preset = DATE_PRESETS.find(p => p.value === value);
      if (preset) setDateRange(preset.getRange());
    }
    setCurrentPage(1);
  };

  const handleFilterChange = (setter: (v: string) => void) => (value: string) => {
    setter(value); setCurrentPage(1); setSelectedIds(new Set());
  };

  const invalidateAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["admin-leads"] });
    queryClient.invalidateQueries({ queryKey: ["admin-leads-count"] });
    queryClient.invalidateQueries({ queryKey: ["admin-leads-kpi"] });
  }, [queryClient]);

  useEffect(() => {
    const interval = setInterval(invalidateAll, 30000);
    return () => clearInterval(interval);
  }, [invalidateAll]);

  // Realtime invalidation — subscribe to leads-table INSERTs and
  // UPDATEs so new inquiries and status changes appear within a few
  // hundred milliseconds instead of waiting for the 30s poll. RLS on
  // the leads table gates row visibility to admins; the channel only
  // delivers events the caller's JWT can read.
  //
  // Polling stays as a belt-and-braces fallback in case the realtime
  // channel drops (network blip, idle suspension). The two combined
  // give bounded freshness regardless of connection state.
  useEffect(() => {
    const channel = supabase
      .channel(`admin-leads-live-${Math.random().toString(36).slice(2,8)}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "leads" },
        () => invalidateAll(),
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "leads" },
        () => invalidateAll(),
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "leads" },
        () => invalidateAll(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [invalidateAll]);

  // KPI Stats
  const { data: kpiStats } = useQuery({
    queryKey: ["admin-leads-kpi"],
    queryFn: async () => {
      const [totalRes, newRes, contactedRes, convertedRes, requestInfoRes, requestCallbackRes] = await Promise.all([
        supabase.from("leads").select("id", { count: "exact", head: true }),
        supabase.from("leads").select("id", { count: "exact", head: true }).eq("status", "new"),
        supabase.from("leads").select("id", { count: "exact", head: true }).eq("status", "contacted"),
        supabase.from("leads").select("id", { count: "exact", head: true }).eq("status", "converted"),
        supabase.from("leads").select("id", { count: "exact", head: true }).eq("inquiry_type", "request_info"),
        supabase.from("leads").select("id", { count: "exact", head: true }).eq("inquiry_type", "request_callback"),
      ]);
      // `redistributed` KPI removed 2026-05-21 — see note in
      // SuperAdminDashboard.tsx + AdminLeads filter dropdown removal.
      return {
        total: totalRes.count || 0, newCount: newRes.count || 0,
        contacted: contactedRes.count || 0, converted: convertedRes.count || 0,
        requestInfo: requestInfoRes.count || 0, requestCallback: requestCallbackRes.count || 0,
      };
    },
  });

  // Free-tier inquiries land in concierge_inquiries (not leads).
  // Surfacing the count here lets the admin see the *full* inquiry
  // universe at a glance — the leads table here is Pro-only, while
  // concierge_inquiries holds Free/Unclaimed redirects + paid
  // seeker-initiated concierge intakes. Distinct surfaces by
  // routing decision; one navigation prompt prevents the admin
  // from forgetting the other side exists.
  const { data: conciergeBacklog } = useQuery({
    queryKey: ["admin-leads-concierge-banner"],
    queryFn: async () => {
      const [redirectRes, allOpenRes] = await Promise.all([
        supabase
          .from("concierge_inquiries")
          .select("id", { count: "exact", head: true })
          .eq("routing_mode", "free_tier_redirect")
          .not("status", "in", "(closed,completed)"),
        supabase
          .from("concierge_inquiries")
          .select("id", { count: "exact", head: true })
          .not("status", "in", "(closed,completed)"),
      ]);
      return {
        freeTierRedirects: redirectRes.count || 0,
        allOpen: allOpenRes.count || 0,
      };
    },
    refetchInterval: 60_000,
    // Keep the larger of the two previously-duplicated staleTimes; the 60s refetchInterval handles freshness, this just avoids needless refetches on remount.
    staleTime: 1000 * 60 * 2,
  });

  // Filtered count
  const { data: totalCount } = useQuery({
    queryKey: ["admin-leads-count", statusFilter, inquiryTypeFilter, searchQuery, dateRange.from?.toISOString(), dateRange.to?.toISOString()],
    queryFn: async () => {
      let query = supabase.from("leads").select("id", { count: "exact", head: true });
      if (statusFilter !== "all") query = query.eq("status", statusFilter);
      if (inquiryTypeFilter !== "all") query = query.eq("inquiry_type", inquiryTypeFilter);
      if (searchQuery) query = query.or(`name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%`);
      if (dateRange.from) query = query.gte("created_at", format(dateRange.from, "yyyy-MM-dd"));
      if (dateRange.to) query = query.lte("created_at", format(dateRange.to, "yyyy-MM-dd") + "T23:59:59.999Z");
      const { count, error } = await query;
      if (error) throw error;
      return count || 0;
    },
  });

  const { page: currentPage, pageSize, totalPages, setPage: setCurrentPage, setPageSize } = usePagination({
    tableId: "admin-leads",
    defaultPageSize: 25,
    totalItems: totalCount ?? 0,
  });


  const { data: leads, isLoading, isFetching, isError: leadsError, refetch: refetchLeads } = useQuery({
    queryKey: ["admin-leads", statusFilter, inquiryTypeFilter, searchQuery, currentPage, dateRange.from?.toISOString(), dateRange.to?.toISOString(), sortKey],
    queryFn: async () => {
      const from = (currentPage - 1) * pageSize;
      const to = from + pageSize - 1;
      // Parse "column:direction" sort key; whitelist columns so a
      // hostile state value can't inject an arbitrary column name.
      const [rawCol, rawDir] = sortKey.split(":");
      const sortableColumns = new Set([
        "created_at",
        "status",
        "urgency",
        "provider_response_status",
        "assigned_at",
      ]);
      const sortColumn = sortableColumns.has(rawCol) ? rawCol : "created_at";
      const sortAscending = rawDir === "asc";
      let query = supabase
        .from("leads")
        .select("id, facility_id, original_facility_id, name, email, phone, status, created_at, urgency, level_of_care, source, location_city_state, location_zip, primary_substance, insurance_type, message, inquiry_type, who_seeking_help, provider_response_status, provider_responded_at, qualified, quality_flag, assignment_status, age_range, gender, preferred_contact, assigned_at, lead_expired_at, shared_with")
        .order(sortColumn, { ascending: sortAscending, nullsFirst: false })
        // Tie-breaker on created_at DESC so equal-sort-key rows are
        // deterministic (otherwise pagination can shuffle).
        .order("created_at", { ascending: false })
        .range(from, to);

      if (statusFilter !== "all") query = query.eq("status", statusFilter);
      if (inquiryTypeFilter !== "all") query = query.eq("inquiry_type", inquiryTypeFilter);
      if (searchQuery) query = query.or(`name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%`);
      if (dateRange.from) query = query.gte("created_at", format(dateRange.from, "yyyy-MM-dd"));
      if (dateRange.to) query = query.lte("created_at", format(dateRange.to, "yyyy-MM-dd") + "T23:59:59.999Z");

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as Lead[];
    },
  });

  // Facilities map
  const { data: facilities } = useQuery({
    queryKey: ["admin-facilities-lookup"],
    queryFn: async () => {
      const { data } = await supabase.from("facilities").select("id, name, city, state").eq("status", "approved").limit(2000);
      return data as Facility[];
    },
    staleTime: 1000 * 60 * 5,
  });

  const facilitiesMap = useMemo(() => {
    if (!facilities) return new Map<string, Facility>();
    return new Map(facilities.map(f => [f.id, f]));
  }, [facilities]);

  const filteredLeads = useMemo(() => leads || [], [leads]);
  

  // Delete — error toast surfaces the actual server-side reason
  // (e.g. "Forbidden - only super admins may delete leads") instead of
  // the generic "Failed to delete" so admins can self-diagnose blocked
  // operations. Same pattern as AdminProviders handleConfirmAction.
  const reasonFromInvoke = (
    data: unknown,
    error: unknown,
    fallback: string,
  ): string => {
    const serverErr = (data as { error?: string } | null)?.error;
    if (serverErr) return serverErr;
    if (error instanceof Error) return error.message;
    return fallback;
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    setIsBulkDeleting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");
      const { data, error } = await supabase.functions.invoke("admin-delete-lead", {
        body: { leadIds: Array.from(selectedIds) },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (error || (data as { error?: string } | null)?.error) {
        throw new Error(reasonFromInvoke(data, error, "Bulk delete failed"));
      }
      invalidateAll(); toast.success(`${selectedIds.size} lead(s) deleted`);
      setSelectedIds(new Set()); setBulkDeleteOpen(false);
    } catch (err) {
      logError("bulk_delete", err);
      toast.error(`Failed to delete: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
    finally { setIsBulkDeleting(false); }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  };
  const toggleSelectAll = () => {
    if (!filteredLeads) return;
    if (selectedIds.size === filteredLeads.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filteredLeads.map((l) => l.id)));
  };

  const handleExportCSV = useCallback(() => {
    if (!leads || leads.length === 0) { toast.error("No leads to export"); return; }
    const exportData = leads.map((lead) => ({
      id: lead.id, name: lead.name, email: lead.email, phone: lead.phone,
      created_at: lead.created_at, status: lead.status,
      inquiry_type: lead.inquiry_type || "request_info",
      qualified: lead.qualified ?? null, urgency: lead.urgency || null,
      primary_substance: lead.primary_substance || null,
      insurance_type: lead.insurance_type || null,
      level_of_care: lead.level_of_care || null,
      location_city_state: lead.location_city_state || null,
      location_zip: lead.location_zip || null,
      who_seeking_help: lead.who_seeking_help || null,
      message: lead.message || null,
      facility_name: facilitiesMap.get(lead.facility_id || "")?.name || undefined,
    }));
    exportLeadsToCSV(exportData);
    toast.success(`Exported ${leads.length} leads (current page)`);
  }, [leads, facilitiesMap]);

  const openDetail = (lead: Lead) => {
    setSelectedLead(lead);
    setShowDetailModal(true);
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        icon={Users}
        iconGradient="bg-gradient-to-br from-chart-3 to-chart-5"
        title="Inquiries"
        subtitle="Direct facility inquiries — click any row for full details and actions"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {selectedIds.size > 0 && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => setBulkStatusOpen(true)}
                  aria-label={`Update status for ${selectedIds.size} selected lead${selectedIds.size === 1 ? "" : "s"}`}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Status</span>
                  <span>({selectedIds.size})</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 border-primary/40 text-primary hover:bg-primary/5"
                  onClick={() => setBulkReassignOpen(true)}
                  aria-label={`Reassign ${selectedIds.size} selected lead${selectedIds.size === 1 ? "" : "s"}`}
                >
                  <ArrowRightLeft className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Reassign</span>
                  <span>({selectedIds.size})</span>
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => setBulkDeleteOpen(true)}
                  aria-label={`Delete ${selectedIds.size} selected lead${selectedIds.size === 1 ? "" : "s"}`}
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
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={handleExportCSV}
              disabled={!leads || leads.length === 0}
              title="Export the current page of inquiries to CSV"
              aria-label="Export the current page of inquiries to CSV"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Export page</span>
            </Button>
          </div>
        }
      />

      {/* Concierge-queue awareness banner — Pro-tier inquiries live in
          the `leads` table (this page); Free / Unclaimed-tier inquiries
          land in `concierge_inquiries` via the routing_mode='free_tier_redirect'
          branch in submit-qualified-lead. Surface a thin reminder + count
          so the admin doesn't lose sight of the parallel queue. */}
      {conciergeBacklog && conciergeBacklog.allOpen > 0 && (
        <div className="flex items-start gap-3 rounded-lg border border-violet-200 bg-violet-50/60 px-4 py-3 text-sm">
          <UserCheck className="h-4 w-4 text-violet-700 mt-0.5 shrink-0" aria-hidden />
          <div className="flex-1 min-w-0">
            <p className="text-slate-900">
              <span className="font-semibold">{conciergeBacklog.allOpen}</span>{" "}
              open concierge {conciergeBacklog.allOpen === 1 ? "inquiry" : "inquiries"} also need attention
              {conciergeBacklog.freeTierRedirects > 0 && (
                <>
                  {" "}—{" "}
                  <span className="font-semibold">{conciergeBacklog.freeTierRedirects}</span>{" "}
                  from Free / Unclaimed facility inquiries
                </>
              )}
              . They live on the concierge surface, not in this Pro-only table.
            </p>
          </div>
          <Button asChild size="sm" variant="outline" className="border-violet-300 text-violet-900 hover:bg-violet-100 shrink-0">
            <Link to="/admin/concierge">Open concierge queue</Link>
          </Button>
        </div>
      )}

      {/* KPI Summary */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 divide-x divide-y sm:divide-y-0 divide-border">
            {[
              { label: "Total", value: kpiStats?.total, icon: Users, color: "text-primary", filter: () => handleFilterChange(setStatusFilter)("all") },
              { label: "New", value: kpiStats?.newCount, icon: Mail, color: "text-info", filter: () => handleFilterChange(setStatusFilter)("new") },
              { label: "Contacted", value: kpiStats?.contacted, icon: Phone, color: "text-chart-3", filter: () => handleFilterChange(setStatusFilter)("contacted") },
              { label: "Converted", value: kpiStats?.converted, icon: Zap, color: "text-success", filter: () => handleFilterChange(setStatusFilter)("converted") },
              { label: "Request Info", value: kpiStats?.requestInfo, icon: MessageSquare, color: "text-primary", filter: () => handleFilterChange(setInquiryTypeFilter)("request_info") },
              { label: "Callbacks", value: kpiStats?.requestCallback, icon: Phone, color: "text-warning", filter: () => handleFilterChange(setInquiryTypeFilter)("request_callback") },
            ].map((kpi) => (
              <button key={kpi.label} onClick={kpi.filter} className="flex flex-col items-center justify-center p-3 sm:p-4 transition-colors hover:bg-muted/50">
                <kpi.icon className={cn("h-4 w-4 mb-1", kpi.color)} />
                <span className="text-lg sm:text-xl font-bold tabular-nums">{kpi.value ?? "—"}</span>
                <span className="text-[9px] sm:text-[10px] uppercase tracking-wide text-muted-foreground">{kpi.label}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col lg:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search by name, email, or phone..." value={searchInput} onChange={(e) => { setSearchInput(e.target.value); setCurrentPage(1); }} className="pl-9" maxLength={128} />
              </div>
              <div className="flex flex-wrap gap-2">
                <Select value={statusFilter} onValueChange={handleFilterChange(setStatusFilter)}>
                  <SelectTrigger className="w-[130px]"><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="contacted">Contacted</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="responding">Responding</SelectItem>
                    <SelectItem value="converted">Converted</SelectItem>
                    <SelectItem value="lost">Lost</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={inquiryTypeFilter} onValueChange={handleFilterChange(setInquiryTypeFilter)}>
                  <SelectTrigger className="w-[140px]"><SelectValue placeholder="Type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="request_info">Request Info</SelectItem>
                    <SelectItem value="request_callback">Callback</SelectItem>
                    <SelectItem value="tour_request">Tour</SelectItem>
                  </SelectContent>
                </Select>
                {/* Redistribution filter dropdown removed 2026-05-21 —
                    we no longer sell leads, and the surviving
                    redistribution_status column is just historical
                    bookkeeping (not actionable for admin triage). */}
                <Select value={datePreset} onValueChange={handleDatePresetChange}>
                  <SelectTrigger className="w-[130px]"><CalendarIcon className="h-4 w-4 mr-1.5" /><SelectValue placeholder="Date" /></SelectTrigger>
                  <SelectContent>
                    {DATE_PRESETS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={sortKey} onValueChange={(v) => { setSortKey(v); setCurrentPage(1); }}>
                  <SelectTrigger className="w-[170px]" aria-label="Sort by">
                    <ArrowUpDown className="h-3.5 w-3.5 mr-1.5" />
                    <SelectValue placeholder="Sort" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="created_at:desc">Newest first</SelectItem>
                    <SelectItem value="created_at:asc">Oldest first</SelectItem>
                    <SelectItem value="status:asc">Status (A→Z)</SelectItem>
                    <SelectItem value="urgency:desc">Urgent first</SelectItem>
                    <SelectItem value="assigned_at:desc">Recently assigned</SelectItem>
                    <SelectItem value="provider_response_status:asc">Unresponded first</SelectItem>
                  </SelectContent>
                </Select>
                {datePreset === "custom" && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-[220px] justify-start text-left font-normal text-xs", !dateRange.from && "text-muted-foreground")}>
                        <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
                        {dateRange.from ? (dateRange.to ? <>{format(dateRange.from, "MMM d")} – {format(dateRange.to, "MMM d, yyyy")}</> : format(dateRange.from, "MMM d, yyyy")) : "Pick range"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent initialFocus mode="range" defaultMonth={dateRange.from} selected={{ from: dateRange.from, to: dateRange.to }} onSelect={(range) => { setDateRange({ from: range?.from, to: range?.to }); setCurrentPage(1); }} numberOfMonths={2} className="pointer-events-auto" />
                    </PopoverContent>
                  </Popover>
                )}
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearAllFilters} className="gap-1 text-muted-foreground hover:text-foreground h-9">
                    <X className="h-3.5 w-3.5" />Clear
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Simplified Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            Inquiries
            <Badge variant="secondary" className="ml-1 tabular-nums">{totalCount ?? 0}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : leadsError ? (
            <div className="text-center py-16 px-4">
              <Users className="h-12 w-12 text-destructive/40 mx-auto mb-3" aria-hidden />
              <p className="text-destructive font-medium">Failed to load inquiries</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                Something went wrong fetching this page. Check your connection and try again.
              </p>
              <Button variant="outline" size="sm" onClick={() => refetchLeads()} className="mt-4 gap-1.5">
                <RefreshCw className="h-3.5 w-3.5" />
                Retry
              </Button>
            </div>
          ) : filteredLeads.length > 0 ? (
            <>
              {/* Background-refetch indicator — surfaces the realtime/polling
                  refresh so admins know the list is live, not stale. Hidden
                  during the initial isLoading state. */}
              {isFetching && (
                <div className="px-4 pb-2 -mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground" aria-live="polite">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Refreshing…
                </div>
              )}

              {/* Desktop / tablet — table layout */}
              <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead scope="col" className="w-10">
                      <button
                        type="button"
                        onClick={toggleSelectAll}
                        className="p-1"
                        aria-label={
                          selectedIds.size === filteredLeads.length && filteredLeads.length > 0
                            ? "Deselect all leads on this page"
                            : "Select all leads on this page"
                        }
                      >
                        {selectedIds.size === filteredLeads.length && filteredLeads.length > 0
                          ? <CheckSquare className="h-4 w-4 text-primary" />
                          : <Square className="h-4 w-4 text-muted-foreground" />}
                      </button>
                    </TableHead>
                    <TableHead scope="col" className="min-w-[160px]">Client</TableHead>
                    <TableHead scope="col" className="min-w-[120px]">Facility</TableHead>
                    <TableHead scope="col" className="min-w-[70px]">Type</TableHead>
                    <TableHead scope="col" className="min-w-[80px]">Status</TableHead>
                    <TableHead scope="col" className="min-w-[100px]">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLeads.map((lead) => {
                    const facility = lead.facility_id ? facilitiesMap.get(lead.facility_id) : null;
                    // SLA indicator: a lead is "stale" when it's been
                    // sitting unresponded for >24h on a still-open status.
                    // Surfaces in the Status column as a small Timer
                    // badge so an admin can scan for at-risk rows.
                    const staleHours = (() => {
                      if (lead.provider_response_status === "contacted") return 0;
                      if (lead.status === "closed" || lead.status === "expired" || lead.status === "converted") return 0;
                      const anchor = lead.assigned_at ?? lead.created_at;
                      if (!anchor) return 0;
                      const diffMs = Date.now() - new Date(anchor).getTime();
                      const hours = Math.floor(diffMs / (60 * 60 * 1000));
                      return hours >= 24 ? hours : 0;
                    })();
                    return (
                      <TableRow
                        key={lead.id}
                        className="cursor-pointer group hover:bg-muted/40 transition-colors"
                        onClick={() => openDetail(lead)}
                      >
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <button onClick={() => toggleSelect(lead.id)} className="p-1">
                            {selectedIds.has(lead.id) ? <CheckSquare className="h-4 w-4 text-primary" /> : <Square className="h-4 w-4 text-muted-foreground" />}
                          </button>
                        </TableCell>
                        <TableCell>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-medium text-sm truncate max-w-[160px]">{lead.name}</span>
                              {lead.urgency === "immediate" && <Zap className="h-3 w-3 text-destructive flex-shrink-0" />}
                            </div>
                            <p className="text-xs text-muted-foreground truncate max-w-[180px]">{lead.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {facility ? (
                            <div className="flex items-center gap-1.5 min-w-0">
                              <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              <span className="text-sm truncate max-w-[120px]">{facility.name}</span>
                            </div>
                          ) : <span className="text-muted-foreground text-xs">—</span>}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs whitespace-nowrap">
                            {lead.inquiry_type === "request_callback" ? "Callback" : lead.inquiry_type === "tour_request" ? "Tour" : "Info"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <StatusBadge status={lead.status} />
                            <LeadStatusBadge lead={lead} />
                            {staleHours > 0 && (
                              <Badge
                                variant="outline"
                                className="text-[10px] gap-1 border-amber-300 bg-amber-50 text-amber-800 px-1.5 py-0"
                                title={`No provider response in ${staleHours}h`}
                              >
                                <Timer className="h-3 w-3" />
                                {staleHours >= 72 ? `${Math.floor(staleHours / 24)}d` : `${staleHours}h`}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {format(new Date(lead.created_at), "MMM d, h:mm a")}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              </div>

              {/* Mobile — stacked card list. Same data as the table above
                  but laid out for phone/narrow viewport (< md). Tap to
                  open detail; the bulk-select checkbox lives in the
                  card's top-right so single-handed users don't have to
                  reach across to toggle. */}
              <div className="md:hidden divide-y divide-border">
                {filteredLeads.map((lead) => {
                  const facility = lead.facility_id ? facilitiesMap.get(lead.facility_id) : null;
                  const staleHours = (() => {
                    if (lead.provider_response_status === "contacted") return 0;
                    if (lead.status === "closed" || lead.status === "expired" || lead.status === "converted") return 0;
                    const anchor = lead.assigned_at ?? lead.created_at;
                    if (!anchor) return 0;
                    const diffMs = Date.now() - new Date(anchor).getTime();
                    const hours = Math.floor(diffMs / (60 * 60 * 1000));
                    return hours >= 24 ? hours : 0;
                  })();
                  const isSelected = selectedIds.has(lead.id);
                  return (
                    <div
                      key={lead.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => openDetail(lead)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          openDetail(lead);
                        }
                      }}
                      className="px-4 py-3 hover:bg-muted/40 focus-visible:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary transition-colors cursor-pointer"
                    >
                      <div className="flex items-start gap-3">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); toggleSelect(lead.id); }}
                          className="p-1 -m-1 shrink-0 mt-0.5"
                          aria-label={isSelected ? `Deselect ${lead.name}` : `Select ${lead.name}`}
                        >
                          {isSelected ? <CheckSquare className="h-4 w-4 text-primary" /> : <Square className="h-4 w-4 text-muted-foreground" />}
                        </button>

                        <div className="flex-1 min-w-0 space-y-1.5">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <p className="font-medium text-sm truncate">{lead.name}</p>
                                {lead.urgency === "immediate" && <Zap className="h-3 w-3 text-destructive shrink-0" />}
                              </div>
                              <p className="text-xs text-muted-foreground truncate">{lead.email}</p>
                            </div>
                            <span className="text-[11px] text-muted-foreground whitespace-nowrap shrink-0">
                              {format(new Date(lead.created_at), "MMM d")}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-1.5">
                            <StatusBadge status={lead.status} />
                            {staleHours > 0 && (
                              <Badge
                                variant="outline"
                                className="text-[10px] gap-1 border-amber-300 bg-amber-50 text-amber-800 px-1.5 py-0"
                                title={`No provider response in ${staleHours}h`}
                              >
                                <Timer className="h-3 w-3" />
                                {staleHours >= 72 ? `${Math.floor(staleHours / 24)}d` : `${staleHours}h`}
                              </Badge>
                            )}
                            <LeadStatusBadge lead={lead} />
                            <Badge variant="secondary" className="text-[10px]">
                              {lead.inquiry_type === "request_callback" ? "Callback" : lead.inquiry_type === "tour_request" ? "Tour" : "Info"}
                            </Badge>
                          </div>

                          {facility && (
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground min-w-0">
                              <Building2 className="h-3 w-3 shrink-0" />
                              <span className="truncate">{facility.name}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="text-center py-16 px-4">
              <Users className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" aria-hidden />
              <p className="text-muted-foreground font-medium">
                {hasActiveFilters ? "No inquiries match these filters" : "No inquiries yet"}
              </p>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                {hasActiveFilters
                  ? "Try adjusting your filters or clearing the date range. New inquiries appear in real time."
                  : "Inquiries from facility-profile contact forms land here. Concierge intakes have their own dashboard."}
              </p>
              <div className="mt-4 flex items-center justify-center gap-2 flex-wrap">
                {hasActiveFilters && (
                  <Button variant="outline" size="sm" onClick={clearAllFilters} className="gap-1.5">
                    <X className="h-3.5 w-3.5" />
                    Clear all filters
                  </Button>
                )}
                <Button variant="link" size="sm" asChild>
                  <Link to="/admin/concierge">View concierge queue →</Link>
                </Button>
              </div>
            </div>
          )}

          {/* Pagination */}
          <div className="px-4 pb-2">
            <PaginationFooter
              page={currentPage}
              pageSize={pageSize}
              totalPages={totalPages}
              totalItems={totalCount ?? 0}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
              itemLabel="lead"
            />
          </div>
        </CardContent>
      </Card>

      {/* Detail Modal */}
      <InquiryDetailModal
        lead={selectedLead}
        open={showDetailModal}
        onOpenChange={setShowDetailModal}
        facilityMap={facilitiesMap}
        facilities={facilities || []}
        onLeadUpdated={invalidateAll}
      />

      {/* Bulk Reassign */}
      <BulkReassignDialog
        open={bulkReassignOpen}
        onOpenChange={setBulkReassignOpen}
        selectedIds={selectedIds}
        facilities={facilities || []}
        onSuccess={() => {
          invalidateAll();
          setSelectedIds(new Set());
        }}
      />

      {/* Bulk Status Update */}
      <BulkStatusUpdateDialog
        open={bulkStatusOpen}
        onOpenChange={setBulkStatusOpen}
        selectedIds={selectedIds}
        onSuccess={() => {
          invalidateAll();
          setSelectedIds(new Set());
        }}
      />


      {/* Bulk Delete */}
      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.size} lead(s)?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently remove the selected leads.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBulkDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} disabled={isBulkDeleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isBulkDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}Delete {selectedIds.size}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
