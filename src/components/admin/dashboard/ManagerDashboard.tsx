import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useAdminErrorHandler } from "@/hooks/useAdminErrorHandler";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Briefcase,
  TrendingUp,
  TrendingDown,
  Building2,
  Users,
  CreditCard,
  BarChart3,
  DollarSign,
  AlertCircle,
  ChevronRight,
  Target,
  Activity,
} from "lucide-react";

interface RevenueStats {
  monthlyRevenue: number;
  previousMonthRevenue: number;
  percentChange: number;
  activeSubscriptions: number;
  totalCustomers: number;
  configured: boolean;
}

export function ManagerDashboard() {
  const queryClient = useQueryClient();
  const { logError } = useAdminErrorHandler("ManagerDashboard");
  const { hasPermission } = useAdminAuth();

  const invalidateDashboard = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["manager-stats"] });
  }, [queryClient]);

  useEffect(() => {
    const channel = supabase
      .channel("manager-dashboard")
      .on("postgres_changes", { event: "*", schema: "public", table: "facilities" }, invalidateDashboard)
      .on("postgres_changes", { event: "*", schema: "public", table: "leads" }, invalidateDashboard)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [invalidateDashboard]);

  // Fetch revenue stats
  const { data: revenueStats, isLoading: loadingRevenue } = useQuery<RevenueStats>({
    queryKey: ["manager-revenue-stats"],
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

  // Fetch providers stats
  const { data: providerStats, isLoading: loadingProviders } = useQuery({
    queryKey: ["manager-provider-stats"],
    queryFn: async () => {
      const [total, approved, pending, featured] = await Promise.all([
        supabase.from("facilities").select("*", { count: "exact", head: true }),
        supabase.from("facilities").select("*", { count: "exact", head: true }).eq("status", "approved"),
        supabase.from("facilities").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("facilities").select("*", { count: "exact", head: true }).eq("featured", true),
      ]);
      return {
        total: total.count || 0,
        approved: approved.count || 0,
        pending: pending.count || 0,
        featured: featured.count || 0,
        approvalRate: total.count ? Math.round(((approved.count || 0) / total.count) * 100) : 0,
      };
    },
  });

  // Fetch leads stats
  const { data: leadStats, isLoading: loadingLeads } = useQuery({
    queryKey: ["manager-lead-stats"],
    queryFn: async () => {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const [totalMonth, totalAll, verified, newLeads] = await Promise.all([
        supabase.from("leads").select("*", { count: "exact", head: true }).gte("created_at", startOfMonth.toISOString()),
        supabase.from("leads").select("*", { count: "exact", head: true }),
        supabase.from("leads").select("*", { count: "exact", head: true }).eq("email_verified", true).gte("created_at", startOfMonth.toISOString()),
        supabase.from("leads").select("*", { count: "exact", head: true }).eq("status", "new"),
      ]);

      return {
        totalMonth: totalMonth.count || 0,
        totalAll: totalAll.count || 0,
        verified: verified.count || 0,
        verificationRate: totalMonth.count ? Math.round(((verified.count || 0) / totalMonth.count) * 100) : 0,
        newLeads: newLeads.count || 0,
      };
    },
  });

  // Fetch active subscriptions
  const { data: subscriptionStats, isLoading: loadingSubs } = useQuery({
    queryKey: ["manager-subscription-stats"],
    queryFn: async () => {
      const [active, trial, canceled] = await Promise.all([
        supabase.from("pro_subscriptions").select("*", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("pro_subscriptions").select("*", { count: "exact", head: true }).eq("status", "trialing"),
        supabase.from("pro_subscriptions").select("*", { count: "exact", head: true }).eq("status", "canceled"),
      ]);
      return {
        active: active.count || 0,
        trial: trial.count || 0,
        canceled: canceled.count || 0,
      };
    },
  });

  const actionItemsCount = (providerStats?.pending || 0) + (leadStats?.newLeads || 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center shadow-lg">
          <Briefcase className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Manager Dashboard</h1>
          <p className="text-sm text-muted-foreground">Operations overview — Providers, Leads, Subscriptions & Analytics</p>
        </div>
      </div>

      {/* Primary KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Revenue */}
        <Card className="border-0 bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium opacity-90">Monthly Revenue</CardTitle>
            <DollarSign className="h-4 w-4 opacity-70" />
          </CardHeader>
          <CardContent>
            {loadingRevenue ? (
              <Skeleton className="h-8 w-24 bg-white/20" />
            ) : (
              <>
                <div className="text-2xl font-bold">${revenueStats?.monthlyRevenue?.toLocaleString() || "0"}</div>
                <p className="text-xs opacity-80 mt-1 flex items-center gap-1">
                  {revenueStats?.percentChange && revenueStats.percentChange >= 0 ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  {revenueStats?.percentChange ? `${revenueStats.percentChange >= 0 ? "+" : ""}${revenueStats.percentChange}%` : "—"} vs last month
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Providers */}
        <Card className="border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Providers</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingProviders ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold">{providerStats?.total?.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground mt-1">{providerStats?.approved} approved</p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Leads */}
        <Card className="border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Monthly Leads</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingLeads ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold">{leadStats?.totalMonth?.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground mt-1">{leadStats?.verificationRate}% verified</p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Actions Needed */}
        <Card className={`border shadow-sm ${actionItemsCount > 0 ? "border-warning/50 bg-warning/5" : ""}`}>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Actions Needed</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{actionItemsCount}</div>
            <div className="flex gap-1.5 mt-1">
              {providerStats?.pending ? (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5 bg-warning/20 text-warning-foreground">
                  {providerStats.pending} pending
                </Badge>
              ) : null}
              {leadStats?.newLeads ? (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5 bg-info/20 text-info-foreground">
                  {leadStats.newLeads} new leads
                </Badge>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Provider Status */}
        <Card className="border shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-medium">Provider Status</CardTitle>
                <CardDescription>Approval and verification rates</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/admin/providers" className="text-xs">
                  View all <ChevronRight className="h-3 w-3 ml-1" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium">Approved</span>
                <span className="text-sm text-muted-foreground">{providerStats?.approvalRate}%</span>
              </div>
              <Progress value={providerStats?.approvalRate || 0} className="h-2" />
            </div>
            <div className="grid grid-cols-3 gap-4 pt-2">
              <div className="text-center p-2 rounded-lg bg-success/10">
                <div className="text-lg font-bold text-success">{providerStats?.approved}</div>
                <div className="text-xs text-muted-foreground">Approved</div>
              </div>
              <div className="text-center p-2 rounded-lg bg-warning/10">
                <div className="text-lg font-bold text-warning">{providerStats?.pending}</div>
                <div className="text-xs text-muted-foreground">Pending</div>
              </div>
              <div className="text-center p-2 rounded-lg bg-primary/10">
                <div className="text-lg font-bold text-primary">{providerStats?.featured}</div>
                <div className="text-xs text-muted-foreground">Featured</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Subscription Overview */}
        <Card className="border shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-medium">Subscription Overview</CardTitle>
                <CardDescription>Active plans and billing status</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/admin/subscriptions" className="text-xs">
                  View all <ChevronRight className="h-3 w-3 ml-1" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loadingSubs ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 rounded-lg bg-success/10 border border-success/20">
                  <CreditCard className="h-5 w-5 text-success mx-auto mb-1" />
                  <div className="text-xl font-bold text-success">{subscriptionStats?.active}</div>
                  <div className="text-xs text-muted-foreground">Active</div>
                </div>
                <div className="text-center p-3 rounded-lg bg-info/10 border border-info/20">
                  <Target className="h-5 w-5 text-info mx-auto mb-1" />
                  <div className="text-xl font-bold text-info">{subscriptionStats?.trial}</div>
                  <div className="text-xs text-muted-foreground">Trial</div>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted/50 border border-border">
                  <AlertCircle className="h-5 w-5 text-muted-foreground mx-auto mb-1" />
                  <div className="text-xl font-bold text-muted-foreground">{subscriptionStats?.canceled}</div>
                  <div className="text-xs text-muted-foreground">Canceled</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="border shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-medium">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {providerStats?.pending && providerStats.pending > 0 && (
            <Button variant="ghost" className="justify-start h-auto py-3 px-4 hover:bg-warning/10" asChild>
              <Link to="/admin/providers?status=pending">
                <AlertCircle className="h-5 w-5 text-warning mr-3" />
                <div className="flex flex-col items-start">
                  <span className="text-sm font-medium">Review Providers</span>
                  <span className="text-xs text-muted-foreground">{providerStats.pending} pending approval</span>
                </div>
              </Link>
            </Button>
          )}
          <Button variant="ghost" className="justify-start h-auto py-3 px-4 hover:bg-info/10" asChild>
            <Link to="/admin/leads">
              <Users className="h-5 w-5 text-info mr-3" />
              <div className="flex flex-col items-start">
                <span className="text-sm font-medium">Manage Leads</span>
                <span className="text-xs text-muted-foreground">View all inquiries</span>
              </div>
            </Link>
          </Button>
          <Button variant="ghost" className="justify-start h-auto py-3 px-4 hover:bg-success/10" asChild>
            <Link to="/admin/subscriptions">
              <CreditCard className="h-5 w-5 text-success mr-3" />
              <div className="flex flex-col items-start">
                <span className="text-sm font-medium">Subscriptions</span>
                <span className="text-xs text-muted-foreground">Billing & plans</span>
              </div>
            </Link>
          </Button>
          <Button variant="ghost" className="justify-start h-auto py-3 px-4 hover:bg-primary/10" asChild>
            <Link to="/admin/analytics">
              <BarChart3 className="h-5 w-5 text-primary mr-3" />
              <div className="flex flex-col items-start">
                <span className="text-sm font-medium">Analytics</span>
                <span className="text-xs text-muted-foreground">View detailed reports</span>
              </div>
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
