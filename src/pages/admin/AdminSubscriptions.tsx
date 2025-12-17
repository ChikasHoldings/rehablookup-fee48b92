import { useState, useMemo, useEffect, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CreditCard,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
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

type SubscriptionStats = {
  total_subscriptions: number;
  active_subscriptions: number;
  professional_count: number;
  featured_count: number;
  basic_count: number;
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

// Plan badge component
function PlanBadge({ plan }: { plan: string }) {
  const config: Record<string, { label: string; className: string }> = {
    basic: { label: "Basic", className: "bg-slate-100 text-slate-700 border-slate-200" },
    professional: { label: "Professional", className: "bg-blue-100 text-blue-700 border-blue-200" },
    featured: { label: "Featured", className: "bg-amber-100 text-amber-700 border-amber-200" },
  };

  const { label, className } = config[plan] || { label: plan, className: "bg-muted text-muted-foreground" };

  return (
    <Badge variant="outline" className={className}>
      {label}
    </Badge>
  );
}

// Status badge component
function StatusBadge({ status, cancelAtPeriodEnd }: { status: string; cancelAtPeriodEnd?: boolean }) {
  if (cancelAtPeriodEnd) {
    return (
      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
        Canceling
      </Badge>
    );
  }

  const config: Record<string, { label: string; className: string }> = {
    active: { label: "Active", className: "bg-green-50 text-green-700 border-green-200" },
    canceled: { label: "Canceled", className: "bg-red-50 text-red-700 border-red-200" },
    past_due: { label: "Past Due", className: "bg-red-50 text-red-700 border-red-200" },
    trialing: { label: "Trial", className: "bg-purple-50 text-purple-700 border-purple-200" },
    incomplete: { label: "Incomplete", className: "bg-slate-50 text-slate-600 border-slate-200" },
  };

  const { label, className } = config[status] || { label: status, className: "bg-muted text-muted-foreground" };

  return (
    <Badge variant="outline" className={className}>
      {label}
    </Badge>
  );
}

// Event type icon
function EventIcon({ type }: { type: string }) {
  switch (type) {
    case "upgrade":
      return <ChevronUp className="h-4 w-4 text-green-500" />;
    case "downgrade":
      return <ChevronDown className="h-4 w-4 text-amber-500" />;
    case "canceled":
      return <Minus className="h-4 w-4 text-red-500" />;
    case "new":
      return <ArrowUpRight className="h-4 w-4 text-blue-500" />;
    default:
      return null;
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
  lead_limit: number;
};

export default function AdminSubscriptions() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [planFilter, setPlanFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortColumn, setSortColumn] = useState<SortColumn>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [selectedSubscription, setSelectedSubscription] = useState<EnrichedSubscription | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Invalidate subscription queries helper
  const invalidateSubscriptionQueries = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["admin-subscription-stats"] });
    queryClient.invalidateQueries({ queryKey: ["admin-subscriptions-facilities"] });
    queryClient.invalidateQueries({ queryKey: ["admin-subscription-lead-counts"] });
    queryClient.invalidateQueries({ queryKey: ["at-risk-providers"] });
    queryClient.invalidateQueries({ queryKey: ["retention-metrics"] });
  }, [queryClient]);

  // Real-time subscriptions for facilities, leads, and retention changes - always active
  useEffect(() => {
    const facilitiesChannel = supabase
      .channel("admin-subscriptions-facilities-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "facilities" },
        (payload) => {
          invalidateSubscriptionQueries();
          if (payload.eventType === "INSERT") {
            toast.info("New provider registered", {
              description: "Subscription data updated",
            });
          }
        }
      )
      .subscribe();

    const leadsChannel = supabase
      .channel("admin-subscriptions-leads-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "leads" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["admin-subscription-lead-counts"] });
          queryClient.invalidateQueries({ queryKey: ["at-risk-providers"] });
        }
      )
      .subscribe();

    // Real-time for retention outreach alerts
    const alertsChannel = supabase
      .channel("admin-retention-alerts-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "subscription_alerts" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["retention-metrics"] });
        }
      )
      .subscribe();

    // Real-time for activity log (login events affect re-engagement metrics)
    const activityChannel = supabase
      .channel("admin-retention-activity-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "account_activity_log" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["retention-metrics"] });
          queryClient.invalidateQueries({ queryKey: ["at-risk-providers"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(facilitiesChannel);
      supabase.removeChannel(leadsChannel);
      supabase.removeChannel(alertsChannel);
      supabase.removeChannel(activityChannel);
    };
  }, [invalidateSubscriptionQueries, queryClient]);

  // Fetch subscription stats from Stripe
  const { data: stripeStats, isLoading: isLoadingStripe, refetch } = useQuery({
    queryKey: ["admin-subscription-stats"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("get-revenue-stats");
      if (error) throw error;
      return data as SubscriptionStats;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Fetch all facilities
  const { data: facilities, isLoading: isLoadingFacilities } = useQuery({
    queryKey: ["admin-subscriptions-facilities"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("facilities")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Facility[];
    },
  });

  // Fetch profiles to map emails
  const { data: profiles } = useQuery({
    queryKey: ["admin-subscriptions-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, email, first_name, last_name");
      if (error) throw error;
      return data as Profile[];
    },
  });

  // Fetch lead counts
  const { data: leadCounts } = useQuery({
    queryKey: ["admin-subscription-lead-counts"],
    queryFn: async () => {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data } = await supabase
        .from("leads")
        .select("facility_id")
        .gte("created_at", startOfMonth.toISOString());

      const counts: Record<string, number> = {};
      data?.forEach((lead) => {
        if (lead.facility_id) {
          counts[lead.facility_id] = (counts[lead.facility_id] || 0) + 1;
        }
      });
      return counts;
    },
  });

  // Map email to profile
  const emailToProfile = useMemo(() => {
    const map: Record<string, Profile> = {};
    profiles?.forEach((p) => {
      map[p.email.toLowerCase()] = p;
    });
    return map;
  }, [profiles]);

  // Map user_id to facility
  const userToFacility = useMemo(() => {
    const map: Record<string, Facility> = {};
    facilities?.forEach((f) => {
      map[f.user_id] = f;
    });
    return map;
  }, [facilities]);

  // Combine subscription data with facility data
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
        lead_limit: planDetails?.qualified_lead_limit || 4,
      };
    });
  }, [stripeStats?.subscriptions, emailToProfile, userToFacility, leadCounts]);

  // Filter subscriptions
  const filteredSubscriptions = useMemo(() => {
    return enrichedSubscriptions.filter((sub) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = sub.facility_name.toLowerCase().includes(query);
        const matchesEmail = sub.customer_email.toLowerCase().includes(query);
        if (!matchesName && !matchesEmail) return false;
      }

      // Plan filter
      if (planFilter !== "all" && sub.plan !== planFilter) return false;

      // Status filter
      if (statusFilter === "active" && sub.status !== "active") return false;
      if (statusFilter === "canceled" && sub.status !== "canceled") return false;
      if (statusFilter === "canceling" && !sub.cancel_at_period_end) return false;
      if (statusFilter === "past_due" && sub.status !== "past_due") return false;

      return true;
    });
  }, [enrichedSubscriptions, searchQuery, planFilter, statusFilter]);

  // Sort subscriptions
  const sortedSubscriptions = useMemo(() => {
    const planOrder = { basic: 0, professional: 1, featured: 2 };
    const statusOrder = { active: 0, trialing: 1, past_due: 2, incomplete: 3, canceled: 4 };

    return [...filteredSubscriptions].sort((a, b) => {
      let comparison = 0;

      switch (sortColumn) {
        case "name":
          comparison = a.facility_name.localeCompare(b.facility_name);
          break;
        case "plan":
          comparison = (planOrder[a.plan as keyof typeof planOrder] || 0) - (planOrder[b.plan as keyof typeof planOrder] || 0);
          break;
        case "status":
          const aStatus = a.cancel_at_period_end ? "canceling" : a.status;
          const bStatus = b.cancel_at_period_end ? "canceling" : b.status;
          comparison = (statusOrder[aStatus as keyof typeof statusOrder] || 0) - (statusOrder[bStatus as keyof typeof statusOrder] || 0);
          break;
        case "revenue":
          comparison = a.monthly_amount - b.monthly_amount;
          break;
        case "renews":
          comparison = new Date(a.current_period_end).getTime() - new Date(b.current_period_end).getTime();
          break;
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [filteredSubscriptions, sortColumn, sortDirection]);

  // Handle column sort click
  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
    setCurrentPage(1);
  };

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, planFilter, statusFilter]);

  // Pagination calculations
  const totalPages = Math.ceil(sortedSubscriptions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedSubscriptions = sortedSubscriptions.slice(startIndex, endIndex);

  const isLoading = isLoadingStripe || isLoadingFacilities;

  // Calculate plan distribution for visual indicator
  const planDistribution = useMemo(() => {
    if (!stripeStats) return { basic: 0, professional: 0, featured: 0 };
    const total = stripeStats.active_subscriptions || 1;
    return {
      basic: Math.round((stripeStats.basic_count / total) * 100),
      professional: Math.round((stripeStats.professional_count / total) * 100),
      featured: Math.round((stripeStats.featured_count / total) * 100),
    };
  }, [stripeStats]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Subscriptions</h1>
        <p className="text-muted-foreground">Monitor revenue, plan distribution, and churn</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full max-w-2xl grid-cols-4">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <LayoutDashboard className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="subscriptions" className="flex items-center gap-2">
            <List className="h-4 w-4" />
            All Subscriptions
          </TabsTrigger>
          <TabsTrigger value="retention" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Retention
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings2 className="h-4 w-4" />
            Plan Settings
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Revenue Stats */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Monthly Revenue</p>
                    <p className="text-2xl font-bold">
                      ${stripeStats?.mrr?.toLocaleString() || "0"}
                    </p>
                  </div>
                  <div className={`flex items-center gap-1 text-sm ${(stripeStats?.mrr_growth || 0) >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {(stripeStats?.mrr_growth || 0) >= 0 ? (
                      <TrendingUp className="h-4 w-4" />
                    ) : (
                      <TrendingDown className="h-4 w-4" />
                    )}
                    {stripeStats?.mrr_growth || 0}%
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Active Subscriptions</p>
                    <p className="text-2xl font-bold">{stripeStats?.active_subscriptions || 0}</p>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-green-600">
                    <ArrowUpRight className="h-4 w-4" />
                    +{stripeStats?.new_last_30_days || 0}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Churn Rate (30d)</p>
                    <p className="text-2xl font-bold">{stripeStats?.churn_rate || 0}%</p>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-red-600">
                    <ArrowDownRight className="h-4 w-4" />
                    {stripeStats?.canceled_last_30_days || 0}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">At-Risk</p>
                    <p className="text-2xl font-bold">
                      {enrichedSubscriptions.filter((s) => s.cancel_at_period_end).length}
                    </p>
                  </div>
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Plan Distribution */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Plan Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Basic</span>
                    <span className="text-sm text-muted-foreground">{stripeStats?.basic_count || 0}</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-slate-400 rounded-full transition-all duration-500"
                      style={{ width: `${planDistribution.basic}%` }}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Professional</span>
                    <span className="text-sm text-muted-foreground">{stripeStats?.professional_count || 0}</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-500 rounded-full transition-all duration-500"
                      style={{ width: `${planDistribution.professional}%` }}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Featured</span>
                    <span className="text-sm text-muted-foreground">{stripeStats?.featured_count || 0}</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-amber-500 rounded-full transition-all duration-500"
                      style={{ width: `${planDistribution.featured}%` }}
                    />
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
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : stripeStats?.recent_events && stripeStats.recent_events.length > 0 ? (
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {stripeStats.recent_events.slice(0, 9).map((event, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                      <div className="mt-0.5">
                        <EventIcon type={event.type} />
                      </div>
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
                <p className="text-center py-4 text-sm text-muted-foreground">No recent activity</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* All Subscriptions Tab */}
        <TabsContent value="subscriptions" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    All Subscriptions
                  </CardTitle>
                  <CardDescription>
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
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Plan" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Plans</SelectItem>
                    <SelectItem value="basic">Basic</SelectItem>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="featured">Featured</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[140px]">
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
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : sortedSubscriptions.length > 0 ? (
                <>
                  <TooltipProvider>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="hover:bg-transparent">
                            <TableHead 
                              className="cursor-pointer select-none hover:bg-muted/50 transition-colors"
                              onClick={() => handleSort("name")}
                            >
                              <div className="flex items-center gap-1">
                                Provider
                                {sortColumn === "name" && (
                                  sortDirection === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                                )}
                              </div>
                            </TableHead>
                            <TableHead 
                              className="cursor-pointer select-none hover:bg-muted/50 transition-colors"
                              onClick={() => handleSort("plan")}
                            >
                              <div className="flex items-center gap-1">
                                Plan
                                {sortColumn === "plan" && (
                                  sortDirection === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                                )}
                              </div>
                            </TableHead>
                            <TableHead 
                              className="cursor-pointer select-none hover:bg-muted/50 transition-colors"
                              onClick={() => handleSort("status")}
                            >
                              <div className="flex items-center gap-1">
                                Status
                                {sortColumn === "status" && (
                                  sortDirection === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                                )}
                              </div>
                            </TableHead>
                            <TableHead>Leads</TableHead>
                            <TableHead 
                              className="cursor-pointer select-none hover:bg-muted/50 transition-colors"
                              onClick={() => handleSort("revenue")}
                            >
                              <div className="flex items-center gap-1">
                                Revenue
                                {sortColumn === "revenue" && (
                                  sortDirection === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                                )}
                              </div>
                            </TableHead>
                            <TableHead 
                              className="cursor-pointer select-none hover:bg-muted/50 transition-colors"
                              onClick={() => handleSort("renews")}
                            >
                              <div className="flex items-center gap-1">
                                Renews
                                {sortColumn === "renews" && (
                                  sortDirection === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                                )}
                              </div>
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {paginatedSubscriptions.map((sub) => (
                            <TableRow 
                              key={sub.customer_id}
                              className="cursor-pointer hover:bg-muted/50"
                              onClick={() => {
                                setSelectedSubscription(sub);
                                setIsDetailModalOpen(true);
                              }}
                            >
                              <TableCell>
                                <div className="min-w-0">
                                  <p className="font-medium truncate max-w-[200px]">{sub.facility_name}</p>
                                  <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                                    {sub.customer_email}
                                  </p>
                                </div>
                              </TableCell>
                              <TableCell>
                                <PlanBadge plan={sub.plan} />
                              </TableCell>
                              <TableCell>
                                <StatusBadge status={sub.status} cancelAtPeriodEnd={sub.cancel_at_period_end} />
                              </TableCell>
                              <TableCell>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="flex items-center gap-2 cursor-default" onClick={(e) => e.stopPropagation()}>
                                      <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                                        <div 
                                          className={`h-full rounded-full transition-all ${
                                            sub.leads_used >= sub.lead_limit ? "bg-red-500" : 
                                            sub.leads_used >= sub.lead_limit * 0.8 ? "bg-amber-500" : "bg-green-500"
                                          }`}
                                          style={{ width: `${Math.min((sub.leads_used / sub.lead_limit) * 100, 100)}%` }}
                                        />
                                      </div>
                                      <span className="text-sm text-muted-foreground">
                                        {sub.leads_used}/{sub.lead_limit}
                                      </span>
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>{sub.leads_used} of {sub.lead_limit} leads used this month</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TableCell>
                              <TableCell>
                                <span className="font-medium">${sub.monthly_amount}</span>
                                <span className="text-muted-foreground">/mo</span>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm text-muted-foreground">
                                    {format(new Date(sub.current_period_end), "MMM d, yyyy")}
                                  </span>
                                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </TooltipProvider>

                  {/* Pagination Controls */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 pt-4 border-t">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>Showing</span>
                      <Select 
                        value={itemsPerPage.toString()} 
                        onValueChange={(value) => {
                          setItemsPerPage(Number(value));
                          setCurrentPage(1);
                        }}
                      >
                        <SelectTrigger className="w-[70px] h-8">
                          <SelectValue />
                        </SelectTrigger>
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
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        Previous
                      </Button>
                      <div className="flex items-center gap-1">
                        {totalPages <= 7 ? (
                          [...Array(totalPages)].map((_, i) => (
                            <Button
                              key={i + 1}
                              variant={currentPage === i + 1 ? "default" : "outline"}
                              size="sm"
                              className="w-8 h-8 p-0"
                              onClick={() => setCurrentPage(i + 1)}
                            >
                              {i + 1}
                            </Button>
                          ))
                        ) : (
                          <>
                            {currentPage > 3 && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="w-8 h-8 p-0"
                                  onClick={() => setCurrentPage(1)}
                                >
                                  1
                                </Button>
                                {currentPage > 4 && <span className="px-1 text-muted-foreground">...</span>}
                              </>
                            )}
                            {[...Array(5)].map((_, i) => {
                              let pageNum: number;
                              if (currentPage <= 3) {
                                pageNum = i + 1;
                              } else if (currentPage >= totalPages - 2) {
                                pageNum = totalPages - 4 + i;
                              } else {
                                pageNum = currentPage - 2 + i;
                              }
                              if (pageNum < 1 || pageNum > totalPages) return null;
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
                            {currentPage < totalPages - 2 && (
                              <>
                                {currentPage < totalPages - 3 && <span className="px-1 text-muted-foreground">...</span>}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="w-8 h-8 p-0"
                                  onClick={() => setCurrentPage(totalPages)}
                                >
                                  {totalPages}
                                </Button>
                              </>
                            )}
                          </>
                        )}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                      >
                        Next
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-center py-8 text-muted-foreground">No subscriptions found</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Retention Analytics Tab */}
        <TabsContent value="retention" className="space-y-6">
          {/* At-Risk Providers Section */}
          <AtRiskProvidersCard />
          
          {/* Retention Dashboard with Outreach Analytics */}
          <RetentionDashboard />
        </TabsContent>

        {/* Plan Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          <PlanSettingsTab />
        </TabsContent>
      </Tabs>

      {/* Subscription Detail Modal */}
      <SubscriptionDetailModal
        subscription={selectedSubscription}
        open={isDetailModalOpen}
        onOpenChange={setIsDetailModalOpen}
      />
    </div>
  );
}
