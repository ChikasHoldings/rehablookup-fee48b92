import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Eye, MousePointer, Users, TrendingUp, Star, ArrowUpRight, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useFacilitySubscription } from "@/hooks/useFacilitySubscription";

interface FeaturedAnalyticsWidgetProps {
  facilityId: string;
}

interface AnalyticsData {
  impressions: number;
  clicks: number;
  leads: number;
  ctr: number;
  conversionRate: number;
}

export function FeaturedAnalyticsWidget({ facilityId }: FeaturedAnalyticsWidgetProps) {
  const { data: subscription } = useFacilitySubscription(facilityId);
  const hasFeatured = subscription?.has_featured === true;

  const { data: analytics, isLoading, isError } = useQuery({
    queryKey: ["featured-analytics-provider", facilityId],
    queryFn: async (): Promise<AnalyticsData> => {
      // Get last 30 days of analytics
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const startDate = thirtyDaysAgo.toISOString().split("T")[0];

      const { data, error } = await supabase
        .from("featured_placement_analytics")
        .select("event_type, event_count")
        .eq("facility_id", facilityId)
        .gte("event_date", startDate);

      if (error) throw error;

      // Aggregate by event type
      const totals = {
        impression: 0,
        click: 0,
        lead_conversion: 0,
      };

      (data || []).forEach((row) => {
        if (row.event_type in totals) {
          totals[row.event_type as keyof typeof totals] += row.event_count;
        }
      });

      const impressions = totals.impression;
      const clicks = totals.click;
      const leads = totals.lead_conversion;
      const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
      const conversionRate = clicks > 0 ? (leads / clicks) * 100 : 0;

      return {
        impressions,
        clicks,
        leads,
        ctr,
        conversionRate,
      };
    },
    enabled: !!facilityId && hasFeatured,
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });

  // Hide the widget entirely for Pro users without the Featured add-on.
  // Showing a "Featured Performance" panel with all zeros is misleading.
  if (!hasFeatured) return null;

  if (isError) {
    return (
      <Card className="border-amber-200 bg-gradient-to-br from-amber-50/50 to-background dark:from-amber-950/20">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Star className="h-4 w-4 text-amber-500" />
            <CardTitle className="text-base">Featured Performance</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            Couldn't load Featured analytics. Refresh to retry.
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="border-amber-200 bg-gradient-to-br from-amber-50/50 to-background">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Star className="h-5 w-5 text-amber-500" />
            <CardTitle className="text-base">Featured Performance</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const metrics = [
    {
      label: "Impressions",
      value: analytics?.impressions ?? 0,
      icon: Eye,
      color: "text-blue-600",
      bgColor: "bg-blue-500/10",
    },
    {
      label: "Clicks",
      value: analytics?.clicks ?? 0,
      icon: MousePointer,
      color: "text-emerald-600",
      bgColor: "bg-emerald-500/10",
    },
    {
      label: "Leads",
      value: analytics?.leads ?? 0,
      icon: Users,
      color: "text-purple-600",
      bgColor: "bg-purple-500/10",
    },
    {
      label: "CTR",
      value: `${(analytics?.ctr ?? 0).toFixed(1)}%`,
      icon: TrendingUp,
      color: "text-amber-600",
      bgColor: "bg-amber-500/10",
    },
  ];

  return (
    <Card className="border-amber-200 bg-gradient-to-br from-amber-50/50 to-background dark:from-amber-950/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Star className="h-4 w-4 text-amber-500" />
            </div>
            <div>
              <CardTitle className="text-base">Featured Performance</CardTitle>
              <p className="text-xs text-muted-foreground">Last 30 days</p>
            </div>
          </div>
          <Badge variant="outline" className="border-amber-300 text-amber-700 bg-amber-50">
            Featured
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {metrics.map((metric) => (
            <div
              key={metric.label}
              className="flex flex-col items-center p-3 rounded-lg bg-muted/50"
            >
              <div className={`h-8 w-8 rounded-full ${metric.bgColor} flex items-center justify-center mb-2`}>
                <metric.icon className={`h-4 w-4 ${metric.color}`} />
              </div>
              <span className="text-lg font-bold text-foreground">{metric.value}</span>
              <span className="text-xs text-muted-foreground">{metric.label}</span>
            </div>
          ))}
        </div>

        {analytics && analytics.conversionRate > 0 && (
          <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
              <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                Conversion Rate
              </span>
            </div>
            <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
              {analytics.conversionRate.toFixed(1)}%
            </span>
          </div>
        )}

        <Button variant="ghost" size="sm" className="w-full text-muted-foreground" asChild>
          <Link to="/provider/analytics">
            View detailed analytics
            <ArrowUpRight className="h-3 w-3 ml-1" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
