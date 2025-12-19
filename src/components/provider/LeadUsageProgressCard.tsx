import { Link } from "react-router-dom";
import { TrendingUp, Zap, Star, Share2, Crown, AlertTriangle, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { differenceInDays, endOfMonth, startOfMonth, addMonths, format } from "date-fns";

interface LeadUsageProgressCardProps {
  usedLeads: number;
  leadLimit: number;
  plan: "basic" | "professional" | "featured";
  subscriptionEnd?: string | null;
  className?: string;
}

export function LeadUsageProgressCard({
  usedLeads,
  leadLimit,
  plan,
  subscriptionEnd,
  className,
}: LeadUsageProgressCardProps) {
  // Don't show for Basic plan (they have different messaging)
  if (plan === "basic" || leadLimit === 0) {
    return null;
  }

  // Calculate days until billing cycle resets
  const calculateBillingCycleReset = () => {
    if (subscriptionEnd) {
      // Use subscription end date as the reset point
      const endDate = new Date(subscriptionEnd);
      const now = new Date();
      const daysRemaining = differenceInDays(endDate, now);
      return {
        daysRemaining: Math.max(0, daysRemaining),
        resetDate: endDate,
      };
    }
    // Fallback: use end of current month
    const now = new Date();
    const monthEnd = endOfMonth(now);
    const daysRemaining = differenceInDays(monthEnd, now);
    return {
      daysRemaining: Math.max(0, daysRemaining),
      resetDate: monthEnd,
    };
  };

  const { daysRemaining, resetDate } = calculateBillingCycleReset();

  const remainingLeads = Math.max(0, leadLimit - usedLeads);
  const usagePercent = Math.min((usedLeads / leadLimit) * 100, 100);
  const isNearLimit = usagePercent >= 80 && usagePercent < 100;
  const isAtLimit = usagePercent >= 100;

  const exclusivity = plan === "featured" ? "exclusive" : "shared";

  // Get progress bar color based on usage
  const getProgressColor = () => {
    if (isAtLimit) return "[&>div]:bg-destructive";
    if (isNearLimit) return "[&>div]:bg-amber-500";
    return plan === "featured" ? "[&>div]:bg-accent" : "[&>div]:bg-primary";
  };

  // Get border color based on plan
  const getBorderColor = () => {
    if (isAtLimit) return "border-destructive/30";
    if (isNearLimit) return "border-amber-500/30";
    return plan === "featured" ? "border-accent/30" : "border-primary/30";
  };

  // Get background gradient based on plan
  const getBackground = () => {
    if (isAtLimit) return "bg-destructive/5";
    if (isNearLimit) return "bg-amber-500/5";
    return plan === "featured" 
      ? "bg-gradient-to-r from-accent/5 via-background to-primary/5" 
      : "bg-primary/5";
  };

  return (
    <Card className={cn("overflow-hidden", getBorderColor(), getBackground(), className)}>
      <CardContent className="p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Left side - Usage info */}
          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <div className={cn(
                  "h-8 w-8 rounded-lg flex items-center justify-center",
                  isAtLimit ? "bg-destructive/15" : isNearLimit ? "bg-amber-500/15" : plan === "featured" ? "bg-accent/15" : "bg-primary/15"
                )}>
                  {isAtLimit || isNearLimit ? (
                    <AlertTriangle className={cn("h-4 w-4", isAtLimit ? "text-destructive" : "text-amber-600")} />
                  ) : (
                    <TrendingUp className={cn("h-4 w-4", plan === "featured" ? "text-accent" : "text-primary")} />
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Monthly Lead Usage</h3>
                </div>
              </div>
              
              {/* Exclusivity badge */}
              {exclusivity === "exclusive" ? (
                <Badge variant="outline" className="gap-1 text-xs border-accent/50 bg-accent/10 text-accent">
                  <Star className="h-3 w-3" />
                  Exclusive
                </Badge>
              ) : (
                <Badge variant="outline" className="gap-1 text-xs border-primary/50 bg-primary/10 text-primary">
                  <Share2 className="h-3 w-3" />
                  Shared
                </Badge>
              )}
            </div>

            {/* Progress bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {usedLeads} of {leadLimit} leads used
                </span>
                <span className={cn(
                  "font-semibold",
                  isAtLimit ? "text-destructive" : isNearLimit ? "text-amber-600" : "text-foreground"
                )}>
                  {Math.round(usagePercent)}%
                </span>
              </div>
              <Progress 
                value={usagePercent} 
                className={cn("h-3", getProgressColor())}
              />
            </div>

            {/* Remaining leads and billing cycle */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <p className={cn(
                "text-sm font-medium",
                isAtLimit ? "text-destructive" : isNearLimit ? "text-amber-600" : "text-muted-foreground"
              )}>
                {isAtLimit 
                  ? "Lead cap reached — excluded from routing until next billing cycle" 
                  : `${remainingLeads} lead${remainingLeads !== 1 ? 's' : ''} remaining this month`
                }
              </p>
              
              {/* Billing cycle countdown */}
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                <span>
                  {daysRemaining === 0 
                    ? "Resets today" 
                    : daysRemaining === 1 
                      ? "Resets tomorrow" 
                      : `Resets in ${daysRemaining} days`
                  }
                  <span className="hidden sm:inline"> ({format(resetDate, "MMM d")})</span>
                </span>
              </div>
            </div>
          </div>

          {/* Right side - Upgrade CTA (only show for Professional or when at limit) */}
          {(plan === "professional" || isAtLimit) && (
            <div className="shrink-0">
              {plan === "professional" ? (
                <div className="flex flex-col items-center gap-2 p-3 rounded-lg bg-accent/10 border border-accent/20">
                  <div className="flex items-center gap-1.5 text-xs text-accent">
                    <Crown className="h-3.5 w-3.5" />
                    <span className="font-medium">Want exclusive leads?</span>
                  </div>
                  <Button size="sm" variant="default" className="gap-1.5 bg-accent hover:bg-accent/90 text-accent-foreground" asChild>
                    <Link to="/provider/billing">
                      <Zap className="h-3.5 w-3.5" />
                      Upgrade to Featured
                    </Link>
                  </Button>
                </div>
              ) : null}
            </div>
          )}
        </div>

        {/* Additional info for plans */}
        <div className="mt-3 pt-3 border-t border-border/50">
          <p className="text-xs text-muted-foreground">
            {plan === "featured" 
              ? "Your leads are 100% exclusive — never shared with other providers."
              : "Your leads may be shared with up to 1 other Professional provider."
            }
          </p>
        </div>
      </CardContent>
    </Card>
  );
}