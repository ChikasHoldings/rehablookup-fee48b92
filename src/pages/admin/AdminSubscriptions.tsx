import { useState, useMemo, useEffect, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { useAdminErrorHandler } from "@/hooks/useAdminErrorHandler";
import { useDebounce } from "@/hooks/useDebounce";
import {
  CreditCard,
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Search,
  ArrowUpRight,
  ChevronUp,
  ChevronDown,
  Minus,
  LayoutDashboard,
  List,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Settings2,
  Star,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { toast } from "sonner";
import { PLAN_DETAILS } from "@/hooks/useSubscription";
import { AtRiskProvidersCard } from "@/components/admin/AtRiskProvidersCard";
import { RetentionDashboard } from "@/components/admin/RetentionDashboard";
import { SubscriptionDetailModal } from "@/components/admin/SubscriptionDetailModal";
import { PlanSettingsTab } from "@/components/admin/PlanSettingsTab";
import { FeaturedPlacementTab } from "@/components/admin/FeaturedPlacementTab";

type SubscriptionStats = {
  total_subscriptions: number;
  active_subscriptions: number;
  pro_count: number;
  free_count: number;
  mrr: number;
  mrr_growth: number;
  new_last_30_days: number;
  canceled_last_30_days: number;
  churn_rate: number;
  subscriptions: Array<{
    customer_id: string;
    customer_email: string;
    customer_name: string;
    plan: string;
    status: string;
    current_period_end: string;
    created: string;
    cancel_at_period_end: boolean;
    monthly_amount: number;
  }>;
  recent_events: Array<{
    type: "upgrade" | "downgrade" | "canceled" | "new";
    customer_email: string;
    from_plan?: string;
    to_plan?: string;
    date: string;
  }>;
};

type Facility = {
  id: string;
  name: string;
  city: string;
  state: string;
  status: string;
  featured: boolean;
  logo_url: string | null;
  created_at: string;
  user_id: string;
};

type Profile = {
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
};

/* ───── Plan badge ───── */
function PlanBadge({ plan }: { plan: string }) {
  const config: Record<string, { label: string; className: string }> = {
    free: { label: "Free", className: "bg-muted text-muted-foreground border-border" },
    pro: { label: "Pro", className: "bg-warning/10 text-warning border-warning/30" },
  };
  const { label, className } = config[plan] || { label: plan, className: "bg-muted text-muted-foreground" };
  return <Badge variant="outline" className={className}>{label}</Badge>;
}

/* ───── Status badge ───── */
function StatusBadge({ status, cancelAtPeriodEnd }: { status: string; cancelAtPeriodEnd?: boolean }) {
  if (cancelAtPeriodEnd) {
    return <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30">Canceling</Badge>;
  }
  const config: Record<string, { label: string; className: string }> = {
    active: { label: "Active", className: "bg-success/10 text-success border-success/30" },
    canceled: { label: "Canceled", className: "bg-destructive/10 text-destructive border-destructive/30" },
    past_due: { label: "Past Due", className: "bg-destructive/10 text-destructive border-destructive/30" },
    trialing: { label: "Trial", className: "bg-info/10 text-info border-info/30" },
    incomplete: { label: "Incomplete", className: "bg-muted text-muted-foreground border-border" },
  };
  const { label, className } = config[status] || { label: status, className: "bg-muted text-muted-foreground" };
  return <Badge variant="outline" className={className}>{label}</Badge>;
}

/* ───── Event icon ───── */
function EventIcon({ type }: { type: string }) {
  switch (type) {
    case "upgrade": return <ChevronUp className="h-4 w-4 text-success" />;
    case "downgrade": return <ChevronDown className="h-4 w-4 text-warning" />;
    case "canceled": return <Minus className="h-4 w-4 text-destructive" />;
    case "new": return <ArrowUpRight className="h-4 w-4 text-info" />;
    default: return null;
  }
}

type SortColumn = "name" | "plan" | "status" | "revenue" | "renews";
type SortDirection = "asc" | "desc";

type EnrichedSubscription = {
  customer_id: string;
  customer_email: string;
  customer_name: string;
  plan: string;
  status: string;
  current_period_end: string;
  created: string;
  cancel_at_period_end: boolean;
  monthly_amount: number;
  facility_name: string;
  facility_city?: string;
  facility_state?: string;
  leads_used: number;
  location_limit: number;
};

const VALID_TABS = ["overview", "subscriptions", "featured", "retention", "settings"] as const;
type ValidTab = typeof VALID_TABS[number];

export default function AdminSubscriptions() {
  const queryClient = useQueryClient();
  const { logError } = useAdminErrorHandler("AdminSubscriptions");
  const [searchParams, setSearchParams] = useSearchParams();

  // Sync tab from URL
  const tabFromUrl = searchParams.get("tab") as ValidTab | null;
  const [activeTab, setActiveTab] = useState<string>(
    tabFromUrl && VALID_TABS.includes(tabFromUrl) ? tabFromUrl : "overview"
  );

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setSearchParams(tab === "overview" ? {} : { tab }, { replace: true });
  };

  // Sync URL → state on nav
  useEffect(() => {
    const t = searchParams.get("tab") as ValidTab | null;
    if (t && VALID_TABS.includes(t) && t !== activeTab) {
      setActiveTab(t);
    }
  }, [searchParams]);

  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 350);
  const [planFilter, setPlanFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortColumn, setSortColumn] = useState<SortColumn>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [selectedSubscription, setSelectedSubscription] = useState<EnrichedSubscription | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const invalidateSubscriptionQueries = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["admin-subscription-stats"] });
    queryClient.invalidateQueries({ queryKey: ["admin-subscriptions-facilities"] });
    queryClient.invalidateQueries({ queryKey: ["admin-subscription-lead-counts"] });
    queryClient.invalidateQueries({ queryKey: ["at-risk-providers"] });
    queryClient.invalidateQueries({ queryKey: ["retention-metrics"] });
  }, [queryClient]);

  /* ───── Realtime channels ───── */
  useEffect(() => {
    const channels = [
      supabase
        .channel("admin-subs-facilities-rt")
        .on("postgres_changes", { event: "*", schema: "public", table: "facilities" }, () => invalidateSubscriptionQueries())
        .subscribe(),
      supabase
        .channel("admin-subs-unlocks-rt")
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "lead_unlocks" }, () => {
          queryClient.invalidateQueries({ queryKey: ["admin-subscription-lead-counts"] });
          queryClient.invalidateQueries({ queryKey: ["at-risk-providers"] });
        })
        .subscribe(),
      supabase
        .channel("admin-subs-leads-rt")
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "leads" }, () => {
          queryClient.invalidateQueries({ queryKey: ["at-risk-providers"] });
        })
        .subscribe(),
      supabase
        .channel("admin-subs-alerts-rt")
        .on("postgres_changes", { event: "*", schema: "public", table: "subscription_alerts" }, () => {
          queryClient.invalidateQueries({ queryKey: ["retention-metrics"] });
        })
        .subscribe(),
      supabase
        .channel("admin-subs-activity-rt")
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "account_activity_log" }, () => {
          queryClient.invalidateQueries({ queryKey: ["retention-metrics"] });
          queryClient.invalidateQueries({ queryKey: ["at-risk-providers"] });
        })
        .subscribe(),
    ];

    return () => { channels.forEach((ch) => supabase.removeChannel(ch)); };
  }, [invalidateSubscriptionQueries, queryClient]);

  /* ───── Data queries ───── */
  const { data: stripeStats, isLoading: isLoadingStripe, error: stripeError } = useQuery({
    queryKey: ["admin-subscription-stats"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("get-revenue-stats");
      if (error) throw error;
      return data as SubscriptionStats;
    },
    staleTime: 1000 * 60 * 5,
  });

  const { data: facilities, isLoading: isLoadingFacilities, error: facilitiesError } = useQuery({
    queryKey: ["admin-subscriptions-facilities"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("facilities")
        .select("id, name, city, state, status, featured, logo_url, user_id, created_at")
        .order("created_at", { ascending: false })
        .limit(1000);
      if (error) throw error;
      return data as Facility[];
    },
  });

  const { data: profiles, error: profilesError } = useQuery({
    queryKey: ["admin-subscriptions-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, email, first_name, last_name")
        .limit(1000);
      if (error) throw error;
      return data as Profile[];
    },
  });

  const { data: leadCounts, error: leadCountsError } = useQuery({
    queryKey: ["admin-subscription-lead-counts"],
    queryFn: async () => {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      const { data } = await supabase
        .from("lead_unlocks")
        .select("facility_id")
        .gte("created_at", startOfMonth.toISOString())
        .limit(5000);
      const counts: Record<string, number> = {};
      data?.forEach((u) => {
        if (u.facility_id) counts[u.facility_id] = (counts[u.facility_id] || 0) + 1;
      });
      return counts;
    },
  });

  /* ───── Error logging ───── */
  useEffect(() => { if (stripeError) logError("fetch_subscription_stats", stripeError); }, [stripeError, logError]);
  useEffect(() => { if (facilitiesError) logError("fetch_facilities", facilitiesError); }, [facilitiesError, logError]);
  useEffect(() => { if (profilesError) logError("fetch_profiles", profilesError); }, [profilesError, logError]);
  useEffect(() => { if (leadCountsError) logError("fetch_lead_counts", leadCountsError); }, [leadCountsError, logError]);

  /* ───── Derived data ───── */
  const emailToProfile = useMemo(() => {
    const map: Record<string, Profile> = {};
    profiles?.forEach((p) => { map[p.email.toLowerCase()] = p; });
    return map;
  }, [profiles]);

  const userToFacility = useMemo(() => {
    const map: Record<string, Facility> = {};
    facilities?.forEach((f) => { map[f.user_id] = f; });
    return map;
  }, [facilities]);

  const enrichedSubscriptions = useMemo(() => {
    if (!stripeStats?.subscriptions) return [];
    return stripeStats.subscriptions.map((sub) => {
      const profile = emailToProfile[sub.customer_email.toLowerCase()];
      const facility = profile ? userToFacility[profile.user_id] : null;
      const leadsUsed = facility ? (leadCounts?.[facility.id] || 0) : 0;
      const planDetails = PLAN_DETAILS[sub.plan as keyof typeof PLAN_DETAILS];
      return {
        ...sub,
        facility_name: facility?.name || "No facility",
        facility_city: facility?.city,
        facility_state: facility?.state,
        leads_used: leadsUsed,
        location_limit: planDetails?.location_limit || 1,
      };
    });
  }, [stripeStats?.subscriptions, emailToProfile, userToFacility, leadCounts]);

  /* ───── Filtering ───── */
  const filteredSubscriptions = useMemo(() => {
    return enrichedSubscriptions.filter((sub) => {
      if (debouncedSearch) {
        const q = debouncedSearch.toLowerCase();
        if (!sub.facility_name.toLowerCase().includes(q) && !sub.customer_email.toLowerCase().includes(q)) return false;
      }
      if (planFilter !== "all" && sub.plan !== planFilter) return false;
      if (statusFilter === "active" && sub.status !== "active") return false;
      if (statusFilter === "canceled" && sub.status !== "canceled") return false;
      if (statusFilter === "canceling" && !sub.cancel_at_period_end) return false;
      if (statusFilter === "past_due" && sub.status !== "past_due") return false;
      return true;
    });
  }, [enrichedSubscriptions, debouncedSearch, planFilter, statusFilter]);

  /* ───── Sorting ───── */
  const sortedSubscriptions = useMemo(() => {
    const planOrder = { free: 0, pro: 1 };
    const statusOrder = { active: 0, trialing: 1, past_due: 2, incomplete: 3, canceled: 4 };
    return [...filteredSubscriptions].sort((a, b) => {
      let cmp = 0;
      switch (sortColumn) {
        case "name": cmp = a.facility_name.localeCompare(b.facility_name); break;
        case "plan": cmp = (planOrder[a.plan as keyof typeof planOrder] || 0) - (planOrder[b.plan as keyof typeof planOrder] || 0); break;
        case "status": {
          const sa = a.cancel_at_period_end ? "canceling" : a.status;
          const sb = b.cancel_at_period_end ? "canceling" : b.status;
          cmp = (statusOrder[sa as keyof typeof statusOrder] || 0) - (statusOrder[sb as keyof typeof statusOrder] || 0);
          break;
        }
        case "revenue": cmp = a.monthly_amount - b.monthly_amount; break;
        case "renews": cmp = new Date(a.current_period_end).getTime() - new Date(b.current_period_end).getTime(); break;
      }
      return sortDirection === "asc" ? cmp : -cmp;
    });
  }, [filteredSubscriptions, sortColumn, sortDirection]);

  const handleSort = (col: SortColumn) => {
    if (sortColumn === col) setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortColumn(col); setSortDirection("asc"); }
    setCurrentPage(1);
  };

  useEffect(() => { setCurrentPage(1); }, [debouncedSearch, planFilter, statusFilter]);

  /* ───── Pagination ───── */
  const totalPages = Math.max(1, Math.ceil(sortedSubscriptions.length / itemsPerPage));
  const paginatedSubscriptions = sortedSubscriptions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const isLoading = isLoadingStripe || isLoadingFacilities;

  const planDistribution = useMemo(() => {
    if (!stripeStats) return { free: 0, pro: 0 };
    const total = stripeStats.active_subscriptions || 1;
    return {
      free: Math.round(((stripeStats.free_count || 0) / total) * 100),
      pro: Math.round(((stripeStats.pro_count || 0) / total) * 100),
    };
  }, [stripeStats]);

  /* ───── Sort header helper ───── */
  const SortHeader = ({ col, children }: { col: SortColumn; children: React.ReactNode }) => (
    <TableHead
      className="cursor-pointer select-none hover:bg-muted/50 transition-colors"
      onClick={() => handleSort(col)}
    >
      <div className="flex items-center gap-1">
        {children}
        {sortColumn === col && (
          sortDirection === "asc" ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />
        )}
      </div>
    </TableHead>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Subscriptions</h1>
        <p className="text-sm text-muted-foreground">Monitor revenue, plan distribution, and churn</p>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <div className="overflow-x-auto">
          <TabsList className="inline-flex w-auto min-w-full sm:min-w-0 sm:grid sm:w-full sm:max-w-3xl sm:grid-cols-5">
            <TabsTrigger value="overview" className="flex items-center gap-1.5 text-xs sm:text-sm">
              <LayoutDashboard className="h-4 w-4" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="subscriptions" className="flex items-center gap-1.5 text-xs sm:text-sm">
              <List className="h-4 w-4" />
              <span className="hidden sm:inline">Subscriptions</span>
            </TabsTrigger>
            <TabsTrigger value="featured" className="flex items-center gap-1.5 text-xs sm:text-sm">
              <Star className="h-4 w-4" />
              <span className="hidden sm:inline">Featured</span>
            </TabsTrigger>
            <TabsTrigger value="retention" className="flex items-center gap-1.5 text-xs sm:text-sm">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Retention</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-1.5 text-xs sm:text-sm">
              <Settings2 className="h-4 w-4" />
              <span className="hidden sm:inline">Settings</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ═══════ Overview Tab ═══════ */}
        <TabsContent value="overview" className="space-y-6">
          {/* Revenue Stats */}
          <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
            {[
              {
                label: "MRR",
                value: isLoading ? null : `$${stripeStats?.mrr?.toLocaleString() || "0"}`,
                icon: DollarSign,
                iconBg: "bg-success/10",
                iconColor: "text-success",
                extra: isLoading ? null : (
                  <span className={`flex items-center gap-0.5 text-xs font-medium ${(stripeStats?.mrr_growth || 0) >= 0 ? "text-success" : "text-destructive"}`}>
                    {(stripeStats?.mrr_growth || 0) >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                    {stripeStats?.mrr_growth || 0}%
                  </span>
                ),
              },
              {
                label: "Active",
                value: isLoading ? null : String(stripeStats?.active_subscriptions || 0),
                icon: CreditCard,
                iconBg: "bg-info/10",
                iconColor: "text-info",
                extra: isLoading ? null : (
                  <span className="text-xs font-medium text-success">+{stripeStats?.new_last_30_days || 0}</span>
                ),
              },
              {
                label: "Churn",
                value: isLoading ? null : `${stripeStats?.churn_rate || 0}%`,
                icon: TrendingDown,
                iconBg: "bg-destructive/10",
                iconColor: "text-destructive",
                extra: isLoading ? null : (
                  <span className="text-xs font-medium text-destructive">{stripeStats?.canceled_last_30_days || 0}</span>
                ),
              },
              {
                label: "At-Risk",
                value: isLoading ? null : String(enrichedSubscriptions.filter((s) => s.cancel_at_period_end).length),
                icon: AlertTriangle,
                iconBg: "bg-warning/10",
                iconColor: "text-warning",
                extra: null,
              },
            ].map((card) => (
              <Card key={card.label} className="border-border/40">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center gap-2.5">
                    <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${card.iconBg} shrink-0`}>
                      <card.icon className={`h-4 w-4 ${card.iconColor}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider">{card.label}</p>
                      {card.value === null ? (
                        <Skeleton className="h-6 w-16 mt-1" />
                      ) : (
                        <p className="text-lg sm:text-xl font-bold leading-tight tabular-nums">{card.value}</p>
                      )}
                    </div>
                    {card.extra && <div className="shrink-0">{card.extra}</div>}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Plan Distribution */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Plan Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Free</span>
                    <span className="text-sm text-muted-foreground tabular-nums">{stripeStats?.free_count || 0}</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-muted-foreground/40 rounded-full transition-all duration-500" style={{ width: `${planDistribution.free}%` }} />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Pro</span>
                    <span className="text-sm text-muted-foreground tabular-nums">{stripeStats?.pro_count || 0}</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-warning rounded-full transition-all duration-500" style={{ width: `${planDistribution.pro}%` }} />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* At-Risk Providers */}
          <AtRiskProvidersCard />

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
              <CardDescription>Upgrades, downgrades & cancellations</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-14 w-full" />
                  ))}
                </div>
              ) : stripeStats?.recent_events && stripeStats.recent_events.length > 0 ? (
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {stripeStats.recent_events.slice(0, 9).map((event, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                      <div className="mt-0.5"><EventIcon type={event.type} /></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{event.customer_email}</p>
                        <p className="text-xs text-muted-foreground">
                          {event.type === "new" && `Subscribed to ${event.to_plan}`}
                          {event.type === "canceled" && `Canceled ${event.from_plan}`}
                          {event.type === "upgrade" && `Upgraded to ${event.to_plan}`}
                          {event.type === "downgrade" && `Downgraded to ${event.to_plan}`}
                        </p>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(event.date), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CreditCard className="h-10 w-10 mx-auto mb-2 opacity-20" />
                  <p className="text-sm">No recent activity</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══════ All Subscriptions Tab ═══════ */}
        <TabsContent value="subscriptions" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    All Subscriptions
                  </CardTitle>
                  <CardDescription className="tabular-nums">
                    {sortedSubscriptions.length} of {enrichedSubscriptions.length} providers
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={planFilter} onValueChange={setPlanFilter}>
                  <SelectTrigger className="w-full sm:w-36">
                    <SelectValue placeholder="Plan" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Plans</SelectItem>
                    <SelectItem value="free">Free</SelectItem>
                    <SelectItem value="pro">Pro</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-36">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="canceling">Canceling</SelectItem>
                    <SelectItem value="canceled">Canceled</SelectItem>
                    <SelectItem value="past_due">Past Due</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-4">
                      <Skeleton className="h-4 w-40 flex-1" />
                      <Skeleton className="h-5 w-12" />
                      <Skeleton className="h-5 w-16" />
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                  ))}
                </div>
              ) : sortedSubscriptions.length > 0 ? (
                <>
                  <TooltipProvider>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="hover:bg-transparent">
                            <SortHeader col="name">Provider</SortHeader>
                            <SortHeader col="plan">Plan</SortHeader>
                            <SortHeader col="status">Status</SortHeader>
                            <TableHead>Leads</TableHead>
                            <SortHeader col="revenue">Revenue</SortHeader>
                            <SortHeader col="renews">Renews</SortHeader>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {paginatedSubscriptions.map((sub) => (
                            <TableRow
                              key={sub.customer_id}
                              className="cursor-pointer hover:bg-muted/50"
                              onClick={() => { setSelectedSubscription(sub); setIsDetailModalOpen(true); }}
                            >
                              <TableCell className="min-w-[200px]">
                                <div className="min-w-0">
                                  <p className="font-medium truncate max-w-[200px] text-sm">{sub.facility_name}</p>
                                  <p className="text-xs text-muted-foreground truncate max-w-[200px]">{sub.customer_email}</p>
                                </div>
                              </TableCell>
                              <TableCell><PlanBadge plan={sub.plan} /></TableCell>
                              <TableCell><StatusBadge status={sub.status} cancelAtPeriodEnd={sub.cancel_at_period_end} /></TableCell>
                              <TableCell>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="text-sm text-muted-foreground tabular-nums cursor-default" onClick={(e) => e.stopPropagation()}>
                                      {sub.leads_used} this mo
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent><p>{sub.leads_used} leads unlocked this month</p></TooltipContent>
                                </Tooltip>
                              </TableCell>
                              <TableCell>
                                <span className="font-medium tabular-nums">${sub.monthly_amount}</span>
                                <span className="text-muted-foreground">/mo</span>
                              </TableCell>
                              <TableCell>
                                <span className="text-sm text-muted-foreground tabular-nums">
                                  {format(new Date(sub.current_period_end), "MMM d, yyyy")}
                                </span>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </TooltipProvider>

                  {/* Pagination */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 pt-4 border-t">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground tabular-nums">
                      <span>Showing</span>
                      <Select value={itemsPerPage.toString()} onValueChange={(v) => { setItemsPerPage(Number(v)); setCurrentPage(1); }}>
                        <SelectTrigger className="w-[70px] h-8"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="10">10</SelectItem>
                          <SelectItem value="25">25</SelectItem>
                          <SelectItem value="50">50</SelectItem>
                          <SelectItem value="100">100</SelectItem>
                        </SelectContent>
                      </Select>
                      <span>of {sortedSubscriptions.length} results</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}>
                        <ChevronLeft className="h-4 w-4 mr-1" />Prev
                      </Button>
                      <span className="text-sm text-muted-foreground tabular-nums">
                        {currentPage} / {totalPages}
                      </span>
                      <Button variant="outline" size="sm" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                        Next<ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <CreditCard className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p className="font-medium">No subscriptions found</p>
                  <p className="text-sm mt-1">Try adjusting your filters</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══════ Retention Tab ═══════ */}
        <TabsContent value="retention" className="space-y-6">
          <AtRiskProvidersCard />
          <RetentionDashboard />
        </TabsContent>

        {/* ═══════ Featured Tab ═══════ */}
        <TabsContent value="featured" className="space-y-6">
          <FeaturedPlacementTab />
        </TabsContent>

        {/* ═══════ Settings Tab ═══════ */}
        <TabsContent value="settings" className="space-y-6">
          <PlanSettingsTab />
        </TabsContent>
      </Tabs>

      {/* Detail Modal */}
      <SubscriptionDetailModal
        subscription={selectedSubscription}
        open={isDetailModalOpen}
        onOpenChange={setIsDetailModalOpen}
      />
    </div>
  );
}
