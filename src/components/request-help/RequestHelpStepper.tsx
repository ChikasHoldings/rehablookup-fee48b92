import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface RequestHelpStepperProps {
  currentStep: number;
  totalSteps: number;
}

const stepLabels = ["About You", "Treatment", "Insurance", "Contact"];

export function RequestHelpStepper({ currentStep, totalSteps }: RequestHelpStepperProps) {
  return (
    <div className="mb-6 md:mb-8">
      {/* Mobile: Progress bar with step indicator */}
      <div className="md:hidden">
        <div className="flex items-center justify-between mb-3">
          <span className="text-base font-medium text-foreground">{stepLabels[currentStep - 1]}</span>
          <span className="text-sm text-muted-foreground">
            {currentStep} of {totalSteps}
          </span>
        </div>
        <div className="w-full bg-muted rounded-full h-2">
          <div 
            className="bg-primary h-2 rounded-full transition-all duration-300"
            style={{ width: `${(currentStep / totalSteps) * 100}%` }}
          />
        </div>
      </div>

      {/* Desktop: Full stepper */}
      <div className="hidden md:flex items-center justify-between">
        {stepLabels.map((label, index) => {
          const stepNumber = index + 1;
          const isCompleted = stepNumber < currentStep;
          const isCurrent = stepNumber === currentStep;
          
          return (
            <div key={label} className="flex items-center flex-1">
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
                    isCompleted && "bg-primary text-primary-foreground",
                    isCurrent && "bg-primary text-primary-foreground ring-4 ring-primary/20",
                    !isCompleted && !isCurrent && "bg-muted text-muted-foreground"
                  )}
                >
                  {isCompleted ? <Check className="w-5 h-5" /> : stepNumber}
                </div>
                <span
                  className={cn(
                    "mt-2 text-xs font-medium",
                    isCurrent ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  {label}
                </span>
              </div>
              {index < totalSteps - 1 && (
                <div
                  className={cn(
                    "flex-1 h-0.5 mx-4",
                    stepNumber < currentStep ? "bg-primary" : "bg-muted"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
