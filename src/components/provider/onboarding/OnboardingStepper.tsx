import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  VISIBLE_STEPS,
  canReach,
  stepIndex,
  type OnboardingStep,
} from "@/hooks/useProviderOnboardingState";

interface OnboardingStepperProps {
  /** The step the visible stepper "is on". For verify_email + verify_phone
   *  this collapses to the "verify" tile. */
  current: OnboardingStep;
  /** The server's authoritative current step. Used as the reachability
   *  ceiling for clicks. */
  serverCurrent: OnboardingStep;
  /** Click → navigate. Stepper only invokes for reachable tiles; the
   *  parent enforces with canReach as well. */
  onSelect: (target: OnboardingStep) => void;
}

/**
 * Persistent top-of-wizard stepper. Collapses verify_email + verify_phone
 * into one "Verify" tile so the visible count stays at 5
 * (Account → Verify → Find or List → Plan → Build/Edit).
 *
 * - Completed tiles render with a check icon and are clickable (back nav).
 * - Current tile is highlighted, non-interactive (already there).
 * - Future tiles are muted and not clickable.
 */
export function OnboardingStepper({
  current,
  serverCurrent,
  onSelect,
}: OnboardingStepperProps) {
  // Find which visible tile contains the current step. verify_email and
  // verify_phone both map to the "verify" tile.
  const currentVisibleIdx = VISIBLE_STEPS.findIndex((s) =>
    s.group.includes(current as never),
  );

  return (
    <nav
      aria-label="Onboarding progress"
      className="w-full"
    >
      <ol className="flex items-stretch gap-2 sm:gap-3">
        {VISIBLE_STEPS.map((tile, i) => {
          const isCurrent = i === currentVisibleIdx;
          const isComplete = i < currentVisibleIdx;
          // First step in the tile's group is what we navigate to on click.
          const navTarget = tile.group[0] as OnboardingStep;
          const reachable = canReach(navTarget, serverCurrent);
          const clickable = reachable && !isCurrent;
          return (
            <li
              key={tile.key}
              className="flex-1 min-w-0"
              aria-current={isCurrent ? "step" : undefined}
            >
              <button
                type="button"
                disabled={!clickable}
                onClick={() => clickable && onSelect(navTarget)}
                className={cn(
                  "w-full text-left rounded-lg border p-3 sm:p-3.5 transition-colors",
                  isCurrent
                    ? "border-[#1B365D] bg-[#1B365D]/5"
                    : isComplete
                      ? "border-emerald-200 bg-emerald-50 hover:bg-emerald-100"
                      : "border-slate-200 bg-white",
                  !clickable && "cursor-default",
                )}
              >
                <div className="flex items-center gap-2">
                  <span
                    aria-hidden
                    className={cn(
                      "inline-flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-full text-[10px] sm:text-xs font-semibold",
                      isComplete
                        ? "bg-emerald-600 text-white"
                        : isCurrent
                          ? "bg-[#1B365D] text-white"
                          : "bg-slate-200 text-slate-600",
                    )}
                  >
                    {isComplete ? <Check className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> : i + 1}
                  </span>
                  <span
                    className={cn(
                      "text-xs sm:text-sm font-medium truncate",
                      isCurrent
                        ? "text-[#1B365D]"
                        : isComplete
                          ? "text-emerald-700"
                          : "text-slate-500",
                    )}
                  >
                    {tile.label}
                  </span>
                </div>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

// stepIndex is exported above for reuse; re-export here as a convenience.
export { stepIndex };
