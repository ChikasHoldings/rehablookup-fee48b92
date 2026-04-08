import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Users,
  Search,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Clock,
  Zap,
  MoreHorizontal,
  Eye,
  CalendarIcon,
  PieChart,
  Building2,
  Share2,
  Timer,
  Download,
  X,
  Trash2,
  ArrowRightLeft,
  CheckSquare,
  Square,
  Loader2,
} from "lucide-react";
import { format, subDays, startOfMonth, endOfMonth, subMonths, formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { toast } from "sonner";
import { LeadProfileModal, Lead } from "@/components/leads/LeadProfileModal";
import { cn } from "@/lib/utils";
import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip as RechartsTooltip } from "recharts";
import { useAdminErrorHandler } from "@/hooks/useAdminErrorHandler";
import { exportLeadsToCSV } from "@/lib/csvExport";
import { formatSourceLabel } from "@/lib/sourceLabels";

const SOURCE_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(221, 83%, 53%)",
  "hsl(174, 72%, 46%)",
  "hsl(0, 72%, 51%)",
];

type DateRange = {
  from: Date | undefined;
  to: Date | undefined;
};

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

type Facility = {
  id: string;
  name: string;
  city: string;
  state: string;
};

const ITEMS_PER_PAGE = 25;

// Status Badge Component using semantic tokens
function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    new: { label: "New", className: "bg-info/10 text-info border-info/30" },
    contacted: { label: "Contacted", className: "bg-chart-3/10 text-chart-3 border-chart-3/30" },
    in_progress: { label: "In Progress", className: "bg-warning/10 text-warning border-warning/30" },
    scheduled: { label: "Scheduled", className: "bg-chart-5/10 text-chart-5 border-chart-5/30" },
    admitted: { label: "Admitted", className: "bg-success/10 text-success border-success/30" },
    converted: { label: "Converted", className: "bg-success/10 text-success border-success/30" },
    closed: { label: "Closed", className: "bg-muted text-muted-foreground border-border" },
    expired: { label: "Expired", className: "bg-muted text-muted-foreground border-border" },
    lost: { label: "Lost", className: "bg-destructive/10 text-destructive border-destructive/30" },
  };

  const { label, className } = config[status] || { label: status, className: "bg-muted text-muted-foreground border-border" };

  return (
    <Badge variant="outline" className={className}>
      {label}
    </Badge>
  );
}

// Redistribution Status Badge Component
function RedistributionBadge({ status, exclusiveUntil, extendedUntil }: { 
  status: string | null; 
  exclusiveUntil?: string | null;
  extendedUntil?: string | null;
}) {
  if (!status) return <span className="text-muted-foreground text-xs">—</span>;
  
  const config: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
    exclusive: { 
      label: "Exclusive", 
      className: "bg-warning/10 text-warning border-warning/30",
      icon: <Timer className="h-3 w-3" />
    },
    extended: { 
      label: "Redistributed", 
      className: "bg-info/10 text-info border-info/30",
      icon: <Share2 className="h-3 w-3" />
    },
    expired: { 
      label: "Expired", 
      className: "bg-muted text-muted-foreground border-border",
      icon: <Clock className="h-3 w-3" />
    },
  };

  const { label, className, icon } = config[status] || { label: status, className: "bg-muted text-muted-foreground border-border", icon: null };
  
  const timeLeft = status === "exclusive" && exclusiveUntil 
    ? formatDistanceToNow(new Date(exclusiveUntil), { addSuffix: true })
    : status === "extended" && extendedUntil
    ? formatDistanceToNow(new Date(extendedUntil), { addSuffix: true })
    : null;

  const badgeElement = (
    <Badge variant="outline" className={cn(className, "gap-1 cursor-default")}>
      {icon}
      {label}
    </Badge>
  );

  if (!timeLeft) return badgeElement;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex">{badgeElement}</span>
        </TooltipTrigger>
        <TooltipContent>
          <p>Expires {timeLeft}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Urgency Indicator
function UrgencyIndicator({ urgency }: { urgency: string | null }) {
  if (!urgency) return null;

  const config: Record<string, { icon: React.ReactNode; className: string; label: string }> = {
    immediate: { icon: <Zap className="h-3 w-3" />, className: "text-destructive", label: "Immediate" },
    "within-week": { icon: <Clock className="h-3 w-3" />, className: "text-warning", label: "This Week" },
    "within-month": { icon: <Calendar className="h-3 w-3" />, className: "text-info", label: "This Month" },
    researching: { icon: <Search className="h-3 w-3" />, className: "text-muted-foreground", label: "Researching" },
  };

  const { icon, className, label } = config[urgency] || { icon: null, className: "", label: urgency };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`flex items-center gap-1 ${className}`}>
            {icon}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>Urgency: {label}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Debounce hook
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
  const [urgencyFilter, setUrgencyFilter] = useState("all");
  const [redistributionFilter, setRedistributionFilter] = useState("all");
  const [datePreset, setDatePreset] = useState("all");
  const [dateRange, setDateRange] = useState<DateRange>({ from: undefined, to: undefined });
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<Lead | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const highlightProcessedRef = useRef(false);

  const searchQuery = useDebounce(searchInput, 350);

  // Check if any filters are active
  const hasActiveFilters = statusFilter !== "all" || urgencyFilter !== "all" || redistributionFilter !== "all" || searchInput !== "" || dateRange.from !== undefined || dateRange.to !== undefined;

  const clearAllFilters = () => {
    setStatusFilter("all");
    setUrgencyFilter("all");
    setRedistributionFilter("all");
    setSearchInput("");
    setDatePreset("all");
    setDateRange({ from: undefined, to: undefined });
    setCurrentPage(1);
  };

  // Handle URL params for deep linking
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const highlightId = params.get("highlight");
    if (highlightId && !highlightProcessedRef.current) {
      highlightProcessedRef.current = true;
    }
    if (highlightId) {
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  // Handle date preset changes
  const handleDatePresetChange = (value: string) => {
    setDatePreset(value);
    if (value !== "custom") {
      const preset = DATE_PRESETS.find(p => p.value === value);
      if (preset) {
        setDateRange(preset.getRange());
      }
    }
    setCurrentPage(1);
  };

  // Invalidate leads queries helper
  const invalidateLeadsQueries = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["admin-leads"] });
    queryClient.invalidateQueries({ queryKey: ["admin-leads-count"] });
    queryClient.invalidateQueries({ queryKey: ["admin-leads-kpi"] });
    queryClient.invalidateQueries({ queryKey: ["admin-leads-source-breakdown"] });
    queryClient.invalidateQueries({ queryKey: ["admin-leads-redistribution-stats"] });
  }, [queryClient]);

  // Real-time subscriptions for leads
  useEffect(() => {
    const leadsChannel = supabase
      .channel("admin-leads-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "leads" },
        (payload) => {
          invalidateLeadsQueries();
          const newLead = payload.new as Lead;
          toast.success("New inquiry received", {
            description: `${newLead.name} submitted an inquiry`,
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "leads" },
        () => {
          invalidateLeadsQueries();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(leadsChannel);
    };
  }, [invalidateLeadsQueries]);

  // Fetch KPI stats independently (not from page data)
  const { data: kpiStats } = useQuery({
    queryKey: ["admin-leads-kpi"],
    queryFn: async () => {
      const [totalRes, newRes, contactedRes, convertedRes] = await Promise.all([
        supabase.from("leads").select("id", { count: "exact", head: true }),
        supabase.from("leads").select("id", { count: "exact", head: true }).eq("status", "new"),
        supabase.from("leads").select("id", { count: "exact", head: true }).eq("status", "contacted"),
        supabase.from("leads").select("id", { count: "exact", head: true }).eq("status", "converted"),
      ]);
      return {
        total: totalRes.count || 0,
        newCount: newRes.count || 0,
        contacted: contactedRes.count || 0,
        converted: convertedRes.count || 0,
      };
    },
    staleTime: 1000 * 60 * 2,
  });

  // Fetch total count for pagination (filtered)
  const { data: totalCount } = useQuery({
    queryKey: ["admin-leads-count", statusFilter, urgencyFilter, redistributionFilter, searchQuery, dateRange.from?.toISOString(), dateRange.to?.toISOString()],
    queryFn: async () => {
      try {
        let query = supabase
          .from("leads")
          .select("id", { count: "exact", head: true });

        if (statusFilter !== "all") query = query.eq("status", statusFilter);
        if (urgencyFilter !== "all") query = query.eq("urgency", urgencyFilter);
        if (redistributionFilter !== "all") query = query.eq("redistribution_status", redistributionFilter);
        if (searchQuery) query = query.or(`name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%`);
        if (dateRange.from) query = query.gte("created_at", format(dateRange.from, "yyyy-MM-dd"));
        if (dateRange.to) query = query.lte("created_at", format(dateRange.to, "yyyy-MM-dd") + "T23:59:59.999Z");

        const { count, error } = await query;
        if (error) throw error;
        return count || 0;
      } catch (error) {
        logError("fetch_leads_count", error, { statusFilter });
        throw error;
      }
    },
  });

  // Fetch leads with pagination
  const { data: leads, isLoading } = useQuery({
    queryKey: ["admin-leads", statusFilter, urgencyFilter, redistributionFilter, searchQuery, currentPage, dateRange.from?.toISOString(), dateRange.to?.toISOString()],
    queryFn: async () => {
      try {
        const from = (currentPage - 1) * ITEMS_PER_PAGE;
        const to = from + ITEMS_PER_PAGE - 1;

        let query = supabase
          .from("leads")
          .select("id, facility_id, name, email, phone, status, created_at, urgency, level_of_care, source, location_city_state, location_zip, primary_substance, insurance_type, message, inquiry_type, who_seeking_help, provider_response_status, provider_responded_at, qualified, quality_flag, redistribution_status, assignment_status, age_range, gender, preferred_contact")
          .order("created_at", { ascending: false })
          .range(from, to);

        if (statusFilter !== "all") query = query.eq("status", statusFilter);
        if (urgencyFilter !== "all") query = query.eq("urgency", urgencyFilter);
        if (redistributionFilter !== "all") query = query.eq("redistribution_status", redistributionFilter);
        if (searchQuery) query = query.or(`name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%`);
        if (dateRange.from) query = query.gte("created_at", format(dateRange.from, "yyyy-MM-dd"));
        if (dateRange.to) query = query.lte("created_at", format(dateRange.to, "yyyy-MM-dd") + "T23:59:59.999Z");

        const { data, error } = await query;
        if (error) throw error;
        return data as Lead[];
      } catch (error) {
        logError("fetch_leads", error, { statusFilter, currentPage });
        throw error;
      }
    },
  });

  // Handle highlight param
  useEffect(() => {
    if (leads && leads.length > 0) {
      const params = new URLSearchParams(window.location.search);
      const highlightId = params.get("highlight");
      if (highlightId) {
        const leadToHighlight = leads.find(l => l.id === highlightId);
        if (leadToHighlight) {
          setSelectedLead(leadToHighlight);
          setShowProfileModal(true);
        }
      }
    }
  }, [leads]);

  const filteredLeads = useMemo(() => leads || [], [leads]);
  const totalPages = Math.ceil((totalCount || 0) / ITEMS_PER_PAGE);

  // Reset to page 1 when filters change
  const handleFilterChange = (setter: (v: string) => void) => (value: string) => {
    setter(value);
    setCurrentPage(1);
  };

  // Fetch facilities for display
  const { data: facilities } = useQuery({
    queryKey: ["admin-facilities-lookup"],
    queryFn: async () => {
      const { data } = await supabase
        .from("facilities")
        .select("id, name, city, state")
        .eq("status", "approved")
        .limit(2000);
      return data as Facility[];
    },
    staleTime: 1000 * 60 * 5,
  });

  // Fetch lead source breakdown
  const { data: sourceBreakdown } = useQuery({
    queryKey: ["admin-leads-source-breakdown", dateRange.from?.toISOString(), dateRange.to?.toISOString()],
    queryFn: async () => {
      let query = supabase
        .from("leads")
        .select("source")
        .limit(5000);

      if (dateRange.from) query = query.gte("created_at", format(dateRange.from, "yyyy-MM-dd"));
      if (dateRange.to) query = query.lte("created_at", format(dateRange.to, "yyyy-MM-dd") + "T23:59:59.999Z");

      const { data, error } = await query;
      if (error) throw error;

      const counts: Record<string, number> = {};
      (data || []).forEach((lead) => {
        const source = lead.source || "direct";
        counts[source] = (counts[source] || 0) + 1;
      });

      return Object.entries(counts)
        .map(([source, count], index) => ({
          name: formatSourceLabel(source),
          value: count,
          source,
          color: SOURCE_COLORS[index % SOURCE_COLORS.length],
        }))
        .sort((a, b) => b.value - a.value);
    },
    staleTime: 1000 * 60 * 5,
  });

  const facilitiesMap = useMemo(() => {
    if (!facilities) return new Map<string, Facility>();
    return new Map(facilities.map(f => [f.id, f]));
  }, [facilities]);

  const openLeadProfile = (lead: Lead) => {
    setSelectedLead(lead);
    setShowProfileModal(true);
  };

  // Lead assignment mutation
  const assignLead = useMutation({
    mutationFn: async ({ leadId, facilityId }: { leadId: string; facilityId: string }) => {
      const { error } = await supabase
        .from("leads")
        .update({ facility_id: facilityId })
        .eq("id", leadId);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateLeadsQueries();
      toast.success("Lead assigned to facility");
    },
    onError: (error) => {
      logError("assign_lead", error);
      toast.error("Failed to assign lead");
    },
  });

  // Delete lead handler
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

      invalidateLeadsQueries();
      toast.success("Lead deleted permanently");
      setDeleteTarget(null);
    } catch (err) {
      logError("delete_lead", err);
      toast.error("Failed to delete lead");
    } finally {
      setIsDeleting(false);
    }
  };

  // Bulk delete handler
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
      invalidateLeadsQueries();
      toast.success(`${selectedIds.size} lead(s) deleted`);
      setSelectedIds(new Set());
      setBulkDeleteOpen(false);
    } catch (err) {
      logError("bulk_delete_leads", err);
      toast.error("Failed to delete leads");
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
    if (selectedIds.size === filteredLeads.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredLeads.map((l) => l.id)));
    }
  };

  const handleExportCSV = useCallback(() => {
    if (!leads || leads.length === 0) {
      toast.error("No leads to export");
      return;
    }
    
    const exportData = leads.map((lead) => ({
      id: lead.id,
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      created_at: lead.created_at,
      status: lead.status,
      exclusivity: lead.redistribution_status || null,
      qualified: lead.qualified ?? null,
      urgency: lead.urgency || null,
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
    toast.success(`Exported ${leads.length} leads to CSV`);
  }, [leads, facilitiesMap]);

  // Fetch redistribution stats
  const { data: redistStats } = useQuery({
    queryKey: ["admin-leads-redistribution-stats"],
    queryFn: async () => {
      const [exclusiveRes, extendedRes, expiredRes] = await Promise.all([
        supabase.from("leads").select("id", { count: "exact", head: true }).eq("redistribution_status", "exclusive"),
        supabase.from("leads").select("id", { count: "exact", head: true }).eq("redistribution_status", "extended"),
        supabase.from("leads").select("id", { count: "exact", head: true }).eq("redistribution_status", "expired"),
      ]);
      return {
        exclusive: exclusiveRes.count || 0,
        extended: extendedRes.count || 0,
        expired: expiredRes.count || 0,
      };
    },
    staleTime: 1000 * 60 * 2,
  });

  const totalSourceLeads = useMemo(() => {
    return (sourceBreakdown || []).reduce((sum, item) => sum + item.value, 0);
  }, [sourceBreakdown]);

  return (
    <div className="space-y-6">
      {/* Header with Export */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Inquiries</h1>
          <p className="text-sm text-muted-foreground">
            Direct facility inquiries from seekers
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <Button
              variant="destructive"
              size="sm"
              className="gap-1.5"
              onClick={() => setBulkDeleteOpen(true)}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete ({selectedIds.size})
            </Button>
          )}
          <Button 
            variant="outline" 
            className="gap-2"
            size="sm"
            onClick={handleExportCSV}
            disabled={!leads || leads.length === 0}
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* KPI Summary Bar - uses independent counts, not page data */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 divide-x divide-y sm:divide-y-0 divide-border">
            {/* Total */}
            <button
              onClick={() => handleFilterChange(setStatusFilter)("all")}
              className={cn(
                "flex flex-col items-center justify-center p-4 transition-colors hover:bg-muted/50",
                statusFilter === "all" && "bg-accent/10 ring-1 ring-inset ring-accent"
              )}
            >
              <Users className="h-4 w-4 text-primary mb-1" />
              <span className="text-xl font-bold tabular-nums">{kpiStats?.total ?? "—"}</span>
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Total</span>
            </button>

            {/* New */}
            <button
              onClick={() => handleFilterChange(setStatusFilter)("new")}
              className={cn(
                "flex flex-col items-center justify-center p-4 transition-colors hover:bg-muted/50",
                statusFilter === "new" && "bg-accent/10 ring-1 ring-inset ring-accent"
              )}
            >
              <Mail className="h-4 w-4 text-info mb-1" />
              <span className="text-xl font-bold tabular-nums">{kpiStats?.newCount ?? "—"}</span>
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">New</span>
            </button>

            {/* Contacted */}
            <button
              onClick={() => handleFilterChange(setStatusFilter)("contacted")}
              className={cn(
                "flex flex-col items-center justify-center p-4 transition-colors hover:bg-muted/50",
                statusFilter === "contacted" && "bg-accent/10 ring-1 ring-inset ring-accent"
              )}
            >
              <Phone className="h-4 w-4 text-chart-3 mb-1" />
              <span className="text-xl font-bold tabular-nums">{kpiStats?.contacted ?? "—"}</span>
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Contacted</span>
            </button>

            {/* Converted */}
            <button
              onClick={() => handleFilterChange(setStatusFilter)("converted")}
              className={cn(
                "flex flex-col items-center justify-center p-4 transition-colors hover:bg-muted/50",
                statusFilter === "converted" && "bg-accent/10 ring-1 ring-inset ring-accent"
              )}
            >
              <Zap className="h-4 w-4 text-success mb-1" />
              <span className="text-xl font-bold tabular-nums">{kpiStats?.converted ?? "—"}</span>
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Converted</span>
            </button>

            {/* Redistribution Stats */}
            {redistStats && (
              <>
                <button
                  onClick={() => handleFilterChange(setRedistributionFilter)("exclusive")}
                  className={cn(
                    "flex flex-col items-center justify-center p-4 transition-colors hover:bg-muted/50 bg-muted/20",
                    redistributionFilter === "exclusive" && "bg-accent/10 ring-1 ring-inset ring-accent"
                  )}
                >
                  <Timer className="h-4 w-4 text-warning mb-1" />
                  <span className="text-xl font-bold tabular-nums">{redistStats.exclusive}</span>
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Exclusive</span>
                </button>
                <button
                  onClick={() => handleFilterChange(setRedistributionFilter)("extended")}
                  className={cn(
                    "flex flex-col items-center justify-center p-4 transition-colors hover:bg-muted/50 bg-muted/20",
                    redistributionFilter === "extended" && "bg-accent/10 ring-1 ring-inset ring-accent"
                  )}
                >
                  <Share2 className="h-4 w-4 text-info mb-1" />
                  <span className="text-xl font-bold tabular-nums">{redistStats.extended}</span>
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Redistributed</span>
                </button>
                <button
                  onClick={() => handleFilterChange(setRedistributionFilter)("expired")}
                  className={cn(
                    "flex flex-col items-center justify-center p-4 transition-colors hover:bg-muted/50 bg-muted/20",
                    redistributionFilter === "expired" && "bg-accent/10 ring-1 ring-inset ring-accent"
                  )}
                >
                  <Clock className="h-4 w-4 text-muted-foreground mb-1" />
                  <span className="text-xl font-bold tabular-nums">{redistStats.expired}</span>
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Expired</span>
                </button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Lead Sources Chart */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <PieChart className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-lg">Inquiry Sources</CardTitle>
          </div>
          <CardDescription>
            Breakdown of inquiries by source {dateRange.from || dateRange.to ? "(filtered by date)" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            {/* Pie Chart */}
            <div className="h-[250px]">
              {sourceBreakdown && sourceBreakdown.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={sourceBreakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={90}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {sourceBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip 
                      formatter={(value: number, name: string) => [
                        `${value} inquiries (${totalSourceLeads > 0 ? ((value / totalSourceLeads) * 100).toFixed(1) : 0}%)`,
                        name
                      ]}
                    />
                    <Legend />
                  </RechartsPieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                  No inquiry data available
                </div>
              )}
            </div>
            {/* Source List */}
            <div className="space-y-3">
              {sourceBreakdown && sourceBreakdown.length > 0 ? (
                sourceBreakdown.map((source) => {
                  const percentage = totalSourceLeads > 0 ? (source.value / totalSourceLeads) * 100 : 0;
                  return (
                    <div key={source.source} className="flex items-center gap-3">
                      <div 
                        className="w-3 h-3 rounded-full shrink-0" 
                        style={{ backgroundColor: source.color }} 
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium truncate">{source.name}</span>
                          <span className="text-sm text-muted-foreground ml-2 tabular-nums">
                            {source.value} ({percentage.toFixed(1)}%)
                          </span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-1.5">
                          <div 
                            className="h-1.5 rounded-full transition-all" 
                            style={{ width: `${percentage}%`, backgroundColor: source.color }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center text-muted-foreground py-8 text-sm">
                  No source data available
                </div>
              )}
              {sourceBreakdown && sourceBreakdown.length > 0 && (
                <div className="pt-3 border-t">
                  <div className="flex items-center justify-between text-sm font-semibold">
                    <span>Total Inquiries</span>
                    <span className="tabular-nums">{totalSourceLeads}</span>
                  </div>
                </div>
              )}
            </div>
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
                  placeholder="Search by name, email, or phone..."
                  value={searchInput}
                  onChange={(e) => {
                    setSearchInput(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-9"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Select value={statusFilter} onValueChange={handleFilterChange(setStatusFilter)}>
                  <SelectTrigger className="w-[130px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="contacted">Contacted</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="admitted">Admitted</SelectItem>
                    <SelectItem value="converted">Converted</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                    <SelectItem value="lost">Lost</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={urgencyFilter} onValueChange={handleFilterChange(setUrgencyFilter)}>
                  <SelectTrigger className="w-[130px]">
                    <SelectValue placeholder="Urgency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Urgency</SelectItem>
                    <SelectItem value="immediate">Immediate</SelectItem>
                    <SelectItem value="within-week">This Week</SelectItem>
                    <SelectItem value="within-month">This Month</SelectItem>
                    <SelectItem value="researching">Researching</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={redistributionFilter} onValueChange={handleFilterChange(setRedistributionFilter)}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Distribution" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Distribution</SelectItem>
                    <SelectItem value="exclusive">Exclusive</SelectItem>
                    <SelectItem value="extended">Redistributed</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                  </SelectContent>
                </Select>
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearAllFilters} className="gap-1.5 text-muted-foreground hover:text-foreground h-10">
                    <X className="h-3.5 w-3.5" />
                    Clear
                  </Button>
                )}
              </div>
            </div>
            {/* Date Range Filter */}
            <div className="flex flex-wrap items-center gap-2">
              <Select value={datePreset} onValueChange={handleDatePresetChange}>
                <SelectTrigger className="w-[140px]">
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Date Range" />
                </SelectTrigger>
                <SelectContent>
                  {DATE_PRESETS.map((preset) => (
                    <SelectItem key={preset.value} value={preset.value}>
                      {preset.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {datePreset === "custom" && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-[240px] justify-start text-left font-normal",
                        !dateRange.from && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange.from ? (
                        dateRange.to ? (
                          <>
                            {format(dateRange.from, "MMM d, yyyy")} - {format(dateRange.to, "MMM d, yyyy")}
                          </>
                        ) : (
                          format(dateRange.from, "MMM d, yyyy")
                        )
                      ) : (
                        <span>Pick a date range</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      initialFocus
                      mode="range"
                      defaultMonth={dateRange.from}
                      selected={{ from: dateRange.from, to: dateRange.to }}
                      onSelect={(range) => {
                        setDateRange({ from: range?.from, to: range?.to });
                        setCurrentPage(1);
                      }}
                      numberOfMonths={2}
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              )}
              {(dateRange.from || dateRange.to) && datePreset !== "custom" && (
                <Badge variant="secondary" className="text-xs">
                  {dateRange.from && dateRange.to
                    ? `${format(dateRange.from, "MMM d")} - ${format(dateRange.to, "MMM d, yyyy")}`
                    : dateRange.from
                    ? `From ${format(dateRange.from, "MMM d, yyyy")}`
                    : `Until ${format(dateRange.to!, "MMM d, yyyy")}`}
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
            <Users className="h-5 w-5" />
            Inquiries
            <Badge variant="secondary" className="ml-1 tabular-nums">
              {totalCount ?? 0}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : filteredLeads && filteredLeads.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="min-w-[220px]">Contact</TableHead>
                    <TableHead className="min-w-[100px]">Status</TableHead>
                    <TableHead className="min-w-[120px]">Distribution</TableHead>
                    <TableHead className="min-w-[150px]">Provider</TableHead>
                    <TableHead className="min-w-[120px]">Location</TableHead>
                    <TableHead className="min-w-[100px]">Source</TableHead>
                    <TableHead className="min-w-[130px]">Submitted</TableHead>
                    <TableHead className="text-right w-[60px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLeads.map((lead) => {
                    const assignedFacility = lead.facility_id ? facilitiesMap.get(lead.facility_id) : null;
                    
                    return (
                      <TableRow key={lead.id} className="group">
                        <TableCell>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => openLeadProfile(lead)}
                                className="font-medium text-primary hover:underline focus:outline-none focus:underline truncate max-w-[200px] text-left"
                              >
                                {lead.name}
                              </button>
                              <UrgencyIndicator urgency={lead.urgency} />
                            </div>
                            <div className="flex items-center gap-3 text-sm text-muted-foreground mt-0.5">
                              <span className="flex items-center gap-1 truncate max-w-[180px]">
                                <Mail className="h-3 w-3 shrink-0" />
                                {lead.email}
                              </span>
                              {lead.phone && (
                                <span className="flex items-center gap-1 hidden sm:flex">
                                  <Phone className="h-3 w-3" />
                                  {lead.phone}
                                </span>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={lead.status} />
                        </TableCell>
                        <TableCell>
                          <RedistributionBadge 
                            status={lead.redistribution_status} 
                            exclusiveUntil={lead.exclusive_until}
                            extendedUntil={lead.extended_until}
                          />
                        </TableCell>
                        <TableCell>
                          {assignedFacility ? (
                            <div className="flex items-center gap-1.5">
                              <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                              <span className="text-sm truncate max-w-[150px]">
                                {assignedFacility.name}
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {lead.location_city_state || lead.location_zip ? (
                            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                              <MapPin className="h-3.5 w-3.5 shrink-0" />
                              <span className="truncate max-w-[120px]">
                                {lead.location_city_state || lead.location_zip}
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs whitespace-nowrap">
                            {formatSourceLabel(lead.source)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground whitespace-nowrap">
                            {format(new Date(lead.created_at), "MMM d, h:mm a")}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openLeadProfile(lead)}>
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              {facilities && facilities.length > 0 && (
                                <DropdownMenuSub>
                                  <DropdownMenuSubTrigger>
                                    <ArrowRightLeft className="h-4 w-4 mr-2" />
                                    Route to Provider
                                  </DropdownMenuSubTrigger>
                                  <DropdownMenuSubContent className="max-h-60 overflow-y-auto">
                                    {facilities.slice(0, 50).map((f) => (
                                      <DropdownMenuItem
                                        key={f.id}
                                        onClick={() => assignLead.mutate({ leadId: lead.id, facilityId: f.id })}
                                        disabled={lead.facility_id === f.id}
                                      >
                                        <Building2 className="h-3.5 w-3.5 mr-2 shrink-0" />
                                        <span className="truncate">{f.name}</span>
                                        {lead.facility_id === f.id && (
                                          <Badge variant="secondary" className="ml-auto text-[10px]">Current</Badge>
                                        )}
                                      </DropdownMenuItem>
                                    ))}
                                  </DropdownMenuSubContent>
                                </DropdownMenuSub>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => setDeleteTarget(lead)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete Lead
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
                {hasActiveFilters
                  ? "Try adjusting your filters to see more results"
                  : "Inquiries will appear here when seekers contact providers"}
              </p>
              {hasActiveFilters && (
                <Button variant="link" size="sm" onClick={clearAllFilters} className="mt-3 text-primary">
                  Clear all filters
                </Button>
              )}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-t">
              <p className="text-sm text-muted-foreground tabular-nums">
                Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, totalCount || 0)} of {totalCount}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        className="w-8 h-8 p-0"
                        onClick={() => setCurrentPage(pageNum)}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lead Profile Modal */}
      <LeadProfileModal
        lead={selectedLead}
        open={showProfileModal}
        onOpenChange={setShowProfileModal}
        isAdmin
        facilities={facilities || []}
        onAssign={(leadId, facilityId) => assignLead.mutate({ leadId, facilityId })}
        isAssigning={assignLead.isPending}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Lead Permanently?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the lead <strong>{deleteTarget?.name}</strong> ({deleteTarget?.email}) and all associated notes, emails, and unlock records. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteLead}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting…" : "Delete Permanently"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
