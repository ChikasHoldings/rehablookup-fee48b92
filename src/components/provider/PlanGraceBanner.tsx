import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePlanGrace } from "@/hooks/usePlanGrace";

/**
 * Courtesy-period banner (dashboard + billing). Shows the expiry date, days
 * remaining, and the upgrade CTA. Renders nothing when no grace is active —
 * a no-op for every normal provider.
 */
export function PlanGraceBanner() {
  const { data: grace } = usePlanGrace();
  if (!grace) return null;

  const expires = new Date(grace.expires_at);
  const daysLeft = Math.max(0, Math.ceil((expires.getTime() - Date.now()) / 86_400_000));
  const endDate = expires.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  return (
    <div
      className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3"
      role="status"
      data-testid="plan-grace-banner"
    >
      <div className="flex items-center gap-2 text-sm text-violet-900">
        <Sparkles className="h-4 w-4 shrink-0 text-violet-600" />
        <span>
          <span className="font-semibold">
            Complimentary multi-listing period — {daysLeft} day{daysLeft === 1 ? "" : "s"} left.
          </span>{" "}
          Up to {grace.max_facilities} listings are covered until {endDate}. Upgrade to Pro to keep
          them all after that (otherwise extra listings pause; your oldest stays live).
        </span>
      </div>
      <Button asChild size="sm" className="ml-auto shrink-0">
        <Link to="/provider/billing?upgrade=pro">Upgrade to Pro</Link>
      </Button>
    </div>
  );
}
