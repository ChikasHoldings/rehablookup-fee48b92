import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, TrendingUp, Zap, X, Lock, Crown, Users } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

interface LeadUsageIndicatorProps {
  usedLeads: number;
  leadLimit: number;
  variant?: "compact" | "full";
  className?: string;
}

export function LeadUsageIndicator({ 
  usedLeads, 
  leadLimit, 
  variant = "full",
  className = "" 
}: LeadUsageIndicatorProps) {
  // Handle 0 lead limit case (Basic plan)
  if (leadLimit === 0) {
    if (variant === "compact") {
      return (
        <div className={`flex items-center gap-2 text-sm ${className}`}>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">No leads included</span>
        </div>
      );
    }
    return (
      <div className={`space-y-2 ${className}`}>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-muted-foreground">0</span>
          <span className="text-sm text-muted-foreground">leads/month</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Upgrade to start receiving leads
        </p>
      </div>
    );
  }

  const usagePercent = Math.min((usedLeads / leadLimit) * 100, 100);
  const isNearLimit = usagePercent >= 80 && usagePercent < 100;
  const isAtLimit = usagePercent >= 100;

  // Determine progress bar color
  const getProgressColor = () => {
    if (isAtLimit) return "bg-destructive";
    if (isNearLimit) return "bg-amber-500";
    return "bg-primary";
  };

  if (variant === "compact") {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <div className="flex items-center gap-2 text-sm">
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">Leads:</span>
          <span className={`font-semibold ${isAtLimit ? "text-destructive" : isNearLimit ? "text-amber-600" : "text-foreground"}`}>
            {usedLeads} / {leadLimit}
          </span>
        </div>
        <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all ${getProgressColor()}`}
            style={{ width: `${usagePercent}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">Monthly Lead Usage</span>
        </div>
        <span className={`text-sm font-semibold ${isAtLimit ? "text-destructive" : isNearLimit ? "text-amber-600" : "text-foreground"}`}>
          {usedLeads} / {leadLimit}
        </span>
      </div>
      <Progress 
        value={usagePercent} 
        className={`h-2 ${isAtLimit ? "[&>div]:bg-destructive" : isNearLimit ? "[&>div]:bg-amber-500" : ""}`}
      />
      <p className="text-xs text-muted-foreground">
        {isAtLimit 
          ? "Limit reached for this month" 
          : `${leadLimit - usedLeads} leads remaining this month`
        }
      </p>
    </div>
  );
}

interface LeadLimitBannerProps {
  usedLeads: number;
  leadLimit: number;
}

export function LeadLimitWarningBanner({ usedLeads, leadLimit }: LeadLimitBannerProps) {
  const storageKey = `lead_warning_dismissed_${leadLimit}`;
  const [isDismissed, setIsDismissed] = useState(() => {
    return sessionStorage.getItem(storageKey) === "true";
  });

  // Don't show warning for 0-limit plans or when not near limit
  if (leadLimit === 0) return null;
  
  const usagePercent = (usedLeads / leadLimit) * 100;
  const isNearLimit = usagePercent >= 80 && usagePercent < 100;

  if (!isNearLimit || isDismissed) return null;

  const handleDismiss = () => {
    sessionStorage.setItem(storageKey, "true");
    setIsDismissed(true);
  };

  return (
    <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 relative">
      <TrendingUp className="h-4 w-4 text-amber-600" />
      <AlertDescription className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pr-8">
        <span className="text-amber-800 dark:text-amber-200">
          You're nearing your monthly lead limit ({usedLeads}/{leadLimit}). Upgrade to keep receiving inquiries.
        </span>
        <Button size="sm" variant="outline" className="shrink-0 border-amber-300 text-amber-700 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-300 dark:hover:bg-amber-900/50" asChild>
          <Link to="/provider/billing">
            <Zap className="h-3.5 w-3.5 mr-1.5" />
            Upgrade Plan
          </Link>
        </Button>
      </AlertDescription>
      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 text-amber-600 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-200 transition-colors"
        aria-label="Dismiss warning"
      >
        <X className="h-4 w-4" />
      </button>
    </Alert>
  );
}

export function LeadLimitReachedBanner({ usedLeads, leadLimit }: LeadLimitBannerProps) {
  const storageKey = `lead_reached_dismissed_${leadLimit}`;
  const [isDismissed, setIsDismissed] = useState(() => {
    return sessionStorage.getItem(storageKey) === "true";
  });

  // Don't show for 0-limit plans (they have their own messaging)
  if (leadLimit === 0) return null;
  
  const isAtLimit = usedLeads >= leadLimit;

  if (!isAtLimit || isDismissed) return null;

  const handleDismiss = () => {
    sessionStorage.setItem(storageKey, "true");
    setIsDismissed(true);
  };

  return (
    <Alert variant="destructive" className="bg-destructive/5 border-destructive/30 relative">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pr-8">
        <span>
          You've reached your monthly lead limit ({leadLimit} leads). New leads are paused until you upgrade.
        </span>
        <Button size="sm" className="shrink-0 gap-1.5" asChild>
          <Link to="/provider/billing">
            <Zap className="h-3.5 w-3.5" />
            Upgrade to Featured
          </Link>
        </Button>
      </AlertDescription>
      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 text-destructive/70 hover:text-destructive transition-colors"
        aria-label="Dismiss warning"
      >
        <X className="h-4 w-4" />
      </button>
    </Alert>
  );
}

// Banner for Basic plan providers (0 leads)
export function BasicPlanBanner() {
  return (
    <Alert className="border-primary/30 bg-primary/5">
      <AlertCircle className="h-4 w-4 text-primary" />
      <AlertDescription className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <span className="text-foreground">
          <strong>Upgrade required to receive leads.</strong>{" "}
          <span className="text-muted-foreground">Your Basic plan doesn't include lead delivery. Upgrade to Professional or Featured to start receiving patient inquiries.</span>
        </span>
        <Button size="sm" className="shrink-0 gap-1.5" asChild>
          <Link to="/provider/billing">
            <Zap className="h-3.5 w-3.5" />
            View Plans
          </Link>
        </Button>
      </AlertDescription>
    </Alert>
  );
}

// Lead Limit Overlay - Shows over lead table/rows when limit is reached
interface LeadLimitOverlayProps {
  usedLeads: number;
  leadLimit: number;
  hiddenLeadsCount: number;
}

export function LeadLimitOverlay({ usedLeads, leadLimit, hiddenLeadsCount }: LeadLimitOverlayProps) {
  const isAtLimit = usedLeads >= leadLimit;
  
  if (!isAtLimit || hiddenLeadsCount === 0) return null;

  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="max-w-md w-full mx-4 p-8 bg-card border border-border rounded-2xl shadow-xl text-center">
        <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-5">
          <Lock className="h-8 w-8 text-primary" />
        </div>
        <h3 className="text-xl font-bold text-foreground mb-2">
          Monthly Lead Limit Reached
        </h3>
        <p className="text-muted-foreground mb-6">
          You've used all {leadLimit} leads this month. 
          {hiddenLeadsCount > 0 && (
            <span className="block mt-2 font-medium text-foreground">
              {hiddenLeadsCount} new {hiddenLeadsCount === 1 ? 'lead is' : 'leads are'} waiting for you!
            </span>
          )}
        </p>
        
        <div className="space-y-3">
          <Button size="lg" className="w-full gap-2" asChild>
            <Link to="/provider/billing">
              <Crown className="h-5 w-5" />
              Upgrade to Unlock Leads
            </Link>
          </Button>
          <p className="text-xs text-muted-foreground">
            Professional plan: 25 leads/month • Featured plan: 75 leads/month
          </p>
        </div>
      </div>
    </div>
  );
}
