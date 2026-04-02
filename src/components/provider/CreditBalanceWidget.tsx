import { Link } from "react-router-dom";
import { CreditCard, Plus, TrendingDown, TrendingUp, Zap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useProviderCredits } from "@/hooks/useProviderCredits";
import { useProStatus } from "@/hooks/useProStatus";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface CreditBalanceWidgetProps {
  facilityId?: string;
  showTransactions?: boolean;
  className?: string;
}

export function CreditBalanceWidget({ 
  facilityId, 
  showTransactions = true,
  className 
}: CreditBalanceWidgetProps) {
  const { balance, balanceFormatted, transactions, isLoading } = useProviderCredits(facilityId);
  const { data: proStatus } = useProStatus(facilityId);

  const recentTransactions = transactions.slice(0, 3);

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardContent className="p-4 sm:p-6">
        {/* Header with balance */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <CreditCard className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Credit Balance</p>
              <p className="text-2xl font-bold text-foreground">
                {isLoading ? "..." : balanceFormatted}
              </p>
            </div>
          </div>
          
          <Button asChild size="sm" className="gap-1.5">
            <Link to="/provider/billing">
              <Plus className="h-4 w-4" />
              Add Credits
            </Link>
          </Button>
        </div>

        {/* Pro status indicator */}
        {proStatus?.isPro && (
          <div className="mb-4 p-3 rounded-lg bg-gradient-to-r from-amber-500/10 to-amber-500/5 border border-amber-500/20">
            <div className="flex items-center gap-2">
              <Badge className="bg-gradient-to-r from-amber-500 to-amber-600 text-white border-0 gap-1">
                <Zap className="h-3 w-3" />
                Pro Active
              </Badge>
              <span className="text-sm text-amber-700 dark:text-amber-300">
                {proStatus.unlockDiscountPercent}% off all unlocks
              </span>
            </div>
          </div>
        )}

        {/* Recent transactions */}
        {showTransactions && recentTransactions.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Recent Activity</p>
            <div className="space-y-2">
              {recentTransactions.map((tx) => (
                <div 
                  key={tx.id} 
                  className="flex items-center justify-between py-2 border-b border-border/50 last:border-0"
                >
                  <div className="flex items-center gap-2">
                    {tx.transaction_type === 'unlock' ? (
                      <TrendingDown className="h-4 w-4 text-orange-500" />
                    ) : tx.transaction_type === 'refund' ? (
                      <TrendingUp className="h-4 w-4 text-blue-500" />
                    ) : (
                      <TrendingUp className="h-4 w-4 text-emerald-500" />
                    )}
                    <div>
                      <p className="text-sm text-foreground">
                        {tx.transaction_type === 'purchase' && 'Credits added'}
                        {tx.transaction_type === 'unlock' && 'Lead unlocked'}
                        {tx.transaction_type === 'refund' && 'Refund'}
                        {tx.transaction_type === 'bonus' && 'Bonus credits'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(tx.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                  <span className={cn(
                    "font-medium",
                    tx.transaction_type === 'unlock' ? "text-orange-600" : "text-emerald-600"
                  )}>
                    {tx.transaction_type === 'unlock' ? "−" : "+"}${(Math.abs(tx.amount_cents) / 100).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
            
            {transactions.length > 3 && (
              <Button variant="ghost" size="sm" asChild className="w-full mt-2">
                <Link to="/provider/settings?tab=unlock-history">
                  View all transactions
                </Link>
              </Button>
            )}
          </div>
        )}

        {/* Empty state */}
        {showTransactions && recentTransactions.length === 0 && !isLoading && (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground">No transactions yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Purchase credits to unlock leads
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
