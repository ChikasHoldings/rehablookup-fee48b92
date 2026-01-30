import { CheckCircle2, Circle } from "lucide-react";
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
    <div className={cn(
      "flex items-center gap-3 px-4 py-3 rounded-lg border transition-colors",
      optedIn 
        ? "border-emerald-200 dark:border-emerald-900 bg-emerald-50/50 dark:bg-emerald-950/20" 
        : "border-border bg-muted/30"
    )}>
      <div className={cn(
        "h-8 w-8 rounded-md flex items-center justify-center shrink-0",
        optedIn ? "bg-emerald-100 dark:bg-emerald-900" : "bg-muted"
      )}>
        {optedIn ? (
          <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
        ) : (
          <Circle className="h-4 w-4 text-muted-foreground" />
        )}
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm text-foreground">Status</span>
          {optedIn && (
            <Badge 
              variant="secondary" 
              className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300 border-0 text-xs"
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
        <p className="text-xs text-muted-foreground whitespace-nowrap">
          {optedIn
            ? `Since ${optedInAt ? format(new Date(optedInAt), "MMM d, yyyy") : "—"}`
            : "Not active"}
        </p>
      </div>
      <Switch
        checked={optedIn}
        onCheckedChange={onToggle}
        disabled={isPending || (!optedIn && !isEligible)}
        className="shrink-0 ml-2"
      />
    </div>
  );
}
