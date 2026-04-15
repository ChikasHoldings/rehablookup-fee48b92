import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, subDays, startOfDay, eachDayOfInterval } from "date-fns";
import { Eye, Monitor, Phone, MousePointerClick, TrendingUp, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, CartesianGrid } from "recharts";
import type { Facility } from "../ProviderListItem";

interface ProviderAnalyticsTabProps {
  provider: Facility;
  providerFacilities: Facility[];
}

export function ProviderAnalyticsTab({ provider, providerFacilities }: ProviderAnalyticsTabProps) {
  const [dateRange, setDateRange] = useState("30");
  const facilityIds = providerFacilities?.map((f) => f.id) || [provider.id];

  const startDate = startOfDay(subDays(new Date(), parseInt(dateRange)));

  // Fetch all events in date range
  const { data: events } = useQuery({
    queryKey: ["admin-provider-analytics", provider.user_id, dateRange],
    queryFn: async () => {
      const { data } = await supabase
        .from("provider_events")
        .select("event_type, facility_id, created_at")
        .in("facility_id", facilityIds)
        .gte("created_at", startDate.toISOString())
        .order("created_at", { ascending: true });
      return data || [];
    },
  });

  // Fetch lead counts in date range
  const { data: leadData } = useQuery({
    queryKey: ["admin-provider-analytics-leads", provider.user_id, dateRange],
    queryFn: async () => {
      const { data } = await supabase
        .from("leads")
        .select("id, facility_id, created_at")
        .in("facility_id", facilityIds)
        .gte("created_at", startDate.toISOString());
      return data || [];
    },
  });

  // Fetch unlock counts
  const { data: unlockData } = useQuery({
    queryKey: ["admin-provider-analytics-unlocks", provider.user_id, dateRange],
    queryFn: async () => {
      const { data } = await supabase
        .from("lead_unlocks")
        .select("id, unlocked_at")
        .in("facility_id", facilityIds)
        .gte("unlocked_at", startDate.toISOString());
      return data || [];
    },
  });

  // Aggregate totals
  const totals = {
    impressions: events?.filter((e) => e.event_type === "listing_impression").length || 0,
    views: events?.filter((e) => e.event_type === "profile_view").length || 0,
    calls: events?.filter((e) => e.event_type === "click_to_call").length || 0,
    webClicks: events?.filter((e) => e.event_type === "website_click").length || 0,
    leads: leadData?.length || 0,
    unlocks: unlockData?.length || 0,
  };

  // Build daily chart data
  const days = eachDayOfInterval({ start: startDate, end: new Date() });
  const chartData = days.map((day) => {
    const dayStr = format(day, "yyyy-MM-dd");
    const dayEvents = events?.filter((e) => format(new Date(e.created_at), "yyyy-MM-dd") === dayStr) || [];
    const dayLeads = leadData?.filter((l) => format(new Date(l.created_at), "yyyy-MM-dd") === dayStr) || [];
    return {
      date: format(day, "MMM d"),
      impressions: dayEvents.filter((e) => e.event_type === "listing_impression").length,
      views: dayEvents.filter((e) => e.event_type === "profile_view").length,
      calls: dayEvents.filter((e) => e.event_type === "click_to_call").length,
      leads: dayLeads.length,
    };
  });

  const chartConfig = {
    impressions: { label: "Impressions", color: "hsl(var(--muted-foreground))" },
    views: { label: "Profile Views", color: "hsl(var(--primary))" },
    calls: { label: "Click-to-Call", color: "hsl(var(--chart-3))" },
    leads: { label: "Leads", color: "hsl(var(--chart-1))" },
  };

  // Per-facility breakdown
  const facilityBreakdown = facilityIds.map((fid) => {
    const fEvents = events?.filter((e) => e.facility_id === fid) || [];
    const fLeads = leadData?.filter((l) => l.facility_id === fid) || [];
    const name = providerFacilities?.find((f) => f.id === fid)?.name || "—";
    return {
      name,
      impressions: fEvents.filter((e) => e.event_type === "listing_impression").length,
      views: fEvents.filter((e) => e.event_type === "profile_view").length,
      calls: fEvents.filter((e) => e.event_type === "click_to_call").length,
      webClicks: fEvents.filter((e) => e.event_type === "website_click").length,
      leads: fLeads.length,
    };
  });

  return (
    <div className="p-6 space-y-6">
      {/* Date filter */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          Provider Analytics
        </h3>
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        <MetricCard icon={Eye} label="Impressions" value={totals.impressions} />
        <MetricCard icon={Monitor} label="Profile Views" value={totals.views} />
        <MetricCard icon={Phone} label="Click-to-Call" value={totals.calls} />
        <MetricCard icon={MousePointerClick} label="Website Clicks" value={totals.webClicks} />
        <MetricCard icon={Users} label="Leads" value={totals.leads} />
        <MetricCard icon={TrendingUp} label="Unlocks" value={totals.unlocks} />
      </div>

      {/* Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Activity Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[250px] w-full">
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} className="text-muted-foreground" />
              <YAxis tick={{ fontSize: 11 }} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area type="monotone" dataKey="impressions" stackId="1" stroke="hsl(var(--muted-foreground))" fill="hsl(var(--muted-foreground) / 0.1)" />
              <Area type="monotone" dataKey="views" stackId="1" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.1)" />
              <Area type="monotone" dataKey="calls" stackId="1" stroke="hsl(var(--chart-3))" fill="hsl(var(--chart-3) / 0.1)" />
              <Area type="monotone" dataKey="leads" stackId="1" stroke="hsl(var(--chart-1))" fill="hsl(var(--chart-1) / 0.1)" />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Facility Breakdown */}
      {providerFacilities && providerFacilities.length > 1 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Facility Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {facilityBreakdown.map((fb, idx) => (
                <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30">
                  <span className="text-sm font-medium truncate max-w-[200px]">{fb.name}</span>
                  <div className="flex gap-3 text-xs text-muted-foreground">
                    <span>{fb.impressions} impr.</span>
                    <span>{fb.views} views</span>
                    <span>{fb.calls} calls</span>
                    <span>{fb.webClicks} clicks</span>
                    <span>{fb.leads} leads</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function MetricCard({ icon: Icon, label, value }: { icon: any; label: string; value: number }) {
  return (
    <Card>
      <CardContent className="p-2.5 text-center">
        <Icon className="h-3.5 w-3.5 mx-auto mb-1 text-muted-foreground" />
        <p className="text-lg font-bold">{value}</p>
        <p className="text-[10px] text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}
