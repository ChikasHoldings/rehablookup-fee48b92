import { Lock, Sparkles, TrendingUp, CheckCircle, Phone, Users, Coins, Timer, Flame, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { useLeadCountdown } from "@/hooks/useLeadCountdown";
import { cn } from "@/lib/utils";

interface LockedLeadDetailPanelProps {
  totalLeadsCount: number;
  onClose: () => void;
  selectedLeadCreatedAt?: string;
  isRedistributed?: boolean;
}

export function LockedLeadDetailPanel({ totalLeadsCount, onClose, selectedLeadCreatedAt, isRedistributed }: LockedLeadDetailPanelProps) {
  const countdown = useLeadCountdown(selectedLeadCreatedAt || new Date().toISOString());
  const showCountdown = !!selectedLeadCreatedAt && !countdown.isExpired;

  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-background p-6">
      <div className="w-full max-w-sm text-center space-y-6">
        {/* Lock Icon */}
        <div className="h-14 w-14 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center mx-auto">
          <Lock className="h-7 w-7 text-amber-600 dark:text-amber-400" />
        </div>
        
        {/* Title */}
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Inquiry Details Locked
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Unlock with credits to view contact info
          </p>
        </div>

        {/* Countdown Timer */}
        {showCountdown && (
          <div className={cn(
            "py-3 px-4 rounded-xl border text-center",
            countdown.urgencyTier === "critical" && "bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800",
            countdown.urgencyTier === "warning" && "bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800",
            countdown.urgencyTier === "safe" && "bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800",
          )}>
            <div className="flex items-center justify-center gap-2 mb-1">
              <Timer className={cn(
                "h-4 w-4",
                countdown.urgencyTier === "critical" && "text-red-600 dark:text-red-400 animate-pulse",
                countdown.urgencyTier === "warning" && "text-amber-600 dark:text-amber-400",
                countdown.urgencyTier === "safe" && "text-blue-600 dark:text-blue-400",
              )} />
              <span className={cn(
                "text-xs font-medium uppercase tracking-wider",
                countdown.urgencyTier === "critical" && "text-red-600 dark:text-red-400",
                countdown.urgencyTier === "warning" && "text-amber-600 dark:text-amber-400",
                countdown.urgencyTier === "safe" && "text-blue-600 dark:text-blue-400",
              )}>
                Exclusive Access Expires In
              </span>
            </div>
            <div className={cn(
              "text-2xl font-mono font-bold tracking-wider",
              countdown.urgencyTier === "critical" && "text-red-700 dark:text-red-300",
              countdown.urgencyTier === "warning" && "text-amber-700 dark:text-amber-300",
              countdown.urgencyTier === "safe" && "text-blue-700 dark:text-blue-300",
            )}>
              {countdown.formatted}
            </div>
            {/* Progress bar */}
            <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
              <div 
                className={cn(
                  "h-full rounded-full transition-all duration-1000",
                  countdown.urgencyTier === "critical" && "bg-red-500",
                  countdown.urgencyTier === "warning" && "bg-amber-500",
                  countdown.urgencyTier === "safe" && "bg-blue-500",
                )}
                style={{ width: `${100 - countdown.percentElapsed}%` }}
              />
            </div>
            {countdown.urgencyTier === "critical" && (
              <p className="text-[11px] text-red-600 dark:text-red-400 mt-1.5 font-medium">
                ⚠️ This lead will be redistributed soon!
              </p>
            )}
          </div>
        )}

        {/* Scarcity / FOMO Signals */}
        {isRedistributed ? (
          <div className="py-3 px-4 rounded-xl bg-orange-50 border border-orange-200 dark:bg-orange-950/30 dark:border-orange-800 space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-orange-700 dark:text-orange-400">
              <Flame className="h-4 w-4" />
              Redistributed Lead
            </div>
            <p className="text-xs text-orange-600 dark:text-orange-400 flex items-center gap-1.5">
              <Users className="h-3 w-3 flex-shrink-0" />
              ⚠️ Limited availability — max 2 providers only
            </p>
            <p className="text-xs text-orange-600 dark:text-orange-400 flex items-center gap-1.5">
              <Eye className="h-3 w-3 flex-shrink-0" />
              👀 Another provider may have already seen this lead
            </p>
          </div>
        ) : showCountdown && countdown.urgencyTier !== "safe" && (
          <div className="py-2.5 px-4 rounded-xl bg-orange-50/70 border border-orange-200/60 dark:bg-orange-950/20 dark:border-orange-800/50">
            <p className="text-xs text-orange-600 dark:text-orange-400 flex items-center gap-1.5 font-medium">
              <Flame className="h-3.5 w-3.5" />
              🔥 This lead may be shared with others if not unlocked
            </p>
          </div>
        )}

        {totalLeadsCount > 0 && (
          <div className="py-4 px-6 rounded-xl bg-primary/5 border border-primary/20">
            <div className="text-4xl font-bold text-primary">
              {totalLeadsCount}
            </div>
            <p className="text-sm text-primary/80 font-medium">
              Inquir{totalLeadsCount !== 1 ? 'ies' : 'y'} waiting for you
            </p>
          </div>
        )}

        {/* What's hidden - compact */}
        <div className="space-y-2 text-left">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            What's Hidden
          </p>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-muted/50 text-sm">
              <Phone className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0" />
              <span className="text-muted-foreground">Direct phone number</span>
            </div>
            <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-muted/50 text-sm">
              <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
              <span className="text-muted-foreground">Verified email address</span>
            </div>
            <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-muted/50 text-sm">
              <Users className="h-4 w-4 text-purple-600 dark:text-purple-400 flex-shrink-0" />
              <span className="text-muted-foreground">Treatment & insurance details</span>
            </div>
          </div>
        </div>

        {/* How it works */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-center gap-2 text-sm">
            <Badge className="bg-green-600 text-white border-0">
              <Coins className="h-3 w-3 mr-1" />
              Pay-per-unlock
            </Badge>
          </div>
          
          <ul className="space-y-1.5 text-left">
            {[
              "Only pay for inquiries you want",
              "Full contact details on unlock",
              "Pro members get 20% off",
            ].map((feature, i) => (
              <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle className="h-3.5 w-3.5 text-green-600 dark:text-green-400 flex-shrink-0" />
                {feature}
              </li>
            ))}
          </ul>
        </div>

        {/* Stats */}
        <div className="flex items-center justify-center gap-4 py-3 text-xs text-muted-foreground">
          <span>Trusted by 500+ providers</span>
          <span className="flex items-center gap-1 text-primary font-medium">
            <TrendingUp className="h-3.5 w-3.5" />
            4x Avg. ROI
          </span>
        </div>

        {/* CTA */}
        <div className="space-y-2">
          <Button asChild size="default" className="w-full gap-2">
            <Link to="/provider/billing">
              <Coins className="h-4 w-4" />
              Get Credits
            </Link>
          </Button>
          <Button 
            variant="ghost" 
            size="sm"
            className="text-muted-foreground hover:text-foreground"
            onClick={onClose}
          >
            Maybe later
          </Button>
        </div>
      </div>
    </div>
  );
}
