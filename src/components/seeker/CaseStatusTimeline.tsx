import { CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatusConfig {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

interface CaseStatusTimelineProps {
  currentStatus: string;
  steps: string[];
  statusConfig: Record<string, StatusConfig>;
}

export function CaseStatusTimeline({ currentStatus, steps, statusConfig }: CaseStatusTimelineProps) {
  const currentIndex = steps.indexOf(currentStatus);
  // If status is "confirming", show it as between in_contact and placed
  const effectiveIndex = currentStatus === "confirming" ? steps.indexOf("in_contact") + 0.5 : currentIndex;
  
  return (
    <div className="relative">
      {/* Progress line */}
      <div className="absolute top-4 left-0 right-0 h-0.5 bg-muted" />
      <div 
        className="absolute top-4 left-0 h-0.5 bg-primary transition-all duration-500"
        style={{ 
          width: `${Math.min(100, (effectiveIndex / (steps.length - 1)) * 100)}%` 
        }}
      />
      
      {/* Steps */}
      <div className="relative flex justify-between">
        {steps.map((step, index) => {
          const config = statusConfig[step];
          const Icon = config?.icon || CheckCircle;
          const isCompleted = index < effectiveIndex;
          const isCurrent = step === currentStatus || (currentStatus === "confirming" && step === "in_contact");
          const isPending = index > effectiveIndex;
          
          return (
            <div 
              key={step} 
              className="flex flex-col items-center"
            >
              <div 
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 z-10",
                  isCompleted && "bg-primary text-primary-foreground",
                  isCurrent && "bg-primary text-primary-foreground ring-4 ring-primary/20",
                  isPending && "bg-muted text-muted-foreground"
                )}
              >
                {isCompleted ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <Icon className="h-4 w-4" />
                )}
              </div>
              <span 
                className={cn(
                  "text-xs mt-2 text-center max-w-[60px] leading-tight",
                  isCurrent && "font-medium text-foreground",
                  !isCurrent && "text-muted-foreground"
                )}
              >
                {config?.label || step}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
