import { Network, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function PlacementLandingHeader() {
  return (
    <div className="mb-10">
      <div className="flex items-center gap-3 mb-4">
        <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
          <Network className="h-6 w-6 text-primary" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-foreground">Placement Network</h1>
            <Badge variant="secondary" className="text-xs font-medium">
              <Sparkles className="h-3 w-3 mr-1" />
              Beta
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Receive matched referrals from our placement specialists
          </p>
        </div>
      </div>
    </div>
  );
}
