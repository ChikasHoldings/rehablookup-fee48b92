/**
 * WizardStepper
 * ─────────────
 * Compact horizontal step indicator for provider-area multi-step flows.
 * Visual style matches the existing ProviderSignup stepper (lines 879-928
 * of src/pages/ProviderSignup.tsx) so the look is consistent across the
 * provider area.
 *
 * Responsibilities:
 *   - Renders a progress bar showing % complete.
 *   - Renders N circular step dots with state styling
 *     (completed / current / upcoming).
 *
 * Out of scope:
 *   - Navigation between steps. The owning page controls currentStep and
 *     decides which transitions are allowed; the stepper is purely
 *     presentational. (Pass an `onStepClick` callback if you want
 *     back-navigation.)
 */

import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface WizardStepperProps {
  currentStep: number;
  totalSteps: number;
  /** Optional human-readable labels for each step (length must equal totalSteps). */
  labels?: string[];
  /** Called when the user clicks a step dot. Only fired for completed steps
   *  (step index < currentStep). If omitted, dots are not clickable. */
  onStepClick?: (step: number) => void;
  className?: string;
}

export function WizardStepper({
  currentStep,
  totalSteps,
  labels,
  onStepClick,
  className,
}: WizardStepperProps) {
  const progressPct = Math.round((currentStep / totalSteps) * 100);
  const currentLabel =
    labels && labels[currentStep - 1] ? labels[currentStep - 1] : undefined;

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground font-medium">
          Step {currentStep} of {totalSteps}
          {currentLabel ? ` — ${currentLabel}` : ""}
        </span>
        <span className="text-muted-foreground tabular-nums">{progressPct}%</span>
      </div>

      <div className="h-1 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      <div className="flex justify-center gap-2">
        {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step) => {
          const isCompleted = step < currentStep;
          const isCurrent = step === currentStep;
          const clickable = !!onStepClick && isCompleted;

          return (
            <button
              key={step}
              type="button"
              onClick={() => {
                if (clickable && onStepClick) onStepClick(step);
              }}
              disabled={!clickable}
              aria-label={
                labels?.[step - 1]
                  ? `Step ${step}: ${labels[step - 1]}`
                  : `Step ${step}`
              }
              aria-current={isCurrent ? "step" : undefined}
              className={cn(
                "h-7 w-7 rounded-full text-xs font-semibold flex items-center justify-center transition-colors border",
                isCompleted &&
                  "bg-primary text-primary-foreground border-primary",
                isCurrent &&
                  "bg-background text-primary border-primary ring-2 ring-primary/30",
                !isCompleted &&
                  !isCurrent &&
                  "bg-muted text-muted-foreground border-border",
                clickable && "cursor-pointer hover:opacity-80",
                !clickable && !isCurrent && "cursor-not-allowed",
              )}
            >
              {isCompleted ? (
                <Check className="h-3.5 w-3.5" aria-hidden />
              ) : (
                step
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
