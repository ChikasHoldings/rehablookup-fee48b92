import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Users, Search, Mail, Phone, MapPin, Calendar, Clock, Zap,
  MoreHorizontal, Eye, CalendarIcon, Building2, Share2, Timer,
  Download, X, Trash2, ArrowRightLeft, CheckSquare, Square,
  Loader2, Lock, Unlock, Handshake, MessageSquare,
} from "lucide-react";
import { format, subDays, startOfMonth, endOfMonth, subMonths, formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuSub,
  DropdownMenuSubContent, DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAdminErrorHandler } from "@/hooks/useAdminErrorHandler";
import { exportLeadsToCSV } from "@/lib/csvExport";
import { formatSourceLabel } from "@/lib/sourceLabels";
import { InquiryDetailModal } from "@/components/admin/inquiries/InquiryDetailModal";

type Lead = {
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
  redistribution_status: string | null;
  assignment_status: string | null;
  age_range: string | null;
  gender: string | null;
  preferred_contact: string;
  lead_score: number | null;
  lead_score_label: string | null;
  credit_cost: number | null;
  exclusive_until: string | null;
  extended_until: string | null;
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
  { label: "Last 14 Days", value: "14days", getRange: () => ({ from: subDays(new Date(), 14), to: new Date() }) },
  { label: "Last 30 Days", value: "30days", getRange: () => ({ from: subDays(new Date(), 30), to: new Date() }) },
  { label: "This Month", value: "thisMonth", getRange: () => ({ from: startOfMonth(new Date()), to: new Date() }) },
  { label: "Last Month", value: "lastMonth", getRange: () => ({ from: startOfMonth(subMonths(new Date(), 1)), to: endOfMonth(subMonths(new Date(), 1)) }) },
  { label: "Custom", value: "custom", getRange: () => ({ from: undefined, to: undefined }) },
];

const ITEMS_PER_PAGE = 25;

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    new: { label: "New", className: "bg-info/10 text-info border-info/30" },
    contacted: { label: "Contacted", className: "bg-chart-3/10 text-chart-3 border-chart-3/30" },
    unlocked: { label: "Unlocked", className: "bg-success/10 text-success border-success/30" },
    responding: { label: "Responding", className: "bg-chart-5/10 text-chart-5 border-chart-5/30" },
    converted: { label: "Converted", className: "bg-success/10 text-success border-success/30" },
    closed: { label: "Closed", className: "bg-muted text-muted-foreground border-border" },
    expired: { label: "Expired", className: "bg-muted text-muted-foreground border-border" },
  };
  const { label, className } = config[status] || { label: status, className: "bg-muted text-muted-foreground border-border" };
  return <Badge variant="outline" className={cn(className, "text-xs")}>{label}</Badge>;
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
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [inquiryTypeFilter, setInquiryTypeFilter] = useState("all");
  const [redistributionFilter, setRedistributionFilter] = useState("all");
  const [datePreset, setDatePreset] = useState("all");
  const [dateRange, setDateRange] = useState<DateRange>({ from: undefined, to: undefined });
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<Lead | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  const searchQuery = useDebounce(searchInput, 350);

  const hasActiveFilters = statusFilter !== "all" || inquiryTypeFilter !== "all" || redistributionFilter !== "all" || searchInput !== "" || dateRange.from !== undefined;

  const clearAllFilters = () => {
    setStatusFilter("all"); setInquiryTypeFilter("all"); setRedistributionFilter("all");
    setSearchInput(""); setDatePreset("all"); setDateRange({ from: undefined, to: undefined });
    setCurrentPage(1); setSelectedIds(new Set());
  };

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

  // Poll every 30s
  useEffect(() => {
    const interval = setInterval(invalidateAll, 30000);
    return () => clearInterval(interval);
  }, [invalidateAll]);

  // KPI Stats
  const { data: kpiStats } = useQuery({
    queryKey: ["admin-leads-kpi"],
    queryFn: async () => {
      const [totalRes, newRes, contactedRes, convertedRes, unlockedRes, redistRes, requestInfoRes, requestCallbackRes] = await Promise.all([
        supabase.from("leads").select("id", { count: "exact", head: true }),
        supabase.from("leads").select("id", { count: "exact", head: true }).eq("status", "new"),
        supabase.from("leads").select("id", { count: "exact", head: true }).eq("status", "contacted"),
        supabase.from("leads").select("id", { count: "exact", head: true }).eq("status", "converted"),
        supabase.from("lead_unlocks").select("id", { count: "exact", head: true }),
        supabase.from("leads").select("id", { count: "exact", head: true }).eq("redistribution_status", "extended"),
        supabase.from("leads").select("id", { count: "exact", head: true }).eq("inquiry_type", "request_info"),
        supabase.from("leads").select("id", { count: "exact", head: true }).eq("inquiry_type", "request_callback"),
      ]);
      return {
        total: totalRes.count || 0,
        newCount: newRes.count || 0,
        contacted: contactedRes.count || 0,
        converted: convertedRes.count || 0,
        unlocked: unlockedRes.count || 0,
        redistributed: redistRes.count || 0,
        requestInfo: requestInfoRes.count || 0,
        requestCallback: requestCallbackRes.count || 0,
      };
    },
    staleTime: 1000 * 60 * 2,
  });

  // Filtered count
  const { data: totalCount } = useQuery({
    queryKey: ["admin-leads-count", statusFilter, inquiryTypeFilter, redistributionFilter, searchQuery, dateRange.from?.toISOString(), dateRange.to?.toISOString()],
    queryFn: async () => {
      let query = supabase.from("leads").select("id", { count: "exact", head: true });
      if (statusFilter !== "all") query = query.eq("status", statusFilter);
      if (inquiryTypeFilter !== "all") query = query.eq("inquiry_type", inquiryTypeFilter);
      if (redistributionFilter === "redistributed") query = query.eq("redistribution_status", "extended");
      else if (redistributionFilter === "not_redistributed") query = query.or("redistribution_status.is.null,redistribution_status.eq.exclusive");
      else if (redistributionFilter !== "all") query = query.eq("redistribution_status", redistributionFilter);
      if (searchQuery) query = query.or(`name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%`);
      if (dateRange.from) query = query.gte("created_at", format(dateRange.from, "yyyy-MM-dd"));
      if (dateRange.to) query = query.lte("created_at", format(dateRange.to, "yyyy-MM-dd") + "T23:59:59.999Z");
      const { count, error } = await query;
      if (error) throw error;
      return count || 0;
    },
  });

  // Paginated leads
  const { data: leads, isLoading } = useQuery({
    queryKey: ["admin-leads", statusFilter, inquiryTypeFilter, redistributionFilter, searchQuery, currentPage, dateRange.from?.toISOString(), dateRange.to?.toISOString()],
    queryFn: async () => {
      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;
      let query = supabase
        .from("leads")
        .select("id, facility_id, original_facility_id, name, email, phone, status, created_at, urgency, level_of_care, source, location_city_state, location_zip, primary_substance, insurance_type, message, inquiry_type, who_seeking_help, provider_response_status, provider_responded_at, qualified, quality_flag, redistribution_status, assignment_status, age_range, gender, preferred_contact, lead_score, lead_score_label, credit_cost, exclusive_until, extended_until, assigned_at, lead_expired_at, shared_with")
        .order("created_at", { ascending: false })
        .range(from, to);

      if (statusFilter !== "all") query = query.eq("status", statusFilter);
      if (inquiryTypeFilter !== "all") query = query.eq("inquiry_type", inquiryTypeFilter);
      if (redistributionFilter === "redistributed") query = query.eq("redistribution_status", "extended");
      else if (redistributionFilter === "not_redistributed") query = query.or("redistribution_status.is.null,redistribution_status.eq.exclusive");
      else if (redistributionFilter !== "all") query = query.eq("redistribution_status", redistributionFilter);
      if (searchQuery) query = query.or(`name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%`);
      if (dateRange.from) query = query.gte("created_at", format(dateRange.from, "yyyy-MM-dd"));
      if (dateRange.to) query = query.lte("created_at", format(dateRange.to, "yyyy-MM-dd") + "T23:59:59.999Z");

      const { data, error } = await query;
      if (error) throw error;
      return data as Lead[];
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

  // Batch fetch unlock status for current page leads
  const leadIds = useMemo(() => (leads || []).map(l => l.id), [leads]);
  const { data: unlockMap } = useQuery({
    queryKey: ["admin-leads-unlock-map", leadIds],
    queryFn: async () => {
      if (!leadIds.length) return {};
      const { data } = await supabase.from("lead_unlocks").select("lead_id, unlocked_at, facility_id").in("lead_id", leadIds);
      const map: Record<string, { unlocked_at: string; facility_id: string }> = {};
      data?.forEach((u: any) => { map[u.lead_id] = u; });
      return map;
    },
    enabled: leadIds.length > 0,
  });

  const filteredLeads = useMemo(() => leads || [], [leads]);
  const totalPages = Math.ceil((totalCount || 0) / ITEMS_PER_PAGE);

  // Assign lead
  const assignLead = useMutation({
    mutationFn: async ({ leadId, facilityId }: { leadId: string; facilityId: string }) => {
      const { error } = await supabase.from("leads").update({ facility_id: facilityId }).eq("id", leadId);
      if (error) throw error;
    },
    onSuccess: () => { invalidateAll(); toast.success("Lead assigned"); },
    onError: (error) => { logError("assign_lead", error); toast.error("Failed to assign"); },
  });

  // Delete
  const handleDeleteLead = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");
      const { data, error } = await supabase.functions.invoke("admin-delete-lead", {
        body: { leadIds: [deleteTarget.id] },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      invalidateAll();
      toast.success("Lead deleted");
      setDeleteTarget(null);
    } catch (err) {
      logError("delete_lead", err);
      toast.error("Failed to delete");
    } finally {
      setIsDeleting(false);
    }
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
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      invalidateAll();
      toast.success(`${selectedIds.size} lead(s) deleted`);
      setSelectedIds(new Set());
      setBulkDeleteOpen(false);
    } catch (err) {
      logError("bulk_delete", err);
      toast.error("Failed to delete");
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
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
      exclusivity: lead.redistribution_status || null,
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
    toast.success(`Exported ${leads.length} leads`);
  }, [leads, facilitiesMap]);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        icon={Users}
        iconGradient="bg-gradient-to-br from-chart-3 to-chart-5"
        title="Inquiries"
        subtitle="Direct facility inquiries from seekers — full lifecycle tracking"
        actions={
          <div className="flex items-center gap-2">
            {selectedIds.size > 0 && (
              <Button variant="destructive" size="sm" className="gap-1.5" onClick={() => setBulkDeleteOpen(true)}>
                <Trash2 className="h-3.5 w-3.5" />Delete ({selectedIds.size})
              </Button>
            )}
            <Button variant="outline" size="sm" className="gap-2" onClick={handleExportCSV} disabled={!leads || leads.length === 0}>
              <Download className="h-4 w-4" />Export CSV
            </Button>
          </div>
        }
      />

      {/* KPI Summary — 8 clickable stat cards */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 divide-x divide-y sm:divide-y-0 divide-border">
            {[
              { label: "Total", value: kpiStats?.total, icon: Users, color: "text-primary", filter: () => handleFilterChange(setStatusFilter)("all") },
              { label: "New", value: kpiStats?.newCount, icon: Mail, color: "text-info", filter: () => handleFilterChange(setStatusFilter)("new") },
              { label: "Contacted", value: kpiStats?.contacted, icon: Phone, color: "text-chart-3", filter: () => handleFilterChange(setStatusFilter)("contacted") },
              { label: "Converted", value: kpiStats?.converted, icon: Zap, color: "text-success", filter: () => handleFilterChange(setStatusFilter)("converted") },
              { label: "Unlocked", value: kpiStats?.unlocked, icon: Unlock, color: "text-success", filter: () => {} },
              { label: "Redistributed", value: kpiStats?.redistributed, icon: Share2, color: "text-info", filter: () => handleFilterChange(setRedistributionFilter)("redistributed") },
              { label: "Request Info", value: kpiStats?.requestInfo, icon: MessageSquare, color: "text-primary", filter: () => handleFilterChange(setInquiryTypeFilter)("request_info") },
              { label: "Callbacks", value: kpiStats?.requestCallback, icon: Phone, color: "text-warning", filter: () => handleFilterChange(setInquiryTypeFilter)("request_callback") },
            ].map((kpi) => (
              <button
                key={kpi.label}
                onClick={kpi.filter}
                className="flex flex-col items-center justify-center p-3 sm:p-4 transition-colors hover:bg-muted/50"
              >
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
          <div className="flex flex-col gap-4">
            <div className="flex flex-col lg:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, phone, or facility..."
                  value={searchInput}
                  onChange={(e) => { setSearchInput(e.target.value); setCurrentPage(1); }}
                  className="pl-9"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Select value={statusFilter} onValueChange={handleFilterChange(setStatusFilter)}>
                  <SelectTrigger className="w-[130px]"><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="contacted">Contacted</SelectItem>
                    <SelectItem value="unlocked">Unlocked</SelectItem>
                    <SelectItem value="responding">Responding</SelectItem>
                    <SelectItem value="converted">Converted</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={inquiryTypeFilter} onValueChange={handleFilterChange(setInquiryTypeFilter)}>
                  <SelectTrigger className="w-[150px]"><SelectValue placeholder="Inquiry Type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="request_info">Request Info</SelectItem>
                    <SelectItem value="request_callback">Request Callback</SelectItem>
                    <SelectItem value="tour_request">Tour Request</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={redistributionFilter} onValueChange={handleFilterChange(setRedistributionFilter)}>
                  <SelectTrigger className="w-[160px]"><SelectValue placeholder="Distribution" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Distribution</SelectItem>
                    <SelectItem value="exclusive">Exclusive</SelectItem>
                    <SelectItem value="redistributed">Redistributed</SelectItem>
                    <SelectItem value="not_redistributed">Not Redistributed</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                  </SelectContent>
                </Select>
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearAllFilters} className="gap-1.5 text-muted-foreground hover:text-foreground h-10">
                    <X className="h-3.5 w-3.5" />Clear
                  </Button>
                )}
              </div>
            </div>
            {/* Date Range */}
            <div className="flex flex-wrap items-center gap-2">
              <Select value={datePreset} onValueChange={handleDatePresetChange}>
                <SelectTrigger className="w-[140px]">
                  <CalendarIcon className="h-4 w-4 mr-2" /><SelectValue placeholder="Date Range" />
                </SelectTrigger>
                <SelectContent>
                  {DATE_PRESETS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
              {datePreset === "custom" && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-[240px] justify-start text-left font-normal", !dateRange.from && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange.from ? (dateRange.to ? <>{format(dateRange.from, "MMM d, yyyy")} - {format(dateRange.to, "MMM d, yyyy")}</> : format(dateRange.from, "MMM d, yyyy")) : "Pick a date range"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      initialFocus mode="range"
                      defaultMonth={dateRange.from}
                      selected={{ from: dateRange.from, to: dateRange.to }}
                      onSelect={(range) => { setDateRange({ from: range?.from, to: range?.to }); setCurrentPage(1); }}
                      numberOfMonths={2} className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              )}
              {(dateRange.from || dateRange.to) && datePreset !== "custom" && (
                <Badge variant="secondary" className="text-xs">
                  {dateRange.from && dateRange.to
                    ? `${format(dateRange.from, "MMM d")} - ${format(dateRange.to, "MMM d, yyyy")}`
                    : dateRange.from ? `From ${format(dateRange.from, "MMM d, yyyy")}` : ""}
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Inquiries Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5" />Inquiries
            <Badge variant="secondary" className="ml-1 tabular-nums">{totalCount ?? 0}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
          ) : filteredLeads.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-10">
                      <button onClick={toggleSelectAll} className="p-1">
                        {selectedIds.size === filteredLeads.length && filteredLeads.length > 0
                          ? <CheckSquare className="h-4 w-4 text-primary" />
                          : <Square className="h-4 w-4 text-muted-foreground" />}
                      </button>
                    </TableHead>
                    <TableHead className="min-w-[200px]">Seeker</TableHead>
                    <TableHead className="min-w-[80px]">Type</TableHead>
                    <TableHead className="min-w-[80px]">Status</TableHead>
                    <TableHead className="min-w-[80px]">Unlock</TableHead>
                    <TableHead className="min-w-[100px]">Distribution</TableHead>
                    <TableHead className="min-w-[140px]">Facility</TableHead>
                    <TableHead className="min-w-[100px]">Location</TableHead>
                    <TableHead className="min-w-[120px]">Submitted</TableHead>
                    <TableHead className="text-right w-[60px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLeads.map((lead) => {
                    const facility = lead.facility_id ? facilitiesMap.get(lead.facility_id) : null;
                    const unlock = unlockMap?.[lead.id];
                    return (
                      <TableRow key={lead.id} className="group">
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <button onClick={() => toggleSelect(lead.id)} className="p-1">
                            {selectedIds.has(lead.id) ? <CheckSquare className="h-4 w-4 text-primary" /> : <Square className="h-4 w-4 text-muted-foreground" />}
                          </button>
                        </TableCell>
                        <TableCell>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => { setSelectedLead(lead); setShowDetailModal(true); }}
                                className="font-medium text-primary hover:underline focus:outline-none truncate max-w-[180px] text-left"
                              >
                                {lead.name}
                              </button>
                              {lead.urgency === "immediate" && (
                                <TooltipProvider><Tooltip><TooltipTrigger><Zap className="h-3 w-3 text-destructive" /></TooltipTrigger><TooltipContent>Immediate urgency</TooltipContent></Tooltip></TooltipProvider>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                              <span className="flex items-center gap-1 truncate max-w-[160px]"><Mail className="h-3 w-3 shrink-0" />{lead.email}</span>
                              {lead.phone && <span className="flex items-center gap-1 hidden sm:flex"><Phone className="h-3 w-3" />{lead.phone}</span>}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs whitespace-nowrap">
                            {lead.inquiry_type === "request_callback" ? "Callback" : lead.inquiry_type === "tour_request" ? "Tour" : "Info"}
                          </Badge>
                        </TableCell>
                        <TableCell><StatusBadge status={lead.status} /></TableCell>
                        <TableCell>
                          {unlock ? (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger>
                                  <Badge variant="outline" className="bg-success/10 text-success border-success/30 gap-1 text-xs">
                                    <Unlock className="h-3 w-3" />Yes
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>{format(new Date(unlock.unlocked_at), "MMM d, h:mm a")}</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ) : (
                            <Badge variant="outline" className="text-xs text-muted-foreground"><Lock className="h-3 w-3 mr-1" />No</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {lead.redistribution_status ? (
                            <Badge variant="outline" className={cn("gap-1 text-xs",
                              lead.redistribution_status === "exclusive" && "bg-warning/10 text-warning border-warning/30",
                              lead.redistribution_status === "extended" && "bg-info/10 text-info border-info/30",
                              lead.redistribution_status === "expired" && "bg-muted text-muted-foreground border-border"
                            )}>
                              {lead.redistribution_status === "extended" ? <Share2 className="h-3 w-3" /> : lead.redistribution_status === "exclusive" ? <Timer className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                              {lead.redistribution_status === "extended" ? "Redistributed" : lead.redistribution_status}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {facility ? (
                            <div className="flex items-center gap-1.5">
                              <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              <span className="text-sm truncate max-w-[130px]">{facility.name}</span>
                            </div>
                          ) : <span className="text-muted-foreground text-xs">—</span>}
                        </TableCell>
                        <TableCell>
                          {lead.location_city_state || lead.location_zip ? (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <MapPin className="h-3 w-3 shrink-0" />
                              <span className="truncate max-w-[100px]">{lead.location_city_state || lead.location_zip}</span>
                            </div>
                          ) : <span className="text-muted-foreground text-xs">—</span>}
                        </TableCell>
                        <TableCell>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {format(new Date(lead.created_at), "MMM d, h:mm a")}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => { setSelectedLead(lead); setShowDetailModal(true); }}>
                                <Eye className="h-4 w-4 mr-2" />View Details
                              </DropdownMenuItem>
                              {facilities && facilities.length > 0 && (
                                <DropdownMenuSub>
                                  <DropdownMenuSubTrigger><ArrowRightLeft className="h-4 w-4 mr-2" />Route to Provider</DropdownMenuSubTrigger>
                                  <DropdownMenuSubContent className="max-h-60 overflow-y-auto">
                                    {facilities.slice(0, 50).map((f) => (
                                      <DropdownMenuItem key={f.id} onClick={() => assignLead.mutate({ leadId: lead.id, facilityId: f.id })} disabled={lead.facility_id === f.id}>
                                        <Building2 className="h-3.5 w-3.5 mr-2 shrink-0" /><span className="truncate">{f.name}</span>
                                        {lead.facility_id === f.id && <Badge variant="secondary" className="ml-auto text-[10px]">Current</Badge>}
                                      </DropdownMenuItem>
                                    ))}
                                  </DropdownMenuSubContent>
                                </DropdownMenuSub>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => setDeleteTarget(lead)} className="text-destructive focus:text-destructive">
                                <Trash2 className="h-4 w-4 mr-2" />Delete Lead
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-16">
              <Users className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground font-medium">No inquiries found</p>
              <p className="text-xs text-muted-foreground mt-1">
                {hasActiveFilters ? "Try adjusting your filters" : "Inquiries will appear when seekers contact providers"}
              </p>
              {hasActiveFilters && <Button variant="link" size="sm" onClick={clearAllFilters} className="mt-3 text-primary">Clear all filters</Button>}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-t">
              <p className="text-sm text-muted-foreground tabular-nums">
                Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, totalCount || 0)} of {totalCount}
              </p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}>Previous</Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 5) pageNum = i + 1;
                    else if (currentPage <= 3) pageNum = i + 1;
                    else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                    else pageNum = currentPage - 2 + i;
                    return (
                      <Button key={pageNum} variant={currentPage === pageNum ? "default" : "outline"} size="sm" className="w-8 h-8 p-0" onClick={() => setCurrentPage(pageNum)}>
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                <Button variant="outline" size="sm" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>Next</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Modal */}
      <InquiryDetailModal
        lead={selectedLead}
        open={showDetailModal}
        onOpenChange={setShowDetailModal}
        facilityMap={facilitiesMap}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Lead Permanently?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{deleteTarget?.name}</strong> ({deleteTarget?.email}) and all associated data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteLead} disabled={isDeleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isDeleting ? "Deleting…" : "Delete Permanently"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete */}
      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.size} lead(s)?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently remove the selected leads and all associated data.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBulkDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} disabled={isBulkDeleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isBulkDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}Delete {selectedIds.size} Lead(s)
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
