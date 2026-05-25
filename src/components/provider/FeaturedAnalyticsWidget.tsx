import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Eye, Phone, TrendingUp, Star, ArrowUpRight, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useFacilitySubscription } from "@/hooks/useFacilitySubscription";

interface FeaturedAnalyticsWidgetProps {
  facilityId: string;
}

interface AnalyticsData {
  impressions: number;
  calls: number;
  callRate: number;
}

export function FeaturedAnalyticsWidget({ facilityId }: FeaturedAnalyticsWidgetProps) {
  const { data: subscription } = useFacilitySubscription(facilityId);
  const hasFeatured = subscription?.has_featured === true;

  const { data: analytics, isLoading, isError } = useQuery({
    queryKey: ["featured-analytics-provider", facilityId],
    queryFn: async (): Promise<AnalyticsData> => {
      const since = new Date();
      since.setDate(since.getDate() - 30);
      const sinceIso = since.toISOString();

      // Read the tables the public Featured surfaces actually write to (and
      // that admin analytics reads): featured_impressions (occurred_at) and
      // featured_phone_clicks (clicked_at). The old featured_placement_analytics
      // table only ever received card "click" events — never impressions or
      // lead_conversion — so this widget's headline metrics were structurally
      // always zero. RLS scopes both tables to the facility owner.
      const [impRes, callRes] = await Promise.all([
        supabase
          .from("featured_impressions")
          .select("id", { count: "exact", head: true })
          .eq("facility_id", facilityId)
          .gte("occurred_at", sinceIso),
        supabase
          .from("featured_phone_clicks")
          .select("id", { count: "exact", head: true })
          .eq("facility_id", facilityId)
          .gte("clicked_at", sinceIso),
      ]);
      if (impRes.error) throw impRes.error;
      if (callRes.error) throw callRes.error;

      const impressions = impRes.count ?? 0;
      const calls = callRes.count ?? 0;
      const callRate = impressions > 0 ? (calls / impressions) * 100 : 0;

      return { impressions, calls, callRate };
    },
    enabled: !!facilityId && hasFeatured,
    staleTime: 5 * 60 * 1000,
    // Mirror ConciergeAnalyticsWidget so returning from the Marketing
    // detail page or from a Stripe portal redirect refreshes the panel.
    refetchOnWindowFocus: true,
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
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
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
      label: "Calls",
      value: analytics?.calls ?? 0,
      icon: Phone,
      color: "text-emerald-600",
      bgColor: "bg-emerald-500/10",
    },
    {
      label: "Call rate",
      value: `${(analytics?.callRate ?? 0).toFixed(1)}%`,
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
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
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

        {analytics && analytics.impressions === 0 && (
          <p className="text-xs text-slate-600 text-center leading-relaxed">
            Featured is active. Metrics populate as users see your listing on
            the pages you're rotating in — give it 24 hours for the first
            impressions to land.
          </p>
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
