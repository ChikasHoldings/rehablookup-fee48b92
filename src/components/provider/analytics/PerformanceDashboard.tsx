import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  ArrowDownRight,
  ArrowUpRight,
  Eye,
  Globe,
  Lock,
  MessageSquare,
  Minus,
  Phone,
  Sparkles,
  TrendingUp,
  Trophy,
} from "lucide-react";
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  useFacilityPerformance,
  type PerformanceSummary,
} from "@/hooks/useFacilityPerformance";

interface PerformanceDashboardProps {
  facilityId: string | undefined;
}

/**
 * Pro performance dashboard backed by the facility_metrics_daily
 * rollup. Headline counts, week-over-week deltas, daily series,
 * traffic source breakdown, and aggregate market position. Free
 * facilities get the same component with a blurred-overlay teaser.
 */
export function PerformanceDashboard({ facilityId }: PerformanceDashboardProps) {
  const { data, isLoading, isError, refetch } = useFacilityPerformance(facilityId);

  if (!facilityId) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Pick a facility from the header dropdown to see performance.
        </CardContent>
      </Card>
    );
  }

  if (isLoading) return <DashboardSkeleton />;

  if (isError || !data) {
    return (
      <Card>
        <CardContent className="py-10 text-center space-y-2">
          <p className="text-sm font-medium text-foreground">
            Couldn't load performance data
          </p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Try again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return data.tier === "pro" ? (
    <ProDashboard data={data} />
  ) : (
    <FreeTeaser data={data} />
  );
}

/* ─── Pro shape ───────────────────────────────────────────────────── */

function ProDashboard({ data }: { data: PerformanceSummary }) {
  const w = data.last_7_days;
  const p = data.prev_7_days || {
    impressions: 0,
    profile_views: 0,
    phone_clicks: 0,
    website_clicks: 0,
    inquiries: 0,
    widget_loads: 0,
  };

  return (
    <div className="space-y-6">
      {/* ─── Headline KPIs with WoW deltas ─── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi
          icon={Eye}
          label="Profile views"
          value={w.profile_views}
          prev={p.profile_views ?? 0}
          tint="bg-sky-100 text-sky-700"
        />
        <Kpi
          icon={Phone}
          label="Phone clicks"
          value={w.phone_clicks ?? 0}
          prev={p.phone_clicks ?? 0}
          tint="bg-emerald-100 text-emerald-700"
        />
        <Kpi
          icon={Globe}
          label="Website clicks"
          value={w.website_clicks ?? 0}
          prev={p.website_clicks ?? 0}
          tint="bg-violet-100 text-violet-700"
        />
        <Kpi
          icon={MessageSquare}
          label="Inquiries"
          value={w.inquiries}
          prev={p.inquiries ?? 0}
          tint="bg-amber-100 text-amber-700"
        />
      </div>

      {/* ─── Daily series chart ─── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Last 30 days</CardTitle>
          <CardDescription>
            Daily profile views and inquiries. Bot + internal traffic
            already filtered out at the source.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DailyChart series={data.series ?? []} />
        </CardContent>
      </Card>

      {/* ─── Traffic sources + market position ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TrafficSourcesCard sources={data.traffic ?? []} />
        <MarketPositionCard market={data.market} />
      </div>

      {data.last_refresh_at && (
        <p className="text-xs text-muted-foreground">
          Rollup refreshed {formatRelative(data.last_refresh_at)} · cron runs hourly.
        </p>
      )}
    </div>
  );
}

/* ─── Free teaser ─────────────────────────────────────────────────── */

function FreeTeaser({ data }: { data: PerformanceSummary }) {
  const headline = data.last_7_days.profile_views;
  // Pick the most-positive phrase. Plural "times" is fine because the
  // word is the same for 1 or N in this construction ("viewed 1 time"
  // is slightly awkward but unambiguous).
  const headlineCopy =
    headline > 0
      ? `Viewed ${headline.toLocaleString()} time${headline === 1 ? "" : "s"} this week`
      : "No profile views recorded this week yet";

  return (
    <div className="space-y-6">
      {/* Visible headline — Free facilities still see real data */}
      <Card className="border-amber-200/60 bg-gradient-to-br from-amber-50/60 to-card">
        <CardContent className="pt-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">
                Free tier · headline only
              </p>
              <h2 className="mt-1 font-display text-2xl font-bold tracking-tight text-slate-900">
                {headlineCopy}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground max-w-xl">
                {data.last_30_days.profile_views > 0
                  ? `${data.last_30_days.profile_views.toLocaleString()} in the last 30 days · ${data.last_30_days.inquiries.toLocaleString()} ${data.last_30_days.inquiries === 1 ? "inquiry" : "inquiries"} so far.`
                  : "When clients view your profile, the numbers will appear here."}
              </p>
            </div>
            <Button asChild className="bg-[#1B365D] hover:bg-[#142a4a] gap-2 shrink-0 self-start sm:self-auto">
              <Link to="/provider/billing?upgrade=pro">
                <Sparkles className="h-4 w-4" />
                Upgrade to Pro
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Blurred preview of the Pro dashboard */}
      <div className="relative">
        <div
          aria-hidden
          className="pointer-events-none select-none filter blur-sm opacity-40"
        >
          {/* Static placeholder bars + cards so the blur has something
              to render. No real data leaks — these are illustrative
              shapes only. */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="pt-4">
                  <div className="h-3 w-24 rounded bg-slate-200" />
                  <div className="mt-3 h-7 w-16 rounded bg-slate-300" />
                  <div className="mt-2 h-3 w-20 rounded bg-slate-200" />
                </CardContent>
              </Card>
            ))}
          </div>
          <Card className="mt-6">
            <CardContent className="pt-6">
              <div className="h-3 w-32 rounded bg-slate-200" />
              <div className="mt-4 h-40 w-full rounded bg-gradient-to-r from-slate-100 via-slate-200 to-slate-100" />
            </CardContent>
          </Card>
        </div>
        {/* Lock overlay */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="rounded-2xl border border-amber-200 bg-white px-6 py-5 shadow-md text-center max-w-md">
            <div className="mx-auto h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
              <Lock className="h-5 w-5 text-amber-600" aria-hidden />
            </div>
            <h3 className="mt-3 font-semibold text-foreground">
              The full dashboard is a Pro perk
            </h3>
            <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
              Daily views and inquiries, week-over-week deltas, traffic
              sources, and your market rank in {data.facility.state ?? "your state"}.
              All numbers refreshed hourly.
            </p>
            <Button asChild size="sm" className="mt-4 bg-amber-500 hover:bg-amber-600 text-white gap-1.5">
              <Link to="/provider/billing?upgrade=pro">
                <Sparkles className="h-4 w-4" />
                Upgrade to Pro
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Subcomponents ───────────────────────────────────────────────── */

function Kpi({
  icon: Icon,
  label,
  value,
  prev,
  tint,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  prev: number;
  tint: string;
}) {
  const delta = useMemo(() => {
    if (prev === 0 && value === 0) return { pct: 0, dir: "flat" as const };
    if (prev === 0) return { pct: 100, dir: "up" as const };
    const change = ((value - prev) / prev) * 100;
    return {
      pct: Math.round(Math.abs(change)),
      dir: change > 1 ? ("up" as const) : change < -1 ? ("down" as const) : ("flat" as const),
    };
  }, [value, prev]);

  const DeltaIcon = delta.dir === "up" ? ArrowUpRight : delta.dir === "down" ? ArrowDownRight : Minus;
  const deltaColor =
    delta.dir === "up"
      ? "text-emerald-600"
      : delta.dir === "down"
        ? "text-red-600"
        : "text-muted-foreground";

  return (
    <Card>
      <CardContent className="pt-4 pb-4 px-4">
        <div className="flex items-center gap-2">
          <div className={cn("h-7 w-7 rounded-md flex items-center justify-center", tint)}>
            <Icon className="h-4 w-4" aria-hidden />
          </div>
          <p className="text-xs text-muted-foreground font-medium truncate">{label}</p>
        </div>
        <p className="mt-2 text-2xl font-bold text-foreground tabular-nums leading-none">
          {value.toLocaleString()}
        </p>
        <div className={cn("mt-1.5 flex items-center gap-1 text-xs font-medium", deltaColor)}>
          <DeltaIcon className="h-3 w-3" aria-hidden />
          {delta.dir === "flat" ? (
            <span>vs prior 7 days</span>
          ) : (
            <span>
              {delta.pct}% {delta.dir === "up" ? "up" : "down"} vs prior 7 days
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function DailyChart({
  series,
}: {
  series: PerformanceSummary["series"];
}) {
  const data = (series ?? []).map((d) => ({
    ...d,
    label: new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
  }));
  if (data.length === 0) {
    return (
      <div className="h-40 flex items-center justify-center text-sm text-muted-foreground">
        No activity recorded yet.
      </div>
    );
  }

  return (
    <div className="h-64 -ml-2">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 12, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="views-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"  stopColor="#0ea5e9" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="inq-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"  stopColor="#f59e0b" stopOpacity={0.45} />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#e2e8f0" strokeDasharray="2 2" vertical={false} />
          <XAxis dataKey="label" fontSize={11} tickLine={false} axisLine={false} interval="preserveStartEnd" />
          <YAxis fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
          <Tooltip
            contentStyle={{ fontSize: 12, border: "1px solid #e2e8f0", borderRadius: 8 }}
            labelStyle={{ fontWeight: 600 }}
          />
          <Area
            type="monotone"
            dataKey="profile_views"
            name="Profile views"
            stroke="#0ea5e9"
            strokeWidth={2}
            fill="url(#views-grad)"
            isAnimationActive={false}
          />
          <Area
            type="monotone"
            dataKey="inquiries"
            name="Inquiries"
            stroke="#f59e0b"
            strokeWidth={2}
            fill="url(#inq-grad)"
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function TrafficSourcesCard({
  sources,
}: {
  sources: Array<{ source: string; count: number }>;
}) {
  const total = sources.reduce((sum, s) => sum + s.count, 0);
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Traffic sources</CardTitle>
        <CardDescription>
          Where visitors landed on your profile from in the last 30 days.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {sources.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No traffic recorded yet.
          </p>
        ) : (
          <div className="space-y-2.5">
            {sources.slice(0, 6).map((s) => {
              const pct = total > 0 ? Math.round((s.count / total) * 100) : 0;
              return (
                <div key={s.source} className="space-y-1">
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="truncate text-foreground">{s.source}</span>
                    <span className="tabular-nums text-muted-foreground shrink-0">
                      {s.count.toLocaleString()} · {pct}%
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full bg-[#1B365D]" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MarketPositionCard({
  market,
}: {
  market: PerformanceSummary["market"];
}) {
  if (!market) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Trophy className="h-4 w-4 text-amber-500" aria-hidden />
            Market position
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Not enough state-level data yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  const { rank, total, percentile, state } = market;
  const topQuartile = percentile >= 75;
  const ordinal = ordinalSuffix(rank);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Trophy className="h-4 w-4 text-amber-500" aria-hidden />
          Market position
        </CardTitle>
        <CardDescription>
          Your rank in {state} by profile views over the last 30 days.
          Aggregate-only — never another facility's raw numbers.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-foreground tabular-nums">{ordinal}</span>
          <span className="text-sm text-muted-foreground">
            of {total.toLocaleString()} approved facilities in {state}
          </span>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <Badge
            variant="outline"
            className={cn(
              "text-xs",
              topQuartile
                ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                : "bg-slate-50 border-slate-200 text-slate-700",
            )}
          >
            <TrendingUp className="h-3 w-3 mr-1" aria-hidden />
            {percentile}th percentile
          </Badge>
          {topQuartile && (
            <span className="text-xs text-muted-foreground">Top quartile in your state.</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── Helpers ─────────────────────────────────────────────────────── */

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-4 space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-7 w-20" />
              <Skeleton className="h-3 w-28" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardContent className="pt-6">
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}

function ordinalSuffix(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function formatRelative(iso: string): string {
  try {
    const diff = (Date.now() - new Date(iso).getTime()) / 1000;
    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.round(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.round(diff / 3600)}h ago`;
    return `${Math.round(diff / 86400)}d ago`;
  } catch {
    return "";
  }
}
