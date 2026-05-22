import { useState, useEffect, useCallback, useMemo } from "react";
import { pluckNonNull } from "@/lib/nullableRows";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AdvisorReminder } from "@/components/admin/concierge/AdvisorReminder";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { AdminPageHeader, AdminStatCard } from "@/components/admin/AdminPageHeader";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Search, RefreshCw, HeartHandshake, Building2, Inbox,
  Flag, LayoutGrid, List, TrendingUp,
  Clock, Users, CheckCircle, Loader2, Link2, ArrowRightLeft, Download, X,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { PlacementOpsDashboard } from "@/components/admin/concierge/PlacementOpsDashboard";
import { NetworkProvidersTab } from "@/components/admin/concierge/NetworkProvidersTab";
import { getCaseNextAction } from "@/components/admin/concierge/placementActionUtils";
import { CaseAlertIcons } from "@/components/admin/concierge/CaseSlaAlerts";
import { VISUAL_STAGES, getVisualStage } from "@/components/admin/concierge/placementPipelineConfig";
import { BulkConciergeStatusDialog } from "@/components/admin/concierge/BulkConciergeStatusDialog";
import { BulkReassignAdvisorDialog } from "@/components/admin/concierge/BulkReassignAdvisorDialog";
import { ConciergeDetailSheet } from "@/components/admin/ConciergeDetailSheet";
import AdvisorInbox from "@/pages/admin/AdvisorInbox";
import AdvisorProviderDirectory from "@/pages/admin/AdvisorProviderDirectory";
import { cn } from "@/lib/utils";

function useDebounce(value: string, delay: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

export default function AdminConcierge() {
  const { user, adminRole } = useAdminAuth();
  const isAdvisor = adminRole === "advisor";
  const queryClient = useQueryClient();

  // URL state — every filter and the active tab/view round-trip through
  // ?q=…&stage=…&routing=…&advisor=…&tab=…&view=…&case=… so admins can
  // bookmark or share a filtered view. `replace: true` keeps history
  // tidy (one entry per page-load instead of one per keystroke), and
  // defaults are NOT written to the URL so the bare /admin/concierge
  // path stays clean.
  const [searchParams, setSearchParams] = useSearchParams();

  // Tab values for the unified Placements workspace. Backward-compat:
  // legacy bookmarks at ?tab=domestic and ?tab=providers map onto the
  // new tab names.
  const VALID_TABS = ["cases", "network", "directory", "inbox"] as const;
  type TabValue = typeof VALID_TABS[number];
  const normalizeTab = (raw: string | null): TabValue => {
    if (raw === "domestic") return "cases";
    if (raw === "providers") return "network";
    if (raw && (VALID_TABS as readonly string[]).includes(raw)) return raw as TabValue;
    return "cases";
  };
  const [activeTab, setActiveTab] = useState<string>(() => normalizeTab(searchParams.get("tab")));
  const [searchInput, setSearchInput] = useState(() => searchParams.get("q") ?? "");
  const searchQuery = useDebounce(searchInput, 350);
  const [stageFilter, setStageFilter] = useState<string>(() => searchParams.get("stage") ?? "all");
  // Routing-mode filter — defaults to "all". The Free-tier-redirect
  // option lets advisors zero in on inquiries that submitted on a Free
  // listing (those carry routing_mode='free_tier_redirect' from the
  // submit-qualified-lead branch).
  const [routingFilter, setRoutingFilter] = useState<"all" | "free_tier_redirect" | "standard">(() => {
    const v = searchParams.get("routing");
    return v === "free_tier_redirect" || v === "standard" ? v : "all";
  });
  const [advisorFilter, setAdvisorFilter] = useState<string>(() => searchParams.get("advisor") ?? "all");
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(() => searchParams.get("case") ?? null);
  const [viewMode, setViewMode] = useState<"table" | "dashboard">(() => {
    const v = searchParams.get("view");
    return v === "dashboard" ? "dashboard" : "table";
  });
  // Multi-select state — drives the bulk-status and bulk-reassign
  // dialogs. Cleared when filters change so the admin never operates
  // on a row that's no longer visible.
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkStatusOpen, setBulkStatusOpen] = useState(false);
  const [bulkReassignOpen, setBulkReassignOpen] = useState(false);

  useEffect(() => {
    if (isAdvisor && user?.id) setAdvisorFilter(user.id);
  }, [isAdvisor, user?.id]);

  // Sync state → URL on every relevant change. Mirrors the pattern
  // used in AdminLeads / AdminProviders / AdminSeekers / AdminIVR.
  // Loop-guarded: only writes back when the canonical serialization
  // differs, otherwise setSearchParams would re-render on every tick.
  useEffect(() => {
    const next = new URLSearchParams();
    if (searchQuery) next.set("q", searchQuery);
    if (stageFilter && stageFilter !== "all") next.set("stage", stageFilter);
    if (routingFilter && routingFilter !== "all") next.set("routing", routingFilter);
    if (advisorFilter && advisorFilter !== "all") next.set("advisor", advisorFilter);
    if (activeTab && activeTab !== "cases") next.set("tab", activeTab);
    if (viewMode && viewMode !== "table") next.set("view", viewMode);
    if (selectedCaseId) next.set("case", selectedCaseId);
    const a = next.toString();
    const b = searchParams.toString();
    if (a !== b) setSearchParams(next, { replace: true });
  }, [
    searchQuery, stageFilter, routingFilter, advisorFilter, activeTab, viewMode,
    selectedCaseId, searchParams, setSearchParams,
  ]);

  const hasActiveFilters =
    searchInput !== "" ||
    stageFilter !== "all" ||
    routingFilter !== "all" ||
    (advisorFilter !== "all" && !(isAdvisor && advisorFilter === user?.id));

  const clearAllFilters = () => {
    setSearchInput("");
    setStageFilter("all");
    setRoutingFilter("all");
    // Advisors are auto-scoped to their own queue — leave that intact.
    if (!isAdvisor) setAdvisorFilter("all");
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

  const invalidateAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["admin-concierge-cases-full"] });
    queryClient.invalidateQueries({ queryKey: ["admin-concierge-case-detail"] });
    queryClient.invalidateQueries({ queryKey: ["admin-network-provider-count"] });
  }, [queryClient]);

  // Realtime + polling fallback — concierge_inquiries is already in
  // the supabase_realtime publication (verified before deploy). The
  // 30s poll is belt-and-braces in case the channel drops on a flaky
  // connection.
  useEffect(() => {
    const interval = setInterval(invalidateAll, 30000);
    return () => clearInterval(interval);
  }, [invalidateAll]);

  useEffect(() => {
    const channel = supabase
      .channel(`admin-concierge-live-${Math.random().toString(36).slice(2,8)}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "concierge_inquiries" }, () => invalidateAll())
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "concierge_inquiries" }, () => invalidateAll())
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "concierge_inquiries" }, () => invalidateAll())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [invalidateAll]);

  const { data: cases, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["admin-concierge-cases-full"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("concierge_inquiries")
        .select("id, user_name, user_email, user_phone, status, level_of_care, desired_location_state, preferred_state, preferred_city, match_count, assigned_advisor_id, created_at, updated_at, tour_coordination_status, placement_confirmed, placement_confirmed_at, placed_facility_id, introductions_sent_at, introductions_sent_count, timeline_urgency, primary_concern, closed_at, seeker_confirmed, matched_at, routing_mode, originating_facility_id")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: adminStaff } = useQuery({
    queryKey: ["admin-staff-list"],
    queryFn: async () => {
      const { data } = await supabase
        .from("admin_user_profiles")
        .select("user_id, first_name, last_name, display_name")
        .eq("status", "active");
      return data || [];
    },
  });

  const placedFacilityIds = [...new Set(pluckNonNull(cases, "placed_facility_id"))];
  const { data: facilityMap } = useQuery({
    queryKey: ["admin-placement-facilities", placedFacilityIds],
    queryFn: async () => {
      if (!placedFacilityIds.length) return {};
      const { data } = await supabase.from("facilities").select("id, name, city, state").in("id", placedFacilityIds as string[]);
      const map: Record<string, any> = {};
      data?.forEach(f => { map[f.id] = f; });
      return map;
    },
    enabled: placedFacilityIds.length > 0,
  });

  const { data: networkCount } = useQuery({
    queryKey: ["admin-network-provider-count"],
    queryFn: async () => {
      const { count } = await supabase.from("facilities").select("id", { count: "exact", head: true }).eq("concierge_network_opted_in", true);
      return count || 0;
    },
  });

  // International placement product retired 2026-05-20 — the live
  // case count query, tab, and InternationalCasesTab component are
  // all removed. /admin/international now redirects to this dashboard.

  // Detail-sheet payload — fetches the full row so ConciergeDetailSheet's
  // tabs (Overview/Intake/Decision/Introductions/Placement/Timeline/Actions)
  // each have what they need. `select("*")` keeps the source-of-truth at
  // the schema rather than a hand-maintained column list that drifted out
  // of sync before (the old list referenced abandoned_cart_email_sent_at,
  // a column that has never existed on this table).
  const { data: selectedCase } = useQuery({
    queryKey: ["admin-concierge-case-detail", selectedCaseId],
    queryFn: async () => {
      if (!selectedCaseId) return undefined;
      const { data, error } = await supabase
        .from("concierge_inquiries")
        .select("*")
        .eq("id", selectedCaseId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!selectedCaseId,
  });

  const getAdvisorName = (advisorId: string | null) => {
    if (!advisorId) return "—";
    const a = adminStaff?.find(s => s.user_id === advisorId);
    return a ? (a.display_name || `${a.first_name} ${a.last_name}`) : "—";
  };

  const advisorNames: Record<string, string> = {};
  adminStaff?.forEach(a => {
    advisorNames[a.user_id] = a.display_name || `${a.first_name} ${a.last_name}`;
  });

  // Filtering by visual stage group
  const filteredCases = useMemo(() => (cases || []).filter(c => {
    if (stageFilter !== "all" && stageFilter !== "closed") {
      const vs = getVisualStage(c.status);
      if (vs.key !== stageFilter) return false;
    }
    if (stageFilter === "closed" && c.status !== "closed") return false;
    if (advisorFilter === "unassigned" && c.assigned_advisor_id !== null) return false;
    if (advisorFilter !== "all" && advisorFilter !== "unassigned" && c.assigned_advisor_id !== advisorFilter) return false;
    // Routing-mode filter. The 'standard' bucket includes legacy rows
    // where routing_mode is NULL (those pre-date the column).
    if (routingFilter === "free_tier_redirect" && (c as { routing_mode?: string | null }).routing_mode !== "free_tier_redirect") return false;
    if (routingFilter === "standard") {
      const rm = (c as { routing_mode?: string | null }).routing_mode;
      if (rm === "free_tier_redirect") return false;
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        c.user_name?.toLowerCase().includes(q) ||
        c.user_email?.toLowerCase().includes(q) ||
        c.user_phone?.includes(q) ||
        c.id.toLowerCase().includes(q)
      );
    }
    return true;
  }), [cases, stageFilter, advisorFilter, routingFilter, searchQuery]);

  // Drop selections that drop out of the filtered view — prevents the
  // admin from bulk-acting on rows they can no longer see.
  useEffect(() => {
    if (selectedIds.size === 0) return;
    const visible = new Set(filteredCases.map(c => c.id));
    let changed = false;
    const next = new Set<string>();
    for (const id of selectedIds) {
      if (visible.has(id)) next.add(id); else changed = true;
    }
    if (changed) setSelectedIds(next);
  }, [filteredCases, selectedIds]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const toggleSelectAll = () => {
    if (!filteredCases.length) return;
    const allIds = filteredCases.map(c => c.id);
    const allSelected = allIds.every(id => selectedIds.has(id));
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allIds));
    }
  };

  // CSV export — full filtered set, one row per case, columns matching
  // what an ops manager actually needs in a spreadsheet (no PII beyond
  // what the admin already sees in the table).
  const handleExportCSV = () => {
    if (!filteredCases.length) { toast.info("No cases to export"); return; }
    const rows = filteredCases.map(c => ({
      ID: c.id,
      Client: c.user_name || "",
      Email: c.user_email || "",
      Phone: c.user_phone || "",
      Status: c.status || "",
      Stage: getVisualStage(c.status).label,
      Advisor: getAdvisorName(c.assigned_advisor_id),
      LevelOfCare: c.level_of_care || "",
      State: c.preferred_state || c.desired_location_state || "",
      City: c.preferred_city || "",
      Urgency: c.timeline_urgency || "",
      RoutingMode: (c as { routing_mode?: string | null }).routing_mode || "standard",
      Created: c.created_at ? new Date(c.created_at).toISOString() : "",
      Updated: c.updated_at ? new Date(c.updated_at).toISOString() : "",
      MatchedAt: c.matched_at ? new Date(c.matched_at).toISOString() : "",
      PlacedAt: c.placement_confirmed_at ? new Date(c.placement_confirmed_at).toISOString() : "",
      ClosedAt: c.closed_at ? new Date(c.closed_at).toISOString() : "",
    }));
    const headers = Object.keys(rows[0]);
    const csv = [
      headers.join(","),
      ...rows.map(r => headers.map(h => {
        const v = String((r as Record<string, string>)[h] ?? "");
        return v.includes(",") || v.includes('"') || v.includes("\n") ? `"${v.replace(/"/g, '""')}"` : v;
      }).join(",")),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `concierge-cases-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${rows.length} cases`);
  };

  // Stats
  const allCases = cases || [];
  const totalCases = allCases.length;
  const activeCases = allCases.filter(c => !["completed", "closed"].includes(c.status)).length;
  const awaitingAction = allCases.filter(c => {
    const action = getCaseNextAction(c);
    return action.priority === "blocker" || action.priority === "high";
  }).length;
  // "Placed" includes the new terminal state `seeker_selected` and any
  // legacy admission_* / billed rows from the retired paid-placement
  // workflow so the dashboard count stays accurate while old data is
  // closed out. `completed` is the historical archival state.
  const completedCases = allCases.filter(c =>
    c.status === "completed" ||
    c.status === "seeker_selected" ||
    c.status === "admission_in_progress" ||
    c.status === "admitted" ||
    c.status === "billed"
  ).length;

  // SLA-ish badge — how long the case has been parked in its current
  // status. Mirrors the wait-time badge used on /admin/providers.
  const slaBadge = (c: typeof allCases[number]) => {
    if (c.status === "completed" || c.status === "closed") return null;
    const since = c.updated_at ? new Date(c.updated_at).getTime() : Date.now();
    const hrs = (Date.now() - since) / 36e5;
    if (hrs >= 168) return { label: `${Math.floor(hrs / 24)}d`, tone: "bg-destructive/10 text-destructive border-destructive/30" };
    if (hrs >= 24) return { label: `${Math.floor(hrs / 24)}d`, tone: "bg-amber-500/10 text-amber-600 border-amber-500/30" };
    return null;
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <AdvisorReminder />
      <AdminPageHeader
        icon={HeartHandshake}
        iconGradient="bg-gradient-to-br from-primary to-primary/70"
        title="Placements"
        subtitle="Concierge advisor workspace — intake, matching, intros, and case messaging in one place"
        badges={[
          { label: "Active", value: activeCases, className: "bg-primary/10 text-primary" },
          { label: "Completed", value: completedCases, className: "bg-success/10 text-success" },
        ]}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            {!isAdvisor && (
              <>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/admin/concierge/metrics">
                    <TrendingUp className="h-3.5 w-3.5 mr-1.5" />
                    <span className="text-xs sm:text-sm">Partner metrics</span>
                  </Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/admin/concierge/audit-review">
                    <Flag className="h-3.5 w-3.5 mr-1.5" />
                    <span className="text-xs sm:text-sm">Audit review</span>
                  </Link>
                </Button>
                {/* /admin/placement-revenue retired 2026-05-20 with the
                    paid international placement product. Revenue stats
                    now live on /admin/analytics. */}
              </>
            )}
            {selectedIds.size > 0 && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => setBulkStatusOpen(true)}
                  aria-label={`Update status for ${selectedIds.size} selected case${selectedIds.size === 1 ? "" : "s"}`}
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
                  aria-label={`Reassign ${selectedIds.size} selected case${selectedIds.size === 1 ? "" : "s"}`}
                >
                  <ArrowRightLeft className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Reassign</span>
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
              disabled={!filteredCases.length}
              aria-label="Export current view as CSV"
              className="gap-1.5"
            >
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline text-xs sm:text-sm">CSV</span>
            </Button>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              <span className="text-xs sm:text-sm">Refresh</span>
            </Button>
          </div>
        }
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide">
          <TabsList className={`inline-flex w-auto sm:grid sm:w-full ${isAdvisor ? "sm:grid-cols-3 sm:max-w-lg" : "sm:grid-cols-4 sm:max-w-2xl"}`}>
            <TabsTrigger value="cases" aria-label="Cases" className="flex items-center gap-1.5 px-3 whitespace-nowrap">
              <Flag className="h-3.5 w-3.5" />
              <span className="text-xs sm:text-sm">Cases</span>
            </TabsTrigger>
            {!isAdvisor && (
              <TabsTrigger value="network" aria-label="Network providers" className="flex items-center gap-1.5 px-3 whitespace-nowrap">
                <Building2 className="h-3.5 w-3.5" />
                <span className="text-xs sm:text-sm">Network</span>
                {!!networkCount && <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">{networkCount}</Badge>}
              </TabsTrigger>
            )}
            <TabsTrigger value="directory" aria-label="Provider directory" className="flex items-center gap-1.5 px-3 whitespace-nowrap">
              <Building2 className="h-3.5 w-3.5" />
              <span className="text-xs sm:text-sm">Directory</span>
            </TabsTrigger>
            <TabsTrigger value="inbox" aria-label="Advisor inbox" className="flex items-center gap-1.5 px-3 whitespace-nowrap">
              <Inbox className="h-3.5 w-3.5" />
              <span className="text-xs sm:text-sm">Inbox</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="cases" className="space-y-4">
          {/* KPI Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <AdminStatCard label="Total" value={isLoading ? "—" : totalCases} icon={HeartHandshake}
              onClick={() => setStageFilter("all")} active={stageFilter === "all"} />
            <AdminStatCard label="Active" value={isLoading ? "—" : activeCases} icon={Clock} valueClassName="text-primary" />
            <AdminStatCard label="Needs Action" value={isLoading ? "—" : awaitingAction} icon={Users} valueClassName="text-warning" />
            <AdminStatCard label="Placed" value={isLoading ? "—" : completedCases} icon={CheckCircle} valueClassName="text-success" />
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-xl border bg-card">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by name, email, phone..." value={searchInput} onChange={(e) => setSearchInput(e.target.value)} className="pl-9" />
            </div>
            <Select value={stageFilter} onValueChange={setStageFilter}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="Stage" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stages</SelectItem>
                {VISUAL_STAGES.map(vs => (
                  <SelectItem key={vs.key} value={vs.key}>{vs.label}</SelectItem>
                ))}
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
            {/* Routing-mode filter — surfaces free_tier_redirect inquiries
                so advisors can prioritize them (originating facility must
                be pinned as Option 1 of the 3 introductions). */}
            <Select value={routingFilter} onValueChange={(v) => setRoutingFilter(v as typeof routingFilter)}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Routing" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All routing modes</SelectItem>
                <SelectItem value="free_tier_redirect">Free-tier redirects</SelectItem>
                <SelectItem value="standard">Standard intake</SelectItem>
              </SelectContent>
            </Select>
            <Select value={advisorFilter} onValueChange={setAdvisorFilter}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="Advisor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Advisors</SelectItem>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {adminStaff?.map(a => (
                  <SelectItem key={a.user_id} value={a.user_id}>
                    {a.display_name || `${a.first_name} ${a.last_name}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <span className="text-xs text-muted-foreground tabular-nums whitespace-nowrap">{filteredCases.length} cases</span>
              <div className="flex items-center border rounded-md overflow-hidden">
                <Button variant={viewMode === "table" ? "default" : "ghost"} size="sm"
                  className="h-8 px-2.5 rounded-none" onClick={() => setViewMode("table")} title="Table View">
                  <List className="h-3.5 w-3.5" />
                </Button>
                <Button variant={viewMode === "dashboard" ? "default" : "ghost"} size="sm"
                  className="h-8 px-2.5 rounded-none" onClick={() => setViewMode("dashboard")} title="Ops Dashboard">
                  <LayoutGrid className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>

          {/* Content */}
          {viewMode === "dashboard" ? (
            <PlacementOpsDashboard
              cases={filteredCases}
              onCaseClick={(id) => setSelectedCaseId(id)}
              advisorNames={advisorNames}
              isAdvisor={isAdvisor}
              currentAdvisorId={user?.id}
            />
          ) : (
            <div className="rounded-xl border bg-card overflow-hidden">
              {/* Background-refetch indicator — surfaces realtime/polling
                  refresh so admins know the list is live, not stale.
                  Hidden during the initial isLoading state. */}
              {!isLoading && isFetching && (
                <div className="px-4 pt-3 -mb-1 flex items-center gap-1.5 text-[11px] text-muted-foreground" aria-live="polite">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Refreshing…
                </div>
              )}
              {isLoading ? (
                <div className="p-4 space-y-3">
                  {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
                </div>
              ) : filteredCases.length === 0 ? (
                <div className="text-center py-16">
                  <HeartHandshake className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground font-medium">No cases found</p>
                  <p className="text-xs text-muted-foreground mt-1">Try adjusting your filters.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/30">
                        <th scope="col" className="w-10 px-3 py-2.5">
                          <Checkbox
                            checked={filteredCases.length > 0 && filteredCases.every(c => selectedIds.has(c.id))}
                            onCheckedChange={toggleSelectAll}
                            aria-label={
                              filteredCases.length > 0 && filteredCases.every(c => selectedIds.has(c.id))
                                ? "Deselect all visible cases"
                                : "Select all visible cases"
                            }
                          />
                        </th>
                        <th className="px-4 py-2.5 text-left font-medium text-muted-foreground text-xs">Client</th>
                        <th className="px-4 py-2.5 text-left font-medium text-muted-foreground text-xs">Advisor</th>
                        <th className="px-4 py-2.5 text-left font-medium text-muted-foreground text-xs">Stage</th>
                        <th className="px-4 py-2.5 text-left font-medium text-muted-foreground text-xs">Next Action</th>
                        <th className="px-4 py-2.5 text-left font-medium text-muted-foreground text-xs">Activity</th>
                        <th className="px-4 py-2.5 text-left font-medium text-muted-foreground text-xs w-[80px]">Alerts</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCases.map((c) => {
                        const nextAction = getCaseNextAction(c);
                        const visualStage = getVisualStage(c.status);
                        const sla = slaBadge(c);
                        const isChecked = selectedIds.has(c.id);
                        return (
                          <tr key={c.id}
                            className={cn(
                              "border-b last:border-0 hover:bg-primary/5 cursor-pointer transition-colors",
                              isChecked && "bg-primary/5"
                            )}
                            onClick={() => setSelectedCaseId(c.id)}>
                            <td className="px-3 py-3 align-middle" onClick={(e) => e.stopPropagation()}>
                              <Checkbox
                                checked={isChecked}
                                onCheckedChange={() => toggleSelect(c.id)}
                                aria-label={`Select case ${c.user_name || c.id.slice(0, 8)}`}
                              />
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className={cn("h-2 w-2 rounded-full shrink-0",
                                  c.status === "completed" ? "bg-success" :
                                  c.status === "closed" ? "bg-muted-foreground/30" :
                                  nextAction.priority === "blocker" ? "bg-destructive animate-pulse" :
                                  "bg-primary"
                                )} />
                                <div className="min-w-0">
                                  <p className="font-medium truncate max-w-[180px]">{c.user_name}</p>
                                  <p className="text-[10px] text-muted-foreground font-mono">{c.id.slice(0, 8)}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                              {getAdvisorName(c.assigned_advisor_id) === "—" ? (
                                <Badge variant="outline" className="text-[9px] bg-destructive/10 text-destructive border-destructive/30">Unassigned</Badge>
                              ) : (
                                <span>{getAdvisorName(c.assigned_advisor_id)}</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <Badge variant="outline" className={cn("text-[10px]", visualStage.badgeColor)}>
                                  {visualStage.label}
                                </Badge>
                                {sla && (
                                  <Badge variant="outline" className={cn("text-[10px]", sla.tone)} title="Time since last status change">
                                    <Clock className="h-2.5 w-2.5 mr-0.5" />
                                    {sla.label}
                                  </Badge>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1.5">
                                {nextAction.priority === "blocker" && <span className="h-2 w-2 rounded-full bg-destructive shrink-0" />}
                                {nextAction.priority === "done" && <CheckCircle className="h-3.5 w-3.5 text-success shrink-0" />}
                                <span className={cn("text-xs whitespace-nowrap",
                                  nextAction.priority === "blocker" && "text-destructive font-medium",
                                  nextAction.priority === "high" && "font-medium",
                                  nextAction.priority === "done" && "text-muted-foreground"
                                )}>{nextAction.label}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <p className="text-xs text-muted-foreground">
                                {formatDistanceToNow(new Date(c.updated_at), { addSuffix: true })}
                              </p>
                            </td>
                            <td className="px-4 py-3">
                              <CaseAlertIcons caseData={c} />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        {!isAdvisor && (
          <TabsContent value="network">
            <NetworkProvidersTab />
          </TabsContent>
        )}

        <TabsContent value="directory">
          <AdvisorProviderDirectory />
        </TabsContent>

        <TabsContent value="inbox">
          <AdvisorInbox />
        </TabsContent>

      </Tabs>

      <BulkConciergeStatusDialog
        open={bulkStatusOpen}
        onOpenChange={setBulkStatusOpen}
        selectedIds={selectedIds}
        onSuccess={() => { setSelectedIds(new Set()); invalidateAll(); }}
      />
      <BulkReassignAdvisorDialog
        open={bulkReassignOpen}
        onOpenChange={setBulkReassignOpen}
        selectedIds={selectedIds}
        advisors={adminStaff || []}
        onSuccess={() => { setSelectedIds(new Set()); invalidateAll(); }}
      />

      <ConciergeDetailSheet
        caseData={selectedCase}
        open={!!selectedCaseId}
        onClose={() => setSelectedCaseId(null)}
        onRefresh={() => {
          invalidateAll();
          queryClient.invalidateQueries({ queryKey: ["admin-concierge-case-detail", selectedCaseId] });
        }}
      />
    </div>
  );
}
