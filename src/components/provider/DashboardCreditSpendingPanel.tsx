import React, { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Wallet, TrendingDown, DollarSign, Zap, RefreshCw, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { startOfMonth } from "date-fns";

interface DashboardCreditSpendingPanelProps {
  facilityId?: string;
  balanceCents: number;
  isLoading?: boolean;
}

export function DashboardCreditSpendingPanel({
  facilityId,
  balanceCents,
  isLoading: balanceLoading,
}: DashboardCreditSpendingPanelProps) {
  const queryClient = useQueryClient();

  const { data: spending, isLoading: spendingLoading } = useQuery({
    queryKey: ["credit-spending-monthly", facilityId],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return { totalSpent: 0, leadCount: 0, avgCost: 0 };

      const monthStart = startOfMonth(new Date()).toISOString();

      const { data, error } = await supabase
        .from("credit_transactions")
        .select("amount_cents, transaction_type")
        .eq("provider_id", session.user.id)
        .eq("transaction_type", "unlock")
        .gte("created_at", monthStart);

      if (error) throw error;

      const transactions = data || [];
      const totalSpent = transactions.reduce((sum, t) => sum + Math.abs(t.amount_cents), 0);
      const leadCount = transactions.length;
      const avgCost = leadCount > 0 ? Math.round(totalSpent / leadCount) : 0;

      return { totalSpent, leadCount, avgCost };
    },
    staleTime: 1000 * 60 * 3,
    refetchOnWindowFocus: true,
  });

  // Real-time subscription for credit changes
  useEffect(() => {
    if (!facilityId) return;
    const channel = supabase
      .channel(`credit-spending-live-${facilityId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "credit_transactions",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["credit-spending-monthly", facilityId] });
          queryClient.invalidateQueries({ queryKey: ["provider-credits"] });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [facilityId, queryClient]);

  const isLoading = balanceLoading || spendingLoading;
  const balanceDollars = (balanceCents / 100).toFixed(2);
  const isLow = balanceCents < 2000; // Under $20

  if (isLoading) {
    return <Skeleton className="h-48 rounded-lg" />;
  }

  return (
    <Card>
      <CardHeader className="pb-2 px-4 pt-4">
        <div className="flex items-center gap-2">
          <Wallet className="h-4 w-4 text-primary" />
          <CardTitle className="text-sm font-semibold">Credits & Spending</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-3">
        {/* Balance */}
        <div className={cn(
          "rounded-lg border p-3 flex items-center justify-between",
          isLow ? "border-destructive/30 bg-destructive/[0.03]" : "border-border"
        )}>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Current Balance</p>
            <p className={cn(
              "text-2xl font-bold tabular-nums leading-none mt-1",
              isLow ? "text-destructive" : "text-foreground"
            )}>
              ${balanceDollars}
            </p>
            {isLow && (
              <p className="text-[11px] text-destructive mt-1 font-medium">⚠️ Low balance — top up to avoid missing leads</p>
            )}
          </div>
          <div className={cn(
            "h-10 w-10 rounded-lg flex items-center justify-center shrink-0",
            isLow ? "bg-destructive/10" : "bg-primary/10"
          )}>
            <DollarSign className={cn("h-5 w-5", isLow ? "text-destructive" : "text-primary")} />
          </div>
        </div>

        {/* Monthly stats */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="rounded-md border px-2.5 py-2 bg-card">
            <div className="flex items-center gap-1.5 mb-1">
              <div className="h-5 w-5 rounded flex items-center justify-center bg-blue-500/10 shrink-0">
                <TrendingDown className="h-3 w-3 text-blue-600" />
              </div>
              <p className="text-[11px] text-muted-foreground font-medium">Spent This Month</p>
            </div>
            <p className="text-base font-bold text-foreground leading-none">
              ${((spending?.totalSpent || 0) / 100).toFixed(0)}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {spending?.leadCount || 0} lead{(spending?.leadCount || 0) !== 1 ? "s" : ""} unlocked
            </p>
          </div>
          <div className="rounded-md border px-2.5 py-2 bg-card">
            <div className="flex items-center gap-1.5 mb-1">
              <div className="h-5 w-5 rounded flex items-center justify-center bg-emerald-500/10 shrink-0">
                <Zap className="h-3 w-3 text-emerald-600" />
              </div>
              <p className="text-[11px] text-muted-foreground font-medium">Avg Cost / Lead</p>
            </div>
            <p className="text-base font-bold text-foreground leading-none">
              ${((spending?.avgCost || 0) / 100).toFixed(0)}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">per unlock</p>
          </div>
        </div>

        {/* CTAs */}
        <div className="flex gap-2">
          <Button size="sm" className="flex-1 h-8 text-xs" asChild>
            <Link to="/provider/billing?purchase_credits=true">
              <Plus className="h-3 w-3 mr-1" />
              Top Up Credits
            </Link>
          </Button>
          <Button size="sm" variant="outline" className="flex-1 h-8 text-xs" asChild>
            <Link to="/provider/billing?tab=auto-reload">
              <RefreshCw className="h-3 w-3 mr-1" />
              Auto-Reload
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
