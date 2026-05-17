import { useState, type ReactNode } from "react";
import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { UpgradeDialog } from "./UpgradeDialog";
import type { PlanTier } from "@/lib/planLimits";

interface PlanGateProps {
  /** The user's current plan. Anything other than `requires` triggers the locked state. */
  current: PlanTier | null | undefined;
  /** The plan this field requires (always `"pro"` for now). */
  requires: PlanTier;
  /** Which feature the gate is protecting — shapes the upgrade dialog headline. */
  feature: "photos" | "video";
  /** Locked-state label. Defaults to "Upgrade to Pro to unlock". */
  lockedLabel?: string;
  /** Optional return-to URL after the Pro upgrade Checkout round-trip. */
  returnTo?: string;
  className?: string;
  children: ReactNode;
}

/**
 * Plan-gated wrapper. Renders `children` normally when the user's
 * plan meets `requires`; otherwise renders them greyed out + non-
 * interactive, with a lock icon + "Upgrade to Pro to unlock" badge,
 * and opens an UpgradeDialog on any click.
 *
 * The wrapper does NOT swallow events from inside `children` —
 * children just visually appear locked. The dialog opens via a
 * sibling absolute overlay that captures the click.
 */
export function PlanGate({
  current,
  requires,
  feature,
  lockedLabel = "Upgrade to Pro to unlock",
  returnTo,
  className,
  children,
}: PlanGateProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const meets = current === requires || current === "pro";

  if (meets) {
    return <>{children}</>;
  }

  return (
    <>
      <div className={cn("relative", className)}>
        <div className="opacity-50 pointer-events-none select-none" aria-hidden>
          {children}
        </div>
        <button
          type="button"
          onClick={() => setDialogOpen(true)}
          aria-label={lockedLabel}
          className="absolute inset-0 flex items-end justify-end p-2 group/gate"
        >
          <Badge className="bg-white border border-[#1B365D]/30 text-[#1B365D] gap-1 shadow-sm group-hover/gate:bg-[#1B365D] group-hover/gate:text-white transition-colors">
            <Lock className="h-3 w-3" aria-hidden />
            {lockedLabel}
          </Badge>
        </button>
      </div>
      <UpgradeDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        feature={feature}
        returnTo={returnTo}
      />
    </>
  );
}
