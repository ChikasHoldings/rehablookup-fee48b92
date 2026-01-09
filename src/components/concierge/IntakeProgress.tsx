import { Check, User, Heart, MapPin, CreditCard, Phone } from "lucide-react";
import { cn } from "@/lib/utils";

interface IntakeProgressProps {
  currentStep: number;
  totalSteps: number;
}

const STEPS = [
  { icon: User, label: "Who" },
  { icon: Heart, label: "Care" },
  { icon: MapPin, label: "Location" },
  { icon: CreditCard, label: "Payment" },
  { icon: Phone, label: "Contact" },
];

export function IntakeProgress({ currentStep, totalSteps }: IntakeProgressProps) {
  return (
    <div className="w-full">
      {/* Desktop Progress */}
      <div className="hidden md:flex items-center justify-between relative">
        {/* Connection Line */}
        <div className="absolute top-5 left-0 right-0 h-0.5 bg-border" />
        <div 
          className="absolute top-5 left-0 h-0.5 bg-primary transition-all duration-500"
          style={{ width: `${((currentStep - 1) / (totalSteps - 1)) * 100}%` }}
        />
        
        {STEPS.map((step, index) => {
          const stepNumber = index + 1;
          const isCompleted = stepNumber < currentStep;
          const isCurrent = stepNumber === currentStep;
          const Icon = step.icon;
          
          return (
            <div key={step.label} className="flex flex-col items-center relative z-10">
              <div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 border-2",
                  isCompleted && "bg-primary border-primary text-primary-foreground",
                  isCurrent && "bg-background border-primary text-primary ring-4 ring-primary/20",
                  !isCompleted && !isCurrent && "bg-muted border-border text-muted-foreground"
                )}
              >
                {isCompleted ? (
                  <Check className="h-5 w-5" />
                ) : (
                  <Icon className="h-5 w-5" />
                )}
              </div>
              <span
                className={cn(
                  "mt-2 text-xs font-medium",
                  isCurrent && "text-primary",
                  isCompleted && "text-foreground",
                  !isCompleted && !isCurrent && "text-muted-foreground"
                )}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
      
      {/* Mobile Progress */}
      <div className="md:hidden">
        <div className="flex items-center gap-3 mb-2">
          {STEPS.map((step, index) => {
            const stepNumber = index + 1;
            const isCompleted = stepNumber < currentStep;
            const isCurrent = stepNumber === currentStep;
            
            return (
              <div
                key={step.label}
                className={cn(
                  "flex-1 h-1.5 rounded-full transition-all",
                  isCompleted && "bg-primary",
                  isCurrent && "bg-primary/60",
                  !isCompleted && !isCurrent && "bg-muted"
                )}
              />
            );
          })}
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-foreground">
            Step {currentStep}: {STEPS[currentStep - 1]?.label}
          </span>
          <span className="text-muted-foreground">
            {currentStep} of {totalSteps}
          </span>
        </div>
      </div>
    </div>
  );
}
