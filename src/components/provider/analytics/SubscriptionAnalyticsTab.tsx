import { useState } from "react";
import {
  TrendingUp, TrendingDown, Minus, Eye, Phone, Inbox, Clock,
  Megaphone, Info,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useFacilityAnalytics, type AnalyticsRange, type FacilityAnalyticsResponse } from "@/hooks/useFacilityAnalytics";
import { useFacilityRole } from "@/hooks/useFacilityRole";

// Industry-benchmark CTR for Featured placements. Update via the env var
// `VITE_INDUSTRY_AVG_CTR` (percent value, e.g. "0.65"). Default 0.65%
// reflects the rehab-directory baseline at time of build; revisit as we
// accumulate live data.
const BENCHMARK_CTR_PCT = Number(import.meta.env.VITE_INDUSTRY_AVG_CTR ?? 0.65);

const RANGE_OPTIONS: Array<{ value: AnalyticsRange; label: string }> = [
  { value: "last_7d", label: "7 days" },
  { value: "last_30d", label: "30 days" },
  { value: "last_90d", label: "90 days" },
  { value: "last_12m", label: "12 months" },
];

interface SubscriptionAnalyticsTabProps {
  facilityId: string | null | undefined;
  /** Optional: when admin is viewing as a facility, surface a banner. */
  viewingAsFacilityName?: string | null;
}

export function SubscriptionAnalyticsTab({ facilityId, viewingAsFacilityName }: SubscriptionAnalyticsTabProps) {
  const [range, setRange] = useState<AnalyticsRange>("last_30d");
  // Subscription analytics surface billing data (renewal forecast, paid
  // amounts), so this tab stays owner-only — managers/viewers get a clear
  // owner-only notice rather than the forbidden error the get-facility-analytics
  // edge function returns. Passing a null facilityId for non-owners disables the
  // query so we never fire the wasted 403.
  const { isOwner, isLoading: roleLoading } = useFacilityRole(facilityId);
  const { data, isLoading, isError, error } = useFacilityAnalytics({
    facilityId: isOwner ? facilityId : null,
    range,
  });

  if (!facilityId) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          Select a facility to view subscription analytics.
        </CardContent>
      </Card>
    );
  }

  if (roleLoading) return <SkeletonState />;

  if (!isOwner) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          Subscription &amp; billing analytics are available to the facility owner.
        </CardContent>
      </Card>
    );
  }

  if (isLoading) return <SkeletonState />;
  if (isError || !data) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-red-700">
          Couldn't load analytics. {error instanceof Error ? error.message : "Please try again."}
        </CardContent>
      </Card>
    );
  }

  const isPro = !!data.subscription?.is_pro;
  const hasFeatured = !!data.subscription?.has_featured;

  const allZero = data.summary.profile_views.current === 0
    && data.summary.phone_clicks.current === 0
    && data.summary.inquiries.current === 0;

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {viewingAsFacilityName && (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Viewing as: <span className="font-semibold">{viewingAsFacilityName}</span>
          </div>
        )}

        {/* Time range selector */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h3 className="text-base font-semibold text-foreground">Subscription performance</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {data.subscription
                ? `${data.subscription.tier === "pro" ? "Pro" : "Free"}${data.subscription.has_featured ? " + Featured" : ""}${data.subscription.has_concierge_partner ? " + legacy add-on" : ""} · ${data.subscription.billing_period ?? "monthly"}`
                : "Free tier"}
            </p>
          </div>
          <Tabs value={range} onValueChange={(v) => setRange(v as AnalyticsRange)}>
            <TabsList className="h-9">
              {RANGE_OPTIONS.map((opt) => (
                <TabsTrigger key={opt.value} value={opt.value} className="text-xs h-7 px-3">
                  {opt.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        {allZero ? <EmptyState /> : null}

        {/* Summary KPI cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard
            icon={Eye}
            label="Profile views"
            value={data.summary.profile_views.current}
            delta={data.summary.profile_views.delta_pct}
            deltaSuffix="%"
          />
          <KpiCard
            icon={Phone}
            label="Phone clicks"
            value={data.summary.phone_clicks.current}
            delta={data.summary.phone_clicks.delta_pct}
            deltaSuffix="%"
          />
          <KpiCard
            icon={Inbox}
            label="Inquiries"
            value={data.summary.inquiries.current}
            delta={data.summary.inquiries.delta_pct}
            deltaSuffix="%"
          />
          <KpiCard
            icon={Clock}
            label="Avg response"
            value={data.summary.avg_response_time_hours.current}
            valueSuffix=" hrs"
            delta={null}
          />
        </div>

        {/* Featured per-placement breakdown */}
        {hasFeatured && data.featured_breakdown && (
          <FeaturedBreakdown
            rows={data.featured_breakdown}
            totalImpressions={data.featured_impressions_total}
          />
        )}

        {/* Legacy retired add-on. The reporting block was titled "Concierge
            Partner performance" and framed a retired product as a live one. It
            is removed from the provider surface; historical records remain
            available to admins via the read-only archive. */}

        {/* Lead funnel — always shown */}
        <FunnelBlock funnel={data.funnel} isPro={isPro} />

        {/* Reviews — only if any in range */}
        {data.reviews && <ReviewsBlock reviews={data.reviews} />}

        {/* Renewal forecast — only for paying subscribers */}
        {data.renewal_forecast && <RenewalForecastFooter forecast={data.renewal_forecast} />}
      </div>
    </TooltipProvider>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────

function KpiCard({
  icon: Icon, label, value, valueSuffix, delta, deltaSuffix = "%",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  valueSuffix?: string;
  delta: number | null;
  deltaSuffix?: string;
}) {
  const trend =
    delta === null ? "neutral" :
    delta >= 5 ? "up" :
    delta <= -20 ? "down-strong" :
    delta <= -5 ? "down" :
    "neutral";
  const TrendIcon = trend === "up" ? TrendingUp : trend === "neutral" ? Minus : TrendingDown;
  const trendColor =
    trend === "up" ? "text-emerald-700" :
    trend === "down-strong" ? "text-red-700" :
    trend === "down" ? "text-amber-700" :
    "text-slate-500";

  return (
    <Card>
      <CardContent className="pt-4 pb-3 px-4">
        <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground">
          <Icon className="h-3.5 w-3.5" />
          {label}
        </div>
        <div className="text-2xl font-bold text-foreground tabular-nums">
          {typeof value === "number" ? value.toLocaleString() : value}
          {valueSuffix && <span className="text-base font-normal text-muted-foreground">{valueSuffix}</span>}
        </div>
        {delta !== null && (
          <div className={cn("flex items-center gap-1 text-xs mt-1", trendColor)}>
            <TrendIcon className="h-3 w-3" />
            <span className="tabular-nums">{delta > 0 ? "+" : ""}{delta}{deltaSuffix}</span>
            <span className="text-muted-foreground">vs prev period</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function FeaturedBreakdown({ rows, totalImpressions }: { rows: FacilityAnalyticsResponse["featured_breakdown"]; totalImpressions: number }) {
  if (!rows || rows.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Megaphone className="h-4 w-4 text-[#1B365D]" />
            Featured placements
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground">
          No active Featured placements yet.
        </CardContent>
      </Card>
    );
  }
  const totalClicks = rows.reduce((s, r) => s + r.phone_clicks, 0);
  const overallCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
  const benchTier =
    overallCtr >= BENCHMARK_CTR_PCT * 1.1 ? "above" :
    overallCtr >= BENCHMARK_CTR_PCT * 0.9 ? "at" :
    "below";
  const benchLabel =
    benchTier === "above" ? "Above benchmark" :
    benchTier === "at" ? "At benchmark" :
    "Below benchmark";
  const benchColor =
    benchTier === "above" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
    benchTier === "at" ? "bg-slate-50 text-slate-700 border-slate-200" :
    "bg-amber-50 text-amber-800 border-amber-200";

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Megaphone className="h-4 w-4 text-[#1B365D]" />
          Featured placements ({rows.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="overflow-x-auto -mx-2">
          <table className="w-full text-sm">
            <thead className="text-[11px] uppercase tracking-wide text-muted-foreground">
              <tr className="border-b border-border">
                <th className="text-left py-2 px-2 font-semibold">Type</th>
                <th className="text-left py-2 px-2 font-semibold">Value</th>
                <th className="text-right py-2 px-2 font-semibold">Impressions</th>
                <th className="text-right py-2 px-2 font-semibold">Phone clicks</th>
                <th className="text-right py-2 px-2 font-semibold">CTR</th>
                <th className="text-right py-2 px-2 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={`${r.placement_type}::${r.placement_value}`} className="border-b border-border/60 last:border-0">
                  <td className="py-2 px-2 text-muted-foreground capitalize">{r.placement_type}</td>
                  <td className="py-2 px-2 font-medium text-foreground">{r.placement_value}</td>
                  <td className="py-2 px-2 text-right tabular-nums">{(r.impressions ?? 0).toLocaleString()}</td>
                  <td className="py-2 px-2 text-right tabular-nums">{(r.phone_clicks ?? 0).toLocaleString()}</td>
                  <td className="py-2 px-2 text-right tabular-nums">{(r.ctr_pct ?? 0).toFixed(2)}%</td>
                  <td className="py-2 px-2 text-right">
                    {r.is_active
                      ? <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">Active</Badge>
                      : <Badge variant="outline" className="text-[10px] text-muted-foreground">Inactive</Badge>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between gap-2 text-xs pt-2 border-t border-border">
          <div className="text-muted-foreground">
            Average CTR: <span className="font-medium text-foreground tabular-nums">{overallCtr.toFixed(2)}%</span>
            <span className="mx-2 text-slate-300">·</span>
            Industry benchmark: <span className="font-medium text-foreground tabular-nums">{BENCHMARK_CTR_PCT.toFixed(2)}%</span>
          </div>
          <Badge variant="outline" className={cn("text-[10px]", benchColor)}>{benchLabel}</Badge>
        </div>
      </CardContent>
    </Card>
  );
}

function FunnelBlock({ funnel, isPro }: { funnel: FacilityAnalyticsResponse["funnel"]; isPro: boolean }) {
  const steps = [
    { label: "Profile views", value: funnel.profile_views },
    { label: "Phone clicks", value: funnel.phone_clicks },
    { label: isPro ? "Inquiries submitted" : "Concierge routed", value: funnel.inquiries_submitted },
    { label: isPro ? "Responded to" : "Provider responded", value: funnel.inquiries_responded },
    { label: isPro ? "Marked converted" : "Client chose you", value: funnel.inquiries_converted },
  ];
  const max = Math.max(...steps.map((s) => s.value), 1);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Lead funnel</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {steps.map((s, i) => {
          const width = Math.max(4, Math.round((s.value / max) * 100));
          const prevValue = i === 0 ? null : steps[i - 1].value;
          const pctOfPrev = prevValue && prevValue > 0 ? Math.round((s.value / prevValue) * 1000) / 10 : null;
          return (
            <div key={s.label} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{s.label}</span>
                <span className="font-semibold tabular-nums">
                  {s.value.toLocaleString()}
                  {pctOfPrev !== null && i > 0 && (
                    <span className="ml-2 text-muted-foreground font-normal">({pctOfPrev}%)</span>
                  )}
                </span>
              </div>
              <div className="h-2 bg-slate-100 rounded-sm overflow-hidden">
                <div
                  className="h-full bg-[#1B365D]"
                  style={{ width: `${width}%` }}
                  role="presentation"
                />
              </div>
            </div>
          );
        })}
        {!isPro && (
          <p className="mt-3 text-xs leading-relaxed text-slate-500">
            Pro performance reporting adds the per-source breakdown behind these
            totals. Inquiries themselves are not a paid feature — your facility
            already receives them.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function ReviewsBlock({ reviews }: { reviews: NonNullable<FacilityAnalyticsResponse["reviews"]> }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Reviews</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
        <div><p className="text-xs text-muted-foreground">Received</p><p className="text-xl font-bold tabular-nums">{reviews.received}</p></div>
        <div><p className="text-xs text-muted-foreground">Avg rating</p><p className="text-xl font-bold tabular-nums">{reviews.avg_rating} / 5</p></div>
        <div><p className="text-xs text-muted-foreground">Responded</p><p className="text-xl font-bold tabular-nums">{reviews.responded}</p></div>
        <div><p className="text-xs text-muted-foreground">Pending</p><p className="text-xl font-bold text-amber-800 tabular-nums">{reviews.pending}</p></div>
      </CardContent>
    </Card>
  );
}

function RenewalForecastFooter({ forecast }: { forecast: NonNullable<FacilityAnalyticsResponse["renewal_forecast"]> }) {
  const renewalDate = new Date(forecast.period_end).toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric",
  });
  const charge = (forecast.estimated_charge_cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2 });
  const costPerClick = forecast.cost_per_phone_click_cents > 0
    ? `$${(forecast.cost_per_phone_click_cents / 100).toFixed(2)}` : "—";
  const costPerInq = forecast.cost_per_inquiry_cents > 0
    ? `$${(forecast.cost_per_inquiry_cents / 100).toFixed(2)}` : "—";

  return (
    <Card className="border-[#1B365D]/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Clock className="h-4 w-4 text-[#1B365D]" />
          Renewal forecast
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p>
          Your subscription renews on <strong>{renewalDate}</strong>.
          {" "}Estimated renewal charge: <strong>${charge}</strong>.
        </p>
        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border">
          <div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              Implied cost per phone click
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3 w-3 cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs text-xs">
                  Calculated as your annual subscription cost ÷ count.
                  RehabLookup never charges per click, per call, or per inquiry —
                  this is just to help you evaluate the value of your subscription.
                </TooltipContent>
              </Tooltip>
            </div>
            <p className="text-lg font-bold tabular-nums mt-0.5">{costPerClick}</p>
          </div>
          <div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              Implied cost per inquiry
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3 w-3 cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs text-xs">
                  Calculated as your annual subscription cost ÷ count.
                  RehabLookup never charges per click, per call, or per inquiry —
                  this is just to help you evaluate the value of your subscription.
                </TooltipContent>
              </Tooltip>
            </div>
            <p className="text-lg font-bold tabular-nums mt-0.5">{costPerInq}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SkeletonState() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="pt-4 pb-3 px-4 space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-7 w-24" />
              <Skeleton className="h-3 w-28" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card><CardContent className="py-6 space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-32 w-full" />
      </CardContent></Card>
    </div>
  );
}

function EmptyState() {
  return (
    <Card className="border-dashed">
      <CardContent className="py-8 text-center text-sm text-muted-foreground">
        No data in this range yet. As visitors land on your facility profile, view counts and phone clicks will appear here.
      </CardContent>
    </Card>
  );
}
