import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { Building2, Lock, TrendingUp, Eye, MessageSquare, Phone, Target, Crown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useProviderFacilities, type ProviderFacility } from "@/hooks/useProviderFacilities";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { startOfWeek, subWeeks, format, eachWeekOfInterval } from "date-fns";

interface DashboardFacilityPerformancePanelProps {
  isPro: boolean;
}

interface FacilityMetrics {
  facilityId: string;
  facilityName: string;
  leadsReceived: number;
  leadsUnlocked: number;
  conversionRate: number;
  contactAttempts: number;
  weeklyTrend: { week: string; leads: number; unlocked: number }[];
}

function useFacilityPerformanceMetrics(facilityId: string | undefined) {
  return useQuery({
    queryKey: ["facility-performance", facilityId],
    queryFn: async (): Promise<FacilityMetrics | null> => {
      if (!facilityId) return null;

      // Fetch facility name
      const { data: facility } = await supabase
        .from("facilities")
        .select("name")
        .eq("id", facilityId)
        .single();

      // Fetch leads
      const { data: leads } = await supabase
        .from("leads_provider_view")
        .select("id, status, created_at, is_unlocked, provider_response_status")
        .eq("facility_id", facilityId);

      // Fetch unlocks
      const { data: unlocks } = await supabase
        .from("lead_unlocks")
        .select("lead_id, created_at")
        .eq("facility_id", facilityId);

      const allLeads = leads || [];
      const allUnlocks = unlocks || [];
      const leadsReceived = allLeads.length;
      const leadsUnlocked = allUnlocks.length;
      const contactAttempts = allLeads.filter(
        l => l.provider_response_status && l.provider_response_status !== "pending"
      ).length;
      const conversionRate = leadsReceived > 0
        ? Math.round((leadsUnlocked / leadsReceived) * 100)
        : 0;

      // Build weekly trend (last 6 weeks)
      const now = new Date();
      const sixWeeksAgo = subWeeks(startOfWeek(now, { weekStartsOn: 1 }), 5);
      const weeks = eachWeekOfInterval(
        { start: sixWeeksAgo, end: now },
        { weekStartsOn: 1 }
      );

      const weeklyTrend = weeks.map(weekStart => {
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 7);
        const weekLabel = format(weekStart, "MMM d");

        const weekLeads = allLeads.filter(l => {
          const d = new Date(l.created_at);
          return d >= weekStart && d < weekEnd;
        }).length;

        const weekUnlocked = allUnlocks.filter(u => {
          const d = new Date(u.created_at);
          return d >= weekStart && d < weekEnd;
        }).length;

        return { week: weekLabel, leads: weekLeads, unlocked: weekUnlocked };
      });

      return {
        facilityId,
        facilityName: facility?.name || "Unknown",
        leadsReceived,
        leadsUnlocked,
        conversionRate,
        contactAttempts,
        weeklyTrend,
      };
    },
    enabled: !!facilityId,
    staleTime: 1000 * 60 * 5,
  });
}

function useAllFacilitiesComparison(facilityIds: string[]) {
  return useQuery({
    queryKey: ["facilities-comparison", facilityIds],
    queryFn: async () => {
      if (!facilityIds.length) return [];

      const results = await Promise.all(
        facilityIds.map(async fid => {
          const [{ data: facility }, { data: leads }, { data: unlocks }] = await Promise.all([
            supabase.from("facilities").select("name").eq("id", fid).single(),
            supabase.from("leads_provider_view").select("id").eq("facility_id", fid),
            supabase.from("lead_unlocks").select("lead_id").eq("facility_id", fid),
          ]);
          const name = facility?.name || "Unknown";
          const shortName = name.length > 16 ? name.slice(0, 14) + "…" : name;
          return {
            name: shortName,
            leads: (leads || []).length,
            unlocked: (unlocks || []).length,
          };
        })
      );
      return results.sort((a, b) => b.leads - a.leads);
    },
    enabled: facilityIds.length > 1,
    staleTime: 1000 * 60 * 5,
  });
}

export function DashboardFacilityPerformancePanel({ isPro }: DashboardFacilityPerformancePanelProps) {
  const { facilities } = useProviderFacilities();
  const [selectedFacilityId, setSelectedFacilityId] = useState<string | undefined>(
    facilities?.[0]?.id
  );

  React.useEffect(() => {
    if (!selectedFacilityId && facilities?.length) {
      setSelectedFacilityId(facilities[0].id);
    }
  }, [facilities, selectedFacilityId]);

  const facilityIds = (facilities || []).map(f => f.id);
  const { data: metrics, isLoading } = useFacilityPerformanceMetrics(
    isPro ? selectedFacilityId : undefined
  );
  const { data: comparison } = useAllFacilitiesComparison(
    isPro && facilityIds.length > 1 ? facilityIds : []
  );

  // Locked state for free users
  if (!isPro) {
    return (
      <Card className="relative overflow-hidden border-dashed border-muted-foreground/30">
        <CardContent className="p-6">
          <div className="absolute inset-0 bg-gradient-to-b from-background/60 to-background/90 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center text-center p-6">
            <div className="h-12 w-12 rounded-xl bg-amber-500/10 flex items-center justify-center mb-3">
              <Lock className="h-6 w-6 text-amber-500" />
            </div>
            <h3 className="text-sm font-bold text-foreground mb-1">
              Per-Facility Performance Tracking
            </h3>
            <p className="text-xs text-muted-foreground max-w-xs mb-3">
              See leads, conversions, and weekly trends for each facility. Compare performance across all locations.
            </p>
            <Button
              size="sm"
              className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-md"
              asChild
            >
              <Link to="/provider/pro-upgrade">
                <Crown className="h-3.5 w-3.5 mr-1.5" />
                Upgrade to Pro
              </Link>
            </Button>
          </div>
          {/* Blurred preview */}
          <div className="space-y-4 opacity-40 select-none pointer-events-none" aria-hidden>
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-semibold">Facility Performance</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {["Leads Received", "Leads Unlocked", "Conversion Rate", "Contact Attempts"].map(t => (
                <div key={t} className="rounded-md border p-2.5">
                  <p className="text-xs text-muted-foreground">{t}</p>
                  <p className="text-lg font-bold text-foreground mt-1">--</p>
                </div>
              ))}
            </div>
            <div className="h-[160px] rounded-lg bg-muted/20" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2 px-4 pt-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm font-semibold">Facility Performance</CardTitle>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-amber-500/10 text-amber-600 border-amber-200">
              PRO
            </Badge>
          </div>
          {(facilities?.length ?? 0) > 0 && (
            <Select value={selectedFacilityId} onValueChange={setSelectedFacilityId}>
              <SelectTrigger className="w-[200px] h-8 text-xs">
                <SelectValue placeholder="Select Facility" />
              </SelectTrigger>
              <SelectContent>
                {(facilities || []).map(f => (
                  <SelectItem key={f.id} value={f.id} className="text-xs">
                    {f.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-4">
        {isLoading ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-16 rounded-md" />)}
            </div>
            <Skeleton className="h-[180px] rounded-lg" />
          </div>
        ) : metrics ? (
          <>
            {/* KPI cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <MiniKPI icon={MessageSquare} label="Leads Received" value={metrics.leadsReceived} color="blue" />
              <MiniKPI icon={Eye} label="Leads Unlocked" value={metrics.leadsUnlocked} color="primary" />
              <MiniKPI icon={Target} label="Conversion Rate" value={`${metrics.conversionRate}%`} color="emerald" />
              <MiniKPI icon={Phone} label="Contact Attempts" value={metrics.contactAttempts} color="purple" />
            </div>

            {/* Weekly Trend Chart */}
            {metrics.weeklyTrend.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                  <TrendingUp className="h-3 w-3" /> Weekly Trend
                </p>
                <div className="h-[180px] rounded-lg border bg-muted/10 p-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={metrics.weeklyTrend} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                      <XAxis dataKey="week" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                          fontSize: "12px",
                          padding: "8px 12px",
                        }}
                      />
                      <Line type="monotone" dataKey="leads" name="Leads" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="unlocked" name="Unlocked" stroke="hsl(142, 71%, 45%)" strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </>
        ) : (
          <p className="text-xs text-muted-foreground text-center py-8">Select a facility to view performance.</p>
        )}

        {/* Comparison Chart (multi-facility) */}
        {comparison && comparison.length > 1 && (
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <Building2 className="h-3 w-3" /> Cross-Facility Comparison
            </p>
            <div className="h-[200px] rounded-lg border bg-muted/10 p-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={comparison} layout="vertical" margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} width={90} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                      padding: "8px 12px",
                    }}
                  />
                  <Bar dataKey="leads" name="Leads" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} barSize={12} />
                  <Bar dataKey="unlocked" name="Unlocked" fill="hsl(142, 71%, 45%)" radius={[0, 4, 4, 0]} barSize={12} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-center gap-4 mt-1">
              <LegendDot color="hsl(var(--primary))" label="Leads" />
              <LegendDot color="hsl(142, 71%, 45%)" label="Unlocked" />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ── Sub-components ── */

const KPI_COLORS: Record<string, { bg: string; text: string }> = {
  primary: { bg: "bg-primary/10", text: "text-primary" },
  blue: { bg: "bg-blue-500/10", text: "text-blue-600" },
  emerald: { bg: "bg-emerald-500/10", text: "text-emerald-600" },
  purple: { bg: "bg-purple-500/10", text: "text-purple-600" },
};

function MiniKPI({ icon: Icon, label, value, color }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
  color: string;
}) {
  const c = KPI_COLORS[color] || KPI_COLORS.primary;
  return (
    <div className="rounded-md border px-2.5 py-2 bg-card hover:shadow-sm transition-shadow">
      <div className="flex items-center gap-1.5 mb-1">
        <div className={cn("h-5 w-5 rounded flex items-center justify-center shrink-0", c.bg)}>
          <Icon className={cn("h-3 w-3", c.text)} />
        </div>
        <p className="text-[11px] text-muted-foreground font-medium truncate">{label}</p>
      </div>
      <p className="text-base font-bold text-foreground leading-none">
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1">
      <div className="h-2 w-2 rounded-sm" style={{ backgroundColor: color }} />
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}
