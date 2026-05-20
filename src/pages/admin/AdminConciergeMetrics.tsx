import { useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { AlertTriangle, TrendingUp, Users, ShieldCheck, Flag } from "lucide-react";
import { format } from "date-fns";
import { AdvisorReminder } from "@/components/admin/concierge/AdvisorReminder";

interface AdvisorMetrics {
  advisor_id: string;
  advisor_display_name: string | null;
  decisions_total: number;
  introductions_total: number;
  partner_introductions_total: number;
  non_partner_introductions_total: number;
  partner_ratio: number | null;
  flagged_decisions: number;
  last_decision_at: string | null;
}

interface NetworkRollup {
  decisions_total: number;
  introductions_total: number;
  partner_introductions_total: number;
  non_partner_introductions_total: number;
  flagged_decisions: number;
  partner_ratio: number | null;
}

interface DistributionResponse {
  ok: boolean;
  window_days: number;
  window_start: string;
  generated_at: string;
  network: NetworkRollup;
  advisors: AdvisorMetrics[];
}

const WINDOW_OPTIONS = [
  { value: 7, label: "Last 7 days" },
  { value: 30, label: "Last 30 days" },
  { value: 90, label: "Last 90 days" },
  { value: 180, label: "Last 180 days" },
  { value: 365, label: "Last 365 days" },
];

const RATIO_WARN = 0.7;
const RATIO_WATCH = 0.5;

function ratioTone(ratio: number | null): {
  className: string;
  label: string;
} {
  if (ratio === null) return { className: "text-slate-500", label: "—" };
  if (ratio >= RATIO_WARN) {
    return { className: "text-red-700 font-semibold", label: `${(ratio * 100).toFixed(0)}%` };
  }
  if (ratio >= RATIO_WATCH) {
    return { className: "text-amber-700 font-medium", label: `${(ratio * 100).toFixed(0)}%` };
  }
  return { className: "text-emerald-700", label: `${(ratio * 100).toFixed(0)}%` };
}

export default function AdminConciergeMetrics() {
  const [windowDays, setWindowDays] = useState<number>(90);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["advisor-partner-distribution", windowDays],
    queryFn: async (): Promise<DistributionResponse> => {
      const { data, error } = await supabase.functions.invoke(
        "get-advisor-partner-distribution",
        { body: { window_days: windowDays } },
      );
      // Throw so React Query surfaces the failure via isError —
      // returning null on error previously short-circuited the error
      // state and rendered "0 decisions" as if nothing existed.
      if (error) throw error;
      if (!data) throw new Error("Empty response from get-advisor-partner-distribution");
      if ((data as { error?: string }).error) {
        throw new Error((data as { error: string }).error);
      }
      return data as DistributionResponse;
    },
    staleTime: 1000 * 60,
  });

  const network = data?.network;
  const advisors = useMemo(() => data?.advisors ?? [], [data?.advisors]);

  const warnAdvisors = useMemo(
    () => advisors.filter((a) => (a.partner_ratio ?? 0) >= RATIO_WARN),
    [advisors],
  );
  const watchAdvisors = useMemo(
    () =>
      advisors.filter(
        (a) => (a.partner_ratio ?? 0) >= RATIO_WATCH && (a.partner_ratio ?? 0) < RATIO_WARN,
      ),
    [advisors],
  );

  return (
    <div className="space-y-6">
      <Helmet>
        <title>Concierge metrics · RehabLookup admin</title>
      </Helmet>

      <AdvisorReminder />

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-[#1B365D]" aria-hidden />
            Concierge partner distribution
          </h1>
          <p className="text-sm text-slate-600 mt-1 max-w-2xl">
            Advisor-level breakdown of Placement-Partner vs. non-partner introductions.
            Surfaces selection patterns before they trip the per-decision auto-flag.
            EKRA reference only — flat fees, no per-introduction compensation.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-wide font-semibold text-slate-600">
            Window
          </span>
          <Select
            value={String(windowDays)}
            onValueChange={(v) => setWindowDays(Number(v))}
          >
            <SelectTrigger className="w-44 h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {WINDOW_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={String(opt.value)}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Network rollup */}
      <div className="grid gap-4 md:grid-cols-4">
        <RollupCard
          icon={<Users className="h-4 w-4 text-[#1B365D]" />}
          label="Decisions"
          value={isLoading ? null : network?.decisions_total ?? 0}
          sub={`${network?.introductions_total ?? 0} introductions`}
        />
        <RollupCard
          icon={<ShieldCheck className="h-4 w-4 text-emerald-700" />}
          label="Network partner ratio"
          value={
            isLoading
              ? null
              : network?.partner_ratio !== null && network?.partner_ratio !== undefined
                ? `${(network.partner_ratio * 100).toFixed(0)}%`
                : "—"
          }
          sub={`${network?.partner_introductions_total ?? 0} partner / ${network?.non_partner_introductions_total ?? 0} non-partner`}
        />
        <RollupCard
          icon={<Flag className="h-4 w-4 text-amber-700" />}
          label="Flagged decisions"
          value={isLoading ? null : network?.flagged_decisions ?? 0}
          sub={
            <Link
              to="/admin/concierge/audit-review"
              className="text-[#1B365D] underline-offset-2 hover:underline"
            >
              Open audit review →
            </Link>
          }
        />
        <RollupCard
          icon={<AlertTriangle className="h-4 w-4 text-red-700" />}
          label="Advisors over 70%"
          value={isLoading ? null : warnAdvisors.length}
          sub={`${watchAdvisors.length} more in the 50–69% watch band`}
        />
      </div>

      {/* Advisor table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Per-advisor distribution</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : isError ? (
            <div className="flex items-center justify-between gap-3 p-3 rounded-md border border-red-200 bg-red-50" role="alert">
              <p className="text-sm text-red-700">
                Failed to load advisor metrics. Retry, or check the edge function logs.
              </p>
              <Button variant="outline" size="sm" onClick={() => refetch()}>Retry</Button>
            </div>
          ) : advisors.length === 0 ? (
            <p className="text-sm text-slate-500">
              No introduction decisions recorded in the selected window.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs uppercase tracking-wide text-slate-600">
                  <tr className="border-b border-slate-200">
                    <th className="py-2 pr-4 text-left font-semibold">Advisor</th>
                    <th className="py-2 px-2 text-right font-semibold">Decisions</th>
                    <th className="py-2 px-2 text-right font-semibold">Intros</th>
                    <th className="py-2 px-2 text-right font-semibold">Partner</th>
                    <th className="py-2 px-2 text-right font-semibold">Non-partner</th>
                    <th className="py-2 px-2 text-right font-semibold">Partner %</th>
                    <th className="py-2 px-2 text-right font-semibold">Flagged</th>
                    <th className="py-2 pl-2 text-left font-semibold">Last decision</th>
                  </tr>
                </thead>
                <tbody>
                  {advisors.map((a) => {
                    const tone = ratioTone(a.partner_ratio);
                    const isWarn = (a.partner_ratio ?? 0) >= RATIO_WARN;
                    return (
                      <tr
                        key={a.advisor_id}
                        className="border-b border-slate-100 last:border-0"
                      >
                        <td className="py-2 pr-4">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-slate-900">
                              {a.advisor_display_name ?? a.advisor_id.slice(0, 8)}
                            </span>
                            {isWarn && (
                              <Badge variant="destructive" className="text-[10px]">
                                Review
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="py-2 px-2 text-right tabular-nums">
                          {a.decisions_total}
                        </td>
                        <td className="py-2 px-2 text-right tabular-nums">
                          {a.introductions_total}
                        </td>
                        <td className="py-2 px-2 text-right tabular-nums">
                          {a.partner_introductions_total}
                        </td>
                        <td className="py-2 px-2 text-right tabular-nums">
                          {a.non_partner_introductions_total}
                        </td>
                        <td className={`py-2 px-2 text-right tabular-nums ${tone.className}`}>
                          {tone.label}
                        </td>
                        <td className="py-2 px-2 text-right tabular-nums">
                          {a.flagged_decisions > 0 ? (
                            <span className="text-amber-700 font-medium">
                              {a.flagged_decisions}
                            </span>
                          ) : (
                            <span className="text-slate-400">0</span>
                          )}
                        </td>
                        <td className="py-2 pl-2 text-slate-600 whitespace-nowrap">
                          {a.last_decision_at
                            ? format(new Date(a.last_decision_at), "MMM d, yyyy")
                            : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-4 grid gap-2 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-red-600" />
              <span>
                <span className="font-semibold">≥ 70%</span> partner introductions —
                review for selection-pattern bias.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-amber-500" />
              <span>
                <span className="font-semibold">50–69%</span> — watch band; verify
                non-partner alternatives are being considered.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-600" />
              <span>
                <span className="font-semibold">&lt; 50%</span> — normal range given
                current partner density.
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function RollupCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs uppercase tracking-wide font-semibold text-slate-600 flex items-center gap-2">
          {icon}
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold text-slate-900 tabular-nums">
          {value === null ? <Skeleton className="h-7 w-16" /> : value}
        </p>
        {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}
