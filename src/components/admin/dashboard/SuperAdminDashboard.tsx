import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AdminWidgetBoundary } from "@/components/admin/AdminWidgetBoundary";
import { useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAdminErrorHandler } from "@/hooks/useAdminErrorHandler";
import { SuperAdminActivityFeed } from "@/components/admin/dashboard/SuperAdminActivityFeed";
import SubscriptionActivityWidget from "@/components/admin/SubscriptionActivityWidget";
import {
  DashboardKPICards,
  DashboardChartsSection,
  QuickActionsCard,
  TopCitiesCard,
  RecentLeadsCard,
  CriticalAlertsBanner,
  AddonAdoptionCard,
} from "@/components/admin/dashboard";
import { Button } from "@/components/ui/button";
import { Shield, Sparkles, AlertTriangle } from "lucide-react";

const PLAN_COLORS = {
  free: "hsl(215, 16%, 47%)",
  pro: "hsl(45, 93%, 47%)",
};

interface SubscriptionBreakdown {
  name: string;
  value: number;
  color: string;
}

interface RevenueStats {
  monthlyRevenue: number;
  previousMonthRevenue: number;
  percentChange: number;
  activeSubscriptions: number;
  totalCustomers: number;
  configured: boolean;
  subscriptionsByPlan?: {
    free: number;
    pro: number;
  };
}

export function SuperAdminDashboard() {
  const queryClient = useQueryClient();
  const { logError } = useAdminErrorHandler("SuperAdminDashboard");

  const invalidateDashboard = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["admin-provider-stats"] });
    queryClient.invalidateQueries({ queryKey: ["admin-lead-stats"] });
    queryClient.invalidateQueries({ queryKey: ["admin-top-cities"] });
    queryClient.invalidateQueries({ queryKey: ["admin-recent-leads"] });
    queryClient.invalidateQueries({ queryKey: ["admin-revenue-stats"] });
    queryClient.invalidateQueries({ queryKey: ["admin-weekly-trends"] });
  }, [queryClient]);

  useEffect(() => {
    const facilitiesChannel = supabase
      .channel(`dashboard-facilities-super-${Math.random().toString(36).slice(2,8)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "facilities" }, invalidateDashboard)
      .subscribe();

    // Poll for leads data every 60 seconds (leads removed from Realtime for PII security)
    const leadsInterval = setInterval(invalidateDashboard, 60000);

    return () => {
      supabase.removeChannel(facilitiesChannel);
      clearInterval(leadsInterval);
    };
  }, [invalidateDashboard]);

  // Fetch revenue stats (single call, also produces subscription breakdown)
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

  // Derive subscription breakdown from revenueStats (no duplicate API call)
  const subscriptionBreakdown: SubscriptionBreakdown[] = revenueStats?.subscriptionsByPlan
    ? [
        { name: "Free", value: revenueStats.subscriptionsByPlan.free || 0, color: PLAN_COLORS.free },
        { name: "Pro", value: revenueStats.subscriptionsByPlan.pro || 0, color: PLAN_COLORS.pro },
      ]
    : [
        { name: "Free", value: 0, color: PLAN_COLORS.free },
        { name: "Pro", value: 0, color: PLAN_COLORS.pro },
      ];

  // Fetch weekly trends
  const { data: weeklyTrends } = useQuery({
    queryKey: ["admin-weekly-trends"],
    queryFn: async () => {
      const days = 7;
      const now = new Date();
      const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
      
      const [{ data: leadsData }, { data: facilitiesData }] = await Promise.all([
        supabase
          .from("leads")
          .select("created_at")
          .gte("created_at", startDate.toISOString())
          .order("created_at", { ascending: true }),
        supabase
          .from("facilities")
          .select("created_at")
          .gte("created_at", startDate.toISOString())
          .order("created_at", { ascending: true }),
      ]);
      
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

  // Directory account stats. The retired "placement" breakdown (confirmed
  // placements from concierge_inquiries) was removed in the Stage-3 cutover
  // and replaced with the Featured add-on count, which is a live product.
  const { data: providerStats, isLoading: loadingProviders } = useQuery({
    queryKey: ["admin-provider-stats"],
    queryFn: async () => {
      const [total, approved, pending, suspended, proSubs, featuredSubs] = await Promise.all([
        supabase.from("facilities").select("id", { count: "exact", head: true }),
        supabase.from("facilities").select("id", { count: "exact", head: true }).eq("status", "approved"),
        supabase.from("facilities").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("facilities").select("id", { count: "exact", head: true }).eq("suspended", true),
        supabase.from("facility_subscriptions").select("id", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("facility_subscriptions").select("id", { count: "exact", head: true }).eq("status", "active").eq("has_featured", true),
      ]);
      return {
        total: total.count || 0,
        approved: approved.count || 0,
        pending: pending.count || 0,
        suspended: suspended.count || 0,
        pro: proSubs.count || 0,
        featured: featuredSubs.count || 0,
        verified: approved.count || 0,
      };
    },
    staleTime: 2 * 60 * 1000,
  });

  // Inquiry-volume stats. Every inquiry is pinned to the facility the seeker
  // selected, so there is nothing to count for matching, assignment, or
  // redistribution — only how many arrived and how many are still untriaged.
  const { data: leadStats, isLoading: loadingLeads } = useQuery({
    queryKey: ["admin-lead-stats"],
    queryFn: async () => {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const [totalMonth, totalAll, newLeads] = await Promise.all([
        supabase.from("leads").select("id", { count: "exact", head: true }).gte("created_at", startOfMonth.toISOString()),
        supabase.from("leads").select("id", { count: "exact", head: true }),
        supabase.from("leads").select("id", { count: "exact", head: true }).eq("status", "new"),
      ]);

      return {
        totalMonth: totalMonth.count || 0,
        totalAll: totalAll.count || 0,
        newLeads: newLeads.count || 0,
      };
    },
    staleTime: 2 * 60 * 1000,
  });
  // Lead redistribution monetization was retired in the EKRA flat-fee
  // refactor (we no longer sell leads). The corresponding KPI card +
  // query were removed 2026-05-21. The `leads.redistribution_status`
  // column still exists for historical row tagging but no UI surfaces
  // it on the dashboard.
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
    staleTime: 5 * 60 * 1000,
  });
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
    staleTime: 60 * 1000,
  });
  // Fetch critical escalations for alert banner
  const { data: criticalEscalations } = useQuery({
    queryKey: ["admin-critical-escalations"],
    queryFn: async () => {
      const [critical, totalOpen] = await Promise.all([
        supabase.from("admin_escalations").select("id, subject, created_at").eq("status", "open").eq("priority", "critical").order("created_at", { ascending: false }).limit(3),
        supabase.from("admin_escalations").select("id", { count: "exact", head: true }).in("status", ["open", "in_progress"]),
      ]);
      return { critical: critical.data || [], criticalCount: critical.data?.length || 0, totalOpen: totalOpen.count || 0 };
    },
    staleTime: 60 * 1000,
  });

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Priority admin-notification alerts — crisis intakes, no-match
          concierge cases, retired-product webhooks, Free-tier notify
          failures. Renders only when there are unread alerts to show. */}
      <AdminWidgetBoundary name="Critical Alerts">
        <CriticalAlertsBanner />
      </AdminWidgetBoundary>

      {/* Critical Escalation Alert */}
      {criticalEscalations && criticalEscalations.criticalCount > 0 && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-sm font-semibold text-destructive">{criticalEscalations.criticalCount} Critical Escalation{criticalEscalations.criticalCount > 1 ? "s" : ""}</p>
                <p className="text-xs text-muted-foreground">{criticalEscalations.totalOpen} total open · Needs immediate attention</p>
              </div>
            </div>
            <Button variant="destructive" size="sm" asChild>
              <Link to="/admin/escalations">Review Now</Link>
            </Button>
          </div>
          {criticalEscalations.critical.length > 0 && (
            <div className="mt-3 space-y-1.5 border-t border-destructive/20 pt-3">
              {criticalEscalations.critical.map((esc) => (
                <div key={esc.id} className="flex items-center gap-2 text-xs">
                  <span className="h-1.5 w-1.5 rounded-full bg-destructive flex-shrink-0" />
                  <span className="font-medium truncate">{esc.subject}</span>
                  <span className="text-muted-foreground ml-auto flex-shrink-0">{new Date(esc.created_at).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {/* Header */}
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg shrink-0">
          <Shield className="h-4 w-4 sm:h-5 sm:w-5 text-primary-foreground" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <h1 className="text-lg sm:text-2xl font-semibold tracking-tight text-foreground truncate">Super Admin Dashboard</h1>
            <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary shrink-0" />
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">Full platform overview with all metrics and controls</p>
        </div>
      </div>

      {/* Primary KPIs */}
      <AdminWidgetBoundary name="KPI Cards">
        <DashboardKPICards
          revenueStats={revenueStats}
          providerStats={providerStats}
          leadStats={leadStats}
          weeklyTrends={weeklyTrends}
          loadingRevenue={loadingRevenue}
          loadingProviders={loadingProviders}
          loadingLeads={loadingLeads}
        />
      </AdminWidgetBoundary>

      {/* Charts Row */}
      <AdminWidgetBoundary name="Charts">
        <DashboardChartsSection
          providerStats={providerStats}
          leadStats={leadStats}
          subscriptionBreakdown={subscriptionBreakdown}
          loadingProviders={loadingProviders}
          loadingLeads={loadingLeads}
          loadingBreakdown={loadingRevenue}
        />
      </AdminWidgetBoundary>

      {/* Quick Actions + Top Cities */}
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        <AdminWidgetBoundary name="Quick Actions">
          <QuickActionsCard providerStats={providerStats} />
        </AdminWidgetBoundary>
        <AdminWidgetBoundary name="Top Cities">
          <TopCitiesCard topCities={topCities} />
        </AdminWidgetBoundary>
      </div>

      {/* Recent Leads + Activity Feed */}
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        <AdminWidgetBoundary name="Recent Leads">
          <RecentLeadsCard recentLeads={recentLeads} />
        </AdminWidgetBoundary>
        <AdminWidgetBoundary name="Activity Feed">
          <SuperAdminActivityFeed />
        </AdminWidgetBoundary>
      </div>

      {/* Subscription activity + add-on adoption (Pro / Featured). */}
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        <AdminWidgetBoundary name="Subscriptions">
          <SubscriptionActivityWidget />
        </AdminWidgetBoundary>
        <AdminWidgetBoundary name="Addon Adoption">
          <AddonAdoptionCard />
        </AdminWidgetBoundary>
      </div>
    </div>
  );
}
