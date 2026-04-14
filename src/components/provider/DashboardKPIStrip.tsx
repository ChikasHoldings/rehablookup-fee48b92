import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Inbox,
  Unlock,
  Eye,
  Star,
  AlertTriangle,
  Sparkles,
  Zap,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { startOfWeek, startOfMonth } from "date-fns";
import { cn } from "@/lib/utils";

interface DashboardKPIStripProps {
  facilityId: string;
  isPro: boolean;
  proSavingsCents?: number;
}

interface WeeklyKPIs {
  received: number;
  unlocked: number;
  views: number;
  reviewCount: number;
  avgRating: number;
}

export function DashboardKPIStrip({ facilityId, isPro, proSavingsCents = 0 }: DashboardKPIStripProps) {
  const weekStart = useMemo(() => startOfWeek(new Date(), { weekStartsOn: 1 }).toISOString(), []);

  const { data: kpis, isLoading } = useQuery({
    queryKey: ["dashboard-kpi-strip", facilityId, weekStart],
    queryFn: async (): Promise<WeeklyKPIs> => {
      // Fetch leads, views, and reviews in parallel
      const [leadsResult, viewsResult, reviewsResult] = await Promise.all([
        supabase
          .from("leads_provider_view")
          .select("id, status, is_unlocked, created_at")
          .eq("facility_id", facilityId)
          .gte("created_at", weekStart)
          .order("created_at", { ascending: false })
          .limit(500),
        supabase
          .from("facility_interactions")
          .select("interaction_count")
          .eq("facility_id", facilityId)
          .eq("interaction_type", "page_view"),
        supabase
          .from("facility_reviews")
          .select("rating")
          .eq("facility_id", facilityId)
          .eq("status", "approved"),
      ]);

      if (leadsResult.error) throw leadsResult.error;

      const leads = leadsResult.data || [];
      const received = leads.length;
      const unlocked = leads.filter(l => l.is_unlocked).length;

      // Sum all page view interactions
      const views = (viewsResult.data || []).reduce((sum, row) => sum + (row.interaction_count || 0), 0);

      // Reviews
      const reviews = reviewsResult.data || [];
      const reviewCount = reviews.length;
      const avgRating = reviewCount > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount
        : 0;

      return { received, unlocked, views, reviewCount, avgRating };
    },
    enabled: !!facilityId,
    staleTime: 1000 * 60 * 3,
    refetchOnWindowFocus: true,
    retry: 2,
  });

  // Fetch Pro savings this month from credit transactions
  const monthStart = useMemo(() => startOfMonth(new Date()).toISOString(), []);
  const { data: monthlySavings = 0 } = useQuery({
    queryKey: ["pro-monthly-savings", facilityId, monthStart],
    queryFn: async (): Promise<number> => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return 0;

      const { data, error } = await supabase
        .from("credit_transactions")
        .select("discount_amount_cents")
        .eq("provider_id", session.user.id)
        .eq("transaction_type", "unlock")
        .eq("discount_applied", true)
        .gte("created_at", monthStart);

      if (error) return 0;
      return (data || []).reduce((sum, tx) => sum + (tx.discount_amount_cents || 0), 0);
    },
    enabled: isPro && !!facilityId,
    staleTime: 1000 * 60 * 5,
  });

  const effectiveSavings = proSavingsCents || monthlySavings;

  const metrics = [
    {
      label: "Leads Received",
      value: kpis?.received ?? 0,
      icon: Inbox,
      iconBg: "bg-primary/10",
      iconColor: "text-primary",
    },
    {
      label: "Leads Unlocked",
      value: kpis?.unlocked ?? 0,
      icon: Unlock,
      iconBg: "bg-emerald-500/10",
      iconColor: "text-emerald-600 dark:text-emerald-400",
    },
    {
      label: "Views",
      value: kpis?.views ?? 0,
      icon: Eye,
      iconBg: "bg-blue-500/10",
      iconColor: "text-blue-600 dark:text-blue-400",
    },
    {
      label: "Reviews",
      value: (kpis?.reviewCount ?? 0) > 0
        ? `${kpis!.reviewCount} (${kpis!.avgRating.toFixed(1)}★)`
        : "0",
      icon: Star,
      iconBg: "bg-amber-500/10",
      iconColor: "text-amber-500",
    },
  ];

  return (
    <div className="space-y-3">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
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
                    <p className="text-lg sm:text-xl font-bold leading-tight tabular-nums text-foreground">
                      {typeof m.value === "number" ? m.value : m.value}
                    </p>
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
          {/* PRO USER: Savings reinforcement */}
          {isPro && effectiveSavings > 0 && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-gradient-to-r from-amber-500/10 to-emerald-500/5 border border-amber-500/20 text-xs">
              <Zap className="h-4 w-4 text-amber-500 shrink-0" />
              <span className="text-foreground">
                🔥 You saved <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  ${(effectiveSavings / 100).toFixed(2)}
                </span> with Pro this month
              </span>
            </div>
          )}

          {/* PRO USER: Speed encouragement */}
          {isPro && (kpis?.unlocked ?? 0) > 0 && (
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
