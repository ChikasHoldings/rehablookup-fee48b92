import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { ManagerTeamPerformance } from "@/components/admin/dashboard/ManagerTeamPerformance";
import { useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
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
  UserPlus,
  AlertTriangle,
  Headphones,
  UserCheck,
  Clock,
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
    queryClient.invalidateQueries({ queryKey: ["manager-provider-stats"] });
    queryClient.invalidateQueries({ queryKey: ["manager-lead-stats"] });
    queryClient.invalidateQueries({ queryKey: ["manager-subscription-stats"] });
    queryClient.invalidateQueries({ queryKey: ["manager-team-stats"] });
    queryClient.invalidateQueries({ queryKey: ["manager-escalation-stats"] });
    queryClient.invalidateQueries({ queryKey: ["manager-placement-stats"] });
  }, [queryClient]);

  useEffect(() => {
    const channel = supabase
      .channel("manager-dashboard")
      .on("postgres_changes", { event: "*", schema: "public", table: "facilities" }, invalidateDashboard)
      .on("postgres_changes", { event: "*", schema: "public", table: "leads" }, invalidateDashboard)
      .on("postgres_changes", { event: "*", schema: "public", table: "admin_escalations" }, invalidateDashboard)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [invalidateDashboard]);

  // Team stats - Advisors & Customer Reps under management
  const { data: teamStats, isLoading: loadingTeam } = useQuery({
    queryKey: ["manager-team-stats"],
    queryFn: async () => {
      const { data: staff } = await supabase
        .from("admin_user_profiles")
        .select("admin_role, status, last_login_at, employment_type")
        .in("admin_role", ["advisor", "customer_rep"]);

      const advisors = staff?.filter(s => s.admin_role === "advisor") || [];
      const reps = staff?.filter(s => s.admin_role === "customer_rep") || [];
      const activeAdvisors = advisors.filter(a => a.status === "active").length;
      const activeReps = reps.filter(r => r.status === "active").length;

      // Recently active (logged in within 24h)
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const recentlyActive = staff?.filter(s => s.last_login_at && s.last_login_at > oneDayAgo).length || 0;

      return {
        totalAdvisors: advisors.length,
        activeAdvisors,
        totalReps: reps.length,
        activeReps,
        recentlyActive,
        totalStaff: (staff?.length || 0),
      };
    },
  });

  // Escalation stats
  const { data: escalationStats, isLoading: loadingEscalations } = useQuery({
    queryKey: ["manager-escalation-stats"],
    queryFn: async () => {
      const [open, inProgress, critical] = await Promise.all([
        supabase.from("admin_escalations").select("id", { count: "exact", head: true }).eq("status", "open"),
        supabase.from("admin_escalations").select("id", { count: "exact", head: true }).eq("status", "in_progress"),
        supabase.from("admin_escalations").select("id", { count: "exact", head: true }).eq("status", "open").eq("priority", "critical"),
      ]);
      return {
        open: open.count || 0,
        inProgress: inProgress.count || 0,
        critical: critical.count || 0,
      };
    },
  });

  // Placement pipeline stats
  const { data: placementStats, isLoading: loadingPlacements } = useQuery({
    queryKey: ["manager-placement-stats"],
    queryFn: async () => {
      const [active, matching, placed, thisMonth] = await Promise.all([
        supabase.from("concierge_inquiries").select("id", { count: "exact", head: true }).in("status", ["reviewing", "matching", "introductions_sent", "in_contact"]),
        supabase.from("concierge_inquiries").select("id", { count: "exact", head: true }).eq("status", "matching"),
        supabase.from("concierge_inquiries").select("id", { count: "exact", head: true }).eq("status", "placed"),
        supabase.from("concierge_inquiries").select("id", { count: "exact", head: true }).eq("status", "placed").gte("created_at", new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
      ]);
      return {
        activeCases: active.count || 0,
        matching: matching.count || 0,
        totalPlaced: placed.count || 0,
        placedThisMonth: thisMonth.count || 0,
      };
    },
  });

  // Revenue stats
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

  // Provider stats
  const { data: providerStats, isLoading: loadingProviders } = useQuery({
    queryKey: ["manager-provider-stats"],
    queryFn: async () => {
      const [total, approved, pending, featured] = await Promise.all([
        supabase.from("facilities").select("id", { count: "exact", head: true }),
        supabase.from("facilities").select("id", { count: "exact", head: true }).eq("status", "approved"),
        supabase.from("facilities").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("facilities").select("id", { count: "exact", head: true }).eq("featured", true),
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

  // Lead stats
  const { data: leadStats, isLoading: loadingLeads } = useQuery({
    queryKey: ["manager-lead-stats"],
    queryFn: async () => {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const [totalMonth, totalAll, verified, newLeads] = await Promise.all([
        supabase.from("leads").select("id", { count: "exact", head: true }).gte("created_at", startOfMonth.toISOString()),
        supabase.from("leads").select("id", { count: "exact", head: true }),
        supabase.from("leads").select("id", { count: "exact", head: true }).eq("email_verified", true).gte("created_at", startOfMonth.toISOString()),
        supabase.from("leads").select("id", { count: "exact", head: true }).eq("status", "new"),
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

  // Subscription stats
  const { data: subscriptionStats, isLoading: loadingSubs } = useQuery({
    queryKey: ["manager-subscription-stats"],
    queryFn: async () => {
      const [active, trial, canceled] = await Promise.all([
        supabase.from("pro_subscriptions").select("id", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("pro_subscriptions").select("id", { count: "exact", head: true }).eq("status", "trialing"),
        supabase.from("pro_subscriptions").select("id", { count: "exact", head: true }).eq("status", "canceled"),
      ]);
      return {
        active: active.count || 0,
        trial: trial.count || 0,
        canceled: canceled.count || 0,
      };
    },
  });

  const escalationCount = (escalationStats?.open || 0) + (escalationStats?.inProgress || 0);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center shadow-lg shrink-0">
          <Briefcase className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
        </div>
        <div className="min-w-0">
          <h1 className="text-lg sm:text-2xl font-semibold tracking-tight text-foreground truncate">Operations Dashboard</h1>
          <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">Team oversight, placements, escalations & platform metrics</p>
        </div>
      </div>

      {/* Primary KPIs - Team & Operations Focus */}
      <div className="grid gap-2 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        {/* Team Status */}
        <Card className="border-0 bg-primary text-primary-foreground shadow-md overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-1 sm:pb-2 space-y-0 p-3 sm:p-6">
            <CardTitle className="text-[10px] sm:text-sm font-medium opacity-90 truncate pr-1">Team Online</CardTitle>
            <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 opacity-70 shrink-0" />
          </CardHeader>
          <CardContent className="min-h-[40px] sm:min-h-[60px] p-3 pt-0 sm:p-6 sm:pt-0">
            {loadingTeam ? (
              <Skeleton className="h-6 sm:h-8 w-16 bg-white/20" />
            ) : (
              <>
                <div className="text-lg sm:text-2xl font-bold tabular-nums">{teamStats?.recentlyActive || 0}<span className="text-sm opacity-70">/{teamStats?.totalStaff || 0}</span></div>
                <p className="text-[9px] sm:text-xs opacity-70 mt-0.5">active in last 24h</p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Active Placements */}
        <Card className="border shadow-sm overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-1 sm:pb-2 space-y-0 p-3 sm:p-6">
            <CardTitle className="text-[10px] sm:text-sm font-medium text-muted-foreground truncate pr-1">Active Cases</CardTitle>
            <UserPlus className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground shrink-0" />
          </CardHeader>
          <CardContent className="min-h-[40px] sm:min-h-[60px] p-3 pt-0 sm:p-6 sm:pt-0">
            {loadingPlacements ? (
              <Skeleton className="h-6 sm:h-8 w-16" />
            ) : (
              <>
                <div className="text-lg sm:text-2xl font-bold tabular-nums">{placementStats?.activeCases}</div>
                <p className="text-[9px] sm:text-xs text-muted-foreground mt-0.5">{placementStats?.placedThisMonth} placed this month</p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Escalations */}
        <Card className={`border shadow-sm overflow-hidden ${escalationCount > 0 ? "border-warning/50 bg-warning/5" : ""}`}>
          <CardHeader className="flex flex-row items-center justify-between pb-1 sm:pb-2 space-y-0 p-3 sm:p-6">
            <CardTitle className="text-[10px] sm:text-sm font-medium text-muted-foreground truncate pr-1">Escalations</CardTitle>
            <AlertTriangle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground shrink-0" />
          </CardHeader>
          <CardContent className="min-h-[40px] sm:min-h-[60px] p-3 pt-0 sm:p-6 sm:pt-0">
            {loadingEscalations ? (
              <Skeleton className="h-6 sm:h-8 w-16" />
            ) : (
              <>
                <div className="text-lg sm:text-2xl font-bold tabular-nums">{escalationCount}</div>
                <div className="flex flex-wrap gap-1 mt-0.5">
                  {escalationStats?.critical ? (
                    <Badge variant="destructive" className="text-[8px] px-1 py-0">{escalationStats.critical} critical</Badge>
                  ) : null}
                  {escalationStats?.open ? (
                    <Badge variant="secondary" className="text-[8px] px-1 py-0">{escalationStats.open} open</Badge>
                  ) : null}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Revenue */}
        <Card className="border shadow-sm overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-1 sm:pb-2 space-y-0 p-3 sm:p-6">
            <CardTitle className="text-[10px] sm:text-sm font-medium text-muted-foreground truncate pr-1">Monthly Revenue</CardTitle>
            <DollarSign className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground shrink-0" />
          </CardHeader>
          <CardContent className="min-h-[40px] sm:min-h-[60px] p-3 pt-0 sm:p-6 sm:pt-0">
            {loadingRevenue ? (
              <Skeleton className="h-6 sm:h-8 w-20" />
            ) : (
              <>
                <div className="text-lg sm:text-2xl font-bold truncate tabular-nums">${revenueStats?.monthlyRevenue?.toLocaleString() || "0"}</div>
                <p className="text-[9px] sm:text-xs text-muted-foreground mt-0.5 flex items-center gap-0.5">
                  {revenueStats?.percentChange && revenueStats.percentChange >= 0 ? (
                    <TrendingUp className="h-2.5 w-2.5 shrink-0 text-success" />
                  ) : (
                    <TrendingDown className="h-2.5 w-2.5 shrink-0 text-destructive" />
                  )}
                  <span className="truncate">
                    {revenueStats?.percentChange ? `${revenueStats.percentChange >= 0 ? "+" : ""}${revenueStats.percentChange}%` : "—"} vs last
                  </span>
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Team Overview + Escalation Queue */}
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        {/* Team Overview */}
        <Card className="border shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-medium">Team Overview</CardTitle>
                <CardDescription>Advisors & Customer Reps under your oversight</CardDescription>
              </div>
              {hasPermission("users") && (
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/admin/users" className="text-xs">
                    Manage <ChevronRight className="h-3 w-3 ml-1" />
                  </Link>
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {loadingTeam ? (
              <div className="space-y-3">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <UserCheck className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Placement Advisors</span>
                      <span className="text-lg font-bold tabular-nums">{teamStats?.totalAdvisors}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-success/10 text-success">{teamStats?.activeAdvisors} active</Badge>
                      {(teamStats?.totalAdvisors || 0) - (teamStats?.activeAdvisors || 0) > 0 && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{(teamStats?.totalAdvisors || 0) - (teamStats?.activeAdvisors || 0)} inactive</Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border">
                  <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center">
                    <Headphones className="h-5 w-5 text-accent-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Customer Reps</span>
                      <span className="text-lg font-bold tabular-nums">{teamStats?.totalReps}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-success/10 text-success">{teamStats?.activeReps} active</Badge>
                      {(teamStats?.totalReps || 0) - (teamStats?.activeReps || 0) > 0 && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{(teamStats?.totalReps || 0) - (teamStats?.activeReps || 0)} inactive</Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Escalation Queue */}
        <Card className={`border shadow-sm ${escalationCount > 0 ? "border-warning/30" : ""}`}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  Escalation Queue
                  {escalationStats?.critical ? (
                    <Badge variant="destructive" className="text-[10px] px-1.5">{escalationStats.critical} critical</Badge>
                  ) : null}
                </CardTitle>
                <CardDescription>Issues from Advisors & Customer Reps needing resolution</CardDescription>
              </div>
              {hasPermission("escalations") && (
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/admin/escalations" className="text-xs">
                    View all <ChevronRight className="h-3 w-3 ml-1" />
                  </Link>
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {loadingEscalations ? (
              <Skeleton className="h-24 w-full" />
            ) : escalationCount === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No open escalations</p>
                <p className="text-xs">All issues resolved</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center p-3 rounded-lg bg-warning/10 border border-warning/20">
                    <div className="text-xl font-bold text-warning tabular-nums">{escalationStats?.open}</div>
                    <div className="text-[10px] text-muted-foreground">Open</div>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-info/10 border border-info/20">
                    <div className="text-xl font-bold text-info tabular-nums">{escalationStats?.inProgress}</div>
                    <div className="text-[10px] text-muted-foreground">In Progress</div>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                    <div className="text-xl font-bold text-destructive tabular-nums">{escalationStats?.critical}</div>
                    <div className="text-[10px] text-muted-foreground">Critical</div>
                  </div>
                </div>
                <RecentEscalationsList />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Placement Pipeline + Provider Status */}
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        {/* Placement Pipeline */}
        <Card className="border shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-medium">Placement Pipeline</CardTitle>
                <CardDescription>Current case distribution & outcomes</CardDescription>
              </div>
              {hasPermission("placements") && (
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/admin/concierge" className="text-xs">
                    View all <ChevronRight className="h-3 w-3 ml-1" />
                  </Link>
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {loadingPlacements ? (
              <Skeleton className="h-24 w-full" />
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                   <div className="text-center p-3 rounded-lg bg-primary/10 border border-primary/20">
                     <Clock className="h-4 w-4 text-primary mx-auto mb-1" />
                    <div className="text-lg font-bold tabular-nums">{placementStats?.activeCases}</div>
                    <div className="text-[10px] text-muted-foreground">Active Cases</div>
                  </div>
                   <div className="text-center p-3 rounded-lg bg-warning/10 border border-warning/20">
                     <Target className="h-4 w-4 text-warning mx-auto mb-1" />
                    <div className="text-lg font-bold tabular-nums">{placementStats?.matching}</div>
                    <div className="text-[10px] text-muted-foreground">Matching</div>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-success/10 border border-success/20">
                  <div className="flex items-center gap-2">
                    <UserPlus className="h-4 w-4 text-success" />
                    <span className="text-sm font-medium">Total Placed</span>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold tabular-nums text-success">{placementStats?.totalPlaced}</span>
                    <span className="text-xs text-muted-foreground ml-2">({placementStats?.placedThisMonth} this mo.)</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Provider Status */}
        <Card className="border shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-medium">Provider Status</CardTitle>
                <CardDescription>Approval and verification rates</CardDescription>
              </div>
              {hasPermission("providers") && (
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/admin/providers" className="text-xs">
                    View all <ChevronRight className="h-3 w-3 ml-1" />
                  </Link>
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {loadingProviders ? (
              <Skeleton className="h-24 w-full" />
            ) : (
              <>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium">Approved</span>
                    <span className="text-sm text-muted-foreground">{providerStats?.approvalRate}%</span>
                  </div>
                  <Progress value={providerStats?.approvalRate || 0} className="h-2" />
                </div>
                <div className="grid grid-cols-3 gap-3 pt-2">
                  <div className="text-center p-2 rounded-lg bg-success/10">
                    <div className="text-base font-bold text-success tabular-nums">{providerStats?.approved}</div>
                    <div className="text-[10px] text-muted-foreground">Approved</div>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-warning/10">
                    <div className="text-base font-bold text-warning tabular-nums">{providerStats?.pending}</div>
                    <div className="text-[10px] text-muted-foreground">Pending</div>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-primary/10">
                    <div className="text-base font-bold text-primary tabular-nums">{providerStats?.featured}</div>
                    <div className="text-[10px] text-muted-foreground">Featured</div>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Leads + Subscriptions */}
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        {/* Leads */}
        <Card className="border shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-medium">Lead Pipeline</CardTitle>
                <CardDescription>Monthly lead volume & verification</CardDescription>
              </div>
              {hasPermission("leads") && (
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/admin/leads" className="text-xs">
                    View all <ChevronRight className="h-3 w-3 ml-1" />
                  </Link>
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {loadingLeads ? (
              <Skeleton className="h-16 w-full" />
            ) : (
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-2 rounded-lg bg-muted/50 border">
                  <div className="text-lg font-bold tabular-nums">{leadStats?.totalMonth}</div>
                  <div className="text-[10px] text-muted-foreground">This Month</div>
                </div>
                <div className="text-center p-2 rounded-lg bg-success/10 border border-success/20">
                  <div className="text-lg font-bold text-success tabular-nums">{leadStats?.verificationRate}%</div>
                  <div className="text-[10px] text-muted-foreground">Verified</div>
                </div>
                <div className="text-center p-2 rounded-lg bg-info/10 border border-info/20">
                  <div className="text-lg font-bold text-info tabular-nums">{leadStats?.newLeads}</div>
                  <div className="text-[10px] text-muted-foreground">New</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Subscriptions */}
        <Card className="border shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-medium">Subscription Overview</CardTitle>
                <CardDescription>Active plans and billing status</CardDescription>
              </div>
              {hasPermission("subscriptions") && (
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/admin/subscriptions" className="text-xs">
                    View all <ChevronRight className="h-3 w-3 ml-1" />
                  </Link>
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {loadingSubs ? (
              <Skeleton className="h-16 w-full" />
            ) : (
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-2 rounded-lg bg-success/10 border border-success/20">
                  <CreditCard className="h-4 w-4 text-success mx-auto mb-1" />
                  <div className="text-lg font-bold text-success tabular-nums">{subscriptionStats?.active}</div>
                  <div className="text-[10px] text-muted-foreground">Active</div>
                </div>
                <div className="text-center p-2 rounded-lg bg-info/10 border border-info/20">
                  <Target className="h-4 w-4 text-info mx-auto mb-1" />
                  <div className="text-lg font-bold text-info tabular-nums">{subscriptionStats?.trial}</div>
                  <div className="text-[10px] text-muted-foreground">Trial</div>
                </div>
                <div className="text-center p-2 rounded-lg bg-muted/50 border">
                  <AlertCircle className="h-4 w-4 text-muted-foreground mx-auto mb-1" />
                  <div className="text-lg font-bold text-muted-foreground tabular-nums">{subscriptionStats?.canceled}</div>
                  <div className="text-[10px] text-muted-foreground">Canceled</div>
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
          {hasPermission("escalations") && escalationCount > 0 && (
            <Button variant="ghost" className="justify-start h-auto py-2.5 px-3 hover:bg-warning/10" asChild>
              <Link to="/admin/escalations">
                <AlertTriangle className="h-5 w-5 text-warning mr-3 shrink-0" />
                <div className="flex flex-col items-start min-w-0">
                  <span className="text-sm font-medium">Review Escalations</span>
                  <span className="text-xs text-muted-foreground">{escalationCount} need attention</span>
                </div>
              </Link>
            </Button>
          )}
          {hasPermission("placements") && (
            <Button variant="ghost" className="justify-start h-auto py-2.5 px-3 hover:bg-primary/10" asChild>
              <Link to="/admin/concierge">
                <UserPlus className="h-5 w-5 text-primary mr-3 shrink-0" />
                <div className="flex flex-col items-start min-w-0">
                  <span className="text-sm font-medium">Placement Center</span>
                  <span className="text-xs text-muted-foreground">{placementStats?.activeCases} active cases</span>
                </div>
              </Link>
            </Button>
          )}
          {hasPermission("providers") && providerStats?.pending && providerStats.pending > 0 && (
            <Button variant="ghost" className="justify-start h-auto py-2.5 px-3 hover:bg-warning/10" asChild>
              <Link to="/admin/providers?status=pending">
                <Building2 className="h-5 w-5 text-warning mr-3 shrink-0" />
                <div className="flex flex-col items-start min-w-0">
                  <span className="text-sm font-medium">Review Providers</span>
                  <span className="text-xs text-muted-foreground">{providerStats.pending} pending</span>
                </div>
              </Link>
            </Button>
          )}
          {hasPermission("leads") && (
            <Button variant="ghost" className="justify-start h-auto py-2.5 px-3 hover:bg-info/10" asChild>
              <Link to="/admin/leads">
                <Users className="h-5 w-5 text-info mr-3 shrink-0" />
                <div className="flex flex-col items-start min-w-0">
                  <span className="text-sm font-medium">Manage Leads</span>
                  <span className="text-xs text-muted-foreground">View all inquiries</span>
                </div>
              </Link>
            </Button>
          )}
          {hasPermission("support") && (
            <Button variant="ghost" className="justify-start h-auto py-2.5 px-3 hover:bg-accent/10" asChild>
              <Link to="/admin/support">
                 <Headphones className="h-5 w-5 text-accent-foreground mr-3 shrink-0" />
                <div className="flex flex-col items-start min-w-0">
                  <span className="text-sm font-medium">Support Inbox</span>
                  <span className="text-xs text-muted-foreground">Customer tickets</span>
                </div>
              </Link>
            </Button>
          )}
          {hasPermission("analytics") && (
            <Button variant="ghost" className="justify-start h-auto py-2.5 px-3 hover:bg-primary/10" asChild>
              <Link to="/admin/analytics">
                <BarChart3 className="h-5 w-5 text-primary mr-3 shrink-0" />
                <div className="flex flex-col items-start min-w-0">
                  <span className="text-sm font-medium">Analytics</span>
                  <span className="text-xs text-muted-foreground">Detailed reports</span>
                </div>
              </Link>
            </Button>
          )}
          {hasPermission("subscriptions") && (
            <Button variant="ghost" className="justify-start h-auto py-2.5 px-3 hover:bg-success/10" asChild>
              <Link to="/admin/subscriptions">
                <CreditCard className="h-5 w-5 text-success mr-3 shrink-0" />
                <div className="flex flex-col items-start min-w-0">
                  <span className="text-sm font-medium">Subscriptions</span>
                  <span className="text-xs text-muted-foreground">Billing & plans</span>
                </div>
              </Link>
            </Button>
          )}
          {hasPermission("reviews") && (
            <Button variant="ghost" className="justify-start h-auto py-2.5 px-3 hover:bg-warning/10" asChild>
              <Link to="/admin/reviews">
                 <Activity className="h-5 w-5 text-warning mr-3 shrink-0" />
                <div className="flex flex-col items-start min-w-0">
                  <span className="text-sm font-medium">Review Moderation</span>
                  <span className="text-xs text-muted-foreground">Pending reviews</span>
                </div>
              </Link>
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Team Performance Metrics */}
      <ManagerTeamPerformance />
    </div>
  );
}

// Inline sub-component: recent escalations with quick-resolve & assign
function RecentEscalationsList() {
  const queryClient = useQueryClient();
  const { user } = useAdminAuth();

  const { data: recentEscalations } = useQuery({
    queryKey: ["manager-recent-escalations"],
    queryFn: async () => {
      const { data } = await supabase
        .from("admin_escalations")
        .select("id, subject, priority, status, created_at, created_by, assigned_to")
        .in("status", ["open", "in_progress"])
        .order("created_at", { ascending: false })
        .limit(5);
      return data || [];
    },
  });

  const invalidateEscalations = () => {
    queryClient.invalidateQueries({ queryKey: ["manager-recent-escalations"] });
    queryClient.invalidateQueries({ queryKey: ["manager-escalation-stats"] });
  };

  const resolveMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("admin_escalations")
        .update({ status: "resolved", resolved_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Escalation resolved");
      invalidateEscalations();
    },
  });

  const assignMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!user?.id) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("admin_escalations")
        .update({ assigned_to: user.id, status: "in_progress" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Assigned to you");
      invalidateEscalations();
    },
  });

  const priorityColors: Record<string, string> = {
    low: "bg-muted text-muted-foreground",
    medium: "bg-warning/10 text-warning",
    high: "bg-destructive/10 text-destructive",
    critical: "bg-destructive text-destructive-foreground",
  };

  if (!recentEscalations || recentEscalations.length === 0) return null;

  return (
    <div className="space-y-2 pt-2 border-t">
      {recentEscalations.map((esc: any) => {
        const isAssignedToMe = esc.assigned_to === user?.id;
        return (
          <div key={esc.id} className="flex items-center justify-between p-2.5 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{esc.subject}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Badge variant="outline" className={`text-[10px] ${priorityColors[esc.priority] || ""}`}>{esc.priority}</Badge>
                {esc.status === "in_progress" && (
                  <Badge variant="outline" className="text-[10px] bg-info/10 text-info">In Progress</Badge>
                )}
                <span className="text-[10px] text-muted-foreground">
                  {new Date(esc.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1 ml-2 shrink-0">
              {!isAssignedToMe && esc.status === "open" && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => assignMutation.mutate(esc.id)}
                  disabled={assignMutation.isPending}
                >
                  Take
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-7"
                onClick={() => resolveMutation.mutate(esc.id)}
                disabled={resolveMutation.isPending}
              >
                Resolve
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
