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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-lg bg-warning/20 border-2 border-warning/50 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-md bg-warning/30">
                <Timer className="h-4 w-4 text-warning-foreground" />
              </div>
              <span className="text-sm font-semibold text-foreground">Exclusive</span>
            </div>
            <p className="text-3xl font-bold text-foreground">{redistStats.exclusive}</p>
            <p className="text-xs text-muted-foreground mt-1">Awaiting original facility</p>
          </div>
          <div className="p-4 rounded-lg bg-info/20 border-2 border-info/50 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-md bg-info/30">
                <Share2 className="h-4 w-4 text-info-foreground" />
              </div>
              <span className="text-sm font-semibold text-foreground">Redistributed</span>
            </div>
            <p className="text-3xl font-bold text-foreground">{redistStats.extended}</p>
            <p className="text-xs text-muted-foreground mt-1">Available to nearby facilities</p>
          </div>
          <div className="p-4 rounded-lg bg-muted/70 border-2 border-border shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-md bg-muted">
                <Clock className="h-4 w-4 text-muted-foreground" />
              </div>
              <span className="text-sm font-semibold text-foreground">Expired</span>
            </div>
            <p className="text-3xl font-bold text-foreground">{redistStats.expired}</p>
            <p className="text-xs text-muted-foreground mt-1">Window closed</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

LeadRedistributionCard.displayName = "LeadRedistributionCard";
