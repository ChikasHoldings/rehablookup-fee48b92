/**
 * MarketReportPanel
 * ─────────────────
 * Monthly market-report digest surfaced on the Provider Analytics page.
 * Backed by the get_facility_market_report SECURITY DEFINER RPC.
 *
 * Shows the provider what's happening in their state for the current
 * month: addressable inquiry volume, their share, their rank vs peer
 * facilities, and the demand mix (substances, levels of care,
 * insurance providers). Helps them decide which services to advertise
 * or which insurance contracts to chase.
 *
 * Free vs Pro:
 *   * Free providers get the panel with a Pro-upgrade banner; the data
 *     still computes and displays so they can see the value before they
 *     commit. (Engine-side, the RPC returns is_pro flag for context.)
 *   * Pro providers get the same panel without the banner.
 *
 * Loading / empty / error states all explicit. No infinite spinners,
 * no blank screens.
 */
import { useState } from "react";
import { format, subMonths } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Link } from "react-router-dom";
import {
  TrendingUp,
  Users,
  Award,
  AlertCircle,
  Sparkles,
  ArrowRight,
  PieChart,
} from "lucide-react";
import {
  useFacilityMarketReport,
  type MarketReport,
  type MarketReportTopItem,
} from "@/hooks/useFacilityMarketReport";

const RECENT_MONTHS_OPTIONS = 6;

function buildMonthOptions(): { value: string; label: string }[] {
  const out: { value: string; label: string }[] = [];
  for (let i = 0; i < RECENT_MONTHS_OPTIONS; i++) {
    const d = subMonths(new Date(), i);
    const value = format(d, "yyyy-MM-01"); // first of month — matches RPC default semantics
    const label = format(d, "MMMM yyyy");
    out.push({ value, label });
  }
  return out;
}

function fmtPct(n: number): string {
  if (!Number.isFinite(n)) return "—";
  return n < 1 && n > 0 ? `<1%` : `${Math.round(n)}%`;
}

function ordinal(n: number): string {
  if (n <= 0) return "—";
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export function MarketReportPanel({ facilityId }: { facilityId: string | undefined }) {
  const [monthOptions] = useState(buildMonthOptions);
  const [selectedMonth, setSelectedMonth] = useState<string>(monthOptions[0].value);
  const { data: report, isLoading, isError, error, refetch } = useFacilityMarketReport(
    facilityId,
    selectedMonth,
  );

  if (!facilityId) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground text-center">
          Select a facility to see its market report.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h2 className="text-base sm:text-lg font-semibold text-slate-900 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-slate-500" aria-hidden />
            Market Report
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Where your facility stands in your state's addiction-treatment
            market this month.
          </p>
        </div>
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {monthOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading && <MarketReportSkeleton />}

      {isError && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-5 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0" aria-hidden />
            <div className="flex-1 min-w-0 space-y-2">
              <p className="text-sm">
                Could not load the market report.
                {error instanceof Error && (
                  <span className="text-muted-foreground"> {error.message}</span>
                )}
              </p>
              <Button size="sm" variant="outline" onClick={() => refetch()}>
                Try again
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {report && !isLoading && !isError && (
        <MarketReportBody report={report} />
      )}
    </div>
  );
}

function MarketReportSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => (
          <Card key={i}>
            <CardContent className="p-4 space-y-2">
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-7 w-2/3" />
              <Skeleton className="h-3 w-3/4" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardContent className="p-4 space-y-2">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}

function MarketReportBody({ report }: { report: MarketReport }) {
  const hasAnyData =
    report.state_total_inquiries > 0 || report.facility_inquiries > 0;

  return (
    <div className="space-y-4">
      {!report.is_pro && (
        <Card className="border-amber-300/70 bg-gradient-to-br from-amber-50/60 to-white">
          <CardContent className="p-4 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-start gap-2.5 flex-1 min-w-0">
              <Sparkles className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" aria-hidden />
              <p className="text-xs sm:text-sm">
                Market reports are a Pro feature. You can preview the
                current month free; upgrade to access every month + email
                delivery.
              </p>
            </div>
            <Button asChild size="sm" className="bg-amber-500 hover:bg-amber-600 text-white shrink-0">
              <Link to="/provider/subscription">
                Upgrade to Pro
                <ArrowRight className="h-3 w-3 ml-1" aria-hidden />
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* KPI strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4 space-y-1">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Inquiries — your facility
            </p>
            <p className="text-2xl font-semibold text-slate-900">
              {report.facility_inquiries.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground">
              {fmtPct(report.facility_share_pct)} of {report.facility_state} this month
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 space-y-1">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
              State total
            </p>
            <p className="text-2xl font-semibold text-slate-900">
              {report.state_total_inquiries.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground">
              Across {report.state_total_facilities} approved {report.facility_state} facilities
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 space-y-1">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Your rank in {report.facility_state}
            </p>
            <p className="text-2xl font-semibold text-slate-900 flex items-baseline gap-1">
              {ordinal(report.state_rank)}
              <span className="text-sm text-muted-foreground font-normal">
                / {report.state_total_facilities}
              </span>
            </p>
            <p className="text-xs text-muted-foreground">
              By inquiry volume
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Verified-share context */}
      <Card>
        <CardContent className="p-4 flex items-center gap-3 flex-wrap">
          <Award className="h-4 w-4 text-emerald-600 shrink-0" aria-hidden />
          <p className="text-sm flex-1 min-w-0">
            <strong>{report.state_verified_count.toLocaleString()}</strong> of{" "}
            <strong>{report.state_total_facilities.toLocaleString()}</strong> approved{" "}
            {report.facility_state} facilities are RehabLookup Verified (
            {fmtPct(report.state_verified_share_pct)}).
          </p>
        </CardContent>
      </Card>

      {/* Demand mix */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <DemandList
          title="Top substances"
          items={report.top_substances}
          empty={hasAnyData ? "No data" : "No state-level inquiries this month"}
        />
        <DemandList
          title="Top levels of care"
          items={report.top_levels_of_care}
          empty={hasAnyData ? "No data" : "No state-level inquiries this month"}
        />
        <DemandList
          title="Top insurance providers"
          items={report.top_insurance_providers}
          empty={hasAnyData ? "No data" : "No state-level inquiries this month"}
        />
      </div>

      <p className="text-[11px] text-muted-foreground">
        Generated {format(new Date(report.generated_at), "MMM d, yyyy h:mm a")}.
        Data covers {report.month}.
      </p>
    </div>
  );
}

function DemandList({
  title,
  items,
  empty,
}: {
  title: string;
  items: MarketReportTopItem[];
  empty: string;
}) {
  return (
    <Card>
      <CardContent className="p-4 space-y-2">
        <p className="text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
          <PieChart className="h-3 w-3" aria-hidden />
          {title}
        </p>
        {items.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">{empty}</p>
        ) : (
          <ul className="space-y-1.5">
            {items.map((it) => (
              <li
                key={it.value}
                className="flex items-center justify-between text-sm"
              >
                <span className="capitalize truncate min-w-0">{it.value}</span>
                <Badge variant="outline" className="text-[10px] ml-2 shrink-0 gap-0.5">
                  <Users className="h-2.5 w-2.5" aria-hidden />
                  {it.count.toLocaleString()}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
