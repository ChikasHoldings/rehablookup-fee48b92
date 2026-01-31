import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useEffect, useCallback, memo, forwardRef } from "react";
import {
  Building2,
  Users,
  AlertCircle,
  CreditCard,
  Star,
  MapPin,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  DollarSign,
  ShieldCheck,
  UserPlus,
  ChevronRight,
  PieChart as PieChartIcon,
  Activity,
} from "lucide-react";
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip as RechartsTooltip, 
  AreaChart, Area, BarChart, Bar, XAxis, YAxis 
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import SubscriptionActivityWidget from "@/components/admin/SubscriptionActivityWidget";
import LowCreditMonitorWidget from "@/components/admin/LowCreditMonitorWidget";
import { useAdminErrorHandler } from "@/hooks/useAdminErrorHandler";

// Chart colors
const CHART_COLORS = {
  primary: "hsl(var(--primary))",
  emerald: "hsl(142, 71%, 45%)",
  amber: "hsl(45, 93%, 47%)",
  blue: "hsl(217, 91%, 60%)",
  violet: "hsl(263, 70%, 50%)",
  rose: "hsl(346, 77%, 49%)",
  slate: "hsl(215, 16%, 47%)",
};

const PLAN_COLORS = {
  free: "hsl(215, 16%, 47%)",
  pro: "hsl(45, 93%, 47%)",
};

interface SubscriptionBreakdown {
  name: string;
  value: number;
  color: string;
}

interface TrendDataPoint {
  date: string;
  value: number;
}

interface RevenueStats {
  monthlyRevenue: number;
  previousMonthRevenue: number;
  percentChange: number;
  activeSubscriptions: number;
  totalCustomers: number;
  configured: boolean;
}

// Sparkline component
interface SparklineProps {
  data: TrendDataPoint[];
  color?: string;
  height?: number;
}

const Sparkline = memo(forwardRef<HTMLDivElement, SparklineProps>(function Sparkline({ 
  data, 
  color = "hsl(var(--primary))", 
  height = 40 
}, ref) {
  if (!data || data.length === 0) return null;
  const gradientId = `sparkline-gradient-${color.replace(/[^a-zA-Z0-9]/g, '')}`;
  
  return (
    <div ref={ref} className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.3} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={1.5}
            fill={`url(#${gradientId})`}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}));

export default function AdminDashboard() {
  const queryClient = useQueryClient();
  const { logError } = useAdminErrorHandler("AdminDashboard");

  const invalidateDashboard = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["admin-provider-stats"] });
    queryClient.invalidateQueries({ queryKey: ["admin-lead-stats"] });
    queryClient.invalidateQueries({ queryKey: ["admin-top-cities"] });
    queryClient.invalidateQueries({ queryKey: ["admin-recent-leads"] });
    queryClient.invalidateQueries({ queryKey: ["admin-revenue-stats"] });
    queryClient.invalidateQueries({ queryKey: ["admin-subscription-breakdown"] });
    queryClient.invalidateQueries({ queryKey: ["admin-weekly-trends"] });
  }, [queryClient]);

  useEffect(() => {
    const facilitiesChannel = supabase
      .channel("dashboard-facilities")
      .on("postgres_changes", { event: "*", schema: "public", table: "facilities" }, invalidateDashboard)
      .subscribe();

    const leadsChannel = supabase
      .channel("dashboard-leads")
      .on("postgres_changes", { event: "*", schema: "public", table: "leads" }, invalidateDashboard)
      .subscribe();

    return () => {
      supabase.removeChannel(facilitiesChannel);
      supabase.removeChannel(leadsChannel);
    };
  }, [invalidateDashboard]);

  // Fetch revenue stats
  const { data: revenueStats, isLoading: loadingRevenue } = useQuery<RevenueStats>({
    queryKey: ["admin-revenue-stats"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase.functions.invoke("get-revenue-stats");
        if (error) {
          logError("fetch_revenue_stats", error);
          return { monthlyRevenue: 0, previousMonthRevenue: 0, percentChange: 0, activeSubscriptions: 0, totalCustomers: 0, configured: false };
        }
        return data;
      } catch (error) {
        logError("fetch_revenue_stats", error);
        return { monthlyRevenue: 0, previousMonthRevenue: 0, percentChange: 0, activeSubscriptions: 0, totalCustomers: 0, configured: false };
      }
    },
    staleTime: 5 * 60 * 1000,
  });

  // Fetch subscription breakdown
  const { data: subscriptionBreakdown, isLoading: loadingBreakdown } = useQuery<SubscriptionBreakdown[]>({
    queryKey: ["admin-subscription-breakdown"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("get-revenue-stats");
      if (error || !data?.subscriptionsByPlan) {
        return [
          { name: "Free", value: 0, color: PLAN_COLORS.free },
          { name: "Pro", value: 0, color: PLAN_COLORS.pro },
        ];
      }
      return [
        { name: "Free", value: data.subscriptionsByPlan.free || 0, color: PLAN_COLORS.free },
        { name: "Pro", value: data.subscriptionsByPlan.pro || 0, color: PLAN_COLORS.pro },
      ];
    },
    staleTime: 5 * 60 * 1000,
  });

  // Fetch weekly trends
  const { data: weeklyTrends } = useQuery({
    queryKey: ["admin-weekly-trends"],
    queryFn: async () => {
      const days = 7;
      const now = new Date();
      const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
      
      const { data: leadsData } = await supabase
        .from("leads")
        .select("created_at")
        .gte("created_at", startDate.toISOString())
        .order("created_at", { ascending: true });
      
      const { data: facilitiesData } = await supabase
        .from("facilities")
        .select("created_at")
        .gte("created_at", startDate.toISOString())
        .order("created_at", { ascending: true });
      
      const leadsByDay: Record<string, number> = {};
      const providersByDay: Record<string, number> = {};
      
      for (let i = 0; i < days; i++) {
        const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
        const dateKey = date.toISOString().split('T')[0];
        leadsByDay[dateKey] = 0;
        providersByDay[dateKey] = 0;
      }
      
      leadsData?.forEach((lead) => {
        const dateKey = new Date(lead.created_at).toISOString().split('T')[0];
        if (leadsByDay[dateKey] !== undefined) leadsByDay[dateKey]++;
      });
      
      facilitiesData?.forEach((facility) => {
        const dateKey = new Date(facility.created_at).toISOString().split('T')[0];
        if (providersByDay[dateKey] !== undefined) providersByDay[dateKey]++;
      });
      
      return {
        leads: Object.entries(leadsByDay).map(([date, value]) => ({ date, value })),
        providers: Object.entries(providersByDay).map(([date, value]) => ({ date, value })),
      };
    },
    staleTime: 5 * 60 * 1000,
  });

  // Fetch providers stats
  const { data: providerStats, isLoading: loadingProviders } = useQuery({
    queryKey: ["admin-provider-stats"],
    queryFn: async () => {
      const [total, approved, pending, featured, verified] = await Promise.all([
        supabase.from("facilities").select("*", { count: "exact", head: true }),
        supabase.from("facilities").select("*", { count: "exact", head: true }).eq("status", "approved"),
        supabase.from("facilities").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("facilities").select("*", { count: "exact", head: true }).eq("featured", true),
        supabase.from("facilities").select("*", { count: "exact", head: true }).eq("verified", true),
      ]);
      return {
        total: total.count || 0,
        approved: approved.count || 0,
        pending: pending.count || 0,
        featured: featured.count || 0,
        verified: verified.count || 0,
      };
    },
  });

  // Fetch leads stats
  const { data: leadStats, isLoading: loadingLeads } = useQuery({
    queryKey: ["admin-lead-stats"],
    queryFn: async () => {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const [totalMonth, totalAll, verified, newLeads, assigned] = await Promise.all([
        supabase.from("leads").select("*", { count: "exact", head: true }).gte("created_at", startOfMonth.toISOString()),
        supabase.from("leads").select("*", { count: "exact", head: true }),
        supabase.from("leads").select("*", { count: "exact", head: true }).eq("email_verified", true).gte("created_at", startOfMonth.toISOString()),
        supabase.from("leads").select("*", { count: "exact", head: true }).eq("status", "new"),
        supabase.from("leads").select("*", { count: "exact", head: true }).not("facility_id", "is", null),
      ]);

      return {
        totalMonth: totalMonth.count || 0,
        totalAll: totalAll.count || 0,
        verified: verified.count || 0,
        verificationRate: totalMonth.count ? Math.round(((verified.count || 0) / totalMonth.count) * 100) : 0,
        newLeads: newLeads.count || 0,
        assigned: assigned.count || 0,
      };
    },
  });

  // Fetch top cities
  const { data: topCities } = useQuery({
    queryKey: ["admin-top-cities"],
    queryFn: async () => {
      const { data } = await supabase
        .from("leads")
        .select("location_city_state")
        .not("location_city_state", "is", null)
        .limit(500);

      if (!data) return [];

      const cityCounts: Record<string, number> = {};
      data.forEach((lead) => {
        if (lead.location_city_state) {
          cityCounts[lead.location_city_state] = (cityCounts[lead.location_city_state] || 0) + 1;
        }
      });

      const sorted = Object.entries(cityCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
      const maxCount = sorted.length > 0 ? sorted[0][1] : 1;

      return sorted.map(([city, count]) => ({ city, count, percentage: Math.round((count / maxCount) * 100) }));
    },
  });

  // Fetch recent leads
  const { data: recentLeads } = useQuery({
    queryKey: ["admin-recent-leads"],
    queryFn: async () => {
      const { data } = await supabase
        .from("leads")
        .select("id, name, email, created_at, facility_id, email_verified, source, status")
        .order("created_at", { ascending: false })
        .limit(5);
      return data || [];
    },
  });

  const formatTimeAgo = (dateString: string) => {
    if (!dateString) return "Unknown";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "Unknown";
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      return `${diffDays}d ago`;
    } catch {
      return "Unknown";
    }
  };

  // Provider status data for bar chart
  const providerStatusData = [
    { name: "Approved", value: providerStats?.approved || 0, fill: CHART_COLORS.emerald },
    { name: "Pending", value: providerStats?.pending || 0, fill: CHART_COLORS.amber },
    { name: "Featured", value: providerStats?.featured || 0, fill: CHART_COLORS.violet },
    { name: "Verified", value: providerStats?.verified || 0, fill: CHART_COLORS.blue },
  ];

  // Lead funnel data
  const leadFunnelData = [
    { name: "Total", value: leadStats?.totalMonth || 0, fill: CHART_COLORS.slate },
    { name: "Verified", value: leadStats?.verified || 0, fill: CHART_COLORS.blue },
    { name: "Assigned", value: leadStats?.assigned || 0, fill: CHART_COLORS.emerald },
  ];

  // Calculate action items
  const actionItemsCount = (providerStats?.pending || 0) + (leadStats?.newLeads || 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Platform overview and key metrics</p>
      </div>

      {/* Primary KPIs - 4 cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Revenue */}
        <Card className="border-0 bg-primary text-primary-foreground shadow-md overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium opacity-90 truncate pr-2">Monthly Revenue</CardTitle>
            <DollarSign className="h-4 w-4 opacity-70 shrink-0" />
          </CardHeader>
          <CardContent className="min-h-[60px]">
            {loadingRevenue ? (
              <Skeleton className="h-8 w-24 bg-white/20" />
            ) : (
              <>
                <div className="text-2xl font-bold truncate">
                  ${revenueStats?.monthlyRevenue?.toLocaleString() || "0"}
                </div>
                <p className="text-xs opacity-70 mt-1 flex items-center gap-1 truncate">
                  {revenueStats?.percentChange && revenueStats.percentChange >= 0 ? (
                    <TrendingUp className="h-3 w-3 shrink-0" />
                  ) : (
                    <TrendingDown className="h-3 w-3 shrink-0" />
                  )}
                  <span className="truncate">
                    {revenueStats?.percentChange ? `${revenueStats.percentChange >= 0 ? "+" : ""}${revenueStats.percentChange}%` : "—"} vs last month
                  </span>
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Providers */}
        <Card className="border shadow-sm overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground truncate pr-2">Total Providers</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
          </CardHeader>
          <CardContent className="pb-0 min-h-[40px]">
            {loadingProviders ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold tabular-nums">{providerStats?.total?.toLocaleString()}</div>
            )}
          </CardContent>
          {weeklyTrends?.providers && (
            <div className="mt-2 -mx-6 -mb-6">
              <Sparkline data={weeklyTrends.providers} color={CHART_COLORS.blue} height={40} />
            </div>
          )}
        </Card>

        {/* Leads */}
        <Card className="border shadow-sm overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground truncate pr-2">Total Leads</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground shrink-0" />
          </CardHeader>
          <CardContent className="pb-0 min-h-[40px]">
            {loadingLeads ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold tabular-nums">{leadStats?.totalAll?.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground truncate">{leadStats?.totalMonth?.toLocaleString()} this month</p>
              </>
            )}
          </CardContent>
          {weeklyTrends?.leads && (
            <div className="mt-2 -mx-6 -mb-6">
              <Sparkline data={weeklyTrends.leads} color={CHART_COLORS.violet} height={40} />
            </div>
          )}
        </Card>

        {/* Actions Needed */}
        <Card className={`border shadow-sm overflow-hidden ${actionItemsCount > 0 ? "border-amber-200 bg-amber-50/50" : ""}`}>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground truncate pr-2">Actions Needed</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground shrink-0" />
          </CardHeader>
          <CardContent className="min-h-[60px]">
            {loadingProviders || loadingLeads ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold tabular-nums">{actionItemsCount}</div>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {providerStats?.pending ? (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-700 hover:bg-amber-100 whitespace-nowrap">
                      {providerStats.pending} pending
                    </Badge>
                  ) : null}
                  {leadStats?.newLeads ? (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-700 hover:bg-blue-100 whitespace-nowrap">
                      {leadStats.newLeads} new
                    </Badge>
                  ) : null}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Provider Status Bar Chart */}
        <Card className="border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">Provider Status</CardTitle>
            <CardDescription className="text-xs">Breakdown by status</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingProviders ? (
              <div className="h-[180px] flex items-center justify-center">
                <Skeleton className="h-full w-full" />
              </div>
            ) : (
              <div className="h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={providerStatusData} layout="vertical" margin={{ left: 0, right: 20 }}>
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="name" width={70} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                    <RechartsTooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-card border rounded-lg shadow-lg px-3 py-2">
                              <p className="text-sm font-medium">{payload[0].payload.name}</p>
                              <p className="text-xs text-muted-foreground">{payload[0].value} providers</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Lead Funnel */}
        <Card className="border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">Lead Funnel</CardTitle>
            <CardDescription className="text-xs">This month's conversion</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingLeads ? (
              <div className="h-[180px] flex items-center justify-center">
                <Skeleton className="h-full w-full" />
              </div>
            ) : (
              <div className="h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={leadFunnelData} layout="vertical" margin={{ left: 0, right: 20 }}>
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="name" width={60} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                    <RechartsTooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-card border rounded-lg shadow-lg px-3 py-2">
                              <p className="text-sm font-medium">{payload[0].payload.name}</p>
                              <p className="text-xs text-muted-foreground">{payload[0].value} leads</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
            <div className="mt-2 pt-2 border-t flex justify-between text-xs text-muted-foreground">
              <span>Verification: {leadStats?.verificationRate || 0}%</span>
              <span>Assigned: {leadStats?.totalMonth ? Math.round((leadStats.assigned / leadStats.totalMonth) * 100) : 0}%</span>
            </div>
          </CardContent>
        </Card>

        {/* Subscription Pie Chart */}
        <Card className="border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">Subscriptions</CardTitle>
            <CardDescription className="text-xs">Distribution by plan</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingBreakdown ? (
              <div className="h-[180px] flex items-center justify-center">
                <Skeleton className="h-24 w-24 rounded-full" />
              </div>
            ) : subscriptionBreakdown && subscriptionBreakdown.some(item => item.value > 0) ? (
              <div className="h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={subscriptionBreakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={65}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {subscriptionBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload as SubscriptionBreakdown;
                          return (
                            <div className="bg-card border rounded-lg shadow-lg px-3 py-2">
                              <p className="text-sm font-medium">{data.name}</p>
                              <p className="text-xs text-muted-foreground">{data.value} subscribers</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend
                      content={({ payload }) => (
                        <div className="flex justify-center gap-4 mt-2">
                          {payload?.map((entry, index) => (
                            <div key={`legend-${index}`} className="flex items-center gap-1.5 text-xs">
                              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                              <span className="text-muted-foreground">{entry.value}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[180px] flex flex-col items-center justify-center text-muted-foreground">
                <PieChartIcon className="h-8 w-8 mb-2 opacity-40" />
                <p className="text-xs">No data available</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions + Top Cities */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Quick Actions */}
        <Card className="border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2">
            {providerStats?.pending && providerStats.pending > 0 && (
              <Button variant="ghost" className="justify-start h-auto py-2.5 px-3 hover:bg-amber-50" asChild>
                <Link to="/admin/providers?status=pending">
                  <AlertCircle className="h-4 w-4 text-amber-600 mr-2" />
                  <div className="flex flex-col items-start">
                    <span className="text-sm">Review Providers</span>
                    <span className="text-xs text-muted-foreground">{providerStats.pending} pending</span>
                  </div>
                </Link>
              </Button>
            )}
            <Button variant="ghost" className="justify-start h-auto py-2.5 px-3 hover:bg-blue-50" asChild>
              <Link to="/admin/leads">
                <UserPlus className="h-4 w-4 text-blue-600 mr-2" />
                <div className="flex flex-col items-start">
                  <span className="text-sm">View Leads</span>
                  <span className="text-xs text-muted-foreground">Manage inquiries</span>
                </div>
              </Link>
            </Button>
            <Button variant="ghost" className="justify-start h-auto py-2.5 px-3 hover:bg-amber-50" asChild>
              <Link to="/admin/featured">
                <Star className="h-4 w-4 text-amber-600 mr-2" />
                <div className="flex flex-col items-start">
                  <span className="text-sm">Featured Placement</span>
                  <span className="text-xs text-muted-foreground">Premium listings</span>
                </div>
              </Link>
            </Button>
            <Button variant="ghost" className="justify-start h-auto py-2.5 px-3 hover:bg-emerald-50" asChild>
              <Link to="/admin/subscriptions">
                <CreditCard className="h-4 w-4 text-emerald-600 mr-2" />
                <div className="flex flex-col items-start">
                  <span className="text-sm">Subscriptions</span>
                  <span className="text-xs text-muted-foreground">Billing & plans</span>
                </div>
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Top Cities */}
        <Card className="border shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-medium">Top Cities by Leads</CardTitle>
              <MapPin className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            {topCities && topCities.length > 0 ? (
              <div className="space-y-3">
                {topCities.map((item, index) => (
                  <div key={item.city} className="flex items-center gap-3">
                    <span className="text-xs font-medium text-muted-foreground w-4">{index + 1}</span>
                    <div className="flex-1">
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium truncate">{item.city}</span>
                        <span className="text-xs text-muted-foreground">{item.count}</span>
                      </div>
                      <Progress value={item.percentage} className="h-1.5" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No location data available</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Leads + Activity Widgets */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Leads */}
        <Card className="border shadow-sm lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-medium">Recent Leads</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/admin/leads" className="text-xs">
                  View all <ChevronRight className="h-3 w-3 ml-1" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {recentLeads && recentLeads.length > 0 ? (
              <div className="space-y-3">
                {recentLeads.map((lead) => (
                  <div key={lead.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                        <span className="text-xs font-medium">{lead.name?.charAt(0)?.toUpperCase() || "?"}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{lead.name || "Unknown"}</p>
                        <p className="text-xs text-muted-foreground truncate">{lead.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {lead.email_verified && (
                        <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">
                          Verified
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground">{formatTimeAgo(lead.created_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No recent leads</p>
            )}
          </CardContent>
        </Card>

        {/* Activity Widget */}
        <div className="space-y-6">
          <SubscriptionActivityWidget />
          <LowCreditMonitorWidget />
        </div>
      </div>
    </div>
  );
}
