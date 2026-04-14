import { Link } from "react-router-dom";
import { CreditCard, AlertTriangle, Crown, Sparkles, ArrowRight, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface DashboardTopBarProps {
  balanceCents: number;
  isPro: boolean;
  isLoading: boolean;
  discountPercent?: number;
}

const LOW_CREDIT_THRESHOLD_CENTS = 2000; // $20.00

export function DashboardTopBar({ balanceCents, isPro, isLoading, discountPercent = 20 }: DashboardTopBarProps) {
  const isLowCredits = balanceCents > 0 && balanceCents < LOW_CREDIT_THRESHOLD_CENTS;
  const isZeroCredits = balanceCents <= 0;
  const balanceFormatted = `$${(balanceCents / 100).toFixed(2)}`;

  return (
    <div className="w-full rounded-xl border border-border/60 bg-card shadow-sm overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 sm:p-4">
        {/* Left: Credit Balance */}
        <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
          {/* Balance */}
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <CreditCard className="h-4.5 w-4.5 text-primary" />
            </div>
            <div>
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider leading-none mb-0.5">
                Credit Balance
              </p>
              {isLoading ? (
                <Skeleton className="h-6 w-16" />
              ) : (
                <p className="text-lg font-bold text-foreground leading-tight tabular-nums">
                  {balanceFormatted}
                </p>
              )}
            </div>
          </div>

          {/* Low / Zero Credits Warning */}
          {!isLoading && (isLowCredits || isZeroCredits) && (
            <div className={cn(
              "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium",
              isZeroCredits
                ? "bg-destructive/10 text-destructive border border-destructive/20"
                : "bg-warning/10 text-warning border border-warning/20"
            )}>
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              <span>{isZeroCredits ? "No credits — add funds to unlock leads" : "Low credits — top up soon"}</span>
            </div>
          )}

          {/* Pro Badge or Upgrade Nudge */}
          {isPro ? (
            <Badge className="bg-gradient-to-r from-amber-500 to-amber-600 text-white border-0 gap-1 h-7 px-2.5 text-xs shadow-sm">
              <Crown className="h-3.5 w-3.5" />
              Pro Active
              {discountPercent > 0 && (
                <span className="opacity-90 ml-0.5">• {discountPercent}% off</span>
              )}
            </Badge>
          ) : null}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {(isLowCredits || isZeroCredits) && !isLoading && (
            <Button size="sm" className="h-8 text-xs gap-1.5" asChild>
              <Link to="/provider/billing?purchase_credits=true">
                <Zap className="h-3.5 w-3.5" />
                Add Credits
              </Link>
            </Button>
          )}

          {!isPro && (
            <Button
              size="sm"
              variant={isLowCredits || isZeroCredits ? "outline" : "default"}
              className={cn(
                "h-8 text-xs gap-1.5",
                !(isLowCredits || isZeroCredits) && "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white border-0 shadow-sm"
              )}
              asChild
            >
              <Link to="/provider/pro-upgrade">
                <Sparkles className="h-3.5 w-3.5" />
                Upgrade to Pro
                <ArrowRight className="h-3 w-3" />
              </Link>
            </Button>
          )}

          {isPro && !isLowCredits && !isZeroCredits && (
            <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" asChild>
              <Link to="/provider/billing">
                Add Credits
              </Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
