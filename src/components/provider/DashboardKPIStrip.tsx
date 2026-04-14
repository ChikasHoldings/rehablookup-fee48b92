import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Inbox,
  Unlock,
  AlertCircle,
  DollarSign,
  Zap,
  TrendingUp,
  Crown,
  ArrowRight,
} from "lucide-react";
import { Link } from "react-router-dom";
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
  missed: number;
  estRevenueLost: number;
}

export function DashboardKPIStrip({ facilityId, isPro, proSavingsCents = 0 }: DashboardKPIStripProps) {
  const weekStart = useMemo(() => startOfWeek(new Date(), { weekStartsOn: 1 }).toISOString(), []);

  const { data: kpis, isLoading } = useQuery({
    queryKey: ["dashboard-kpi-strip", facilityId, weekStart],
    queryFn: async (): Promise<WeeklyKPIs> => {
      // Fetch leads for the week
      const { data } = await supabase
        .from("leads_provider_view")
        .select("id, is_unlocked")
        .eq("facility_id", facilityId)
        .gte("created_at", weekStart)
        .limit(500);

      const leads = data || [];
      const received = leads.length;
      const unlocked = leads.filter(l => l.is_unlocked).length;
      const missed = received - unlocked;
      const estRevenueLost = missed * 5000;

      return { received, unlocked, missed, estRevenueLost };
    },
    enabled: !!facilityId,
    staleTime: 1000 * 60 * 3,
    refetchOnWindowFocus: true,
    retry: 2,
  });

  // Fetch Pro savings this month
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

  const missed = kpis?.missed ?? 0;
  const estRevenueLost = kpis?.estRevenueLost ?? 0;

  const metrics = [
    {
      label: "Leads Received",
      value: String(kpis?.received ?? 0),
      icon: Inbox,
      iconBg: "bg-primary/10",
      iconColor: "text-primary",
    },
    {
      label: "Leads Unlocked",
      value: String(kpis?.unlocked ?? 0),
      icon: Unlock,
      iconBg: "bg-emerald-500/10",
      iconColor: "text-emerald-600 dark:text-emerald-400",
    },
    {
      label: "Missed Leads",
      value: String(missed),
      icon: AlertCircle,
      iconBg: missed > 0 ? "bg-destructive/10" : "bg-muted/50",
      iconColor: missed > 0 ? "text-destructive" : "text-muted-foreground",
    },
    {
      label: "Est. Revenue L...",
      value: `$${estRevenueLost.toLocaleString()}`,
      icon: DollarSign,
      iconBg: estRevenueLost > 0 ? "bg-destructive/10" : "bg-muted/50",
      iconColor: estRevenueLost > 0 ? "text-destructive" : "text-muted-foreground",
      highlight: estRevenueLost > 0,
    },
  ];

  return (
    <div className="space-y-3">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        {metrics.map((m) => (
          <Card key={m.label} className="border-border/40 transition-colors">
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
                      {m.value}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Contextual Banners */}
      {!isLoading && (
        <>
          {/* FREE USER: Nudge */}
          {!isPro && (kpis?.received ?? 0) > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/5 border border-primary/10 text-xs text-muted-foreground">
              <TrendingUp className="h-3.5 w-3.5 text-primary shrink-0" />
              <span>
                <span className="font-medium text-foreground">Upgrade to Pro</span> to save 20% on unlocks and get priority lead access.
              </span>
              <Link to="/provider/pro-upgrade" className="ml-auto text-primary font-medium hover:underline shrink-0">
                Learn more
              </Link>
            </div>
          )}

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