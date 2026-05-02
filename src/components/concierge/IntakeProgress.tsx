import { motion } from "framer-motion";
import { Check, User, Heart, MapPin, Phone, Mail, ShieldCheck, ClipboardCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface IntakeProgressProps {
  currentStep: number;
  totalSteps: number;
}

const STEPS = [
  { icon: User, label: "Who" },
  { icon: Heart, label: "Care" },
  { icon: MapPin, label: "Location" },
  { icon: Phone, label: "Contact" },
  { icon: Mail, label: "Verify Email" },
  { icon: ShieldCheck, label: "Verify Phone" },
  { icon: ClipboardCheck, label: "Review" },
];

export function IntakeProgress({ currentStep, totalSteps }: IntakeProgressProps) {
  const progress = ((currentStep - 1) / (totalSteps - 1)) * 100;

  return (
    <div className="w-full">
      {/* Desktop Progress */}
      <div className="hidden md:flex items-center justify-between relative">
        {/* Connection Line */}
        <div className="absolute top-5 left-0 right-0 h-0.5 bg-border" />
        <motion.div 
          className="absolute top-5 left-0 h-0.5 bg-primary"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
        
        {STEPS.map((step, index) => {
          const stepNumber = index + 1;
          const isCompleted = stepNumber < currentStep;
          const isCurrent = stepNumber === currentStep;
          const Icon = step.icon;
          
          return (
            <div key={step.label} className="flex flex-col items-center relative z-10">
              <motion.div
                initial={{ scale: 0.8 }}
                animate={{ scale: isCurrent ? 1.1 : 1 }}
                transition={{ duration: 0.3 }}
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
              </motion.div>
              <span
                className={cn(
                  "mt-2 text-xs font-medium transition-colors",
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
      
      {/* Mobile Progress - Sleek Animated */}
      <div className="md:hidden">
        {/* Animated Progress Bar */}
        <div className="h-2 bg-muted rounded-full overflow-hidden mb-3">
          <motion.div
            className="h-full bg-gradient-to-r from-primary to-primary/80 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${(currentStep / totalSteps) * 100}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>
        
        {/* Step Info with Animation */}
        <motion.div 
          key={currentStep}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              {(() => {
                const Icon = STEPS[currentStep - 1]?.icon;
                return Icon ? <Icon className="h-4 w-4 text-primary" /> : null;
              })()}
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                {STEPS[currentStep - 1]?.label}
              </p>
              <p className="text-xs text-muted-foreground">
                Step {currentStep} of {totalSteps}
              </p>
            </div>
          </div>
          
          {/* Mini Step Indicators */}
          <div className="flex gap-1">
            {STEPS.map((_, index) => (
              <motion.div
                key={index}
                initial={false}
                animate={{
                  backgroundColor: index + 1 <= currentStep 
                    ? "hsl(var(--primary))" 
                    : "hsl(var(--muted))",
                  scale: index + 1 === currentStep ? 1.2 : 1,
                }}
                transition={{ duration: 0.2 }}
                className="w-2 h-2 rounded-full"
              />
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
