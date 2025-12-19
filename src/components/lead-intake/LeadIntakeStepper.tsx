import { Check, User, ClipboardList, Phone } from "lucide-react";
import { cn } from "@/lib/utils";
import { STEP_LABELS, TOTAL_STEPS } from "./types";

interface LeadIntakeStepperProps {
  currentStep: number;
}

const STEP_ICONS = [User, ClipboardList, Phone];

export function LeadIntakeStepper({ currentStep }: LeadIntakeStepperProps) {
  return (
    <div className="mb-8">
      {/* Mobile: Progress bar with step indicator */}
      <div className="md:hidden">
        <div className="flex items-center justify-between mb-3">
          <span className="text-base font-semibold text-foreground">
            {STEP_LABELS[currentStep - 1]}
          </span>
          <span className="text-sm text-muted-foreground font-medium">
            {currentStep} of {TOTAL_STEPS}
          </span>
        </div>
        <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
          <div 
            className="bg-gradient-to-r from-primary to-primary/80 h-2.5 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${(currentStep / TOTAL_STEPS) * 100}%` }}
          />
        </div>
      </div>

      {/* Desktop: Full stepper */}
      <div className="hidden md:flex items-center justify-between">
        {STEP_LABELS.map((label, index) => {
          const stepNumber = index + 1;
          const isCompleted = stepNumber < currentStep;
          const isCurrent = stepNumber === currentStep;
          const Icon = STEP_ICONS[index];
          
          return (
            <div key={label} className="flex items-center flex-1">
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300",
                    isCompleted && "bg-primary text-primary-foreground shadow-md shadow-primary/30",
                    isCurrent && "bg-primary text-primary-foreground shadow-lg shadow-primary/40 ring-4 ring-primary/20 scale-110",
                    !isCompleted && !isCurrent && "bg-muted text-muted-foreground"
                  )}
                >
                  {isCompleted ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                </div>
                <span
                  className={cn(
                    "mt-3 text-sm font-medium transition-colors",
                    isCurrent ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  {label}
                </span>
              </div>
              {index < TOTAL_STEPS - 1 && (
                <div className="flex-1 h-1 mx-4 rounded-full overflow-hidden bg-muted">
                  <div 
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      stepNumber < currentStep ? "bg-primary w-full" : "bg-transparent w-0"
                    )}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
