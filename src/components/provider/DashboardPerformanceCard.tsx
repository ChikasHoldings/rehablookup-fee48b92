import { Link } from "react-router-dom";
import { Eye, Megaphone, Phone, Globe, Users, ArrowUpRight, ArrowDownRight, Lock, BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useFacilityPerformance } from "@/hooks/useFacilityPerformance";

/**
 * Dashboard "Performance" overview — last-7-days impressions / profile views /
 * click-to-call / website clicks with week-over-week deltas, backed by the
 * facility_metrics_daily rollup via useFacilityPerformance (Pro-gated server
 * side: Free facilities get impressions + profile views only). Deep metrics,
 * trend charts, traffic sources and market position live on /provider/analytics.
 */
function deltaPct(cur: number, prev: number | undefined): number | null {
  if (prev === undefined || prev === 0) return cur > 0 && prev === 0 ? 100 : null;
  return Math.round(((cur - prev) / prev) * 100);
}

function Delta({ value }: { value: number | null }) {
  if (value === null) return null;
  const up = value >= 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-[11px] font-semibold tabular-nums",
        up ? "text-emerald-600" : "text-rose-600",
      )}
    >
      {up ? <ArrowUpRight className="h-3 w-3" aria-hidden /> : <ArrowDownRight className="h-3 w-3" aria-hidden />}
      {Math.abs(value)}%
    </span>
  );
}

function Tile({
  label,
  icon: Icon,
  value,
  delta,
  locked,
}: {
  label: string;
  icon: React.ElementType;
  value: number;
  delta: number | null;
  locked?: boolean;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="flex items-center gap-1.5 text-slate-500">
        <Icon className="h-3.5 w-3.5" aria-hidden />
        <span className="truncate text-[11px] font-medium uppercase tracking-wide">{label}</span>
      </div>
      {locked ? (
        <div className="mt-1.5 flex items-center gap-1 text-slate-400">
          <Lock className="h-3.5 w-3.5" aria-hidden />
          <span className="text-sm font-medium">Pro</span>
        </div>
      ) : (
        <div className="mt-1.5 flex items-baseline gap-2">
          <span className="font-display text-2xl font-bold tabular-nums leading-none text-slate-900">
            {value.toLocaleString()}
          </span>
          <Delta value={delta} />
        </div>
      )}
    </div>
  );
}

export function DashboardPerformanceCard({ facilityId }: { facilityId: string | undefined }) {
  const { data: perf, isLoading, isError } = useFacilityPerformance(facilityId);

  const isPro = perf?.tier === "pro";
  const cur = perf?.last_7_days;
  const prev = perf?.prev_7_days;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b py-3.5">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <BarChart3 className="h-4 w-4 text-[#1B365D]" aria-hidden />
          Performance
          <span className="text-xs font-normal text-slate-400">· last 7 days</span>
        </CardTitle>
        <Button asChild variant="ghost" size="sm" className="h-7 gap-1 text-xs text-[#1B365D]">
          <Link to="/provider/analytics">
            Full performance <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="p-4 sm:p-5">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-[68px] rounded-lg" />
            ))}
          </div>
        ) : isError || !perf ? (
          <p className="py-2 text-sm text-slate-500">
            Couldn't load performance right now.{" "}
            <Link to="/provider/analytics" className="font-medium text-[#1B365D] hover:underline">
              Open analytics
            </Link>
          </p>
        ) : (
          <>
            {/* Search appearances → profile views → contact actions →
                inquiries: the funnel a provider actually reads, left to right.
                Inquiries are shown for EVERY tier — they are not a paid
                entitlement, so they belong in the Free snapshot too. */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              <Tile
                label="Search appearances"
                icon={Megaphone}
                value={cur?.impressions ?? 0}
                delta={deltaPct(cur?.impressions ?? 0, prev?.impressions)}
              />
              <Tile
                label="Profile views"
                icon={Eye}
                value={cur?.profile_views ?? 0}
                delta={deltaPct(cur?.profile_views ?? 0, prev?.profile_views)}
              />
              <Tile
                label="Click to call"
                icon={Phone}
                value={cur?.phone_clicks ?? 0}
                delta={deltaPct(cur?.phone_clicks ?? 0, prev?.phone_clicks)}
                locked={!isPro}
              />
              <Tile
                label="Website clicks"
                icon={Globe}
                value={cur?.website_clicks ?? 0}
                delta={deltaPct(cur?.website_clicks ?? 0, prev?.website_clicks)}
                locked={!isPro}
              />
              <Tile
                label="Inquiries"
                icon={Users}
                value={cur?.inquiries ?? 0}
                delta={deltaPct(cur?.inquiries ?? 0, prev?.inquiries)}
              />
            </div>
            {/* Informational, not a second upsell: the dashboard carries exactly
                one Pro CTA (the Plan section). This states what the greyed tiles
                contain so the lock isn't a mystery. */}
            {!isPro && (
              <p className="mt-3 text-xs leading-relaxed text-slate-500">
                Click-to-call and website clicks, 30-day trends, traffic sources, and
                market position are part of Pro performance reporting.
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
