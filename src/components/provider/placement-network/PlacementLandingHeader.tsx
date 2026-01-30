import { Network } from "lucide-react";

export function PlacementLandingHeader() {
  return (
    <div className="text-center mb-10">
      <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-primary/10 mb-4">
        <Network className="h-7 w-7 text-primary" />
      </div>
      <h1 className="text-3xl font-bold text-foreground">Placement Network</h1>
      <p className="text-muted-foreground mt-2 max-w-md mx-auto">
        Receive matched placement referrals from families working with our specialists
      </p>
    </div>
  );
}
