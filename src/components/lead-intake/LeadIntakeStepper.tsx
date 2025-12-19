import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { STEP_LABELS, TOTAL_STEPS } from "./types";

interface LeadIntakeStepperProps {
  currentStep: number;
}

export function LeadIntakeStepper({ currentStep }: LeadIntakeStepperProps) {
  return (
    <div className="mb-6">
      {/* Progress bar with step numbers */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-foreground">
          {STEP_LABELS[currentStep - 1]}
        </span>
        <span className="text-xs text-muted-foreground">
          Step {currentStep} of {TOTAL_STEPS}
        </span>
      </div>
      
      {/* Progress bar */}
      <div className="flex items-center gap-2">
        {Array.from({ length: TOTAL_STEPS }).map((_, index) => {
          const stepNumber = index + 1;
          const isCompleted = stepNumber < currentStep;
          const isCurrent = stepNumber === currentStep;
          
          return (
            <div key={index} className="flex-1">
              <div 
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  isCompleted && "bg-primary",
                  isCurrent && "bg-primary",
                  !isCompleted && !isCurrent && "bg-muted"
                )}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
