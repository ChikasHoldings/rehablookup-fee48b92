import { ArrowRight, Loader2, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface PlacementJoinCTAProps {
  isPending: boolean;
  onJoin: () => void;
}

export function PlacementJoinCTA({ isPending, onJoin }: PlacementJoinCTAProps) {
  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="p-6 text-center">
        <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <Shield className="h-6 w-6 text-primary" />
        </div>
        <h3 className="font-semibold text-lg text-foreground mb-2">Ready to Join?</h3>
        <p className="text-sm text-muted-foreground mb-5 max-w-sm mx-auto">
          Start receiving matched placement referrals from families working with our specialists.
        </p>
        <Button size="lg" onClick={onJoin} disabled={isPending} className="gap-2">
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              Join Placement Network
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>
        <p className="text-xs text-muted-foreground mt-3">
          No upfront costs. Pay only on successful placement.
        </p>
      </CardContent>
    </Card>
  );
}
