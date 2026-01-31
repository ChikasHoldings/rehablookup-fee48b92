import { forwardRef } from "react";
import { Link } from "react-router-dom";
import { Share2, Timer, Clock, ChevronRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface RedistStats {
  exclusive: number;
  extended: number;
  expired: number;
}

interface LeadRedistributionCardProps {
  redistStats?: RedistStats;
}

export const LeadRedistributionCard = forwardRef<HTMLDivElement, LeadRedistributionCardProps>(
  function LeadRedistributionCard({ redistStats }, ref) {
  if (!redistStats || (redistStats.exclusive === 0 && redistStats.extended === 0 && redistStats.expired === 0)) {
    return null;
  }

  return (
    <Card ref={ref} className="border shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Share2 className="h-4 w-4 text-muted-foreground" />
              Lead Distribution Status
            </CardTitle>
            <CardDescription className="text-xs">Exclusivity and redistribution tracking</CardDescription>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/admin/leads" className="text-xs">
              View all <ChevronRight className="h-3 w-3 ml-1" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4">
          <div className="p-3 rounded-lg bg-warning/10 border border-warning/30">
            <div className="flex items-center gap-2 text-warning-foreground mb-1">
              <Timer className="h-4 w-4" />
              <span className="text-sm font-medium">Exclusive</span>
            </div>
            <p className="text-2xl font-bold text-warning-foreground">{redistStats.exclusive}</p>
            <p className="text-xs text-warning-foreground/80 mt-0.5">Awaiting original facility</p>
          </div>
          <div className="p-3 rounded-lg bg-info/10 border border-info/30">
            <div className="flex items-center gap-2 text-info-foreground mb-1">
              <Share2 className="h-4 w-4" />
              <span className="text-sm font-medium">Redistributed</span>
            </div>
            <p className="text-2xl font-bold text-info-foreground">{redistStats.extended}</p>
            <p className="text-xs text-info-foreground/80 mt-0.5">Available to nearby facilities</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50 border border-border">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Clock className="h-4 w-4" />
              <span className="text-sm font-medium">Expired</span>
            </div>
            <p className="text-2xl font-bold text-muted-foreground">{redistStats.expired}</p>
            <p className="text-xs text-muted-foreground/80 mt-0.5">Window closed</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

LeadRedistributionCard.displayName = "LeadRedistributionCard";
