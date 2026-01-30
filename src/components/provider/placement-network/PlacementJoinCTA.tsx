import { Network, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PlacementJoinCTAProps {
  isPending: boolean;
  onJoin: () => void;
}

export function PlacementJoinCTA({ isPending, onJoin }: PlacementJoinCTAProps) {
  return (
    <div className="text-center py-4">
      <Button size="lg" className="gap-2" onClick={onJoin} disabled={isPending}>
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Network className="h-4 w-4" />
        )}
        Join Placement Network
        <ArrowRight className="h-4 w-4" />
      </Button>
      <p className="text-xs text-muted-foreground mt-3">
        Pay only on successful placement. No upfront costs.
      </p>
    </div>
  );
}
