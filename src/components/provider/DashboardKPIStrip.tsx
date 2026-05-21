import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Inbox,
  Eye,
  Star,
  AlertTriangle,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Zap,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { fromLeadsProviderView } from "@/lib/leadsProviderView";
import { startOfWeek } from "date-fns";
import { cn } from "@/lib/utils";
import { AVG_REVENUE_PER_LEAD_CENTS } from "@/lib/leadValuation";

interface DashboardKPIStripProps {
  facilityId: string;
  isPro: boolean;
  impressionCount?: number;
  reviewCount?: number;
  totalLeadsCount?: number;
}

interface WeeklyKPIs {
  received: number;
  responded: number;
  missed: number;
  estimatedRevenueLostCents: number;
}

export function DashboardKPIStrip({ facilityId, isPro, impressionCount = 0, reviewCount = 0, totalLeadsCount = 0 }: DashboardKPIStripProps) {
  const weekStart = useMemo(() => startOfWeek(new Date(), { weekStartsOn: 1 }).toISOString(), []);

  // Three parallel head:true counts so the "received / responded /
  // missed this week" KPIs stay accurate for any volume of leads —
  // a prior version pulled the last 500 rows client-side and
  // under-reported for high-volume providers (70+ leads/day).
  const { data: kpis, isLoading } = useQuery({
    queryKey: ["dashboard-kpi-strip", facilityId, weekStart],
    queryFn: async (): Promise<WeeklyKPIs> => {
      const base = () =>
        fromLeadsProviderView()
          .select("id", { count: "exact", head: true })
          .eq("facility_id", facilityId)
          .gte("created_at", weekStart);

      const [receivedRes, expiredRes, openRes] = await Promise.all([
        base(),
        base().eq("status", "expired"),
        base().in("status", ["new"]),
      ]);

      if (receivedRes.error) throw receivedRes.error;
      if (expiredRes.error) throw expiredRes.error;
      if (openRes.error) throw openRes.error;

      const received = receivedRes.count ?? 0;
      const missed = expiredRes.count ?? 0;
      const openCount = openRes.count ?? 0;
      // "Responded" = anything not still-new and not expired.
      const responded = Math.max(0, received - missed - openCount);
      const estimatedRevenueLostCents = missed * AVG_REVENUE_PER_LEAD_CENTS;

      return { received, responded, missed, estimatedRevenueLostCents };
    },
    enabled: !!facilityId,
    staleTime: 1000 * 60 * 3,
    refetchOnWindowFocus: true,
    retry: 2,
  });

  const respondedThisWeek = kpis?.responded ?? 0;
  const receivedThisWeek = kpis?.received ?? 0;

  const metrics = [
    {
      label: "Total Leads",
      value: totalLeadsCount,
      subtitle: `${receivedThisWeek} received this week`,
      icon: Inbox,
      iconBg: "bg-primary/10",
      iconColor: "text-primary",
    },
    {
      label: "Responded",
      value: respondedThisWeek,
      subtitle: "this week",
      icon: TrendingUp,
      iconBg: "bg-emerald-500/10",
      iconColor: "text-emerald-600",
    },
    {
      label: "Impressions",
      value: impressionCount,
      icon: Eye,
      iconBg: "bg-primary/10",
      iconColor: "text-primary",
    },
    {
      label: "Reviews",
      value: reviewCount,
      icon: Star,
      iconBg: "bg-amber-500/10",
      iconColor: "text-amber-500",
    },
  ];

  return (
    <div className="space-y-3">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
        {metrics.map((m) => (
          <Card
            key={m.label}
            className="border-border/40 transition-colors"
          >
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2.5">
                <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center shrink-0", m.iconBg)}>
                  <m.icon className={cn("h-4 w-4", m.iconColor)} />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider leading-none mb-0.5 truncate">
                    {m.label}
                  </p>
                  {isLoading ? (
                    <Skeleton className="h-6 w-10 mt-0.5" />
                  ) : (
                    <>
                      <p className="text-lg sm:text-xl font-bold leading-tight tabular-nums text-foreground">
                        {m.value}
                      </p>
                      {m.subtitle && (
                        <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{m.subtitle}</p>
                      )}
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Contextual Banner — Pain-driven for Free, value-reinforcing for Pro */}
      {!isLoading && (
        <>
          {/* FREE USER: Missed leads pain banner */}
          {!isPro && (kpis?.missed ?? 0) > 0 && (
            <Card className="border-destructive/30 bg-gradient-to-r from-destructive/5 to-warning/5 overflow-hidden">
              <CardContent className="p-3.5 sm:p-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
                      <AlertTriangle className="h-5 w-5 text-destructive" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        ⚠️ You missed {kpis!.missed} lead{kpis!.missed !== 1 ? "s" : ""} this week
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        That's ~${((kpis!.missed * AVG_REVENUE_PER_LEAD_CENTS) / 100).toLocaleString()} in potential revenue.
                        Upgrade to Pro to receive every qualified lead with full contact details.
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    className="h-8 text-xs gap-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white border-0 shadow-sm shrink-0"
                    asChild
                  >
                    <Link to="/provider/billing">
                      <Sparkles className="h-3.5 w-3.5" />
                      Upgrade to Pro
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* FREE USER: No missed leads but still nudge */}
          {!isPro && (kpis?.missed ?? 0) === 0 && (kpis?.received ?? 0) > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/5 border border-primary/10 text-xs text-muted-foreground">
              <TrendingUp className="h-3.5 w-3.5 text-primary shrink-0" />
              <span>
                Great response rate! <span className="font-medium text-foreground">Upgrade to Pro</span> to receive every qualified lead with full contact details.
              </span>
              <Link to="/provider/billing" className="ml-auto text-primary font-medium hover:underline shrink-0">
                Learn more
              </Link>
            </div>
          )}

          {/* PRO USER: Speed encouragement */}
          {isPro && (kpis?.responded ?? 0) > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/5 border border-primary/10 text-xs text-muted-foreground">
              <Zap className="h-3.5 w-3.5 text-primary shrink-0" />
              <span>
                ⚡ Faster responses = higher admissions. Leads contacted within 5 min convert <span className="font-medium text-foreground">4× more</span>.
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
