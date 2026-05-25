import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Gauge, TrendingUp, ArrowRight, Lock, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useFacilityPerformance } from "@/hooks/useFacilityPerformance";

/**
 * Dashboard "Listing health" card. Surfaces the canonical server-computed
 * listing_completeness_score (0–100) — never shown to providers before, who
 * only saw a locally-derived "Profile %" — plus the facility's search ranking
 * (rank / percentile within its state) from the Pro performance summary. Gives
 * providers concrete, data-backed feedback on why their listing ranks where it
 * does and what to improve. Reuses the cached useFacilityPerformance query.
 */
function completenessLabel(pct: number): { label: string; cls: string; bar: string } {
  if (pct >= 90) return { label: "Excellent", cls: "text-emerald-700", bar: "bg-emerald-500" };
  if (pct >= 70) return { label: "Good", cls: "text-sky-700", bar: "bg-sky-500" };
  if (pct >= 40) return { label: "Needs work", cls: "text-amber-700", bar: "bg-amber-500" };
  return { label: "Incomplete", cls: "text-rose-700", bar: "bg-rose-500" };
}

export function DashboardListingHealthCard({ facilityId }: { facilityId: string | undefined }) {
  const { data: scores, isLoading } = useQuery({
    queryKey: ["listing-health", facilityId],
    enabled: !!facilityId,
    staleTime: 1000 * 60 * 5,
    queryFn: async (): Promise<{ completeness: number } | null> => {
      if (!facilityId) return null;
      const { data, error } = await supabase
        .from("facilities")
        .select("listing_completeness_score")
        .eq("id", facilityId)
        .maybeSingle();
      if (error) throw error;
      return { completeness: (data as { listing_completeness_score: number | null } | null)?.listing_completeness_score ?? 0 };
    },
  });
  // Shares the cache key with DashboardPerformanceCard — no extra request.
  const { data: perf } = useFacilityPerformance(facilityId);
  const isPro = perf?.tier === "pro";
  const market = perf?.market ?? null;

  const completeness = scores?.completeness ?? 0;
  const c = completenessLabel(completeness);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b py-3.5">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <Gauge className="h-4 w-4 text-[#1B365D]" aria-hidden />
          Listing health
        </CardTitle>
        <Button asChild variant="ghost" size="sm" className="h-7 gap-1 text-xs text-[#1B365D]">
          <Link to="/provider/listings">
            Improve <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-4 p-4 sm:p-5">
        {isLoading ? (
          <Skeleton className="h-16 w-full" />
        ) : (
          <>
            {/* Profile completeness */}
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Profile completeness
                </span>
                <span className={cn("text-xs font-semibold", c.cls)}>
                  {completeness}% · {c.label}
                </span>
              </div>
              <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className={cn("h-full rounded-full transition-all", c.bar)}
                  style={{ width: `${Math.min(100, Math.max(0, completeness))}%` }}
                />
              </div>
              {completeness < 100 && (
                <p className="mt-1.5 text-xs text-slate-500">
                  Complete listings rank higher and convert more inquiries.{" "}
                  <Link to="/provider/listings" className="font-medium text-[#1B365D] hover:underline">
                    Finish your profile
                  </Link>
                  .
                </p>
              )}
            </div>

            {/* Search ranking (Pro) */}
            <div className="border-t border-slate-100 pt-3">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Search ranking
              </span>
              {isPro && market ? (
                <div className="mt-1.5 flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#1B365D]/10">
                    <TrendingUp className="h-5 w-5 text-[#1B365D]" aria-hidden />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900">
                      #{market.rank.toLocaleString()} of {market.total.toLocaleString()}
                      {market.state ? ` in ${market.state}` : ""}
                    </p>
                    <p className="text-xs text-slate-500">
                      Top {Math.max(1, 100 - market.percentile)}% by profile views (30d)
                    </p>
                  </div>
                </div>
              ) : isPro ? (
                <p className="mt-1.5 inline-flex items-center gap-1.5 text-sm text-slate-500">
                  <CheckCircle2 className="h-4 w-4 text-slate-400" aria-hidden />
                  Building your ranking — check back as views accrue.
                </p>
              ) : (
                <div className="mt-1.5 flex items-center justify-between gap-2">
                  <p className="inline-flex items-center gap-1.5 text-sm text-slate-500">
                    <Lock className="h-3.5 w-3.5" aria-hidden />
                    See your rank vs. peers in your state with Pro.
                  </p>
                  <Button asChild size="sm" className="h-7 gap-1 bg-[#1B365D] text-xs hover:bg-[#142a4a]">
                    <Link to="/provider/billing?upgrade=pro">Upgrade</Link>
                  </Button>
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
