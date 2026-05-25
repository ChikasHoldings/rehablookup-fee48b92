import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { AlertTriangle, CheckCircle2, Clock, RefreshCw, Timer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface JobHealth {
  jobname: string;
  schedule: string;
  active: boolean;
  last_run: string | null;
  last_status: string | null;
  last_message: string | null;
  runs_24h: number;
  failures_24h: number;
}

function relTime(ts: string | null): string {
  if (!ts) return "never";
  const d = new Date(ts);
  if (isNaN(d.getTime())) return "—";
  return `${formatDistanceToNow(d)} ago`;
}

/**
 * Super-admin observability surface: shows every scheduled cron job (which drive
 * the edge functions) with its last-run status and 24h run/failure counts, so a
 * failing webhook/cron/edge job is visible in-panel instead of silent. Backed by
 * the get_scheduled_job_health RPC (reads pg_cron run history).
 */
export function ScheduledJobsHealthCard() {
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["scheduled-job-health"],
    queryFn: async (): Promise<JobHealth[]> => {
      const { data, error } = await (
        supabase.rpc as unknown as (
          fn: string,
        ) => Promise<{ data: JobHealth[] | null; error: { message: string } | null }>
      )("get_scheduled_job_health");
      if (error) throw new Error(error.message);
      return data ?? [];
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const totalFailures = (data ?? []).reduce((s, j) => s + (j.failures_24h || 0), 0);
  const failingJobs = (data ?? []).filter((j) => j.failures_24h > 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Timer className="h-5 w-5 text-primary" />
              Scheduled Jobs & Edge Functions
            </CardTitle>
            <CardDescription>
              Cron-driven edge jobs — last run, status, and failures in the last 24 hours.
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="gap-1.5 shrink-0"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isFetching && "animate-spin")} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : isError ? (
          <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-2 text-sm">
              <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" aria-hidden />
              <div>
                <p className="font-medium text-foreground">Couldn't load job health.</p>
                <p className="text-muted-foreground mt-0.5">
                  {error instanceof Error ? error.message : "Unknown error"}
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        ) : (data ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            No scheduled jobs found.
          </p>
        ) : (
          <>
            <div className="mb-3 flex items-center gap-2 text-sm">
              {totalFailures === 0 ? (
                <Badge className="bg-emerald-600 hover:bg-emerald-600 gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" /> All {data!.length} jobs healthy (24h)
                </Badge>
              ) : (
                <Badge variant="destructive" className="gap-1">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {totalFailures} failure{totalFailures === 1 ? "" : "s"} across {failingJobs.length} job
                  {failingJobs.length === 1 ? "" : "s"} (24h)
                </Badge>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="py-2 pr-3 font-medium">Job</th>
                    <th className="py-2 px-3 font-medium hidden md:table-cell">Schedule</th>
                    <th className="py-2 px-3 font-medium">Last run</th>
                    <th className="py-2 px-3 font-medium">Status</th>
                    <th className="py-2 pl-3 font-medium text-right">24h runs / fails</th>
                  </tr>
                </thead>
                <tbody>
                  {data!.map((j) => {
                    const failing = j.failures_24h > 0;
                    const ok = (j.last_status ?? "").toLowerCase() === "succeeded";
                    return (
                      <tr
                        key={j.jobname}
                        className={cn("border-b last:border-0", failing && "bg-destructive/5")}
                      >
                        <td className="py-2 pr-3">
                          <span className="font-medium text-foreground">{j.jobname}</span>
                          {!j.active && (
                            <Badge variant="outline" className="ml-2 text-[10px]">paused</Badge>
                          )}
                          {failing && j.last_message && (
                            <p className="text-xs text-destructive/80 mt-0.5 truncate max-w-[280px]">
                              {j.last_message}
                            </p>
                          )}
                        </td>
                        <td className="py-2 px-3 hidden md:table-cell">
                          <code className="text-xs text-muted-foreground">{j.schedule}</code>
                        </td>
                        <td className="py-2 px-3 text-muted-foreground whitespace-nowrap">
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3 w-3" aria-hidden />
                            {relTime(j.last_run)}
                          </span>
                        </td>
                        <td className="py-2 px-3">
                          {j.last_status == null ? (
                            <Badge variant="outline" className="text-[10px]">no runs</Badge>
                          ) : ok ? (
                            <Badge className="bg-emerald-600 hover:bg-emerald-600 text-[10px]">
                              {j.last_status}
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="text-[10px]">{j.last_status}</Badge>
                          )}
                        </td>
                        <td className="py-2 pl-3 text-right tabular-nums">
                          <span className="text-muted-foreground">{j.runs_24h}</span>
                          {" / "}
                          <span className={cn(failing ? "text-destructive font-semibold" : "text-muted-foreground")}>
                            {j.failures_24h}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
