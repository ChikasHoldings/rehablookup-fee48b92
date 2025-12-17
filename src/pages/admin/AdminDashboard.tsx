import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { useEffect, useCallback, memo, forwardRef } from "react";
import {
  Building2,
  Users,
  CheckCircle,
  AlertCircle,
  CreditCard,
  Star,
  MapPin,
  TrendingUp,
  TrendingDown,
  Clock,
  ArrowUpRight,
  DollarSign,
  ShieldCheck,
  UserPlus,
  Sparkles,
  ChevronRight,
  PieChart as PieChartIcon,
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip as RechartsTooltip, AreaChart, Area } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import SubscriptionActivityWidget from "@/components/admin/SubscriptionActivityWidget";
import { useAdminErrorHandler } from "@/hooks/useAdminErrorHandler";

// Subscription plan colors
const PLAN_COLORS = {
  basic: "hsl(215, 16%, 47%)", // slate
  professional: "hsl(217, 91%, 60%)", // blue
  featured: "hsl(45, 93%, 47%)", // amber/gold
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

// Sparkline component for KPI cards - using forwardRef to handle refs properly
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
  
  // Generate unique gradient ID based on color
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
  const navigate = useNavigate();
  const { logError, logInfo } = useAdminErrorHandler("AdminDashboard");

  // Invalidate all dashboard queries
  const invalidateDashboard = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["admin-provider-stats"] });
    queryClient.invalidateQueries({ queryKey: ["admin-lead-stats"] });
    queryClient.invalidateQueries({ queryKey: ["admin-top-cities"] });
    queryClient.invalidateQueries({ queryKey: ["admin-recent-leads"] });
    queryClient.invalidateQueries({ queryKey: ["admin-revenue-stats"] });
    queryClient.invalidateQueries({ queryKey: ["admin-subscription-breakdown"] });
    queryClient.invalidateQueries({ queryKey: ["admin-weekly-trends"] });
    queryClient.invalidateQueries({ queryKey: ["admin-subscription-activity"] });
  }, [queryClient]);

  // Real-time subscriptions - always active
  useEffect(() => {
    const facilitiesChannel = supabase
      .channel("dashboard-facilities")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "facilities" },
        () => {
          invalidateDashboard();
        }
      )
      .subscribe();

    const leadsChannel = supabase
      .channel("dashboard-leads")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "leads" },
        () => {
          invalidateDashboard();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(facilitiesChannel);
      supabase.removeChannel(leadsChannel);
    };
  }, [invalidateDashboard]);

  // Fetch revenue stats from Stripe
  const { data: revenueStats, isLoading: loadingRevenue } = useQuery<RevenueStats>({
    queryKey: ["admin-revenue-stats"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase.functions.invoke("get-revenue-stats");
        if (error) {
          logError("fetch_revenue_stats", error);
          return {
            monthlyRevenue: 0,
            previousMonthRevenue: 0,
            percentChange: 0,
            activeSubscriptions: 0,
            totalCustomers: 0,
            configured: false,
          };
        }
        return data;
      } catch (error) {
        logError("fetch_revenue_stats", error);
        return {
          monthlyRevenue: 0,
          previousMonthRevenue: 0,
          percentChange: 0,
          activeSubscriptions: 0,
          totalCustomers: 0,
          configured: false,
        };
      }
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Fetch subscription breakdown by plan (uses data from revenue stats)
  const { data: subscriptionBreakdown, isLoading: loadingBreakdown } = useQuery<SubscriptionBreakdown[]>({
    queryKey: ["admin-subscription-breakdown"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("get-revenue-stats");
      
      if (error || !data?.subscriptionsByPlan) {
        return [
          { name: "Basic", value: 0, color: PLAN_COLORS.basic },
          { name: "Professional", value: 0, color: PLAN_COLORS.professional },
          { name: "Featured", value: 0, color: PLAN_COLORS.featured },
        ];
      }
      
      return [
        { name: "Basic", value: data.subscriptionsByPlan.basic || 0, color: PLAN_COLORS.basic },
        { name: "Professional", value: data.subscriptionsByPlan.professional || 0, color: PLAN_COLORS.professional },
        { name: "Featured", value: data.subscriptionsByPlan.featured || 0, color: PLAN_COLORS.featured },
      ];
    },
    staleTime: 5 * 60 * 1000,
  });

  // Fetch weekly trend data for sparklines
  const { data: weeklyTrends } = useQuery({
    queryKey: ["admin-weekly-trends"],
    queryFn: async () => {
      // Get last 7 days of data
      const days = 7;
      const now = new Date();
      const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
      
      // Fetch leads created in the last 7 days
      const { data: leadsData } = await supabase
        .from("leads")
        .select("created_at")
        .gte("created_at", startDate.toISOString())
        .order("created_at", { ascending: true });
      
      // Fetch facilities created in the last 7 days
      const { data: facilitiesData } = await supabase
        .from("facilities")
        .select("created_at")
        .gte("created_at", startDate.toISOString())
        .order("created_at", { ascending: true });
      
      // Group by day
      const leadsByDay: Record<string, number> = {};
      const providersByDay: Record<string, number> = {};
      
      // Initialize all days with 0
      for (let i = 0; i < days; i++) {
        const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
        const dateKey = date.toISOString().split('T')[0];
        leadsByDay[dateKey] = 0;
        providersByDay[dateKey] = 0;
      }
      
      // Count leads per day
      leadsData?.forEach((lead) => {
        const dateKey = new Date(lead.created_at).toISOString().split('T')[0];
        if (leadsByDay[dateKey] !== undefined) {
          leadsByDay[dateKey]++;
        }
      });
      
      // Count providers per day
      facilitiesData?.forEach((facility) => {
        const dateKey = new Date(facility.created_at).toISOString().split('T')[0];
        if (providersByDay[dateKey] !== undefined) {
          providersByDay[dateKey]++;
        }
      });
      
      // Convert to array format for charts
      const leadsTrend: TrendDataPoint[] = Object.entries(leadsByDay).map(([date, value]) => ({ date, value }));
      const providersTrend: TrendDataPoint[] = Object.entries(providersByDay).map(([date, value]) => ({ date, value }));
      
      return {
        leads: leadsTrend,
        providers: providersTrend,
      };
    },
    staleTime: 5 * 60 * 1000,
  });

  // Fetch providers stats
  const { data: providerStats, isLoading: loadingProviders } = useQuery({
    queryKey: ["admin-provider-stats"],
    queryFn: async () => {
      const { count: total } = await supabase
        .from("facilities")
        .select("*", { count: "exact", head: true });

      const { count: approved } = await supabase
        .from("facilities")
        .select("*", { count: "exact", head: true })
        .eq("status", "approved");

      const { count: pending } = await supabase
        .from("facilities")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");

      const { count: featured } = await supabase
        .from("facilities")
        .select("*", { count: "exact", head: true })
        .eq("featured", true);

      const { count: verified } = await supabase
        .from("facilities")
        .select("*", { count: "exact", head: true })
        .eq("verified", true);

      return {
        total: total || 0,
        approved: approved || 0,
        pending: pending || 0,
        featured: featured || 0,
        verified: verified || 0,
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

      const { count: totalMonth } = await supabase
        .from("leads")
        .select("*", { count: "exact", head: true })
        .gte("created_at", startOfMonth.toISOString());

      const { count: totalAll } = await supabase
        .from("leads")
        .select("*", { count: "exact", head: true });

      const { count: verified } = await supabase
        .from("leads")
        .select("*", { count: "exact", head: true })
        .eq("email_verified", true)
        .gte("created_at", startOfMonth.toISOString());

      const { count: qualified } = await supabase
        .from("leads")
        .select("*", { count: "exact", head: true })
        .eq("qualified", true)
        .gte("created_at", startOfMonth.toISOString());

      const { count: unassigned } = await supabase
        .from("leads")
        .select("*", { count: "exact", head: true })
        .is("facility_id", null);

      const { count: newLeads } = await supabase
        .from("leads")
        .select("*", { count: "exact", head: true })
        .eq("status", "new");

      return {
        totalMonth: totalMonth || 0,
        totalAll: totalAll || 0,
        verified: verified || 0,
        qualified: qualified || 0,
        verificationRate: totalMonth ? Math.round(((verified || 0) / totalMonth) * 100) : 0,
        qualificationRate: totalMonth ? Math.round(((qualified || 0) / totalMonth) * 100) : 0,
        unassigned: unassigned || 0,
        newLeads: newLeads || 0,
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

      const sorted = Object.entries(cityCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
      
      const maxCount = sorted.length > 0 ? sorted[0][1] : 1;

      return sorted.map(([city, count]) => ({ 
        city, 
        count,
        percentage: Math.round((count / maxCount) * 100)
      }));
    },
  });

  // Fetch recent leads
  const { data: recentLeads } = useQuery({
    queryKey: ["admin-recent-leads"],
    queryFn: async () => {
      const { data } = await supabase
        .from("leads")
        .select("id, name, email, created_at, facility_id, email_verified, source, qualified, status")
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

  // Safe data accessors with defaults
  const safeProviderStats = providerStats || { total: 0, approved: 0, pending: 0, featured: 0, verified: 0 };
  const safeLeadStats = leadStats || { totalMonth: 0, totalAll: 0, verified: 0, qualified: 0, verificationRate: 0, qualificationRate: 0, unassigned: 0, newLeads: 0 };
  const safeRecentLeads = recentLeads || [];
  const safeTopCities = topCities || [];
  const safeSubscriptionBreakdown = subscriptionBreakdown || [];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">Platform overview and key performance metrics</p>
      </div>

      {/* Primary KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Revenue Card */}
        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-primary-foreground/90">Monthly Revenue</CardTitle>
            <div className="h-8 w-8 rounded-lg bg-white/10 flex items-center justify-center">
              <DollarSign className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            {loadingRevenue ? (
              <Skeleton className="h-9 w-24 bg-white/20" />
            ) : (
              <>
                <div className="text-3xl font-bold">
                  ${revenueStats?.monthlyRevenue?.toLocaleString() || "0"}
                </div>
                {revenueStats?.configured ? (
                  <p className="text-xs text-primary-foreground/70 mt-1 flex items-center gap-1">
                    {revenueStats.percentChange >= 0 ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    {revenueStats.percentChange >= 0 ? "+" : ""}
                    {revenueStats.percentChange}% from last month
                  </p>
                ) : (
                  <p className="text-xs text-primary-foreground/70 mt-1 flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    {revenueStats?.activeSubscriptions || 0} active subscriptions
                  </p>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Total Providers */}
        <Card className="border-0 shadow-card bg-card overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Providers</CardTitle>
            <div className="h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center">
              <Building2 className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent className="pb-0">
            {loadingProviders ? (
              <Skeleton className="h-9 w-20" />
            ) : (
              <>
                <div className="text-3xl font-bold text-foreground">{providerStats?.total}</div>
                <div className="flex items-center gap-3 mt-2">
                  <span className="inline-flex items-center text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full font-medium">
                    {providerStats?.approved} approved
                  </span>
                  <span className="inline-flex items-center text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full font-medium">
                    {providerStats?.pending} pending
                  </span>
                </div>
              </>
            )}
          </CardContent>
          {weeklyTrends?.providers && (
            <div className="mt-3 -mx-6 -mb-6">
              <Sparkline data={weeklyTrends.providers} color="hsl(217, 91%, 60%)" height={50} />
            </div>
          )}
        </Card>

        {/* Featured Providers */}
        <Card className="border-0 shadow-card bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Featured Providers</CardTitle>
            <div className="h-8 w-8 rounded-lg bg-amber-50 flex items-center justify-center">
              <Star className="h-4 w-4 text-amber-600" />
            </div>
          </CardHeader>
          <CardContent>
            {loadingProviders ? (
              <Skeleton className="h-9 w-20" />
            ) : (
              <>
                <div className="text-3xl font-bold text-foreground">{providerStats?.featured}</div>
                <div className="flex items-center gap-2 mt-2">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                  <span className="text-xs text-muted-foreground">
                    {providerStats?.verified} verified providers
                  </span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Pending Verification */}
        <Card className="border-0 shadow-card bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Review</CardTitle>
            <div className="h-8 w-8 rounded-lg bg-orange-50 flex items-center justify-center">
              <Clock className="h-4 w-4 text-orange-600" />
            </div>
          </CardHeader>
          <CardContent>
            {loadingProviders ? (
              <Skeleton className="h-9 w-20" />
            ) : (
              <>
                <div className="text-3xl font-bold text-foreground">{providerStats?.pending}</div>
                {providerStats?.pending && providerStats.pending > 0 ? (
                  <Link 
                    to="/admin/providers?status=pending"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-2"
                  >
                    Review now <ArrowUpRight className="h-3 w-3" />
                  </Link>
                ) : (
                  <p className="text-xs text-muted-foreground mt-2">All caught up!</p>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Secondary Stats Row */}
      <div className="grid gap-4 md:grid-cols-4">
        {/* Total Leads */}
        <Card className="border-0 shadow-card bg-card overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Leads</CardTitle>
            <div className="h-8 w-8 rounded-lg bg-violet-50 flex items-center justify-center">
              <Users className="h-4 w-4 text-violet-600" />
            </div>
          </CardHeader>
          <CardContent className="pb-0">
            {loadingLeads ? (
              <Skeleton className="h-9 w-20" />
            ) : (
              <>
                <div className="text-3xl font-bold text-foreground">{leadStats?.totalAll}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {leadStats?.totalMonth} this month
                </p>
              </>
            )}
          </CardContent>
          {weeklyTrends?.leads && (
            <div className="mt-3 -mx-6 -mb-6">
              <Sparkline data={weeklyTrends.leads} color="hsl(263, 70%, 50%)" height={50} />
            </div>
          )}
        </Card>

        {/* Qualified Leads */}
        <Card className="border-0 shadow-card bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Qualified Leads</CardTitle>
            <div className="h-8 w-8 rounded-lg bg-emerald-50 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-emerald-600" />
            </div>
          </CardHeader>
          <CardContent>
            {loadingLeads ? (
              <Skeleton className="h-9 w-20" />
            ) : (
              <>
                <div className="text-3xl font-bold text-foreground">{leadStats?.qualified}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {leadStats?.qualificationRate}% qualification rate
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Verification Rate */}
        <Card className="border-0 shadow-card bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Verification Rate</CardTitle>
            <div className="h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center">
              <CheckCircle className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            {loadingLeads ? (
              <Skeleton className="h-9 w-20" />
            ) : (
              <>
                <div className="text-3xl font-bold text-foreground">{leadStats?.verificationRate}%</div>
                <div className="mt-2">
                  <Progress value={leadStats?.verificationRate || 0} className="h-1.5" />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Awaiting Response */}
        <Card className="border-0 shadow-card bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Awaiting Response</CardTitle>
            <div className="h-8 w-8 rounded-lg bg-rose-50 flex items-center justify-center">
              <AlertCircle className="h-4 w-4 text-rose-600" />
            </div>
          </CardHeader>
          <CardContent>
            {loadingLeads ? (
              <Skeleton className="h-9 w-20" />
            ) : (
              <>
                <div className="text-3xl font-bold text-foreground">{leadStats?.newLeads}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {leadStats?.unassigned} unassigned
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Subscription Breakdown Row */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Subscription Pie Chart */}
        <Card className="border-0 shadow-card bg-card">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-violet-50 flex items-center justify-center">
                <PieChartIcon className="h-4 w-4 text-violet-600" />
              </div>
              <div>
                <CardTitle className="text-lg font-semibold">Subscription Breakdown</CardTitle>
                <CardDescription>Distribution by plan tier</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loadingBreakdown ? (
              <div className="h-[200px] flex items-center justify-center">
                <Skeleton className="h-32 w-32 rounded-full" />
              </div>
            ) : subscriptionBreakdown && subscriptionBreakdown.some(item => item.value > 0) ? (
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={subscriptionBreakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                      nameKey="name"
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
                            <div className="bg-card border border-border rounded-lg shadow-lg px-3 py-2">
                              <p className="text-sm font-medium text-foreground">{data.name}</p>
                              <p className="text-xs text-muted-foreground">{data.value} subscribers</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend 
                      content={({ payload }) => (
                        <ul className="flex flex-wrap justify-center gap-4 mt-4">
                          {payload?.map((entry, index) => (
                            <li key={`legend-${index}`} className="flex items-center gap-1.5 text-xs">
                              <span 
                                className="w-2.5 h-2.5 rounded-full" 
                                style={{ backgroundColor: entry.color }}
                              />
                              <span className="text-muted-foreground">{entry.value}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[200px] flex flex-col items-center justify-center text-muted-foreground">
                <PieChartIcon className="h-10 w-10 mb-2 opacity-40" />
                <p className="text-sm">No subscription data available</p>
              </div>
            )}
            {/* Summary stats below chart */}
            {subscriptionBreakdown && subscriptionBreakdown.some(item => item.value > 0) && (
              <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-border">
                {subscriptionBreakdown.map((plan) => (
                  <div key={plan.name} className="text-center">
                    <p className="text-lg font-bold text-foreground">{plan.value}</p>
                    <p className="text-xs text-muted-foreground">{plan.name}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions - moved into this row */}
        <Card className="border-0 shadow-card bg-card lg:col-span-2">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold">Quick Actions</CardTitle>
            <CardDescription>Common administrative tasks</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2">
            {providerStats?.pending && providerStats.pending > 0 && (
              <Button 
                variant="ghost" 
                className="w-full justify-start h-auto py-3 px-3 hover:bg-amber-50 group"
                asChild
              >
                <Link to="/admin/providers?status=pending">
                  <div className="h-9 w-9 rounded-lg bg-amber-100 flex items-center justify-center mr-3 group-hover:bg-amber-200 transition-colors">
                    <AlertCircle className="h-4 w-4 text-amber-600" />
                  </div>
                  <div className="flex flex-col items-start">
                    <span className="text-sm font-medium">Review Providers</span>
                    <span className="text-xs text-muted-foreground">{providerStats.pending} pending approval</span>
                  </div>
                </Link>
              </Button>
            )}
            {leadStats?.unassigned && leadStats.unassigned > 0 && (
              <Button 
                variant="ghost" 
                className="w-full justify-start h-auto py-3 px-3 hover:bg-blue-50 group"
                asChild
              >
                <Link to="/admin/leads?unassigned=true">
                  <div className="h-9 w-9 rounded-lg bg-blue-100 flex items-center justify-center mr-3 group-hover:bg-blue-200 transition-colors">
                    <UserPlus className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="flex flex-col items-start">
                    <span className="text-sm font-medium">Route Leads</span>
                    <span className="text-xs text-muted-foreground">{leadStats.unassigned} unassigned leads</span>
                  </div>
                </Link>
              </Button>
            )}
            <Button 
              variant="ghost" 
              className="w-full justify-start h-auto py-3 px-3 hover:bg-amber-50 group"
              asChild
            >
              <Link to="/admin/featured">
                <div className="h-9 w-9 rounded-lg bg-amber-100 flex items-center justify-center mr-3 group-hover:bg-amber-200 transition-colors">
                  <Star className="h-4 w-4 text-amber-600" />
                </div>
                <div className="flex flex-col items-start">
                  <span className="text-sm font-medium">Featured Placement</span>
                  <span className="text-xs text-muted-foreground">Manage premium listings</span>
                </div>
              </Link>
            </Button>
            <Button 
              variant="ghost" 
              className="w-full justify-start h-auto py-3 px-3 hover:bg-emerald-50 group"
              asChild
            >
              <Link to="/admin/subscriptions">
                <div className="h-9 w-9 rounded-lg bg-emerald-100 flex items-center justify-center mr-3 group-hover:bg-emerald-200 transition-colors">
                  <CreditCard className="h-4 w-4 text-emerald-600" />
                </div>
                <div className="flex flex-col items-start">
                  <span className="text-sm font-medium">Subscriptions</span>
                  <span className="text-xs text-muted-foreground">View billing & plans</span>
                </div>
              </Link>
            </Button>
            <Button 
              variant="ghost" 
              className="w-full justify-start h-auto py-3 px-3 hover:bg-violet-50 group"
              asChild
            >
              <Link to="/admin/users">
                <div className="h-9 w-9 rounded-lg bg-violet-100 flex items-center justify-center mr-3 group-hover:bg-violet-200 transition-colors">
                  <ShieldCheck className="h-4 w-4 text-violet-600" />
                </div>
                <div className="flex flex-col items-start">
                  <span className="text-sm font-medium">User Management</span>
                  <span className="text-xs text-muted-foreground">Manage roles & access</span>
                </div>
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Top Cities Row */}
      <Card className="border-0 shadow-card bg-card">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <MapPin className="h-4 w-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold">Top Cities by Leads</CardTitle>
              <CardDescription>Geographic distribution of inquiries</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {topCities && topCities.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {topCities.map((item, index) => (
                <div key={item.city} className="flex items-center gap-3">
                  <div className="flex items-center justify-center h-8 w-8 rounded-full bg-secondary text-sm font-semibold text-muted-foreground shrink-0">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-medium truncate">{item.city}</span>
                      <span className="text-sm font-semibold text-foreground">{item.count}</span>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary rounded-full transition-all duration-500"
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <MapPin className="h-10 w-10 mb-2 opacity-40" />
              <p className="text-sm">No location data available yet</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Subscription Activity */}
      <SubscriptionActivityWidget />

      {/* Recent Leads */}
      <Card className="border-0 shadow-card bg-card">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-violet-100 flex items-center justify-center">
              <Users className="h-5 w-5 text-violet-600" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold">Recent Leads</CardTitle>
              <CardDescription>Latest contact requests from the platform</CardDescription>
            </div>
          </div>
          <Button variant="outline" size="sm" className="shadow-none" asChild>
            <Link to="/admin/leads">
              View All
              <ArrowUpRight className="h-3.5 w-3.5 ml-1.5" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-border">
            {recentLeads && recentLeads.length > 0 ? (
              recentLeads.map((lead) => (
                <div
                  key={lead.id}
                  onClick={() => navigate(`/admin/leads?highlight=${lead.id}`)}
                  className="flex items-center justify-between py-4 first:pt-0 last:pb-0 cursor-pointer hover:bg-muted/50 -mx-6 px-6 transition-colors group"
                >
                  <div className="flex items-center gap-4">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-semibold ${
                      lead.qualified 
                        ? "bg-gradient-to-br from-emerald-100 to-emerald-50 text-emerald-700" 
                        : "bg-gradient-to-br from-primary/20 to-primary/5 text-primary"
                    }`}>
                      {lead.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">{lead.name}</p>
                      <p className="text-xs text-muted-foreground">{lead.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col items-end gap-1">
                      <div className="flex items-center gap-2">
                        {lead.qualified && (
                          <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50 text-[10px] px-1.5 py-0">
                            <Sparkles className="h-2.5 w-2.5 mr-0.5" />
                            Qualified
                          </Badge>
                        )}
                        {lead.email_verified && !lead.qualified && (
                          <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50 text-[10px] px-1.5 py-0">
                            <CheckCircle className="h-2.5 w-2.5 mr-0.5" />
                            Verified
                          </Badge>
                        )}
                        {!lead.facility_id && (
                          <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50 text-[10px] px-1.5 py-0">
                            Unassigned
                          </Badge>
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Clock className="h-2.5 w-2.5" />
                        {formatTimeAgo(lead.created_at)}
                      </span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Users className="h-10 w-10 mb-2 opacity-40" />
                <p className="text-sm">No leads yet</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
