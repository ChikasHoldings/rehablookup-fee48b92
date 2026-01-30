import { Network, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ReactNode } from "react";

interface PlacementLandingHeaderProps {
  statusSlot?: ReactNode;
}

export function PlacementLandingHeader({ statusSlot }: PlacementLandingHeaderProps) {
  return (
    <div className="mb-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* Left side - Title and description */}
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
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

        {/* Right side - Status slot */}
        {statusSlot && (
          <div className="shrink-0">
            {statusSlot}
          </div>
        )}
      </div>
    </div>
  );
}
