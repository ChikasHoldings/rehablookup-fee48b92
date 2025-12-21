import { Lock, Sparkles, TrendingUp, CheckCircle, Phone, Users, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { PLAN_DETAILS } from "@/hooks/useSubscription";

interface LockedLeadDetailPanelProps {
  totalLeadsCount: number;
  onClose: () => void;
}

export function LockedLeadDetailPanel({ totalLeadsCount, onClose }: LockedLeadDetailPanelProps) {
  const professionalPlan = PLAN_DETAILS.professional;
  
  return (
    <div className="flex-1 flex flex-col bg-background min-h-0 overflow-hidden">
      {/* Header with lock icon */}
      <div className="flex-shrink-0 border-b bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30">
        <div className="p-6 text-center">
          <div className="h-16 w-16 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center mx-auto mb-4">
            <Lock className="h-8 w-8 text-amber-600 dark:text-amber-400" />
          </div>
          <h2 className="text-xl font-semibold text-foreground">
            Lead Details Locked
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Upgrade your plan to view and contact this lead
          </p>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-auto p-6 space-y-6">
        {/* Waiting leads counter */}
        <Card className="p-6 text-center bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <div className="text-5xl font-bold text-primary mb-2">
            {totalLeadsCount}
          </div>
          <p className="text-sm font-medium text-primary/80">
            Lead{totalLeadsCount !== 1 ? 's' : ''} Waiting for You
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            These potential clients are interested in your facility
          </p>
        </Card>

        {/* What you're missing */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            What's Hidden
          </h3>
          <div className="grid gap-2">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <div className="h-8 w-8 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <Phone className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground/60 blur-sm select-none">
                  (555) 123-4567
                </p>
                <p className="text-xs text-muted-foreground">Direct phone number</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <div className="h-8 w-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground/60 blur-sm select-none">
                  john.doe@email.com
                </p>
                <p className="text-xs text-muted-foreground">Verified email address</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <div className="h-8 w-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <Users className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  Treatment preferences, insurance info, urgency level & more
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Upgrade benefits */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Upgrade to Professional
          </h3>
          <Card className="p-4 border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/30">
            <div className="flex items-center gap-2 mb-3">
              <Badge className="bg-green-600 text-white border-0">
                {professionalPlan.price}{professionalPlan.period}
              </Badge>
              <span className="text-sm font-medium text-green-700 dark:text-green-400">
                {professionalPlan.name}
              </span>
            </div>
            <ul className="space-y-2">
              {[
                "100 qualified leads per month",
                "View full contact details",
                "Call and email leads directly",
                "Lead management dashboard",
                "Performance analytics",
              ].map((feature, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-green-700 dark:text-green-300">
                  <CheckCircle className="h-4 w-4 flex-shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>
          </Card>
        </div>

        {/* Stats/social proof */}
        <div className="flex items-center justify-center gap-6 py-4 border-t border-b">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-amber-500 mb-1">
              <Star className="h-4 w-4 fill-current" />
              <Star className="h-4 w-4 fill-current" />
              <Star className="h-4 w-4 fill-current" />
              <Star className="h-4 w-4 fill-current" />
              <Star className="h-4 w-4 fill-current" />
            </div>
            <p className="text-xs text-muted-foreground">Trusted by 500+ providers</p>
          </div>
          <div className="text-center">
            <div className="flex items-center gap-1 text-primary font-semibold mb-1">
              <TrendingUp className="h-4 w-4" />
              <span>4x</span>
            </div>
            <p className="text-xs text-muted-foreground">Avg. ROI</p>
          </div>
        </div>

        {/* CTA buttons */}
        <div className="space-y-3 pt-2">
          <Button asChild size="lg" className="w-full gap-2 h-12 text-base font-semibold">
            <Link to="/provider/billing">
              <Lock className="h-4 w-4" />
              Upgrade to Unlock All Leads
            </Link>
          </Button>
          <Button 
            variant="ghost" 
            className="w-full text-muted-foreground hover:text-foreground"
            onClick={onClose}
          >
            Maybe later
          </Button>
        </div>
      </div>
    </div>
  );
}
