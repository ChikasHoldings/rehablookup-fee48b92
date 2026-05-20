import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { 
  Eye, 
  MousePointerClick, 
  Users, 
  TrendingUp, 
  DollarSign,
  Calendar,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Info,
  Target,
  Percent
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
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
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
type DateRange = "7d" | "30d" | "90d";

type FacilityMetrics = {
  facility_id: string;
  facility_name: string;
  impressions: number;
  clicks: number;
  leads: number;
  ctr: number;
  conversion_rate: number;
};

export function FeaturedAnalyticsDashboard() {
  const queryClient = useQueryClient();
  const [dateRange, setDateRange] = useState<DateRange>("30d");

  const getDaysFromRange = (range: DateRange) => {
    switch (range) {
      case "7d": return 7;
      case "30d": return 30;
      case "90d": return 90;
    }
  };

  // Real-time subscriptions for live updates
  useEffect(() => {
    const analyticsChannel = supabase
      .channel("featured-analytics-updates")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "featured_placement_analytics" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["featured-analytics", dateRange] });
        }
      )
      .subscribe();

    // Poll for leads data every 60 seconds (leads removed from Realtime for PII security)
    const leadsInterval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ["featured-analytics", dateRange] });
    }, 60000);

    const viewsChannel = supabase
      .channel("featured-provider-events-updates")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "provider_events" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["featured-analytics", dateRange] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(analyticsChannel);
      clearInterval(leadsInterval);
      supabase.removeChannel(viewsChannel);
    };
  }, [queryClient, dateRange]);

  // Fetch analytics data. Every Supabase / edge-fn call now checks
  // `error` (and edge-fn payload `data.error`) so a failure stops
  // the aggregation instead of silently rendering zeros across the
  // KPI strip.
  const { data: analytics, isLoading, isError, error: analyticsError } = useQuery({
    queryKey: ["featured-analytics", dateRange],
    queryFn: async () => {
      const days = getDaysFromRange(dateRange);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      const startDateStr = startDate.toISOString().split("T")[0];

      // Fetch Pro subscriber facilities
      const { data: featuredResponse, error: featuredErr } = await supabase.functions.invoke("get-featured-facilities");
      if (featuredErr) throw featuredErr;
      if (featuredResponse && typeof featuredResponse === "object" && "error" in featuredResponse && (featuredResponse as { error: unknown }).error) {
        throw new Error(String((featuredResponse as { error: unknown }).error));
      }
      const featuredIds: string[] = featuredResponse?.proFacilityIds || [];

      if (featuredIds.length === 0) {
        return {
          totalImpressions: 0,
          totalClicks: 0,
          totalLeads: 0,
          avgCTR: 0,
          avgConversion: 0,
          estimatedRevenue: 0,
          facilityMetrics: [],
          avgLeadsPerProvider: 0,
          topPerformer: null,
          subscriberCount: 0,
          impressionsAreMeasured: true,
        };
      }

      // Fetch analytics events
      const { data: analyticsData, error: analyticsErr } = await supabase
        .from("featured_placement_analytics")
        .select("id, facility_id, event_date, event_type, event_count, metadata")
        .in("facility_id", featuredIds)
        .gte("event_date", startDateStr);
      if (analyticsErr) throw analyticsErr;

      // Fetch facility profile views from provider_events (excludes impressions)
      const { data: viewsData, error: viewsErr } = await supabase
        .from("provider_events")
        .select("facility_id")
        .in("facility_id", featuredIds)
        .eq("event_type", "profile_view")
        .gte("created_at", startDate.toISOString());
      if (viewsErr) throw viewsErr;

      // Fetch leads for conversions
      const { data: leadsData, error: leadsErr } = await supabase
        .from("leads")
        .select("facility_id")
        .in("facility_id", featuredIds)
        .gte("created_at", startDate.toISOString());
      if (leadsErr) throw leadsErr;

      // Fetch facility names
      const { data: facilities, error: facilitiesErr } = await supabase
        .from("facilities")
        .select("id, name")
        .in("id", featuredIds);
      if (facilitiesErr) throw facilitiesErr;

      const facilityNames = new Map(facilities?.map(f => [f.id, f.name]) || []);

      // Aggregate metrics per facility
      const metricsMap = new Map<string, FacilityMetrics>();

      featuredIds.forEach((id: string) => {
        metricsMap.set(id, {
          facility_id: id,
          facility_name: facilityNames.get(id) || "Unknown",
          impressions: 0,
          clicks: 0,
          leads: 0,
          ctr: 0,
          conversion_rate: 0,
        });
      });

      // Process analytics events
      analyticsData?.forEach(event => {
        const metrics = metricsMap.get(event.facility_id);
        if (metrics) {
          if (event.event_type === "impression") {
            metrics.impressions += event.event_count;
          } else if (event.event_type === "click") {
            metrics.clicks += event.event_count;
          }
        }
      });

      // Use provider_events as click proxy if no click data
      viewsData?.forEach(view => {
        const metrics = metricsMap.get(view.facility_id);
        if (metrics && metrics.clicks === 0) {
          metrics.clicks += 1;
        }
      });

      // Count leads
      leadsData?.forEach(lead => {
        if (lead.facility_id) {
          const metrics = metricsMap.get(lead.facility_id);
          if (metrics) {
            metrics.leads += 1;
          }
        }
      });

      // Track whether *any* facility has real impression data so the
      // UI can disclose when CTR is based on the fallback estimate
      // instead of measured rows. Previously the page silently
      // inflated impressions with a hardcoded 50/day fudge that
      // distorted every downstream KPI (CTR especially).
      let anyMeasuredImpression = false;
      metricsMap.forEach((metrics) => {
        if (metrics.impressions > 0) anyMeasuredImpression = true;
      });

      // Calculate rates. Estimated-impression fallback only runs if
      // NO real data exists at all — otherwise we trust measured rows.
      // The estimate is clearly labeled in the UI when it kicks in.
      const useEstimate = !anyMeasuredImpression;
      metricsMap.forEach(metrics => {
        if (useEstimate && metrics.impressions === 0) {
          // 6 default homepage slots * ~daily impressions per slot
          metrics.impressions = Math.round(days * 50);
        }
        metrics.ctr = metrics.impressions > 0
          ? (metrics.clicks / metrics.impressions) * 100
          : 0;
        metrics.conversion_rate = metrics.clicks > 0
          ? (metrics.leads / metrics.clicks) * 100
          : 0;
      });

      const facilityMetrics = Array.from(metricsMap.values()).sort(
        (a, b) => b.leads - a.leads
      );

      // Calculate totals
      const totalImpressions = facilityMetrics.reduce((sum, m) => sum + m.impressions, 0);
      const totalClicks = facilityMetrics.reduce((sum, m) => sum + m.clicks, 0);
      const totalLeads = facilityMetrics.reduce((sum, m) => sum + m.leads, 0);
      const avgCTR = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
      const avgConversion = totalClicks > 0 ? (totalLeads / totalClicks) * 100 : 0;
      
      // Estimate Featured Add-On MRR: $599/mo per active Featured subscriber
      // (canonical pricing — see _shared/featured-addon.ts and the marketing
      // pages). Monthly figure; annualize by multiplying by 12 if needed.
      const estimatedRevenue = featuredIds.length * 599;

      // Calculate comparison metrics
      const avgLeadsPerProvider = featuredIds.length > 0 ? totalLeads / featuredIds.length : 0;
      const topPerformer = facilityMetrics.length > 0 ? facilityMetrics[0] : null;

      return {
        totalImpressions,
        totalClicks,
        totalLeads,
        avgCTR,
        avgConversion,
        estimatedRevenue,
        facilityMetrics,
        avgLeadsPerProvider,
        topPerformer,
        subscriberCount: featuredIds.length,
        impressionsAreMeasured: !useEstimate,
      };
    },
    staleTime: 1000 * 60 * 2, // 2 min stale time for faster updates
    refetchOnWindowFocus: true,
  });

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["featured-analytics", dateRange] });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (isError) {
    return (
      <Alert className="bg-destructive/10 border-destructive/30" role="alert">
        <Info className="h-4 w-4 text-destructive" />
        <AlertDescription className="text-destructive flex items-center justify-between gap-3">
          <span>Failed to load featured analytics: {analyticsError instanceof Error ? analyticsError.message : "Unknown error"}</span>
          <Button size="sm" variant="outline" onClick={handleRefresh} aria-label="Retry loading featured analytics">
            <RefreshCw className="h-4 w-4 mr-1" /> Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  const data = analytics || {
    totalImpressions: 0,
    totalClicks: 0,
    totalLeads: 0,
    avgCTR: 0,
    avgConversion: 0,
    estimatedRevenue: 0,
    facilityMetrics: [],
    avgLeadsPerProvider: 0,
    topPerformer: null,
    subscriberCount: 0,
    impressionsAreMeasured: true,
  };

  return (
    <div className="space-y-6">
      {/* Info Alert */}
      <Alert className="bg-emerald-50 border-emerald-200">
        <Info className="h-4 w-4 text-emerald-600" />
        <AlertDescription className="text-emerald-800">
          Analytics tracks impressions, clicks, and conversions for Pro subscribers.
          Data updates in real-time as users interact with featured listings.
        </AlertDescription>
      </Alert>

      {/* Estimated-impressions disclosure — fires only when no
          impression events exist in the window, so the page falls
          back to a 50/day-per-facility estimate. Without this banner
          admins could mistake the estimate for measured data. */}
      {data.subscriberCount > 0 && !data.impressionsAreMeasured && (
        <Alert className="bg-amber-50 border-amber-200" role="status">
          <Info className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            <strong>Impressions are estimated</strong> — no impression events were
            tracked in this period, so impressions and CTR are derived from a
            50/day-per-facility baseline. Click counts, lead counts, and conversion
            rates are measured from real events.
          </AlertDescription>
        </Alert>
      )}

      {/* Header with date range selector and refresh */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
            <BarChart3 className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">Featured Placement Analytics</h3>
            <p className="text-sm text-muted-foreground">
              Track performance metrics for {data.subscriberCount} Pro subscriber{data.subscriberCount !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            className="gap-2"
            aria-label="Refresh featured analytics"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
          <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRange)}>
            <SelectTrigger className="w-[140px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
              <SelectItem value="90d">Last 90 Days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPI Cards */}
      <TooltipProvider>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1">
                    <p className="text-sm font-medium text-muted-foreground">Impressions</p>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-3 w-3 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Number of times featured listings were shown on the homepage</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <p className="text-2xl font-bold">{data.totalImpressions.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground mt-1">Homepage views</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <Eye className="h-5 w-5 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1">
                    <p className="text-sm font-medium text-muted-foreground">Profile Clicks</p>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-3 w-3 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Users who clicked through to view provider profiles</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <p className="text-2xl font-bold">{data.totalClicks.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground mt-1">Click-throughs</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                  <MousePointerClick className="h-5 w-5 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1">
                    <p className="text-sm font-medium text-muted-foreground">Leads Generated</p>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-3 w-3 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Total leads submitted to featured providers</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <p className="text-2xl font-bold">{data.totalLeads.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground mt-1">Conversions</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                  <Users className="h-5 w-5 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1">
                    <p className="text-sm font-medium text-muted-foreground">Avg CTR</p>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-3 w-3 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Click-through rate: clicks / impressions × 100</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <p className="text-2xl font-bold">{data.avgCTR.toFixed(1)}%</p>
                  <div className="flex items-center gap-1 mt-1">
                    {data.avgCTR >= 2 ? (
                      <ArrowUpRight className="h-3 w-3 text-green-600" />
                    ) : (
                      <ArrowDownRight className="h-3 w-3 text-red-600" />
                    )}
                    <span className={`text-xs ${data.avgCTR >= 2 ? "text-green-600" : "text-red-600"}`}>
                      {data.avgCTR >= 2 ? "Good" : "Below avg"}
                    </span>
                  </div>
                </div>
                <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1">
                    <p className="text-sm font-medium text-muted-foreground">Conv. Rate</p>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-3 w-3 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Conversion rate: leads / clicks × 100</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <p className="text-2xl font-bold">{data.avgConversion.toFixed(1)}%</p>
                  <div className="flex items-center gap-1 mt-1">
                    {data.avgConversion >= 5 ? (
                      <ArrowUpRight className="h-3 w-3 text-green-600" />
                    ) : (
                      <ArrowDownRight className="h-3 w-3 text-amber-600" />
                    )}
                    <span className={`text-xs ${data.avgConversion >= 5 ? "text-green-600" : "text-amber-600"}`}>
                      {data.avgConversion >= 5 ? "Strong" : "Average"}
                    </span>
                  </div>
                </div>
                <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                  <Target className="h-5 w-5 text-indigo-600" />
                </div>
              </div>
            </CardContent>
          </Card>

        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-emerald-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-emerald-700">Monthly Revenue</p>
                <p className="text-2xl font-bold text-emerald-900">
                  ${data.estimatedRevenue.toLocaleString()}
                </p>
                <p className="text-xs text-emerald-600 mt-1">From Pro subscriptions</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-emerald-200 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-emerald-700" />
              </div>
            </div>
          </CardContent>
        </Card>
        </div>
      </TooltipProvider>

      {/* Performance Breakdown Table */}
      <Card>
        <CardHeader>
          <CardTitle>Provider Performance Breakdown</CardTitle>
          <CardDescription>
            Individual metrics for each Pro subscriber
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.facilityMetrics.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No Pro subscribers to display</p>
              <p className="text-sm mt-1">Analytics will appear when providers upgrade to Pro</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Provider</TableHead>
                  <TableHead className="text-right">Impressions</TableHead>
                  <TableHead className="text-right">Clicks</TableHead>
                  <TableHead className="text-right">CTR</TableHead>
                  <TableHead className="text-right">Leads</TableHead>
                  <TableHead className="text-right">Conv. Rate</TableHead>
                  <TableHead>Performance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.facilityMetrics.map((metrics) => (
                  <TableRow key={metrics.facility_id}>
                    <TableCell className="font-medium">{metrics.facility_name}</TableCell>
                    <TableCell className="text-right">{metrics.impressions.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{metrics.clicks.toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                      <Badge 
                        variant="outline" 
                        className={
                          metrics.ctr >= 3 
                            ? "text-green-600 border-green-200 bg-green-50" 
                            : metrics.ctr >= 1.5 
                            ? "text-amber-600 border-amber-200 bg-amber-50"
                            : "text-red-600 border-red-200 bg-red-50"
                        }
                      >
                        {metrics.ctr.toFixed(1)}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-semibold text-green-600">
                      {metrics.leads}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge 
                        variant="outline"
                        className={
                          metrics.conversion_rate >= 10 
                            ? "text-green-600 border-green-200 bg-green-50" 
                            : metrics.conversion_rate >= 5 
                            ? "text-amber-600 border-amber-200 bg-amber-50"
                            : "text-slate-600 border-slate-200"
                        }
                      >
                        {metrics.conversion_rate.toFixed(1)}%
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="w-24">
                        <Progress 
                          value={Math.min(100, (metrics.leads / Math.max(1, data.totalLeads / data.facilityMetrics.length)) * 50)} 
                          className="h-2"
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* ROI Summary */}
      <Card className="border-emerald-200 bg-gradient-to-r from-emerald-50/50 to-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-emerald-600" />
            ROI Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-3">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Cost Per Lead</p>
              <p className="text-2xl font-bold">
                ${data.totalLeads > 0 
                  ? Math.round(data.estimatedRevenue / data.totalLeads)
                  : "—"}
              </p>
              <p className="text-xs text-muted-foreground">Based on {dateRange === "30d" ? "monthly" : dateRange} revenue</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Cost Per Click</p>
              <p className="text-2xl font-bold">
                ${data.totalClicks > 0 
                  ? (data.estimatedRevenue / data.totalClicks).toFixed(2)
                  : "—"}
              </p>
              <p className="text-xs text-muted-foreground">Profile visit cost</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Lead Value Estimate</p>
              <p className="text-2xl font-bold text-emerald-600">
                {data.totalLeads > 0 
                  ? `$${Math.round((data.estimatedRevenue / data.totalLeads) * 0.3).toLocaleString()}`
                  : "—"}
              </p>
              <p className="text-xs text-muted-foreground">Estimated value at 30% conversion</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
