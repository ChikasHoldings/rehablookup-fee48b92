import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAdminErrorHandler } from "@/hooks/useAdminErrorHandler";
import { SuperAdminActivityFeed } from "@/components/admin/dashboard/SuperAdminActivityFeed";
import SubscriptionActivityWidget from "@/components/admin/SubscriptionActivityWidget";
import LowCreditMonitorWidget from "@/components/admin/LowCreditMonitorWidget";
import {
  DashboardKPICards,
  DashboardChartsSection,
  LeadRedistributionCard,
  QuickActionsCard,
  TopCitiesCard,
  RecentLeadsCard,
} from "@/components/admin/dashboard";
import { Shield, Sparkles } from "lucide-react";

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
      .channel("dashboard-facilities-super")
      .on("postgres_changes", { event: "*", schema: "public", table: "facilities" }, invalidateDashboard)
      .subscribe();

    const leadsChannel = supabase
      .channel("dashboard-leads-super")
      .on("postgres_changes", { event: "*", schema: "public", table: "leads" }, invalidateDashboard)
      .subscribe();

    return () => {
      supabase.removeChannel(facilitiesChannel);
      supabase.removeChannel(leadsChannel);
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

  // Fetch providers stats with Pro/Placement breakdown
  const { data: providerStats, isLoading: loadingProviders } = useQuery({
    queryKey: ["admin-provider-stats"],
    queryFn: async () => {
      const [total, approved, pending, suspended, proSubs, placementFacilities] = await Promise.all([
        supabase.from("facilities").select("id", { count: "exact", head: true }),
        supabase.from("facilities").select("id", { count: "exact", head: true }).eq("status", "approved"),
        supabase.from("facilities").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("facilities").select("id", { count: "exact", head: true }).eq("suspended", true),
        supabase.from("pro_subscriptions").select("id", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("concierge_inquiries").select("placed_facility_id", { count: "exact", head: true }).not("placed_facility_id", "is", null).eq("placement_confirmed", true),
      ]);
      return {
        total: total.count || 0,
        approved: approved.count || 0,
        pending: pending.count || 0,
        suspended: suspended.count || 0,
        pro: proSubs.count || 0,
        placement: placementFacilities.count || 0,
        featured: proSubs.count || 0,
        verified: approved.count || 0,
      };
    },
  });

  // Fetch leads stats with unlock/revenue metrics
  const { data: leadStats, isLoading: loadingLeads } = useQuery({
    queryKey: ["admin-lead-stats"],
    queryFn: async () => {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const [totalMonth, totalAll, verified, newLeads, unlocksMonth, unlocksAll, unlockRevenueMonth] = await Promise.all([
        supabase.from("leads").select("id", { count: "exact", head: true }).gte("created_at", startOfMonth.toISOString()),
        supabase.from("leads").select("id", { count: "exact", head: true }),
        supabase.from("leads").select("id", { count: "exact", head: true }).eq("email_verified", true).gte("created_at", startOfMonth.toISOString()),
        supabase.from("leads").select("id", { count: "exact", head: true }).eq("status", "new"),
        supabase.from("lead_unlocks").select("id", { count: "exact", head: true }).gte("unlocked_at", startOfMonth.toISOString()),
        supabase.from("lead_unlocks").select("id", { count: "exact", head: true }),
        supabase.from("lead_unlocks").select("unlock_price_cents").gte("unlocked_at", startOfMonth.toISOString()),
      ]);

      const monthlyUnlockRevenue = unlockRevenueMonth.data?.reduce((sum, u) => sum + (u.unlock_price_cents || 0), 0) || 0;

      return {
        totalMonth: totalMonth.count || 0,
        totalAll: totalAll.count || 0,
        verified: verified.count || 0,
        verificationRate: totalMonth.count ? Math.round(((verified.count || 0) / totalMonth.count) * 100) : 0,
        newLeads: newLeads.count || 0,
        unlockedMonth: unlocksMonth.count || 0,
        unlockedAll: unlocksAll.count || 0,
        unlockRevenueMonth: monthlyUnlockRevenue,
        unlockRate: totalMonth.count ? Math.round(((unlocksMonth.count || 0) / totalMonth.count) * 100) : 0,
        assigned: unlocksAll.count || 0,
      };
    },
  });

  // Fetch redistribution stats
  const { data: redistStats } = useQuery({
    queryKey: ["admin-redistribution-stats"],
    queryFn: async () => {
      const [exclusive, extended, expired] = await Promise.all([
        supabase.from("leads").select("id", { count: "exact", head: true }).eq("redistribution_status", "exclusive"),
        supabase.from("leads").select("id", { count: "exact", head: true }).eq("redistribution_status", "extended"),
        supabase.from("leads").select("id", { count: "exact", head: true }).eq("redistribution_status", "expired"),
      ]);
      return {
        exclusive: exclusive.count || 0,
        extended: extended.count || 0,
        expired: expired.count || 0,
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

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shrink-0">
          <Shield className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <h1 className="text-lg sm:text-2xl font-semibold tracking-tight text-foreground truncate">Super Admin Dashboard</h1>
            <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-500 shrink-0" />
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">Full platform overview with all metrics and controls</p>
        </div>
      </div>

      {/* Primary KPIs */}
      <DashboardKPICards
        revenueStats={revenueStats}
        providerStats={providerStats}
        leadStats={leadStats}
        weeklyTrends={weeklyTrends}
        loadingRevenue={loadingRevenue}
        loadingProviders={loadingProviders}
        loadingLeads={loadingLeads}
      />

      {/* Charts Row */}
      <DashboardChartsSection
        providerStats={providerStats}
        leadStats={leadStats}
        subscriptionBreakdown={subscriptionBreakdown}
        loadingProviders={loadingProviders}
        loadingLeads={loadingLeads}
        loadingBreakdown={loadingRevenue}
      />

      {/* Lead Redistribution Stats */}
      <LeadRedistributionCard redistStats={redistStats} />

      {/* Quick Actions + Top Cities */}
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        <QuickActionsCard providerStats={providerStats} />
        <TopCitiesCard topCities={topCities} />
      </div>

      {/* Recent Leads + Activity Feed */}
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        <RecentLeadsCard recentLeads={recentLeads} />
        <SuperAdminActivityFeed />
      </div>

      {/* Subscription & Credit Widgets */}
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        <SubscriptionActivityWidget />
        <LowCreditMonitorWidget />
      </div>
    </div>
  );
}
