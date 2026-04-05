import { Link } from "react-router-dom";
import { Sparkles, Percent, Building2, Star, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useProStatus } from "@/hooks/useProStatus";
import { useFacilityLimits } from "@/hooks/useFacilityLimits";
import { cn } from "@/lib/utils";

interface ProBenefitsWidgetProps {
  className?: string;
}

export function ProBenefitsWidget({ className }: ProBenefitsWidgetProps) {
  const { data: proStatus, isLoading } = useProStatus();
  const { limit: locationLimit, used: usedLocations } = useFacilityLimits();

  // Don't show if not Pro or still loading
  if (isLoading || !proStatus?.isPro) {
    return null;
  }

  const benefits = [
    {
      icon: Percent,
      label: `${proStatus.unlockDiscountPercent}% off unlocks`,
      description: "Applied automatically",
      color: "text-emerald-600",
      bgColor: "bg-emerald-500/10",
    },
    {
      icon: Star,
      label: "Featured placement",
      description: "Priority in search",
      color: "text-amber-600",
      bgColor: "bg-amber-500/10",
    },
    {
      icon: Building2,
      label: `${usedLocations}/${locationLimit} locations`,
      description: "Multiple facilities",
      color: "text-violet-600",
      bgColor: "bg-violet-500/10",
    },
  ];

  return (
    <Card className={cn("border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-amber-600/10", className)}>
      <CardHeader className="p-3.5 pb-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center">
              <Sparkles className="h-3.5 w-3.5 text-white" />
            </div>
            <CardTitle className="text-sm font-semibold">Your Pro Benefits</CardTitle>
          </div>
          <Badge className="bg-amber-500/20 text-amber-700 border-amber-500/30 text-xs font-medium">
            ACTIVE
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-3.5 pt-0">
        <div className="space-y-2">
          {benefits.map((benefit) => {
            const Icon = benefit.icon;
            return (
              <div key={benefit.label} className="flex items-center gap-2.5">
                <div className={cn("h-6 w-6 rounded flex items-center justify-center shrink-0", benefit.bgColor)}>
                  <Icon className={cn("h-3 w-3", benefit.color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground">{benefit.label}</p>
                  <p className="text-xs text-muted-foreground">{benefit.description}</p>
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-3 pt-2.5 border-t border-amber-500/20">
          <Button
            variant="ghost"
            size="sm"
            className="w-full h-7 text-xs text-amber-700 hover:text-amber-800 hover:bg-amber-500/10 justify-between"
            asChild
          >
            <Link to="/provider/billing?tab=pro">
              Manage Subscription
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
