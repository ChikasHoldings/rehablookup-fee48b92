import { useMemo } from "react";
import { DollarSign, TrendingUp, Unlock, ArrowUpRight, BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { type CreditTransaction } from "@/hooks/useProviderCredits";

interface ProROIWidgetProps {
  transactions: CreditTransaction[];
  balanceCents: number;
  isPro: boolean;
}

export function ProROIWidget({ transactions, balanceCents, isPro }: ProROIWidgetProps) {
  const stats = useMemo(() => {
    const now = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(now.getDate() - 30);

    const recentTx = transactions.filter(
      (tx) => new Date(tx.created_at) >= thirtyDaysAgo
    );

    const totalSpent = recentTx
      .filter((tx) => tx.transaction_type === "unlock")
      .reduce((sum, tx) => sum + Math.abs(tx.amount_cents), 0);

    const totalPurchased = recentTx
      .filter((tx) => tx.transaction_type === "purchase" || tx.transaction_type === "bonus")
      .reduce((sum, tx) => sum + tx.amount_cents, 0);

    const unlocksCount = recentTx.filter(
      (tx) => tx.transaction_type === "unlock"
    ).length;

    const totalSaved = recentTx
      .filter((tx) => tx.discount_applied && tx.discount_amount_cents)
      .reduce((sum, tx) => sum + (tx.discount_amount_cents ?? 0), 0);

    const avgUnlockCost = unlocksCount > 0 ? Math.round(totalSpent / unlocksCount) : 0;

    // Simple utilization: spent / (spent + remaining balance)
    const totalAvailable = totalSpent + balanceCents;
    const utilization = totalAvailable > 0 ? Math.round((totalSpent / totalAvailable) * 100) : 0;

    return {
      totalSpent,
      totalPurchased,
      unlocksCount,
      totalSaved,
      avgUnlockCost,
      utilization,
    };
  }, [transactions, balanceCents]);

  if (transactions.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="p-3.5 pb-2.5 border-b">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" />
          <CardTitle className="text-sm font-semibold">Credit ROI</CardTitle>
          <span className="text-xs text-muted-foreground ml-auto">30 days</span>
        </div>
      </CardHeader>
      <CardContent className="p-3.5">
        <div className="space-y-3">
          {/* Key metrics */}
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2.5 rounded-lg bg-muted/50">
              <div className="flex items-center gap-1.5 mb-1">
                <Unlock className="h-3 w-3 text-primary" />
                <span className="text-xs text-muted-foreground">Unlocks</span>
              </div>
              <p className="text-lg font-bold text-foreground tabular-nums">{stats.unlocksCount}</p>
            </div>
            <div className="p-2.5 rounded-lg bg-muted/50">
              <div className="flex items-center gap-1.5 mb-1">
                <DollarSign className="h-3 w-3 text-primary" />
                <span className="text-xs text-muted-foreground">Spent</span>
              </div>
              <p className="text-lg font-bold text-foreground tabular-nums">
                ${(stats.totalSpent / 100).toFixed(0)}
              </p>
            </div>
          </div>

          {/* Avg cost per unlock */}
          {stats.unlocksCount > 0 && (
            <div className="flex items-center justify-between p-2.5 rounded-lg border border-border/50">
              <span className="text-xs text-muted-foreground">Avg. Cost / Unlock</span>
              <span className="text-sm font-bold text-foreground tabular-nums">
                ${(stats.avgUnlockCost / 100).toFixed(2)}
              </span>
            </div>
          )}

          {/* Pro savings */}
          {isPro && stats.totalSaved > 0 && (
            <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-success/5 border border-success/20">
              <TrendingUp className="h-4 w-4 text-success shrink-0" />
              <div className="flex-1">
                <p className="text-xs font-medium text-success">Pro Savings</p>
                <p className="text-sm font-bold text-success tabular-nums">
                  ${(stats.totalSaved / 100).toFixed(2)} saved
                </p>
              </div>
            </div>
          )}

          {/* Credit utilization */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Credit Utilization</span>
              <span className="text-xs font-medium text-foreground">{stats.utilization}%</span>
            </div>
            <Progress value={stats.utilization} className="h-1.5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
