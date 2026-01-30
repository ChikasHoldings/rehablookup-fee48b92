import { CheckCircle2, Circle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface PlacementNetworkToggleProps {
  optedIn: boolean;
  optedInAt: string | null;
  pendingCount: number;
  isEligible: boolean;
  isPending: boolean;
  onToggle: (checked: boolean) => void;
}

export function PlacementNetworkToggle({
  optedIn,
  optedInAt,
  pendingCount,
  isEligible,
  isPending,
  onToggle,
}: PlacementNetworkToggleProps) {
  return (
    <Card className={cn(
      "mb-8 transition-colors",
      optedIn 
        ? "border-emerald-200 dark:border-emerald-900 bg-emerald-50/50 dark:bg-emerald-950/20" 
        : "border-border"
    )}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className={cn(
              "h-10 w-10 rounded-lg flex items-center justify-center shrink-0",
              optedIn ? "bg-emerald-100 dark:bg-emerald-900" : "bg-muted"
            )}>
              {optedIn ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <Circle className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-foreground">Network Status</h3>
                {optedIn && (
                  <Badge 
                    variant="secondary" 
                    className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300 border-0"
                  >
                    Active
                  </Badge>
                )}
                {pendingCount > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    {pendingCount} new
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground truncate">
                {optedIn
                  ? `Receiving referrals since ${optedInAt ? format(new Date(optedInAt), "MMM d, yyyy") : "—"}`
                  : "Enable to start receiving matched referrals"}
              </p>
            </div>
          </div>
          <Switch
            checked={optedIn}
            onCheckedChange={onToggle}
            disabled={isPending || (!optedIn && !isEligible)}
            className="shrink-0"
          />
        </div>
      </CardContent>
    </Card>
  );
}
