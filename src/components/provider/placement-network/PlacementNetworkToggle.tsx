import { Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { format } from "date-fns";

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
    <Card className="mb-6 border-2 border-border/50">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Placement Network</h3>
              <p className="text-sm text-muted-foreground">
                {optedIn
                  ? `Active since ${optedInAt ? format(new Date(optedInAt), "MMM d, yyyy") : "—"}`
                  : "Opt in to receive placement referrals"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {optedIn && (
              <Badge variant="outline" className="border-emerald-500 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30">
                Active
              </Badge>
            )}
            {pendingCount > 0 && (
              <Badge variant="destructive">{pendingCount} pending</Badge>
            )}
            <Switch
              checked={optedIn}
              onCheckedChange={onToggle}
              disabled={isPending || (!optedIn && !isEligible)}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
