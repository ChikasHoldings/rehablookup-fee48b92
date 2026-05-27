import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Eye, Phone, Globe, MousePointerClick, Star, ArrowUpRight, AlertCircle, DollarSign, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import { useFacilitySubscription } from "@/hooks/useFacilitySubscription";
import { TIER_PRICING } from "@/lib/billingPricing";
import { cn } from "@/lib/utils";

interface FeaturedAnalyticsWidgetProps {
  facilityId: string;
}

type Range = "7d" | "30d" | "90d";

const RANGE_DAYS: Record<Range, number> = { "7d": 7, "30d": 30, "90d": 90 };
const RANGE_LABEL: Record<Range, string> = { "7d": "7 days", "30d": "30 days", "90d": "90 days" };

const MONTHLY_COST_DOLLARS = TIER_PRICING.featured.monthlyCents / 100;

interface PlacePerf {
  type: string;
  value: string;
  impressions: number;
  calls: number;
}

interface AnalyticsData {
  impressions: number;
  calls: number;
  views: number;
  websiteVisits: number;
  callRate: number;
  places: PlacePerf[];
}

// Human-readable label for a placement_type/placement_value pair.
function placeLabel(type: string, value: string): string {
  const titled = value.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  switch (type) {
    case "state": return `${titled}`;
    case "city": return `${titled}`;
    case "near_me": return `${value.toUpperCase()} · near-me`;
    case "treatment": return `${titled} · treatment`;
    case "insurance": return `${titled} · insurance`;
    case "homepage": return "National homepage";
    case "international": return "International pages";
    default: return titled;
  }
}

export function FeaturedAnalyticsWidget({ facilityId }: FeaturedAnalyticsWidgetProps) {
  const [range, setRange] = useState<Range>("30d");
  const { data: subscription } = useFacilitySubscription(facilityId);
  const hasFeatured = subscription?.has_featured === true;

  const { data: analytics, isLoading, isError } = useQuery({
    queryKey: ["featured-analytics-provider", facilityId, range],
    queryFn: async (): Promise<AnalyticsData> => {
      const since = new Date();
      since.setDate(since.getDate() - RANGE_DAYS[range]);
      const sinceIso = since.toISOString();

      // Active placements drive the per-place breakdown (bounded set).
      const { data: placements } = await supabase
        .from("featured_placements")
        .select("placement_type, placement_value")
        .eq("facility_id", facilityId)
        .eq("active", true);

      const [impRes, callRes, viewRes, webRes] = await Promise.all([
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
        supabase
          .from("provider_events")
          .select("id", { count: "exact", head: true })
          .eq("facility_id", facilityId)
          .eq("event_type", "profile_view")
          .eq("is_internal", false)
          .eq("is_bot", false)
          .gte("created_at", sinceIso),
        supabase
          .from("provider_events")
          .select("id", { count: "exact", head: true })
          .eq("facility_id", facilityId)
          .eq("event_type", "website_click")
          .eq("is_internal", false)
          .eq("is_bot", false)
          .gte("created_at", sinceIso),
      ]);
      if (impRes.error) throw impRes.error;
      if (callRes.error) throw callRes.error;
      if (viewRes.error) throw viewRes.error;
      if (webRes.error) throw webRes.error;

      const impressions = impRes.count ?? 0;
      const calls = callRes.count ?? 0;
      const views = viewRes.count ?? 0;
      const websiteVisits = webRes.count ?? 0;
      const callRate = impressions > 0 ? (calls / impressions) * 100 : 0;

      // Per-place impressions + calls (where the facility actually performed).
      const places: PlacePerf[] = await Promise.all(
        (placements ?? []).map(async (p) => {
          const [pi, pc] = await Promise.all([
            supabase
              .from("featured_impressions")
              .select("id", { count: "exact", head: true })
              .eq("facility_id", facilityId)
              .eq("placement_type", p.placement_type)
              .eq("placement_value", p.placement_value)
              .gte("occurred_at", sinceIso),
            supabase
              .from("featured_phone_clicks")
              .select("id", { count: "exact", head: true })
              .eq("facility_id", facilityId)
              .eq("placement_type", p.placement_type)
              .eq("placement_value", p.placement_value)
              .gte("clicked_at", sinceIso),
          ]);
          if (pi.error) throw pi.error;
          if (pc.error) throw pc.error;
          return {
            type: p.placement_type,
            value: p.placement_value,
            impressions: pi.count ?? 0,
            calls: pc.count ?? 0,
          };
        }),
      );
      places.sort((a, b) => b.impressions - a.impressions || b.calls - a.calls);

      return { impressions, calls, views, websiteVisits, callRate, places };
    },
    enabled: !!facilityId && hasFeatured,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
    retry: 2,
  });

  if (!hasFeatured) return null;

  const costPerImpression =
    analytics && analytics.impressions > 0
      ? (MONTHLY_COST_DOLLARS / analytics.impressions).toFixed(2)
      : null;
  const costPerCall =
    analytics && analytics.calls > 0
      ? (MONTHLY_COST_DOLLARS / analytics.calls).toFixed(2)
      : null;

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

  return (
    <Card className="border-amber-200 bg-gradient-to-br from-amber-50/50 to-background dark:from-amber-950/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Star className="h-4 w-4 text-amber-500" />
            </div>
            <CardTitle className="text-base">Featured Performance</CardTitle>
          </div>
          <div className="flex items-center gap-1">
            {(["7d", "30d", "90d"] as Range[]).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={cn(
                  "rounded px-2 py-0.5 text-xs font-medium transition-colors",
                  range === r
                    ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
                    : "text-muted-foreground hover:bg-muted",
                )}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Primary metrics — views, impressions, calls, website */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <MetricBox icon={Eye} label="Profile views" value={analytics?.views ?? 0} color="text-violet-600" bg="bg-violet-500/10" />
          <MetricBox icon={MousePointerClick} label="Impressions" value={analytics?.impressions ?? 0} color="text-blue-600" bg="bg-blue-500/10" />
          <MetricBox icon={Phone} label="Calls" value={analytics?.calls ?? 0} color="text-emerald-600" bg="bg-emerald-500/10" />
          <MetricBox icon={Globe} label="Website visits" value={analytics?.websiteVisits ?? 0} color="text-amber-600" bg="bg-amber-500/10" />
        </div>

        {/* ROI cost context */}
        {(costPerImpression || costPerCall) && (
          <div className="rounded-lg border border-amber-200/60 bg-amber-50/40 p-3 space-y-1">
            <p className="text-[11px] font-semibold text-amber-900 flex items-center gap-1.5">
              <DollarSign className="h-3 w-3" aria-hidden />
              Cost efficiency — {RANGE_LABEL[range]} · {(analytics?.callRate ?? 0).toFixed(1)}% call rate
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-0.5">
              {costPerImpression && (
                <span className="text-xs text-amber-800"><span className="font-semibold">${costPerImpression}</span> per impression</span>
              )}
              {costPerCall && (
                <span className="text-xs text-amber-800"><span className="font-semibold">${costPerCall}</span> per call</span>
              )}
            </div>
            <p className="text-[10px] text-amber-700/70">Based on ${MONTHLY_COST_DOLLARS}/mo subscription cost</p>
          </div>
        )}

        {/* Performance by place — where the facility's Featured slots ran */}
        {analytics && analytics.places.length > 0 && (
          <div className="rounded-lg border bg-card">
            <p className="px-3 py-2 text-[11px] font-semibold text-slate-700 flex items-center gap-1.5 border-b">
              <MapPin className="h-3 w-3 text-slate-400" aria-hidden />
              Where you performed — {RANGE_LABEL[range]}
            </p>
            <ul className="divide-y divide-slate-100">
              {analytics.places.map((p) => (
                <li key={`${p.type}:${p.value}`} className="flex items-center justify-between gap-3 px-3 py-2">
                  <span className="text-xs font-medium text-slate-800 truncate">{placeLabel(p.type, p.value)}</span>
                  <span className="flex items-center gap-3 text-xs text-muted-foreground shrink-0 tabular-nums">
                    <span className="inline-flex items-center gap-0.5"><MousePointerClick className="h-3 w-3" />{p.impressions.toLocaleString()}</span>
                    <span className="inline-flex items-center gap-0.5"><Phone className="h-3 w-3" />{p.calls.toLocaleString()}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {analytics && analytics.impressions === 0 && (
          <p className="text-xs text-slate-600 text-center leading-relaxed">
            Featured is active. Metrics populate as users see your listing in
            rotation — give it 24 hours for the first impressions to land.
          </p>
        )}

        <Button variant="ghost" size="sm" className="w-full text-muted-foreground" asChild>
          <Link to="/provider/analytics?tab=subscription">
            View detailed analytics
            <ArrowUpRight className="h-3 w-3 ml-1" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function MetricBox({
  icon: Icon,
  label,
  value,
  color,
  bg,
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  color: string;
  bg: string;
}) {
  return (
    <div className="flex flex-col items-center p-3 rounded-lg bg-muted/50">
      <div className={`h-8 w-8 rounded-full ${bg} flex items-center justify-center mb-2`}>
        <Icon className={`h-4 w-4 ${color}`} />
      </div>
      <span className="text-lg font-bold text-foreground tabular-nums">
        {typeof value === "number" ? value.toLocaleString() : value}
      </span>
      <span className="text-xs text-muted-foreground text-center">{label}</span>
    </div>
  );
}
